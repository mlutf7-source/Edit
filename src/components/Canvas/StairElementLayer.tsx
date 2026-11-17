import React from 'react';
import type { StairElement, CanvasView } from '../../core/types';
import { worldToScreen, PX_PER_METER } from '../../core/geometry';
import type { ColorTheme } from '../../core/colorTheme';

interface Props {
  stairElements: StairElement[];
  view: CanvasView;
  width: number;
  height: number;
  scale?: number;
  theme: ColorTheme;
}

const ARROW_HEAD_SIZE = 14;

export const StairElementLayer: React.FC<Props> = React.memo(({ stairElements, view, width, height, scale = 1, theme }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);

    const toScreen = (p: { x: number; y: number }) =>
      worldToScreen(p.x, p.y, width, height, view.zoom, view.offsetX, view.offsetY);

    stairElements.forEach(el => {
      const centerScreen = toScreen(el.position);
      ctx.save();
      ctx.translate(centerScreen.x, centerScreen.y);
      ctx.rotate(-el.rotation);

      const w = el.width * PX_PER_METER * view.zoom;
      const l = el.length * PX_PER_METER * view.zoom;
      const halfW = w / 2;
      const halfL = l / 2;

      if (el.type === 'landing') {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = theme.landingFill;
        ctx.fillRect(-halfL, -halfW, l, w);
        ctx.restore();
        ctx.strokeStyle = theme.landingBorder;
        ctx.lineWidth = Math.max(0.5, 1 * view.zoom);
        ctx.strokeRect(-halfL, -halfW, l, w);
      } else {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = theme.stairFill;
        ctx.fillRect(-halfL, -halfW, l, w);
        ctx.restore();
        ctx.strokeStyle = theme.stairBorder;
        ctx.lineWidth = Math.max(0.5, 1 * view.zoom);
        ctx.strokeRect(-halfL, -halfW, l, w);

        const stepCount = el.stepCount ?? Math.max(2, Math.floor(el.length / (el.treadDepth ?? 0.27)));
        const stepPx = l / stepCount;
        ctx.strokeStyle = theme.stairLines;
        ctx.lineWidth = Math.max(0.4, 0.6 * view.zoom);
        for (let i = 1; i < stepCount; i++) {
          const x = -halfL + stepPx * i;
          ctx.beginPath();
          ctx.moveTo(x, -halfW);
          ctx.lineTo(x, halfW);
          ctx.stroke();
        }
      }
      ctx.restore();
    });

if (stairElements.length > 0) {
  type Point = { x: number; y: number };

  const EPS = 0.015;

  const sorted = [...stairElements].sort(
    (a, b) => (a.elevation ?? 0) - (b.elevation ?? 0)
  );

  // حساب أركان العنصر مع مراعاة الدوران
  const corners = (el: StairElement): Point[] => {
    const c = Math.cos(el.rotation);
    const s = Math.sin(el.rotation);
    const halfL = el.length / 2;
    const halfW = el.width / 2;

    return [
      [-halfL, -halfW],
      [halfL, -halfW],
      [halfL, halfW],
      [-halfL, halfW],
    ].map(([x, y]) => ({
      x: el.position.x + x * c - y * s,
      y: el.position.y + x * s + y * c,
    }));
  };

  // اختبار التلامس الهندسي بين عنصرين
  const touches = (a: StairElement, b: StairElement) => {
    const pa = corners(a);
    const pb = corners(b);

    const axes: Point[] = [];

    for (const polygon of [pa, pb]) {
      for (let i = 0; i < 2; i++) {
        const p = polygon[i];
        const q = polygon[i + 1];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy);

        if (len > 0) {
          axes.push({
            x: -dy / len,
            y: dx / len,
          });
        }
      }
    }

    return axes.every(axis => {
      const project = (points: Point[]) =>
        points.map(p => p.x * axis.x + p.y * axis.y);

      const av = project(pa);
      const bv = project(pb);

      return (
        Math.max(...av) + EPS >= Math.min(...bv) &&
        Math.max(...bv) + EPS >= Math.min(...av)
      );
    });
  };

  // تقسيم العناصر إلى مجموعات متصلة حسب ترتيب الصعود
  const groups: StairElement[][] = [];
  let current: StairElement[] = [];

  for (const el of sorted) {
    if (
      current.length > 0 &&
      !touches(current[current.length - 1], el)
    ) {
      groups.push(current);
      current = [];
    }

    current.push(el);
  }

  if (current.length > 0) {
    groups.push(current);
  }

  // بناء وصلة بزاوية قائمة في الاتجاه المحلي للسلم
  const orthogonalConnection = (
    from: Point,
    to: Point,
    rotation: number
  ): Point[] => {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);

    const dx = to.x - from.x;
    const dy = to.y - from.y;

    const along = dx * c + dy * s;
    const across = -dx * s + dy * c;

    const bend: Point = {
      x: from.x + along * c,
      y: from.y + along * s,
    };

    if (Math.abs(along) < EPS || Math.abs(across) < EPS) {
      return [to];
    }

    return [bend, to];
  };

  // رسم كل مجموعة متصلة بصورة مستقلة
  for (const group of groups) {
    const path: Point[] = [];

    group.forEach((el, index) => {
      const center = el.position;

      if (index === 0) {
        const c = Math.cos(el.rotation);
        const s = Math.sin(el.rotation);

        path.push({
          x: center.x - c * el.length / 2,
          y: center.y - s * el.length / 2,
        });

        path.push(center);
        return;
      }

      const previous = group[index - 1];

      path.push(
        ...orthogonalConnection(
          previous.position,
          center,
          previous.rotation
        )
      );
    });

    const last = group[group.length - 1];
    const c = Math.cos(last.rotation);
    const s = Math.sin(last.rotation);

    const end: Point = {
      x: last.position.x + c * last.length / 2,
      y: last.position.y + s * last.length / 2,
    };

    path.push(
      ...orthogonalConnection(
        path[path.length - 1],
        end,
        last.rotation
      )
    );

    const screenPath = path.map(toScreen);

    ctx.save();
    ctx.strokeStyle = theme.stairArrow;
    ctx.fillStyle = theme.stairArrow;
    ctx.lineWidth = Math.max(1, 1.5 * view.zoom);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    ctx.beginPath();
    ctx.moveTo(screenPath[0].x, screenPath[0].y);

    for (let i = 1; i < screenPath.length; i++) {
      ctx.lineTo(screenPath[i].x, screenPath[i].y);
    }

    ctx.stroke();

    // رسم رأس السهم في نهاية كل مجموعة
    if (screenPath.length >= 2) {
      const tip = screenPath[screenPath.length - 1];

      let before = screenPath[screenPath.length - 2];

      for (let i = screenPath.length - 2; i >= 0; i--) {
        const p = screenPath[i];

        if (Math.hypot(tip.x - p.x, tip.y - p.y) > 0.01) {
          before = p;
          break;
        }
      }

      const angle = Math.atan2(
        tip.y - before.y,
        tip.x - before.x
      );

      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);

      ctx.lineTo(
        tip.x - ARROW_HEAD_SIZE * Math.cos(angle - Math.PI / 7),
        tip.y - ARROW_HEAD_SIZE * Math.sin(angle - Math.PI / 7)
      );

      ctx.lineTo(
        tip.x - ARROW_HEAD_SIZE * Math.cos(angle + Math.PI / 7),
        tip.y - ARROW_HEAD_SIZE * Math.sin(angle + Math.PI / 7)
      );

      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
        }
    
    
  }, [stairElements, view, width, height, scale, theme]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
});
