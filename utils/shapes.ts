import * as THREE from 'three';
import { ShapeType } from '../types';

export const PARTICLE_COUNT = 100000;

/**
 * 将图像解析为粒子位置和颜色
 */
export const generateImagePositionsAndColors = (image: HTMLImageElement): { positions: Float32Array, colors: Float32Array } => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { positions, colors };

  const size = 320;
  canvas.width = size;
  canvas.height = size;
  
  const scale = Math.min(size / image.width, size / image.height);
  const x = (size - image.width * scale) / 2;
  const y = (size - image.height * scale) / 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, x, y, image.width * scale, image.height * scale);
  
  const imageData = ctx.getImageData(0, 0, size, size).data;
  const validPoints: {x: number, y: number, r: number, g: number, b: number}[] = [];

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      const brightness = (r + g + b) / 3;

      if (brightness > 5) {
        validPoints.push({
          x: (px - size / 2) * 2.5,
          y: (size / 2 - py) * 2.5,
          r: r / 255,
          g: g / 255,
          b: b / 255
        });
      }
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = validPoints[i % validPoints.length] || { x: 0, y: 0, r: 0, g: 0, b: 0 };
    const i3 = i * 3;
    positions[i3] = p.x;
    positions[i3 + 1] = p.y;
    positions[i3 + 2] = (Math.random() - 0.5) * 5;
    colors[i3] = p.r;
    colors[i3 + 1] = p.g;
    colors[i3 + 2] = p.b;
  }

  return { positions, colors };
};

export const generateShapePositions = (type: ShapeType): Float32Array => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const temp = new THREE.Vector3();

  let lx = 0.1, ly = 0, lz = 0;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const t = i / PARTICLE_COUNT;

    switch (type) {
      case ShapeType.BUTTERFLY: {
        const angle = t * Math.PI * 40;
        const r = (Math.exp(Math.cos(angle)) - 2 * Math.cos(4 * angle) - Math.pow(Math.sin(angle / 12), 5)) * 80;
        temp.set(r * Math.sin(angle), r * Math.cos(angle), (Math.random() - 0.5) * 50);
        break;
      }
      case ShapeType.JELLYFISH: {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.5) * 150;
        if (i < PARTICLE_COUNT * 0.4) {
          const h = Math.sqrt(Math.max(0, 150*150 - r*r)) * 0.5;
          temp.set(r * Math.cos(angle), h, r * Math.sin(angle));
        } else {
          const tx = (Math.random() - 0.5) * 200;
          const ty = -Math.random() * 400;
          const tz = (Math.random() - 0.5) * 200;
          temp.set(tx, ty, tz);
        }
        break;
      }
      case ShapeType.WHALE: {
        const u = t * Math.PI * 2;
        const v = Math.random() * Math.PI;
        temp.set(300 * Math.cos(u) * Math.sin(v), 100 * Math.sin(u) * Math.sin(v), 150 * Math.cos(v));
        if (temp.x > 100) temp.y *= 0.2;
        break;
      }
      case ShapeType.DRAGON: {
        const a = t * Math.PI * 20;
        const r = 150 + Math.sin(a * 0.2) * 50;
        temp.set(r * Math.cos(a), a * 10 - 300, r * Math.sin(a));
        break;
      }
      case ShapeType.GALAXY: {
        const arm = i % 3;
        const angle = (i / PARTICLE_COUNT) * Math.PI * 20 + (arm * Math.PI * 2 / 3);
        const radius = Math.pow(Math.random(), 0.5) * 350;
        const spiral = angle + radius * 0.01;
        temp.set(Math.cos(spiral) * radius, (Math.random() - 0.5) * (400 - radius) * 0.2, Math.sin(spiral) * radius);
        break;
      }
      case ShapeType.DNA_HELIX: {
        const side = i % 2 === 0 ? 1 : -1;
        const a = t * Math.PI * 10;
        const h = t * 600 - 300;
        const r = 80;
        temp.set(r * Math.cos(a) * side, h, r * Math.sin(a) * side);
        if (i % 50 < 2) { // Rungs
          const step = (i % 50) / 2;
          temp.set(r * Math.cos(a) * (1 - step * 2), h, r * Math.sin(a) * (1 - step * 2));
        }
        break;
      }
      case ShapeType.HEART_3D: {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI;
        const r = 15;
        temp.set(
          r * 16 * Math.pow(Math.sin(u), 3) * Math.sin(v),
          r * (13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) * Math.sin(v),
          r * Math.cos(v) * 5
        );
        break;
      }
      case ShapeType.LORENZ_ATTRACTOR: {
        const dt = 0.01;
        const s = 10, r = 28, b = 8 / 3;
        const dx = s * (ly - lx);
        const dy = lx * (r - lz) - ly;
        const dz = lx * ly - b * lz;
        lx += dx * dt; ly += dy * dt; lz += dz * dt;
        temp.set(lx * 10, ly * 10, (lz - 25) * 10);
        break;
      }
      default: {
        const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
        const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
        temp.setFromSphericalCoords(200, phi, theta);
        break;
      }
    }

    positions[i3] = temp.x;
    positions[i3 + 1] = temp.y;
    positions[i3 + 2] = temp.z;
  }

  return positions;
};
