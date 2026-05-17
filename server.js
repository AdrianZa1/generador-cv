import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs/promises';
import os from 'os';
import puppeteer from 'puppeteer';

dotenv.config();

const app = express();
app.use(cors());
// Aumentar límite para recibir HTML grande (clonado con estilos en línea)
app.use(express.json({ limit: '20mb' }));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.error('ERROR: Set OPENAI_API_KEY in environment');
  process.exit(1);
}

// Serve static files from project root so cv-builder.html is available at /
const __dirname = path.resolve();
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'cv-builder.html'));
});

app.post('/api/gpt', async (req, res) => {
  try {
    const { prompt, max_tokens = 200 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens
      })
    });

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Endpoint para generar PDF server-side usando Puppeteer
app.post('/generate-pdf', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: 'html required' });

    // Crear archivo temporal
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-html-'));
    const tmpFile = path.join(tmpDir, 'cv.html');
    await fs.writeFile(tmpFile, html, 'utf8');

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(pathToFileURL(tmpFile).href, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' } });
    await browser.close();

    // Limpiar
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}

    const outBuf = Buffer.from(pdfBuffer);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Mi_CV.pdf');
    res.setHeader('Content-Length', outBuf.length);
    res.end(outBuf);
  } catch (err) {
    console.error('generate-pdf error', err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API proxy and static server running on http://localhost:${PORT}`));
