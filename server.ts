import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Healthcheck endpoint for Cloud Run and monitoring
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
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
    res.send('Building application, please wait a moment...');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Đoàn Viên Số server listening on http://0.0.0.0:${PORT}`);
});
