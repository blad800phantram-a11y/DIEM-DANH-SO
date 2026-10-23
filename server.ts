import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// In AI Studio Cloud Run containers, Nginx listens on port 8080 and proxies traffic to localhost:3000.
// If process.env.PORT is 8080, Express must still listen on port 3000 to avoid EADDRINUSE conflict with Nginx.
const PORT = process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : 3000;

app.use(express.json());

// Healthcheck endpoints for Cloud Run and monitoring probes
app.get(['/health', '/healthz', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'healthy', ok: true, timestamp: new Date().toISOString() });
});

const distPath = path.resolve(__dirname, 'dist');

// Serve static assets from build output
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback: any route returns index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // In case build hasn't run yet
  app.get('*', (_req, res) => {
    res.send('Đoàn Viên Số - Đang khởi động hệ thống, vui lòng chờ trong giây lát...');
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Đoàn Viên Số server listening on http://0.0.0.0:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

