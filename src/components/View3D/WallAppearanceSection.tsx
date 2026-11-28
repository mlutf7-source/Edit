import React from 'react';
import type { Wall } from '../../core/types';
import { resolveSettingsForFloor, type View3DSettings, type WallAppearance } from './view3dTypes';
import { WallsSection } from './View3DSettingsSections';

export function WallAppearanceSection({walls, settings, onChange, floor}: {walls: Wall[]; settings: View3DSettings; onChange: (s: View3DSettings)=>void; floor: 'global' | number}) {
  const [id,setId] = React.useState('');
  const eligible = walls.filter(w=>w.type==='exterior' && (!w.kind || w.kind==='wall') && (floor==='global' || (w.floor??0)===floor));
  const wall = eligible.find(w=>w.id===id);
  const overrides = settings.wallOverrides ?? {};
  const update = (patch: Partial<View3DSettings>) => {
    if(!wall) return;
    const next: WallAppearance = {...overrides[wall.id]};
    if(patch.wallColor !== undefined) next.wallColor=patch.wallColor;
    if(patch.wallMaterial !== undefined) next.wallMaterial=patch.wallMaterial;
    if(patch.wallPatternScale !== undefined) next.wallPatternScale=patch.wallPatternScale;
    if(patch.wallRoughness !== undefined) next.wallRoughness=patch.wallRoughness;
    onChange({...settings,wallOverrides:{...overrides,[wall.id]:next}});
  };
  const reset=()=>{if(!wall)return; const next={...overrides}; delete next[wall.id]; onChange({...settings,wallOverrides:next});};
  const field:React.CSSProperties={width:'100%',background:'#102338',color:'#e7f4fb',border:'1px solid #31566c',borderRadius:8,padding:8,boxSizing:'border-box'};
  return <details style={{...field,margin:'6px 0'}}><summary style={{cursor:'pointer',color:'#8ee8f5'}}>تخصيص جدار خارجي</summary>
    <label style={{display:'block',margin:'8px 0'}}>اختر الجدار</label>
    <select aria-label="اختر الجدار الخارجي" style={field} value={wall?.id??''} onChange={e=>setId(e.target.value)}>
      <option value="">اختر من الجدران ({eligible.length})</option>
      {eligible.map((w,i)=><option key={w.id} value={w.id}>{`دور ${w.floor??0} — جدار ${i+1} — (${w.start.x.toFixed(2)}, ${w.start.y.toFixed(2)}) ← (${w.end.x.toFixed(2)}, ${w.end.y.toFixed(2)})${overrides[w.id]?' • مخصص':''}`}</option>)}
    </select>
    {wall && <><p style={{fontSize:12}}>تطبق الخصائص على الوجه الخارجي فقط. لا تتغير أبعاد الجدار.</p><WallsSection settings={{...resolveSettingsForFloor(settings,wall.floor??0),...overrides[wall.id]}} update={update}/><button type="button" style={field} onClick={reset}>إلغاء تخصيص الجدار والعودة لإعدادات الدور</button></>}
  </details>;
}
