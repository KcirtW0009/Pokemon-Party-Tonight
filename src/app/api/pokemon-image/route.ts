import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveImageToken } from '@/server/imageTokens';

// 像素猜遊戲的图片代理：客户端只拿到随机 token，看不到图鉴 id。
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const id = resolveImageToken(token);
  if (!id) return new Response('not found', { status: 404 });
  try {
    const file = path.join(process.cwd(), 'public', 'pokemon', 'official-artwork', `${id}.png`);
    const buf = await readFile(file);
    return new Response(buf as unknown as BodyInit, {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
