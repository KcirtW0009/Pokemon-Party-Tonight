import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { registerRoomHandlers } from './src/server/rooms';
import { resolveImageToken } from './src/server/imageTokens';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const dev = process.env.NODE_ENV !== 'production' && process.env.npm_lifecycle_event !== 'start';
const port = Number(process.env.PORT ?? 3100);

async function main(): Promise<void> {
  console.log(`Preparing Pokémon Party (${dev ? 'development' : 'production'}) on port ${port}`);
  const app = next({ dev, port, hostname: '0.0.0.0' });
  await app.prepare();
  const handler = app.getRequestHandler();
  const httpServer = createServer((req, res) => {
    // Serve in the authoritative process, sharing the actual game's token registry.
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    if (url.pathname === '/api/pokemon-image') {
      const id = resolveImageToken(url.searchParams.get('token') ?? '');
      if (!id) { res.writeHead(404); res.end(); return; }
      void readFile(path.join(process.cwd(), 'public/pokemon/official-artwork', `${id}.png`)).then(buf => {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
        res.end(buf);
      }).catch(() => { res.writeHead(404); res.end(); });
      return;
    }
    void handler(req, res);
  });
  const io = new Server(httpServer, {
    cors: dev ? { origin: `http://localhost:${port}` } : undefined,
  });
  registerRoomHandlers(io);
  httpServer.listen(port, () => {
    console.log(`> 宝可梦派对 ready on http://localhost:${port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
