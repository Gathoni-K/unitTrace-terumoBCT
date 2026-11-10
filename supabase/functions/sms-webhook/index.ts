import { parseSmsCommand } from './_shared/parseSmsCommand.ts';

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const form = await request.formData();
  const from = form.get('from');
  const text = form.get('text');
  if (typeof from !== 'string' || typeof text !== 'string') {
    return new Response('Invalid request', { status: 400 });
  }
  void from;
  const result = parseSmsCommand(text, ['blood_group']);
  if ('error' in result) return new Response(result.error, { status: 400 });
  // TODO: authenticate the sender, persist the decision, and return a localized reply.
  return new Response(`Task ${result.taskId} ${result.action} recorded for review.`, { status: 200 });
});
