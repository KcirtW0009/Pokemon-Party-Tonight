# Pokemon Party Tonight — Render Free

Repository: https://github.com/KcirtW0009/Pokemon-Party-Tonight

## Dashboard setup

Select the repository under New → Web Service, then configure:

| Setting | Value |
|---|---|
| Name | pokemon-party-tonight |
| Language/runtime | Node |
| Branch | main |
| Region | Singapore |
| Root Directory | Leave empty |
| Build Command | npm ci --include=dev && npm run build |
| Start Command | npm start |
| Instance Type | Free |
| Environment | NODE_ENV=production, NODE_VERSION=24 |

Do not set PPT_FAST. Leave PORT to Render: the server uses its assigned PORT, while local development stays on 3100. Keep a single instance, because rooms live in process memory. No database or paid resource is required.

Alternatively, New → Blueprint can read render.yaml. It explicitly selects the free plan. The ordinary Web Service creation form requires the settings above to be entered manually.

## After deployment

Wait for Live, then open the HTTPS onrender.com URL. Create a room on a computer and join from a phone with Wi-Fi disabled. Check readiness, one game, image loading and a refresh/reconnect.

Free service sleeps after 15 minutes without inbound HTTP/WebSocket traffic; waking takes about a minute. Restart, redeploy or sleep clears all rooms and scores. Play only on the same public deployment URL: local and cloud rooms are separate.

The repository contains all 1,025 artwork PNGs and prebuilt data. Build validates these assets before compiling; no Pokémon data download is required on Render.

## Troubleshooting

- Missing package.json: wrong branch/root, or source has not been pushed yet.
- Cannot find dist/server.cjs: build command must include npm run build.
- Missing TypeScript/tsx/esbuild: install with npm ci --include=dev.
- Deployment logs show short game timers: remove PPT_FAST and redeploy.
- Blank/missing artwork: confirm public/pokemon/official-artwork is committed.
- Build or startup fails: retain the complete error log and fix before changing the plan.

References: https://render.com/docs/web-services, https://render.com/docs/free, https://render.com/docs/node-version
