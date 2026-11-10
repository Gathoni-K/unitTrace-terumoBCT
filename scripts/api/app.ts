import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import type { Pool } from 'pg';
import { listTasks, getTask, revealTask, submitDecision, type DecisionPayload } from './tasksService.js';
import { computeBeforeAfterMetrics } from '../metrics/before-after.js';

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role, x-user-id');
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

function sendText(res: ServerResponse, statusCode: number, text: string): void {
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.statusCode = statusCode;
  res.end(text);
}

function readRequestBody(req: IncomingMessage): Promise<Record<string, unknown>> {
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
      const trimmed = body.trim();
      if (!trimmed) {
        resolve({});
        return;
      }
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(trimmed);
        const result: Record<string, unknown> = {};
        for (const [key, val] of params.entries()) {
          result[key] = val;
        }
        resolve(result);
        return;
      }
      try {
        resolve(JSON.parse(trimmed));
      } catch {
        // Fallback to URL-encoded parsing if JSON parsing fails
        try {
          const params = new URLSearchParams(trimmed);
          const result: Record<string, unknown> = {};
          for (const [key, val] of params.entries()) {
            result[key] = val;
          }
          resolve(result);
        } catch {
          resolve({});
        }
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
          const body = await readRequestBody(req);
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
        const body = await readRequestBody(req);

        const action = body.action as DecisionPayload['action'];
        if (!action || !['accept', 'change', 'reject', 'approve', 'send_back', 'escalate'].includes(action)) {
          sendJson(res, 400, {
            error: "Field 'action' must be one of: 'accept', 'change', 'reject', 'approve', 'send_back', 'escalate'",
          });
          return;
        }

        const roleHeader = req.headers['x-user-role'];
        const userRole: 'clerk' | 'supervisor' =
          typeof roleHeader === 'string' && roleHeader.toLowerCase() === 'supervisor' ? 'supervisor' : 'clerk';

        const rawIp =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
          req.socket.remoteAddress ||
          '127.0.0.1';

        const payload: DecisionPayload = {
          action,
          modified_suggestion: body.modified_suggestion as Record<string, unknown> | undefined,
          user_id: (body.user_id as string) ?? undefined,
          user_role: (body.user_role as DecisionPayload['user_role']) ?? userRole,
          ip_address: (body.ip_address as string) ?? rawIp,
          channel: (body.channel as DecisionPayload['channel']) ?? 'web',
          note: (body.note as string) ?? undefined,
        };

        try {
          const result = await submitDecision(pool, taskId, payload);
          sendJson(res, 200, result);
        } catch (decisionErr) {
          const status = (decisionErr as { statusCode?: number }).statusCode;
          if (status === 403) {
            sendJson(res, 403, { error: (decisionErr as Error).message });
            return;
          }
          throw decisionErr;
        }
        return;
      }

      // 6. POST /api/webhooks/africastalking/sms
      if (method === 'POST' && pathname === '/api/webhooks/africastalking/sms') {
        const body = await readRequestBody(req);
        const from = String(body.from || body.phoneNumber || '').trim();
        const text = String(body.text || '').trim();

        const match = /^(\d+)\s+(OK|NO)$/i.exec(text);
        if (!match) {
          sendText(res, 200, "Error: Invalid format. Reply '41 OK' or '41 NO'.");
          return;
        }

        const taskId = match[1];
        const isOk = match[2].toUpperCase() === 'OK';
        const action = isOk ? 'accept' : 'reject';

        try {
          await submitDecision(pool, taskId, {
            action,
            channel: 'sms',
            actor: from || undefined,
            user_role: 'clerk',
            note: `SMS reply from ${from || 'mobile'}`,
          });
          const verb = isOk ? 'accepted' : 'rejected';
          sendText(res, 200, `Task ${taskId} ${verb}. Logged to audit trail.`);
        } catch (decisionErr) {
          const msg = decisionErr instanceof Error ? decisionErr.message : String(decisionErr);
          if (msg.includes('supervisors') || (decisionErr as { statusCode?: number }).statusCode === 403) {
            sendText(res, 200, 'Error: Only supervisors can approve merges. Please use the web app.');
          } else if (msg.includes('not found')) {
            sendText(res, 200, `Error: Task ${taskId} not found.`);
          } else {
            console.error('SMS Decision Error:', decisionErr);
            sendText(res, 200, `Error: Failed to process task ${taskId}.`);
          }
        }
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

