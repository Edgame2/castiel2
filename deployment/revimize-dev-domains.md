# Exposing API Gateway and UI on revimize-dev.com

To serve the API at **api.revimize-dev.com** and the web UI at **www.revimize-dev.com**.

**Ready-made files:** `deployment/nginx/revimize-dev.conf` (nginx server blocks), `deployment/env.revimize-dev.example` (env vars for gateway CORS, auth redirects, and UI build).

**Scripts:** `deployment/scripts/setup-revimize-dev-env.sh` (copy env example to `.env`), `deployment/scripts/install-nginx-revimize-dev.sh` (install nginx conf). UI: `pnpm run build:revimize-dev` in `ui/` (builds with `NEXT_PUBLIC_API_BASE_URL=https://api.revimize-dev.com`).

## 1. DNS

Point both hostnames to the host(s) where the stack runs (or to your load balancer):

- **api.revimize-dev.com** → IP or LB of the server running the API gateway
- **www.revimize-dev.com** → IP or LB of the server running the UI (can be the same host)

## 2. Reverse proxy (e.g. nginx)

Use **deployment/nginx/revimize-dev.conf**: it defines `api.revimize-dev.com` → gateway (port 3001) and `www.revimize-dev.com` → UI (port 3000). To install: `sudo ./deployment/scripts/install-nginx-revimize-dev.sh` (default target `/etc/nginx/sites-enabled`) or copy the conf manually. The script removes the nginx **default** site so your domains are served instead of "Welcome to nginx!". Reload nginx after install: `sudo nginx -t && sudo systemctl reload nginx`. **HTTPS (so you get https://www.revimize-dev.com with no port):**

1. Deploy the config as-is (HTTP on port 80). Then **http://www.revimize-dev.com** works with no `:3000` — nginx proxies to the UI on 3000.
2. On the server, get certificates and let certbot configure nginx:
   ```bash
   ./deployment/scripts/setup-https-revimize-dev.sh
   ```
   Or: `sudo certbot --nginx -d api.revimize-dev.com -d www.revimize-dev.com` (add `-m your@email` for renewal emails).
3. Certbot will add HTTPS (port 443) and can redirect HTTP to HTTPS. After that, **https://www.revimize-dev.com** works with no port.

## 3. UI build

Build the UI with the **public** API base URL so the browser calls the API subdomain. From repo root:

```bash
cd ui && pnpm run build:revimize-dev
```

Or: `NEXT_PUBLIC_API_BASE_URL=https://api.revimize-dev.com pnpm build` (or set the env in CI and run `pnpm build`).

## 4. Auth / CORS (env)

Set these in your `.env` (or CI) so the gateway and auth use the right origins. To create `.env` from the example: `./deployment/scripts/setup-revimize-dev-env.sh`. Then add `JWT_SECRET` and any other secrets. See **deployment/env.revimize-dev.example** for the full list.

- **Gateway CORS:** `FRONTEND_URL=https://www.revimize-dev.com` (gateway reads this via config `cors.origin`).
- **Auth:** `BASE_URL=https://api.revimize-dev.com` (OAuth/SAML callback host) and `MAIN_APP_URL=https://www.revimize-dev.com` (post-login redirect). Docker Compose passes these to the auth service when set in `.env`.

## 5. UI across reboots and backend

**UI (systemd):** On the server, install the service so the UI survives reboots:
```bash
sudo ./deployment/scripts/install-castiel-ui-service.sh
```
If the repo is not at `/home/ubuntu/dev/castiel2`, edit `deployment/systemd/castiel-ui.service` (User and paths) before running. Status: `sudo systemctl status castiel-ui`.

**Backend (Docker Compose):** On the server, start the API gateway and services so login and API calls work:
```bash
./deployment/scripts/start-backend.sh
```
Or: `docker compose up -d` from repo root.

## Summary

| Goal                         | Action                                                                 |
|-----------------------------|------------------------------------------------------------------------|
| API at api.revimize-dev.com | DNS → host; nginx (or similar) route by `server_name` to gateway.     |
| UI at www.revimize-dev.com  | DNS → host; nginx route by `server_name` to UI server.                 |
| UI calls API                | Build UI with `NEXT_PUBLIC_API_BASE_URL=https://api.revimize-dev.com`. |
| CORS & auth redirects        | Gateway CORS and auth frontend/base URL set to `https://www.revimize-dev.com`. |

Ports for `proxy_pass` and for the gateway/UI processes should come from your deployment configuration (e.g. env vars or docker-compose), not from hardcoded values in application source.
