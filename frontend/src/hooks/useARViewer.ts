import { useGLTF } from '@react-three/drei';
import { useState } from 'react';
import * as THREE from 'three';

export const useARViewer = (productModelUrl: string) => {
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  
  // NOTE: This assumes the productModelUrl is valid. 
  // Disable in SSR if needed or handle loading states.
  const { scene } = useGLTF(productModelUrl) as any;

  // AI Logic: Scaling the 3D model based on user body dimensions
  const adjustModelToBody = (bodyStats: any) => {
    if (!scene) return;
    if (bodyStats.type === 'Endomorph') scene.scale.set(1.2, 1, 1.1);
    if (bodyStats.type === 'Ectomorph') scene.scale.set(0.9, 1, 0.9);
    // Add other body types as necessary
  };

  return { scene, rotation, setRotation, adjustModelToBody };
};
