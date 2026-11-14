
import type { Point, Wall } from './types';
import { getCurvedWallGeometry } from './curvedWallGeometry';

type CurvedElement = {
  center?: Point;
  width: number;
  arcAnchorAngle?: number;
  arcOffset?: Point;
};

export function getCurvedElementGeometry(
  wall: Wall,
  element: CurvedElement
) {
  const geo = getCurvedWallGeometry(wall);
  if (!geo) return null;

  const reference = element.center ?? wall.start;

  const angle = element.arcAnchorAngle ??
    Math.atan2(
      reference.y - geo.center.y,
      reference.x - geo.center.x
    );

  const offset = element.arcOffset ?? { x: 0, y: 0 };

  return {
    ...geo,
    angle,
    drawCenter: {
      x: geo.center.x + offset.x,
      y: geo.center.y + offset.y,
    },
    elementCenter: {
      x: geo.center.x + offset.x +
        Math.cos(angle) * geo.radius,
      y: geo.center.y + offset.y +
        Math.sin(angle) * geo.radius,
    },
    halfAngle: element.width / (2 * geo.radius),
  };
}
