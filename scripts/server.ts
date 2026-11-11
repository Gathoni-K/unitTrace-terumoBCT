import { pool } from './lib/db.js';
import { createServer } from './api/app.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

if (!process.env.AFRICASTALKING_API_KEY) {
  console.error('FATAL: AFRICASTALKING_API_KEY environment variable is missing.');
  console.error('Set AFRICASTALKING_API_KEY in your environment or .env file before starting the server.');
  process.exit(1);
}

const server = createServer(pool);

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(` UnitTrace Workbench API live at http://${HOST}:${PORT}`);
  console.log(` - GET  /api/health                       Health check`);
  console.log(` - GET  /api/tasks                        List pending / open tasks`);
  console.log(` - GET  /api/tasks/:id                    Get single task details`);
  console.log(` - POST /api/tasks/:id/decision           Submit human decision (Web)`);
  console.log(` - POST /api/tasks/:id/reveal             Audit-logged PII reveal`);
  console.log(` - GET  /api/metrics/before-after         Before/After proof metrics`);
  console.log(` - GET  /api/audit                        Recent audit log entries`);
  console.log(` - POST /api/webhooks/africastalking/sms  Africa's Talking SMS Webhook`);
  console.log(`====================================================`);
  console.log(` Production AT Callback URL:`);
  console.log(`   {DEPLOYED_BASE_URL}/api/webhooks/africastalking/sms`);
  console.log(`====================================================`);
});

process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  server.close(async () => {
    await pool.end();
    console.log('Database pool closed. Exiting.');
    process.exit(0);
  });
});
