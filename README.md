# Nutrix AI

Nutrix AI is a lightweight clinical nutrition dashboard built with HTML, CSS, and vanilla JavaScript. It uses Supabase for authentication and database storage, USDA for nutrition facts, Open Food Facts for product lookup, and Gemini for AI analysis.

## Local development

1. Install dependencies:

```bash
cd /home/muguromwega/nutrix
npm install
```

2. Copy `.env.example` to `.env` and add your backend API keys:

```bash
cp .env.example .env
```

3. Copy browser config template and set your Supabase public credentials:

```bash
cp public/config.example.js public/config.js
```

4. Start the local server:

```bash
npm start
```

5. Open the app:

```text
http://localhost:3000/signup.html
```

## Production optimization

- External API secrets are now kept on the backend proxy, not in the browser.
- Frontend assets are served only from the `public/` folder, so server files and `.env` are not exposed.
- Open Food Facts, USDA, and Gemini calls are routed through `/api/*`.
- Static assets are served with caching headers for better performance.
- Security headers are applied using `helmet`.
- API endpoints are rate-limited to reduce abuse and brute-force traffic.
- API payloads are validated (query/prompt length and bounds checks) before outbound calls.
- Production error responses avoid leaking internal upstream failure details.
- `.gitignore` prevents `.env` and `node_modules` from being committed.

## Notes

- `SUPABASE_ANON_KEY` is a public client key by design and can appear in browser devtools.
- Never place `GEMINI_API_KEY`, `USDA_API_KEY`, service-role keys, or any private token in frontend files.
- For production, run backend APIs behind HTTPS and expose only the proxy URL to the browser.

## SEO and GitHub Pages checklist

- This project is configured for `https://collins-creates.github.io/nutrix/` (repo-based GitHub Pages URL).
- Keep `dashboard.html` as `noindex` (private content) and prioritize indexing the homepage.
- Submit your sitemap URL in [Google Search Console](https://search.google.com/search-console/about) after deployment.
- Connect your GitHub Pages site to a custom domain (if available) and enforce HTTPS.
- Deploy the Node backend (`server.js`) separately (Render/Railway/Fly/etc.); GitHub Pages is static-only.
- In GitHub repository secrets, set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `API_PROXY_PATH`. The deploy workflow generates `public/config.js` at build time from `public/config.template.js`.
- Add original content regularly (guides/blog/resources). Strong rankings come from content quality, backlinks, and technical health over time.

## Render backend deployment

1. Push this repo to GitHub and create a new Render Blueprint service from it (`render.yaml` is included).
2. In Render, set required environment variables:
   - `GEMINI_API_KEY`
   - `USDA_API_KEY`
   - `FRONTEND_ORIGIN` (use `https://collins-creates.github.io`)
3. Deploy and copy your API base URL from Render, for example:
   - `https://nutrix-api.onrender.com`
4. In GitHub repository secrets, set:
   - `API_PROXY_PATH=https://nutrix-api.onrender.com/api`
5. Re-run the GitHub Pages workflow so it regenerates `public/config.js` with the Render API URL.

### Quick verification

- Backend health check: `https://your-render-url/healthz` should return `{"ok":true}`.
- Frontend should load from `https://collins-creates.github.io/nutrix/` and API calls should go to your Render domain (check browser Network tab).

## Production security checklist

- Keep GitHub Pages source set to **GitHub Actions** so `public/config.js` is generated at deploy time (do not commit secrets to frontend files).
- Set GitHub repository secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_PROXY_PATH`.
- Set Render secrets: `GEMINI_API_KEY`, `USDA_API_KEY`, and `FRONTEND_ORIGIN=https://collins-creates.github.io`.
- In Supabase, enable and verify **RLS policies** for `profiles` and `food_history`; only authenticated users should access their own rows.
- Restrict Supabase Auth redirect URLs to your production domain(s) only.
- Rotate API keys immediately if any secret was ever committed or shared.
