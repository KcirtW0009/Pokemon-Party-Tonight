import type { ServerRoom } from './state';
export function targetReached(room: ServerRoom): boolean {
  return room.settings.targetScore > 0 && Object.values(room.scores).some(s => s >= room.settings.targetScore);
}
