import { pool } from './lib/db.js';
import { createServer } from './api/app.js';

const PORT = Number(process.env.PORT || 3000);

const server = createServer(pool);

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Data Quality Workbench API live at http://localhost:${PORT}`);
  console.log(` - GET  /api/tasks             List pending / open tasks`);
  console.log(` - GET  /api/tasks/:id         Get single task details`);
  console.log(` - POST /api/tasks/:id/decision Submit human decision`);
  console.log(` - GET  /api/metrics/before-after Before/After proof metric`);
  console.log(` - GET  /api/health            Health check`);
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

