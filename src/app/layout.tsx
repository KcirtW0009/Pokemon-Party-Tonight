import type { Metadata, Viewport } from 'next';
import './globals.css';
import './batch.css';
import {PartyMusicProvider} from '@/components/PartyMusic';

export const metadata: Metadata = {
  title: '宝可梦派对 · Pokémon Party Tonight',
  description: '2–8 人中文在线宝可梦派对，16 款小游戏，手机电脑一起玩',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F5F3ED',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body><PartyMusicProvider>{children}</PartyMusicProvider></body>
    </html>
  );
}
