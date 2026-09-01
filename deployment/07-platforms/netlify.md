# Netlify (Frontend SPA)

> **Model:** Git-connected static hosting + edge CDN. **Cost:** Free Starter tier suits a
> demo. **Cold start:** none for static assets.

> Recommended **FE** alternative to Vercel. Full FE walkthrough: `my-school-FE/deployment/`.

## Prerequisites

- BE deployed over HTTPS; `my-school-FE` on GitHub.

## Deploy

1. Netlify → **Add new site → Import from Git** → `my-school-FE`.
2. Build command: `pnpm build`. Publish directory: `dist`.
3. **Environment variable:** `VITE_API_BASE_URL=https://<be-domain>/api/v1`.
4. Deploy → note `https://<site>.netlify.app`; set BE `CORS_ORIGIN` to it and redeploy BE.

## SPA routing (required)

Netlify does **not** fall back to `index.html` by default. Add one of:

`my-school-FE/public/_redirects`:

```
/*    /index.html   200
```

or `my-school-FE/netlify.toml`:

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

> **Warning:** Without this rule, deep links / page refreshes on client routes return 404.

## Env is build-time

Same as Vite everywhere: change `VITE_API_BASE_URL` → **trigger a redeploy**.

## Custom domain + TLS

Add the domain in Netlify → update DNS → automatic Let's Encrypt TLS. Update BE
`CORS_ORIGIN`.

## Pros / Cons

| Pros                         | Cons                                       |
| ---------------------------- | ------------------------------------------ |
| Simple, generous free tier   | Needs explicit SPA redirect rule           |
| Deploy previews per PR       | Build-time env (rebuild to change API URL) |
| `netlify.toml` infra-as-code | Backend hosted elsewhere                   |

## Cost

- Starter: **$0** for a demo (fair-use bandwidth/build minutes).
