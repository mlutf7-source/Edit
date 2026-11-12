
import type { Wall, Point } from '../../../core/types';
import {
  wallRectangle,
  segmentIntersection,
} from '../../../core/geometry';

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

const EPS = 1e-8;

const add = (a: Point, b: Point): Point => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

const sub = (a: Point, b: Point): Point => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

const mul = (p: Point, k: number): Point => ({
  x: p.x * k,
  y: p.y * k,
});

const dot = (a: Point, b: Point): number =>
  a.x * b.x + a.y * b.y;

const cross = (a: Point, b: Point): number =>
  a.x * b.y - a.y * b.x;

const length = (p: Point): number =>
  Math.hypot(p.x, p.y);

const normalize = (p: Point): Point | null => {
  const d = length(p);
  return d > EPS ? mul(p, 1 / d) : null;
};

const lineIntersection = (
  a: Point,
  u: Point,
  b: Point,
  v: Point
): Point | null => {
  const d = cross(u, v);
  if (Math.abs(d) < EPS) return null;

  return add(
    a,
    mul(u, cross(sub(b, a), v) / d)
  );
};

const signedSpan = (
  start: number,
  end: number
): number =>
  Math.atan2(
    Math.sin(end - start),
    Math.cos(end - start)
  );

export function computeCorner(
  wallA: Wall,
  wallB: Wall,
  radiusWorld: number,
  toScreen: (p: Point) => Point,
  _zoom: number,
  _scale: number
): CornerGeom | null {
  if (
    !Number.isFinite(radiusWorld) ||
    radiusWorld <= 0 ||
    !Number.isFinite(wallA.thickness) ||
    !Number.isFinite(wallB.thickness) ||
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
  const aStart = toScreen(wallA.start);
  const aEnd = toScreen(wallA.end);
  const bStart = toScreen(wallB.start);
  const bEnd = toScreen(wallB.end);

  const farA =
    length(sub(aStart, P)) >= length(sub(aEnd, P))
      ? aStart
      : aEnd;

  const farB =
    length(sub(bStart, P)) >= length(sub(bEnd, P))
      ? bStart
      : bEnd;

  const uA = normalize(sub(farA, P));
  const uB = normalize(sub(farB, P));

  if (!uA || !uB) return null;

  const cosine = Math.max(
    -1,
    Math.min(1, dot(uA, uB))
  );

  const angle = Math.acos(cosine);

  if (
    angle < 0.03 ||
    angle > Math.PI - 0.03
  ) {
    return null;
  }

  const bisector = normalize(add(uA, uB));
  if (!bisector) return null;

  const rectA = wallRectangle(wallA);
  const rectB = wallRectangle(wallB);

  const facesA = rectA.faces.map(face => ({
    start: toScreen(face.start),
    end: toScreen(face.end),
  }));

  const facesB = rectB.faces.map(face => ({
    start: toScreen(face.start),
    end: toScreen(face.end),
  }));

  // اتجاه الوجه الخارجي لكل جدار بالنسبة للزاوية.
  const outwardA = normalize(
    sub(mul(uA, cosine), uB)
  );

  const outwardB = normalize(
    sub(mul(uB, cosine), uA)
  );

  if (!outwardA || !outwardB) return null;

  const selectOuterFace = (
    faces: typeof facesA,
    outward: Point
  ) => {
    const score = (face: typeof facesA[number]) =>
      dot(sub(face.start, P), outward);

    return score(faces[0]) >= score(faces[1])
      ? faces[0]
      : faces[1];
  };

  const faceA = selectOuterFace(facesA, outwardA);
  const faceB = selectOuterFace(facesB, outwardB);

  const O = lineIntersection(
    faceA.start,
    uA,
    faceB.start,
    uB
  );

  if (!O) return null;

  const worldLengthA = length(
    sub(wallA.end, wallA.start)
  );

  const worldLengthB = length(
    sub(wallB.end, wallB.start)
  );

  if (
    worldLengthA < EPS ||
    worldLengthB < EPS
  ) return null;

  const factorA =
    length(sub(aEnd, aStart)) / worldLengthA;

  const factorB =
    length(sub(bEnd, bStart)) / worldLengthB;

  const factor = (factorA + factorB) / 2;

  if (
    !Number.isFinite(factor) ||
    factor <= 0
  ) return null;

  const thicknessA = wallA.thickness * factor;
  const thicknessB = wallB.thickness * factor;
  const thickness = Math.max(
    thicknessA,
    thicknessB
  );

  const halfAngle = angle / 2;
  const sinHalf = Math.sin(halfAngle);
  const tanHalf = Math.tan(halfAngle);

  if (
    sinHalf <= EPS ||
    tanHalf <= EPS
  ) return null;

  const availableA = length(sub(farA, P));
  const availableB = length(sub(farB, P));

  const available = Math.min(
    availableA,
    availableB
  );

  // الحد الأقصى حسب طول الجدار وزاوية التقائه.
  const maxRadius =
    available * tanHalf * 0.95;

  // نصف القطر المطلوب يشمل سماكة الشريط.
  const requestedRadius =
    radiusWorld * factor + thickness;

  const R = Math.min(
    requestedRadius,
    maxRadius
  );

  if (
    !Number.isFinite(R) ||
    R <= thickness + EPS
  ) {
    return null;
  }

  const tangentDistance = R / tanHalf;

  const center = add(
    O,
    mul(bisector, R / sinHalf)
  );

  const tangentA = add(
    O,
    mul(uA, tangentDistance)
  );

  const tangentB = add(
    O,
    mul(uB, tangentDistance)
  );

  const startAngle = Math.atan2(
    tangentA.y - center.y,
    tangentA.x - center.x
  );

  const endAngle = Math.atan2(
    tangentB.y - center.y,
    tangentB.x - center.x
  );

  const span = signedSpan(
    startAngle,
    endAngle
  );

  const innerRadius = Math.max(
    0,
    R - thickness
  );

  const values = [
    O.x,
    O.y,
    center.x,
    center.y,
    tangentA.x,
    tangentA.y,
    tangentB.x,
    tangentB.y,
    R,
    innerRadius,
    startAngle,
    endAngle,
  ];

  if (!values.every(Number.isFinite)) {
    return null;
  }

  return {
    O,
    center,
    tangentA,
    tangentB,
    radius: R,
    innerRadius,
    startAngle,
    endAngle,
    ccw: span < 0,
  };
}

export function hitTestRoundedCorner(
  pt: Point,
  wallA: Wall,
  wallB: Wall,
  radiusWorld: number,
  zoom: number,
  scale: number,
  toScreen: (p: Point) => Point
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

  const r = length(
    sub(S, g.center)
  );

  const tolerance = 12;

  if (
    r < g.innerRadius - tolerance ||
    r > g.radius + tolerance
  ) {
    return false;
  }

  const angle = Math.atan2(
    S.y - g.center.y,
    S.x - g.center.x
  );

  const span = signedSpan(
    g.startAngle,
    g.endAngle
  );

  const delta = signedSpan(
    g.startAngle,
    angle
  );

  return span < 0
    ? delta <= 0 && delta >= span
    : delta >= 0 && delta <= span;
}
