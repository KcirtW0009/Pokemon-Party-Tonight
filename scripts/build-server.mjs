import { build } from 'esbuild';
await build({ entryPoints: ['server.ts'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: 'dist/server.cjs', sourcemap: true });
