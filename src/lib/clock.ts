let offset = 0;
export function syncClock(serverTime: number) { offset = serverTime - Date.now(); }
export function serverNow() { return Date.now() + offset; }
