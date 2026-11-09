import type { Axis, Point } from '../../../../core/types';
import type { ColorTheme } from '../../../../core/colorTheme';

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  axes: Axis[],
  selectedAxisId: string | null,
  axisBubbleSize: number,
  toScreen: (p: Point) => Point,
  view: { zoom: number },
  theme: ColorTheme,
): void {
  const zoom = view.zoom;

  axes.forEach(axis => {
    const sel = axis.id === selectedAxisId;
    const color = sel ? theme.selection : theme.axisLine;
    const vertical = axis.type === 'vertical';

    const p1 = toScreen(vertical
      ? { x: axis.position + axis.offset, y: axis.center - axis.length / 2 }
      : { x: axis.center - axis.length / 2, y: axis.position - axis.offset });

    const p2 = toScreen(vertical
      ? { x: axis.position + axis.offset, y: axis.center + axis.length / 2 }
      : { x: axis.center + axis.length / 2, y: axis.position - axis.offset });

    // ✅ سماكة الخط تتكيّف مع zoom
    const baseLineWidth = sel ? 1.5 : 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.5, baseLineWidth * zoom);
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // ✅ حجم الفقاعة يتكيّف مع zoom
    const baseR = Math.max(4, axisBubbleSize * zoom);
    const r = sel ? baseR * 1.15 : baseR;

    // ✅ نص الفقاعة أكبر (1.15× نصف القطر بدلاً من 0.82)
    const fontSize = Math.max(4, r * 1.15);

    [p1, p2].forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = sel ? theme.selection : theme.axisText;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(axis.label, p.x, p.y);
    });
  });
}
