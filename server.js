import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const USDA_API_KEY = process.env.USDA_API_KEY;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://collins-creates.github.io';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        connectSrc: [
          "'self'",
          'http://localhost:3000',
          'https://gnvqwzigmzkytlwbyrtf.supabase.co',
          'https://*.supabase.co'
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);
app.use(express.json());

// SEO, security, and API headers.
app.use((req, res, next) => {
  // Redirect www to non-www
  if (req.hostname.startsWith('www.')) {
    return res.redirect(301, `https://${req.hostname.substring(4)}${req.originalUrl}`);
  }

  // SEO Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Allow search engines to index (except dashboard)
  if (req.path.includes('/dashboard')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  } else {
    res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
  }

  // Cache control headers
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.match(/\.(html)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }

  const requestOrigin = req.headers.origin;
  const allowedOrigins = new Set([
    FRONTEND_ORIGIN,
    'https://collins-creates.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
  ]);

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'ignore', maxAge: '1d', index: false }));

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/api/openfoodfacts', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  try {
    const target = `https://world.openfoodfacts.org/api/v2/search?q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(target, { cache: 'no-cache' });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: 'Unable to fetch Open Food Facts data', detail: error.message });
  }
});

app.post('/api/usda', async (req, res) => {
  if (!USDA_API_KEY) {
    console.error('USDA_API_KEY missing');
    return res.status(500).json({ error: 'Missing USDA_API_KEY in environment' });
  }

  const { query, pageSize = 1 } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Missing query in request body' });
  }

  try {
    const target = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}`;
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, pageSize }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('USDA API error:', response.status, data);
      return res.status(response.status).json(data);
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error('USDA fetch error:', error.message);
    return res.status(502).json({ error: 'Unable to fetch USDA data', detail: error.message });
  }
});

app.post('/api/gemini', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment' });
  }

  const prompt = req.body.prompt;
  const model = req.body.model || GEMINI_MODEL;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
  }

  try {
    const target = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: 'Unable to reach Gemini API', detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Nutrix AI - Global Nutrition Intelligence Platform`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`SEO optimized for global search engine dominance`);
});