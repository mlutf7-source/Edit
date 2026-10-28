import type { Point } from './types';

export interface Dimension {
  id: string;
  start: Point;
  end: Point;
  offset: number;
  /** 1 = خارجي، -1 = داخلي */
  faceSide?: 1 | -1;
  floor?: number;

  // ═══════════════════════════════════════════════════
  // ✅ نوع البُعد
  // ═══════════════════════════════════════════════════
  /** default: 'linear' */
  kind?: 'linear' | 'arc' | 'radius';

  // ═══════════════════════════════════════════════════
  // ✅ حقول الجدار المنحني (لـ kind = 'arc' | 'radius')
  // تُلتقط لحظة الإنشاء من getCurvedWallGeometry()
  // ═══════════════════════════════════════════════════
  /** معرّف الجدار المنحني */
  wallId?: string;
  /** مركز القوس */
  curveCenter?: Point;
  /** نصف قطر الجدار (الخط المركزي، ليس الحافة) */
  curveRadius?: number;
  /** زاوية بداية القوس (radians) */
  curveStartAngle?: number;
  /** زاوية نهاية القوس (radians) */
  curveEndAngle?: number;
  /** اتجاه القوس */
  curveAnticlockwise?: boolean;
  /** نصف قطر الحافة الخارجية (للرسم الدقيق) */
  curveOuterRadius?: number;
}
