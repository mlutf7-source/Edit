
export function getWallBorderWidth(zoom: number): number {
  return Math.max(1.5, 4 * zoom);
}
