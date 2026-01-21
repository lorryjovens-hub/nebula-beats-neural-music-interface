
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import { ShapeType, VisualizerConfig, GestureType } from '../types';
import { generateShapePositions, generateImagePositionsAndColors, PARTICLE_COUNT } from '../utils/shapes';
import { audioService } from '../services/audioService';

interface VisualizerProps {
  config: VisualizerConfig;
  setConfig: React.Dispatch<React.SetStateAction<VisualizerConfig>>;
  onGesture?: (gesture: GestureType) => void;
  gestureState?: { type: GestureType; x: number; y: number };
  aiPositions?: Float32Array | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ config, setConfig, gestureState, aiPositions }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const targetColorsRef = useRef<Float32Array | null>(null);
  const currentPositionsRef = useRef<Float32Array | null>(null);
  const colorsRef = useRef<Float32Array | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  const rotationAngles = useRef({ x: 0, y: 0, z: 0 });
  const userRotation = useRef({ x: 0, y: 0 });
  const explosionEnergy = useRef(0);
  const pullStrength = useRef(0);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const zoomLevel = useRef(800);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle AI generated positions
  useEffect(() => {
    if (aiPositions) {
      targetPositionsRef.current = aiPositions;
      targetColorsRef.current = null;
      setConfig(prev => ({ ...prev, activeShape: ShapeType.AI_PROMPT }));
    }
  }, [aiPositions]);

  // Handle gesture: switch shape
  useEffect(() => {
    if (gestureState?.type === 'INDEX') {
      const shapes = Object.values(ShapeType).filter(s => 
        s !== ShapeType.CUSTOM_IMAGE && s !== ShapeType.AI_PROMPT
      );
      const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
      targetPositionsRef.current = generateShapePositions(randomShape as ShapeType);
      targetColorsRef.current = null;
      setConfig(prev => ({ ...prev, activeShape: randomShape }));
    }
  }, [gestureState?.type]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
    camera.position.z = zoomLevel.current;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    geometryRef.current = geometry;
    
    const initialPositions = generateShapePositions(config.activeShape as ShapeType);
    currentPositionsRef.current = new Float32Array(initialPositions);
    targetPositionsRef.current = initialPositions;
    
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    colorsRef.current = colors;

    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositionsRef.current, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: config.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    pointsRef.current = points;
    scene.add(points);

    // Event listeners
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      userRotation.current.y += dx * 0.005;
      userRotation.current.x += dy * 0.005;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging.current = false; };
    const onWheel = (e: WheelEvent) => {
      zoomLevel.current = Math.max(200, Math.min(5000, zoomLevel.current + e.deltaY * 0.5));
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging.current = true;
        lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastMousePos.current.x;
      const dy = e.touches[0].clientY - lastMousePos.current.y;
      userRotation.current.y += dx * 0.005;
      userRotation.current.x += dy * 0.005;
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => { isDragging.current = false; };

    mountRef.current.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    mountRef.current.addEventListener('wheel', onWheel, { passive: true });
    mountRef.current.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    const gui = new dat.GUI({ autoPlace: true, width: 300 });
    const folder = gui.addFolder('视觉与动力学引擎');
    folder.add(config, 'overallScale', 0.1, 3.0).name('整体缩放');
    folder.add(config, 'particleSize', 0.1, 5.0).name('粒子大小').onChange(v => { material.size = v; });
    folder.add(config, 'collisionStrength', 0, 50.0).name('碰撞排斥力');
    folder.add(config, 'randomScatter', 0, 100.0).name('随机扩散偏移');
    folder.add(config, 'morphSpeed', 0.01, 0.2).name('变形速度');
    folder.add(config, 'autoRotate').name('自动旋转');
    folder.open();

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const time = clock.getElapsedTime();
      const stats = audioService.getStats(config.trebleSensitivity);

      if (stats.isTransient || (config.gestureEnabled && gestureState?.type === 'PALM')) {
        explosionEnergy.current = stats.isTransient ? 1.2 : 0.8;
      }
      explosionEnergy.current *= 0.92;

      if (config.gestureEnabled && gestureState?.type === 'FIST') {
        pullStrength.current = Math.min(1.0, pullStrength.current + 0.15);
      } else {
        pullStrength.current *= 0.85;
      }

      if (pointsRef.current && geometryRef.current) {
        const positions = geometryRef.current.attributes.position.array as Float32Array;
        const colors = geometryRef.current.attributes.color.array as Float32Array;
        const target = targetPositionsRef.current!;
        const targetColors = targetColorsRef.current;

        camera.position.z += (zoomLevel.current - camera.position.z) * 0.1;

        const baseS = config.overallScale;
        const pulseY = 1 + stats.bass * 0.5;
        const pulseXZ = 1 + stats.bass * 0.25;
        pointsRef.current.scale.set(baseS * pulseXZ, baseS * pulseY, baseS * pulseXZ);

        if (config.autoRotate) {
          rotationAngles.current.y += config.rotationSpeed + stats.mid * 0.12;
          rotationAngles.current.x += Math.sin(time * 0.15) * 0.002 + stats.bass * 0.05;
          
          if (config.gestureEnabled && gestureState?.type === 'SWIPE') {
            rotationAngles.current.y += gestureState.x * 0.15;
            rotationAngles.current.x += gestureState.y * 0.15;
          }
        }

        pointsRef.current.rotation.x = rotationAngles.current.x + userRotation.current.x;
        pointsRef.current.rotation.y = rotationAngles.current.y + userRotation.current.y;
        
        if (!isDragging.current) {
          userRotation.current.x *= 0.95;
          userRotation.current.y *= 0.95;
        }

        const currentExplosion = explosionEnergy.current * config.explosionIntensity;
        material.size = config.particleSize * (1 + explosionEnergy.current * 4.0);

        // Particle update loop
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          const px = positions[i3], py = positions[i3+1], pz = positions[i3+2];
          const distSq = px*px + py*py + pz*pz;
          const dist = Math.sqrt(distSq) || 1;

          const mSpeed = config.morphSpeed * (1 + pullStrength.current * 3);
          for (let j = 0; j < 3; j++) {
            const idx = i3 + j;
            if (pullStrength.current > 0.02) {
              positions[idx] += (0 - positions[idx]) * pullStrength.current * 0.12;
            }
            positions[idx] += (target[idx] - positions[idx]) * mSpeed;
          }

          if (config.collisionStrength > 0) {
            const range = 60;
            if (dist < range) {
              const f = (range - dist) / range * config.collisionStrength;
              positions[i3] += (px / dist) * f;
              positions[i3+1] += (py / dist) * f;
              positions[i3+2] += (pz / dist) * f;
            }
          }

          // Color dynamics
          if (targetColors) {
            colors[i3] += (targetColors[i3] - colors[i3]) * 0.05;
            colors[i3+1] += (targetColors[i3+1] - colors[i3+1]) * 0.05;
            colors[i3+2] += (targetColors[i3+2] - colors[i3+2]) * 0.05;
          } else {
            const hue = (0.6 - (stats.bass * 0.6 * config.colorFactor) + (dist * 0.00018) + (time * 0.04)) % 1.0;
            const sat = 0.7 + stats.treble * 0.3;
            const b = 0.2 + (stats.bass * 0.5) + (explosionEnergy.current * 0.6);
            const c = new THREE.Color().setHSL(hue, sat, Math.min(0.95, b));
            colors[i3] += (c.r - colors[i3]) * 0.1; 
            colors[i3+1] += (c.g - colors[i3+1]) * 0.1; 
            colors[i3+2] += (c.b - colors[i3+2]) * 0.1;
          }
        }

        geometryRef.current.attributes.position.needsUpdate = true;
        geometryRef.current.attributes.color.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      mountRef.current?.removeEventListener('wheel', onWheel);
      mountRef.current?.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(animationFrameId);
      gui.destroy();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [config]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const { positions, colors } = generateImagePositionsAndColors(img);
          targetPositionsRef.current = positions;
          targetColorsRef.current = colors;
          setConfig(prev => ({ ...prev, activeShape: ShapeType.CUSTOM_IMAGE }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div ref={mountRef} className="absolute inset-0 z-0 touch-none cursor-grab active:cursor-grabbing" />
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        onChange={handleImageUpload} 
        className="hidden" 
      />
    </>
  );
};

export default Visualizer;
