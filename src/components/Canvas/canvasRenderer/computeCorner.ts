
import type { Wall, Point } from '../../../core/types';
import { distance, PX_PER_METER, segmentIntersection } from '../../../core/geometry';

export interface CornerGeom {
  O: Point;
  center: Point;
  tangentA: Point;
  tangentB: Point;
  radius: number;
  innerRadius: number;
  startAngle: number;
  endAngle: number;
  ccw: boolean;
}

const EPS = 1e-7;

const sub = (a: Point, b: Point): Point => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

const dot = (a: Point, b: Point): number =>
  a.x * b.x + a.y * b.y;

const cross = (a: Point, b: Point): number =>
  a.x * b.y - a.y * b.x;

const unit = (a: Point): Point | null => {
  const length = Math.hypot(a.x, a.y);
  return length > EPS
    ? { x: a.x / length, y: a.y / length }
    : null;
};

const offsetIntersection = (
  p: Point,
  nA: Point,
  dA: number,
  nB: Point,
  dB: number,
): Point | null => {
  const det = cross(nA, nB);
  if (Math.abs(det) < EPS) return null;

  return {
    x: p.x + (dA * nB.y - nA.y * dB) / det,
    y: p.y + (nA.x * dB - dA * nB.x) / det,
  };
};

export function computeCorner(
  wallA: Wall,
  wallB: Wall,
  radiusWorld: number,
  toScreen: (p: Point) => Point,
  zoom: number,
  scale: number,
): CornerGeom | null {
  if (
    ![
      radiusWorld,
      zoom,
      scale,
      wallA.thickness,
      wallB.thickness,
    ].every(Number.isFinite) ||
    radiusWorld <= 0 ||
    zoom <= 0 ||
    scale <= 0 ||
    wallA.thickness <= 0 ||
    wallB.thickness <= 0
  ) {
    return null;
  }

  const intersection = segmentIntersection(
    wallA.start,
    wallA.end,
    wallB.start,
    wallB.end
  );

  if (!intersection) return null;

  const P = toScreen(intersection);

  const sA = toScreen(wallA.start);
  const eA = toScreen(wallA.end);
  const sB = toScreen(wallB.start);
  const eB = toScreen(wallB.end);

  const farA = distance(sA, P) > distance(eA, P) ? sA : eA;
  const farB = distance(sB, P) > distance(eB, P) ? sB : eB;

  const uA = unit(sub(farA, P));
  const uB = unit(sub(farB, P));

  if (!uA || !uB) return null;

  const cosine = Math.max(-1, Math.min(1, dot(uA, uB)));
  const angle = Math.acos(cosine);

  if (angle < 0.02 || Math.PI - angle < 0.02) {
    return null;
  }

  const perpA = { x: -uA.y, y: uA.x };
  const perpB = { x: -uB.y, y: uB.x };

  const nA =
    dot(sub(farB, P), perpA) > 0
      ? { x: -perpA.x, y: -perpA.y }
      : perpA;

  const nB =
    dot(sub(farA, P), perpB) > 0
      ? { x: -perpB.x, y: -perpB.y }
      : perpB;

  const factor = PX_PER_METER * zoom * scale;

  const halfA = (wallA.thickness * factor) / 2;
  const halfB = (wallB.thickness * factor) / 2;

  const thickness =
    Math.max(wallA.thickness, wallB.thickness) * factor;

  const O = offsetIntersection(P, nA, halfA, nB, halfB);
  if (!O) return null;

  const create = (R: number): CornerGeom | null => {
    if (R <= thickness + EPS) return null;

    const C = offsetIntersection(
      P,
      nA,
      halfA - R,
      nB,
      halfB - R
    );

    if (!C) return null;

    const tangentA = {
      x: C.x + nA.x * R,
      y: C.y + nA.y * R,
    };

    const tangentB = {
      x: C.x + nB.x * R,
      y: C.y + nB.y * R,
    };

    const tA = dot(sub(tangentA, P), uA);
    const tB = dot(sub(tangentB, P), uB);

    if (
      tA < -EPS ||
      tB < -EPS ||
      tA > distance(P, farA) * 0.98 ||
      tB > distance(P, farB) * 0.98
    ) {
      return null;
    }

    const startAngle = Math.atan2(nA.y, nA.x);
    const endAngle = Math.atan2(nB.y, nB.x);

    const span = Math.atan2(
      Math.sin(endAngle - startAngle),
      Math.cos(endAngle - startAngle)
    );

    const values = [
      O.x,
      O.y,
      C.x,
      C.y,
      tangentA.x,
      tangentA.y,
      tangentB.x,
      tangentB.y,
      R,
      span,
    ];

    if (!values.every(Number.isFinite)) return null;

    return {
      O,
      center: C,
      tangentA,
      tangentB,
      radius: R,
      innerRadius: Math.max(0, R - thickness),
      startAngle,
      endAngle,
      ccw: span < 0,
    };
  };

  const requested = radiusWorld * factor + thickness;

  const minimum =
    thickness + Math.max(0.001, factor * 0.00001);

  if (requested <= minimum) return null;

  const desired = create(requested);
  if (desired) return desired;

  let low = minimum;
  let high = requested;
  let best = create(low);

  if (!best) return null;

  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    const candidate = create(mid);

    if (candidate) {
      low = mid;
      best = candidate;
    } else {
      high = mid;
    }
  }

  return best;
}

export function hitTestRoundedCorner(
  pt: Point,
  wallA: Wall,
  wallB: Wall,
  radiusWorld: number,
  zoom: number,
  scale: number,
  toScreen: (p: Point) => Point,
): boolean {
  const g = computeCorner(
    wallA,
    wallB,
    radiusWorld,
    toScreen,
    zoom,
    scale
  );

  if (!g) return false;

  const S = toScreen(pt);

  const r = Math.hypot(
    S.x - g.center.x,
    S.y - g.center.y
  );

  if (Math.abs(r - g.radius) > 15) return false;

  const theta = Math.atan2(
    S.y - g.center.y,
    S.x - g.center.x
  );

  const span = Math.atan2(
    Math.sin(g.endAngle - g.startAngle),
    Math.cos(g.endAngle - g.startAngle)
  );

  const delta = Math.atan2(
    Math.sin(theta - g.startAngle),
    Math.cos(theta - g.startAngle)
  );

  return span < 0
    ? delta <= 0 && delta >= span
    : delta >= 0 && delta <= span;
  }
