import { useState, useCallback, useRef } from 'react';
import type { Point, ClipFrame } from '../core/types';
import { distance, getAngle, snapAngle } from '../core/geometry';

export function useClipFrameManager(
  clipFrame: ClipFrame | null,
    setClipFrame: (frame: ClipFrame | null) => void
    ) {
      const [selectedClipFrameId, setSelectedClipFrameId] = useState<string | null>(null);
        const dragModeRef = useRef<'move' | 'rotate' | 'scale' | null>(null);
          const dragStartRef = useRef<Point | null>(null);

            
const hitTest = useCallback((pt: Point, frame: ClipFrame): boolean => {
  const angle = frame.rotation || 0;

  const dx = pt.x - frame.x;
  const dy = pt.y - frame.y;

  // تحويل نقطة النقر إلى إحداثيات الكليشة المحلية.
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const halfWidth = frame.width / 2;
  const halfHeight = frame.height / 2;

  // سماحية النقر على الحدود: 15 سم.
  const tolerance = 0.15;

  const nearVerticalEdge =
    Math.abs(Math.abs(localX) - halfWidth) <= tolerance &&
    Math.abs(localY) <= halfHeight + tolerance;

  const nearHorizontalEdge =
    Math.abs(Math.abs(localY) - halfHeight) <= tolerance &&
    Math.abs(localX) <= halfWidth + tolerance;

  return nearVerticalEdge || nearHorizontalEdge;
}, []);


                                        const detectMode = useCallback((pt: Point, frame: ClipFrame): 'move' | 'rotate' | 'scale' => {
                                            const size = Math.max(frame.width, frame.height);
                                                const rotateHandle = { x: frame.x + Math.sin(frame.rotation) * (size / 2 + 0.25), y: frame.y - Math.cos(frame.rotation) * (size / 2 + 0.25) };
                                                    if (distance(pt, rotateHandle) <= 0.3) return 'rotate';
                                                        const scaleHandle = { x: frame.x + Math.cos(frame.rotation) * (frame.width * 0.5), y: frame.y + Math.sin(frame.rotation) * (frame.width * 0.5) };
                                                            if (distance(pt, scaleHandle) <= 0.3) return 'scale';
                                                                return 'move';
                                                                  }, []);

                                                                    const select = useCallback((id: string, pt: Point, mode: 'move' | 'rotate' | 'scale') => {
                                                                        setSelectedClipFrameId(id);
                                                                            dragStartRef.current = pt;
                                                                                dragModeRef.current = mode;
                                                                                  }, []);

                                                                                    const deselect = useCallback(() => {
                                                                                        setSelectedClipFrameId(null);
                                                                                            dragModeRef.current = null;
                                                                                                dragStartRef.current = null;
                                                                                                  }, []);

                                                                                                    const moveDrag = useCallback((pt: Point) => {
                                                                                                        if (!clipFrame || !dragModeRef.current || !dragStartRef.current) return;
                                                                                                            const dx = pt.x - dragStartRef.current.x;
                                                                                                                const dy = pt.y - dragStartRef.current.y;
                                                                                                                    dragStartRef.current = pt;
                                                                                                                        if (dragModeRef.current === 'move') {
                                                                                                                              setClipFrame({ ...clipFrame, x: clipFrame.x + dx, y: clipFrame.y + dy });
                                                                                                                                  } else if (dragModeRef.current === 'rotate') {
                                                                                                                                        let angle = getAngle({ x: clipFrame.x, y: clipFrame.y }, pt) + Math.PI / 2;
                                                                                                                                              angle = snapAngle(angle, 0.15);
                                                                                                                                                    setClipFrame({ ...clipFrame, rotation: angle });
                                                                                                                                                        } else if (dragModeRef.current === 'scale') {
                                                                                                                                                              const dist = distance({ x: clipFrame.x, y: clipFrame.y }, pt);
                                                                                                                                                                    setClipFrame({ ...clipFrame, width: Math.max(2, dist * 2), height: Math.max(2, dist * 2) * 1.414 });
                                                                                                                                                                        }
                                                                                                                                                                          }, [clipFrame, setClipFrame]);

                                                                                                                                                                            const endDrag = useCallback(() => {
                                                                                                                                                                                dragModeRef.current = null;
                                                                                                                                                                                    dragStartRef.current = null;
                                                                                                                                                                                      }, []);

                                                                                                                                                                                        return { selectedClipFrameId, hitTest, detectMode, select, deselect, moveDrag, endDrag };
                                                                                                                                                                                        }
