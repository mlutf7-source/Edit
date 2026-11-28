import React from 'react';
import * as THREE from 'three';
import type { WallBox } from '../../core/wallSegments3D';
import { INTERIOR_PAINT_COLOR } from './helpers/wallHelpers';
import { useSectionPlanes } from './SectionContext';

interface Props {
  box: WallBox;
  matProps: any;
  texture: THREE.Texture | null;
  repeatScale: number;
  isFence?: boolean;
  /** ✅ هل الدور مقطوع؟ */
  isCut?: boolean;
  /** ✅ لون مقطع الجدران عند القص */
  cutColor?: string;
}

export const WallMesh: React.FC<Props> = ({
  box,
  matProps,
  texture,
  repeatScale,
  isFence = false,
  isCut = false,
  cutColor = '#B0B0B0',
}) => {
  const clippingPlanes = useSectionPlanes();

  const owned = React.useMemo(() => {
    const resources: (THREE.Material | THREE.Texture)[] = [];
    const own = <T extends THREE.Material | THREE.Texture,>(r:T):T => { resources.push(r); return r; };
    const build = () => {
    const [w, h] = box.size;

    // ✅ مواد الجدار الخارجي
    const exteriorMaterial = (() => {
      if (!texture) {
        return own(new THREE.MeshStandardMaterial({ ...matProps, clippingPlanes }));
      }
      const tex = own(texture.clone());
      tex.needsUpdate = true;
      tex.repeat.set(w * repeatScale, h * repeatScale);
      return own(new THREE.MeshStandardMaterial({ ...matProps, map: tex, clippingPlanes }));
    })();

    // ✅ الطلاء الداخلي
    const interiorMaterial = isFence
      ? exteriorMaterial
      : own(new THREE.MeshStandardMaterial({
          color: INTERIOR_PAINT_COLOR,
          roughness: 0.9,
          metalness: 0.0,
          clippingPlanes,
        }));

    // ✅ مادة المقطع (رمادي) عند القص
    const cutMaterial = own(new THREE.MeshStandardMaterial({
      color: cutColor,
      roughness: 0.95,
      metalness: 0.0,
      clippingPlanes,
    }));

    // ✅ المادة المحايدة
    const neutralMaterial = (box.isExterior || isFence) ? exteriorMaterial : interiorMaterial;

    // ✅ عندما يكون الدور مقطوعاً: الوجه العلوي (material-2) يصبح رمادياً
    const topFaceMaterial = isCut ? cutMaterial : neutralMaterial;

    // ✅ للسور
    if (isFence) {
      return [exteriorMaterial, exteriorMaterial, exteriorMaterial, exteriorMaterial, exteriorMaterial, exteriorMaterial];
    }

    // ✅ جدار داخلي
    if (!box.isExterior) {
      return [interiorMaterial, interiorMaterial, topFaceMaterial, neutralMaterial, interiorMaterial, interiorMaterial];
    }

    // ✅ جدار خارجي
    if (box.normalSign > 0) {
      return [neutralMaterial, neutralMaterial, topFaceMaterial, neutralMaterial, interiorMaterial, exteriorMaterial];
    } else {
      return [neutralMaterial, neutralMaterial, topFaceMaterial, neutralMaterial, exteriorMaterial, interiorMaterial];
    }
    };
    return {materials:build(),resources};
  }, [box, matProps, texture, repeatScale, isFence, isCut, cutColor, clippingPlanes]);

  const {materials}=owned;
  React.useEffect(()=>()=>{owned.resources.forEach(r=>r.dispose());},[owned]);

  return (
    <mesh position={box.position} rotation={[0, box.rotationY, 0]} castShadow receiveShadow>
      <boxGeometry args={box.size} />
      {materials.map((mat, i) => (
        <primitive key={i} object={mat} attach={`material-${i}`} />
      ))}
    </mesh>
  );
};
