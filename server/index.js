import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForDatabase } from './db.js';
import leadsRouter from './routes/leads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT) || 3000;

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/leads', leadsRouter);

app.use(express.static(publicDir));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await waitForDatabase();
    console.log('Connected to database.');
    app.listen(PORT, () => console.log(`madleads listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();
