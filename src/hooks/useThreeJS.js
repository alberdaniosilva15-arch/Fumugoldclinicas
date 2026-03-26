// FumuGold — useThreeJS hook (fundo 3D holográfico)
import { useEffect } from 'react';
import * as THREE from 'three';

export default function useThreeJS(threeRef, cleanupRef) {
  useEffect(() => {
    const canvas = threeRef?.current;
    if (!canvas || !THREE) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    // Grid holográfico
    const geo = new THREE.BufferGeometry();
    const count = 2000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xD4AF37, size: 0.04, transparent: true, opacity: 0.35 });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      points.rotation.y += 0.0005;
      points.rotation.x += 0.0002;
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', resize);

    // Expor resize no ref
    if (threeRef) threeRef.current = { ...threeRef.current, resize };

    if (cleanupRef) {
      cleanupRef.current = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        renderer.dispose();
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    };
  }, [threeRef, cleanupRef]);
}