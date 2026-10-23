import { useState, useCallback } from 'react';
import type { Column, Window, Door, NorthArrow, Point, Opening } from '../core/types';
import { DEFAULT_COLUMN, DEFAULT_WINDOW, DEFAULT_DOOR, DEFAULT_NORTH_ARROW } from '../core/types';
import { v4 as uuidv4 } from 'uuid';

export function useElementManager() {
  const [columns, setColumns] = useState<Column[]>([]);
    const [windows, setWindows] = useState<Window[]>([]);
      const [doors, setDoors] = useState<Door[]>([]);
        const [northArrows, setNorthArrows] = useState<NorthArrow[]>([]);
          const [openings, setOpenings] = useState<Opening[]>([]); // ✅ حالة الفتحات

            // ============ دوال الأعمدة ============
              const addColumn = useCallback((c: Omit<Column, 'id' | 'rotation'>) =>
                  setColumns(prev => [...prev, {
                        ...c,
                              id: uuidv4(),
                                    rotation: DEFAULT_COLUMN.rotation,
                                          columnShape: c.columnShape ?? 'rect',
                                              }]), []);

                                                const updateColumn = useCallback((id: string, patch: Partial<Column>) =>
                                                    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c)), []);

                                                      const removeColumn = useCallback((id: string) =>
                                                          setColumns(prev => prev.filter(c => c.id !== id)), []);

                                                            // ============ دوال النوافذ ============
                                                              const addWindow = useCallback((w: Omit<Window, 'id' | 'thickness' | 'center'> & { center?: Point }) =>
                                                                  setWindows(prev => [...prev, {
                                                                        ...w,
                                                                              id: uuidv4(),
                                                                                    thickness: DEFAULT_WINDOW.thickness,
                                                                                          center: w.center ?? { x: 0, y: 0 },
                                                                                              }]), []);

                                                                                                const updateWindow = useCallback((id: string, patch: Partial<Window>) =>
                                                                                                    setWindows(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w)), []);

                                                                                                      const removeWindow = useCallback((id: string) =>
                                                                                                          setWindows(prev => prev.filter(w => w.id !== id)), []);

                                                                                                            // ============ دوال الأبواب ============
                                                                                                              const addDoor = useCallback((d: Omit<Door, 'id' | 'thickness' | 'hinge' | 'swing' | 'side' | 'center'> & { center?: Point }) =>
                                                                                                                  setDoors(prev => [...prev, {
                                                                                                                        ...d,
                                                                                                                              id: uuidv4(),
                                                                                                                                    thickness: DEFAULT_DOOR.thickness,
                                                                                                                                          hinge: DEFAULT_DOOR.hinge,
                                                                                                                                                swing: DEFAULT_DOOR.swing,
                                                                                                                                                      side: DEFAULT_DOOR.side,
                                                                                                                                                            center: d.center ?? { x: 0, y: 0 },
                                                                                                                                                                }]), []);

                                                                                                                                                                  const updateDoor = useCallback((id: string, patch: Partial<Door>) =>
                                                                                                                                                                      setDoors(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d)), []);

                                                                                                                                                                        const removeDoor = useCallback((id: string) =>
                                                                                                                                                                            setDoors(prev => prev.filter(d => d.id !== id)), []);

                                                                                                                                                                              // ============ دوال الفتحات ============
                                                                                                                                                                                const addOpening = useCallback((opening: Opening) => {
                                                                                                                                                                                    setOpenings(prev => [...prev, opening]);
                                                                                                                                                                                      }, []);

                                                                                                                                                                                        const updateOpening = useCallback((id: string, patch: Partial<Opening>) => {
                                                                                                                                                                                            setOpenings(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
                                                                                                                                                                                              }, []);

                                                                                                                                                                                                const removeOpening = useCallback((id: string) => {
                                                                                                                                                                                                    setOpenings(prev => prev.filter(o => o.id !== id));
                                                                                                                                                                                                      }, []);

                                                                                                                                                                                                        // ============ دوال سهم الشمال ============
                                                                                                                                                                                                          const addNorthArrow = useCallback((position: Point) => {
                                                                                                                                                                                                              setNorthArrows(prev => [...prev, {
                                                                                                                                                                                                                    id: uuidv4(),
                                                                                                                                                                                                                          position,
                                                                                                                                                                                                                                rotation: DEFAULT_NORTH_ARROW.rotation,
                                                                                                                                                                                                                                      size: DEFAULT_NORTH_ARROW.size,
                                                                                                                                                                                                                                          }]);
                                                                                                                                                                                                                                            }, []);

                                                                                                                                                                                                                                              const updateNorthArrow = useCallback((id: string, patch: Partial<NorthArrow>) =>
                                                                                                                                                                                                                                                  setNorthArrows(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n)), []);

                                                                                                                                                                                                                                                    const removeNorthArrow = useCallback((id: string) =>
                                                                                                                                                                                                                                                        setNorthArrows(prev => prev.filter(n => n.id !== id)), []);

                                                                                                                                                                                                                                                          // ============ التحديث الشامل (للتراجع/الإعادة) ============
                                                                                                                                                                                                                                                            const setAllElements = useCallback((
                                                                                                                                                                                                                                                                newCols: Column[],
                                                                                                                                                                                                                                                                    newWins: Window[],
                                                                                                                                                                                                                                                                        newDoors: Door[],
                                                                                                                                                                                                                                                                            newArrows: NorthArrow[],
                                                                                                                                                                                                                                                                                newOpenings: Opening[] = []
                                                                                                                                                                                                                                                                                  ) => {
                                                                                                                                                                                                                                                                                      setColumns(newCols);
                                                                                                                                                                                                                                                                                          setWindows(newWins);
                                                                                                                                                                                                                                                                                              setDoors(newDoors);
                                                                                                                                                                                                                                                                                                  setNorthArrows(newArrows);
                                                                                                                                                                                                                                                                                                      setOpenings(newOpenings);
                                                                                                                                                                                                                                                                                                        }, []);

                                                                                                                                                                                                                                                                                                          return {
                                                                                                                                                                                                                                                                                                              columns,
                                                                                                                                                                                                                                                                                                                  windows,
                                                                                                                                                                                                                                                                                                                      doors,
                                                                                                                                                                                                                                                                                                                          northArrows,
                                                                                                                                                                                                                                                                                                                              openings,
                                                                                                                                                                                                                                                                                                                                  setAllElements,
                                                                                                                                                                                                                                                                                                                                      addColumn, updateColumn, removeColumn,
                                                                                                                                                                                                                                                                                                                                          addWindow, updateWindow, removeWindow,
                                                                                                                                                                                                                                                                                                                                              addDoor, updateDoor, removeDoor,
                                                                                                                                                                                                                                                                                                                                                  addOpening, updateOpening, removeOpening,
                                                                                                                                                                                                                                                                                                                                                      addNorthArrow, updateNorthArrow, removeNorthArrow,
                                                                                                                                                                                                                                                                                                                                                        };
                                                                                                                                                                                                                                                                                                                                                        }