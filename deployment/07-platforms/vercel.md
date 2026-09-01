# Vercel (Frontend SPA)

> **Model:** Git-connected static/edge hosting, purpose-built for frontend frameworks.
> Auto-detects Vite. **Cost:** Free Hobby tier is plenty for a demo. **Cold start:** none
> (static assets on CDN).

> This is the recommended **FE** host for the free-tier path. Full FE walkthrough:
> `my-school-FE/deployment/`. This page is the API-integration summary.

## Prerequisites

- The BE is deployed and reachable over HTTPS (see the BE platform files).
- BE `CORS_ORIGIN` will be set to the Vercel URL once known.
- `my-school-FE` pushed to GitHub.

## Deploy

1. Vercel → **Add New → Project** → import `my-school-FE`.
2. Framework preset: **Vite** (auto). Build: `pnpm build`. Output: `dist`.
3. **Environment Variable** (Production + Preview):
    ```
    VITE_API_BASE_URL=https://<be-domain>/api/v1
    ```
4. Deploy → note `https://<project>.vercel.app`.
5. Set the BE `CORS_ORIGIN` to that URL and redeploy the BE.

> **Warning:** `VITE_*` is **build-time**. After changing `VITE_API_BASE_URL` you must
> **redeploy** the FE (Vercel → Redeploy), not just restart.

## SPA routing

Vercel serves SPAs correctly by default (unmatched paths → `index.html`). No config
needed for React Router. If you want it explicit, add `vercel.json`:

```json
{
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Preview deploys

Every PR/branch gets a unique preview URL. To let previews call the API, either:

- Set a permissive dev/staging `CORS_ORIGIN` on a staging BE, or
- Add each preview origin (tedious) — usually you point previews at a staging API.

## Custom domain

Add `app.example.com` in Vercel → assign DNS (CNAME) → TLS is automatic. Update BE
`CORS_ORIGIN` to the custom domain.

## Pros / Cons

| Pros                           | Cons                                          |
| ------------------------------ | --------------------------------------------- |
| Zero-config Vite, instant CDN  | Backend must live elsewhere                   |
| Free previews per PR           | Env is build-time (rebuild to change API URL) |
| Automatic TLS + custom domains | Hobby tier has fair-use limits                |

## Cost

- Hobby: **$0** for a demo. Pro (~$20/mo) for teams/commercial use.
