import React from 'react';
import * as THREE from 'three';
import type { CornerGeom } from '../Canvas/canvasRenderer/computeCorner';
import { useSectionPlanes } from './SectionContext';
import { INTERIOR_PAINT_COLOR } from './helpers/wallHelpers';
export function RoundedCornerMesh({g,height,exterior,matProps,texture,repeatScale,isCut,cutColor}: {g:CornerGeom;height:number;exterior:boolean;matProps:THREE.MeshStandardMaterialParameters;texture:THREE.Texture|null;repeatScale:number;isCut:boolean;cutColor:string}) {
  const planes=useSectionPlanes();
  const geometry=React.useMemo(()=>{
    const shape=new THREE.Shape();
    shape.absarc(g.center.x,g.center.y,g.radius,g.startAngle,g.endAngle,g.ccw);
    shape.lineTo(g.center.x+Math.cos(g.endAngle)*g.innerRadius,g.center.y+Math.sin(g.endAngle)*g.innerRadius);
    shape.absarc(g.center.x,g.center.y,g.innerRadius,g.endAngle,g.startAngle,!g.ccw); shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:32});
    const pos=geo.attributes.position, uv=geo.attributes.uv, normal=geo.attributes.normal;
    for(let i=0;i<pos.count;i++) {
      const x=pos.getX(i)-g.center.x,y=pos.getY(i)-g.center.y;
      const a=Math.atan2(y,x), tau=2*Math.PI;
      const delta=g.ccw?((g.startAngle-a)%tau+tau)%tau:((a-g.startAngle)%tau+tau)%tau;
      if(Math.abs(normal.getZ(i))<0.5) uv.setXY(i,(delta>tau-1e-5?0:delta)*Math.hypot(x,y)*repeatScale,(height-pos.getZ(i))*repeatScale);
      else uv.setXY(i,pos.getX(i)*repeatScale,pos.getY(i)*repeatScale);
    }
    uv.needsUpdate=true;
    // ExtrudeGeometry is non-indexed: separate inner curved face from exterior.
    const groups=geo.groups.slice(); geo.clearGroups();
    for(const group of groups) {
      if(group.materialIndex===0){geo.addGroup(group.start,group.count,0);continue;}
      for(let i=group.start;i<group.start+group.count;i+=3){
        const x=pos.getX(i)-g.center.x,y=pos.getY(i)-g.center.y;
        const inner=normal.getX(i)*x+normal.getY(i)*y < -0.5*Math.hypot(x,y);
        geo.addGroup(i,3,inner?2:1);
      }
    }
    // Merge adjacent triangles with the same material to avoid extra draw calls.
    const merged:typeof geo.groups=[];
    for(const group of geo.groups){const last=merged[merged.length-1];if(last&&last.materialIndex===group.materialIndex&&last.start+last.count===group.start)last.count+=group.count;else merged.push({...group});}
    geo.clearGroups();for(const group of merged)geo.addGroup(group.start,group.count,group.materialIndex);
    return geo;
  },[g,height,repeatScale]);
  React.useEffect(()=>()=>geometry.dispose(),[geometry]);
  const props=exterior?matProps:{color:INTERIOR_PAINT_COLOR,roughness:0.9};
  return <mesh geometry={geometry} rotation={[Math.PI/2,0,0]} position={[0,height,0]} castShadow receiveShadow>
    <meshStandardMaterial attach="material-0" {...props} color={isCut?cutColor:props.color} map={!isCut&&exterior?texture:null} clippingPlanes={planes}/>
    <meshStandardMaterial attach="material-1" {...props} map={exterior?texture:null} clippingPlanes={planes}/>
    <meshStandardMaterial attach="material-2" color={INTERIOR_PAINT_COLOR} roughness={0.9} clippingPlanes={planes}/>
  </mesh>;
}
