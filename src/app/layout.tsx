import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '宝可梦派对 · Pokémon Party Tonight',
  description: '2-8 人中文在线宝可梦派对游戏：谁是百变怪 / 像素猜宝可梦 / 训练家默契挑战 / 宝可梦猜拳',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FFC93C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
