# Cloudflare Pages (Frontend SPA)

> **Model:** Static hosting on Cloudflare's global edge network. **Cost:** Free tier is
> very generous (unlimited requests, generous bandwidth). **Cold start:** none.

> Recommended **FE** host for the always-on free path. Full FE walkthrough:
> `my-school-FE/deployment/`.

## Prerequisites
- BE deployed over HTTPS; `my-school-FE` on GitHub.

## Deploy
1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Select `my-school-FE`.
3. Build command: `pnpm build`. Build output directory: `dist`.
4. Environment variable: `VITE_API_BASE_URL=https://<be-domain>/api/v1`.
5. Deploy → note `https://<project>.pages.dev`; set BE `CORS_ORIGIN` and redeploy BE.

> **Note:** Set the build system to use pnpm — Cloudflare detects `pnpm-lock.yaml`. If
> needed, set `NODE_VERSION` / add `packageManager` in `package.json`.

## SPA routing (required)
Add `my-school-FE/public/_redirects`:
```
/*    /index.html   200
```
This ships in the build output and makes deep links work.

## Env is build-time
Change `VITE_API_BASE_URL` → **retry deployment** (rebuild).

## Custom domain + TLS
Add a custom domain in the Pages project → Cloudflare manages DNS + TLS automatically
(especially easy if the domain is already on Cloudflare). Update BE `CORS_ORIGIN`.

## Pros / Cons
| Pros | Cons |
| ---- | ---- |
| Huge free tier, global edge | Needs `_redirects` for SPA |
| Fast, unlimited requests | Build-time env |
| Tight DNS/TLS integration | Backend hosted elsewhere |

## Cost
- Free tier: **$0**, hard to outgrow for a demo.
