# Tencent Cloud deployment

Target: Guangzhou Lighthouse, Ubuntu 24.04, 2 vCPU / 2GB RAM / 50GB SSD.

The application runs on port **3100** in development and on this server. Port 3000 is reserved for the independent implementation.

## Runtime

- Node.js 24 (NodeSource apt repository).
- Application directory: `/home/ubuntu/pokemon-party-tonight`.
- Use the committed `package-lock.json`: `npm ci --include=dev`, then `npm run build`.
- Validate with `npm run test:logic` and `node scripts/room-test.mjs` while the production service is running.
- Install `scripts/pokemon-party-tonight.service` as `/etc/systemd/system/pokemon-party-tonight.service`; run `sudo systemctl daemon-reload` and `sudo systemctl enable --now pokemon-party-tonight`.
- The service runs as `ubuntu`, with `NODE_ENV=production`, `PORT=3100`, restart on failure and boot startup. Do not set `PPT_FAST` in the actual service.
- Inspect: `sudo systemctl status pokemon-party-tonight` and `sudo journalctl -u pokemon-party-tonight -n 100 --no-pager`.
- After an update and successful build: `sudo systemctl restart pokemon-party-tonight`.

## Access

Use SSH public-key authentication for `ubuntu`. Local deployment credentials and temporary archives are in ignored `.deploy/`; never commit private keys.

Tencent Lighthouse firewall must allow TCP 22 for administrative access and TCP 3100 for game testing. Restrict SSH source addresses where practical. Do not open all ports.

Initial test URL: `http://106.55.253.20:3100`. This is an HTTP/IP test endpoint, not a completed domain/HTTPS setup. Mainland public website operation requires the appropriate filing; IP-based temporary testing is a separate case.

Rooms and scores are in process memory; restarting, deploying or rebooting clears them. Run one application instance.

## Security maintenance

Next.js was updated from 14.2.5 to 14.2.35 before deployment to address the published December 2025 security advisory. Continue checking applicable advisories before future public releases.

## Deployment verification (2026-10-03)

Production build, 72 base assertions and 2,140 revision checks passed on Ubuntu with Node.js 24.21.0. The systemd service is enabled and active, listens on all interfaces at 3100 and returns HTTP 200 locally. Production room tests passed, including malformed events, readiness, host permissions, reconnection-related joins, privacy and normal round timing.

After the Tencent Lighthouse TCP 3100 firewall rule was applied, the public endpoint returned HTTP 200. Real Socket.IO clients connected from the development computer to the public IP and passed the room and normal-timing tests, including readiness, host permissions, duplicate/late joins, secret choices, kicking, public words, reminders and abstention continuation.

## Release update (2026-10-04)

The game improvements were built and tested in `/home/ubuntu/ppt-release-3210cd9` before switching. The service's stable directory `/home/ubuntu/pokemon-party-tonight` is now a symlink to that release. The original installation is preserved at `/home/ubuntu/ppt-backup-before-20261004`.

Server build, 72 base and 5,299 revision checks, and the Match component output check passed. Local full multiplayer QA passed 819 checks. After switching, public production room/timing and `QA_URL=http://106.55.253.20:3100 node scripts/feedback-test.mjs` checks passed, including per-stage guess persistence across reconnect.

For future updates, build a new release directory, verify it, repoint the stable symlink and restart the service. A restart clears in-memory rooms. To roll back this update, repoint the stable symlink to the preserved backup and restart:

```bash
ln -sfn /home/ubuntu/ppt-backup-before-20261004 /home/ubuntu/pokemon-party-tonight
sudo systemctl restart pokemon-party-tonight
```
