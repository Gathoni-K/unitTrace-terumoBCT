import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import type { Pool } from 'pg';
import { listTasks, getTask, revealTask, submitDecision, type DecisionPayload } from './tasksService.js';
import { computeBeforeAfterMetrics } from '../metrics/before-after.js';

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

function readBodyJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        // Guard against overly large payloads (1MB limit)
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error(`Invalid JSON: ${(e as Error).message}`));
      }
    });
    req.on('error', reject);
  });
}

export function createApiHandler(pool: Pool) {
  return async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url ?? '/', `http://${host}`);
    const pathname = parsedUrl.pathname;
    const method = req.method?.toUpperCase();

    try {
      // 1. Health check
      if (method === 'GET' && pathname === '/api/health') {
        sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
        return;
      }

      // 2. Before/After Metrics endpoint
      if (method === 'GET' && pathname === '/api/metrics/before-after') {
        const metrics = await computeBeforeAfterMetrics(pool);
        sendJson(res, 200, metrics);
        return;
      }

      // 3. GET /api/tasks
      if (method === 'GET' && pathname === '/api/tasks') {
        const status = parsedUrl.searchParams.get('status') ?? undefined;
        const type = parsedUrl.searchParams.get('type') ?? undefined;
        const source = parsedUrl.searchParams.get('source') ?? undefined;
        const limit = parsedUrl.searchParams.has('limit') ? Number(parsedUrl.searchParams.get('limit')) : undefined;
        const offset = parsedUrl.searchParams.has('offset') ? Number(parsedUrl.searchParams.get('offset')) : undefined;

        const result = await listTasks(pool, { status, type, source, limit, offset });
        sendJson(res, 200, result);
        return;
      }

      // 4. POST or GET /api/tasks/:id/reveal (PII Reveal with access_log audit)
      const revealMatch = /^\/api\/tasks\/([^/]+)\/reveal$/.exec(pathname);
      if ((method === 'POST' || method === 'GET') && revealMatch) {
        const taskId = revealMatch[1];
        let userId: string | undefined;
        if (method === 'POST') {
          const body = await readBodyJson(req);
          userId = (body.user_id as string) ?? undefined;
        } else {
          userId = parsedUrl.searchParams.get('user_id') ?? undefined;
        }

        try {
          const task = await revealTask(pool, taskId, userId);
          sendJson(res, 200, task);
        } catch (revealErr) {
          const message = revealErr instanceof Error ? revealErr.message : String(revealErr);
          if (message.includes('not found')) {
            sendJson(res, 404, { error: message });
          } else {
            throw revealErr;
          }
        }
        return;
      }

      // 5. GET /api/tasks/:id
      const getTaskMatch = /^\/api\/tasks\/([^/]+)$/.exec(pathname);
      if (method === 'GET' && getTaskMatch) {
        const taskId = getTaskMatch[1];
        const task = await getTask(pool, taskId);
        if (!task) {
          sendJson(res, 404, { error: `Task ${taskId} not found` });
          return;
        }
        sendJson(res, 200, task);
        return;
      }

      // 5. POST /api/tasks/:id/decision
      const decisionMatch = /^\/api\/tasks\/([^/]+)\/decision$/.exec(pathname);
      if (method === 'POST' && decisionMatch) {
        const taskId = decisionMatch[1];
        const body = await readBodyJson(req);

        const action = body.action as DecisionPayload['action'];
        if (!action || !['accept', 'change', 'reject', 'approve', 'send_back', 'escalate'].includes(action)) {
          sendJson(res, 400, {
            error: "Field 'action' must be one of: 'accept', 'change', 'reject', 'approve', 'send_back', 'escalate'",
          });
          return;
        }

        const payload: DecisionPayload = {
          action,
          modified_suggestion: body.modified_suggestion as Record<string, unknown> | undefined,
          user_id: (body.user_id as string) ?? undefined,
          channel: (body.channel as DecisionPayload['channel']) ?? 'web',
          note: (body.note as string) ?? undefined,
        };

        const result = await submitDecision(pool, taskId, payload);
        sendJson(res, 200, result);
        return;
      }

      // 404 Not Found
      sendJson(res, 404, { error: `Cannot ${method} ${pathname}` });
    } catch (err) {
      console.error(`API Error [${method} ${pathname}]:`, err);
      sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  };
}

export function createServer(pool: Pool): http.Server {
  return http.createServer(createApiHandler(pool));
}

