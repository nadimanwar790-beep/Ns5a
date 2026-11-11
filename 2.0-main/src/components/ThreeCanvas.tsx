import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CubeCutParams, MiniCubeData, ShapeParams, Dice3DParams, SingleDiceView } from '../types';
import { generateMiniCubes } from '../utils/mathFormulas';

interface ThreeCanvasProps {
  mode: 'shape' | 'cube_cutting' | 'dice';
  shapeParams?: ShapeParams;
  cubeCutParams?: CubeCutParams;
  diceParams?: Dice3DParams;
  selectedCube?: MiniCubeData | null;
  onSelectMiniCube?: (cube: MiniCubeData | null) => void;
  language?: 'hi' | 'en';
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  mode,
  shapeParams,
  cubeCutParams,
  diceParams,
  selectedCube,
  onSelectMiniCube,
  language = 'hi',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mainGroupRef = useRef<THREE.Group | null>(null);
  const meshMapRef = useRef<Map<string, { mesh: THREE.Mesh; data: MiniCubeData }>>(new Map());
  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);

  const [isRotating, setIsRotating] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [webglError, setWebglError] = useState(false);
  const isRotatingRef = useRef(false);
  isRotatingRef.current = isRotating;

  // Track mouse drag for orbit - Default closer radius (11.5) for bigger diagram view
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({ radius: 11.5, theta: Math.PI / 4, phi: Math.PI / 3 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  // Initialize Scene, Camera, Renderer
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 500;
    const height = mountRef.current.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712'); // Deep slate/black
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      console.warn('3D preview is unavailable in this browser:', error);
      setWebglError(true);
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.replaceChildren(renderer.domElement);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -4;
    scene.add(gridHelper);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(12, 18, 15);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 0.6);
    dirLight2.position.set(-10, -8, -10);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xa855f7, 0.8, 30);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // Main Group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    mainGroupRef.current = mainGroup;

    // Update Camera position based on spherical coords
    const updateCameraPos = () => {
      const { radius, theta, phi } = cameraSphericalRef.current;
      camera.position.x = cameraTargetRef.current.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = cameraTargetRef.current.y + radius * Math.cos(phi);
      camera.position.z = cameraTargetRef.current.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(cameraTargetRef.current);
    };
    updateCameraPos();

    // Pointer controls work for mouse, pen, and touch. One finger orbits;
    // two fingers pinch to zoom and move together to pan the scene.
    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    const pointers = new Map<number, { x: number; y: number }>();
    let previousPinchDistance = 0;
    let previousPinchCenter = { x: 0, y: 0 };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraSphericalRef.current.radius = Math.max(
        4,
        Math.min(35, cameraSphericalRef.current.radius + e.deltaY * 0.02)
      );
      updateCameraPos();
    };

    const getPinchState = () => {
      const points = Array.from(pointers.values());
      const [first, second] = points;
      const dx = first.x - second.x;
      const dy = first.y - second.y;
      return {
        distance: Math.sqrt(dx * dx + dy * dy),
        center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      };
    };

    const panCamera = (deltaX: number, deltaY: number) => {
      camera.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
      const panScale = cameraSphericalRef.current.radius * 0.0018;
      cameraTargetRef.current.addScaledVector(right, -deltaX * panScale);
      cameraTargetRef.current.addScaledVector(up, deltaY * panScale);
      updateCameraPos();
    };

    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dom.setPointerCapture?.(e.pointerId);
      isDraggingRef.current = true;

      if (pointers.size === 1) {
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      } else if (pointers.size === 2) {
        const pinch = getPinchState();
        previousPinchDistance = pinch.distance;
        previousPinchCenter = pinch.center;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1 && isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;
        cameraSphericalRef.current.theta -= deltaX * 0.008;
        cameraSphericalRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, cameraSphericalRef.current.phi - deltaY * 0.008)
        );
        updateCameraPos();
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      } else if (pointers.size >= 2) {
        e.preventDefault();
        const pinch = getPinchState();
        const zoomDelta = (previousPinchDistance - pinch.distance) * 0.025;
        cameraSphericalRef.current.radius = Math.max(
          4,
          Math.min(35, cameraSphericalRef.current.radius + zoomDelta)
        );
        panCamera(
          pinch.center.x - previousPinchCenter.x,
          pinch.center.y - previousPinchCenter.y
        );
        previousPinchDistance = pinch.distance;
        previousPinchCenter = pinch.center;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      dom.releasePointerCapture?.(e.pointerId);
      if (pointers.size === 0) {
        isDraggingRef.current = false;
        previousPinchDistance = 0;
      } else if (pointers.size === 1) {
        const remaining = Array.from(pointers.values())[0];
        previousMousePositionRef.current = remaining;
        previousPinchDistance = 0;
      }
    };

    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove, { passive: false });
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);

    // Raycasting for mini-cube click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(mainGroup.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const match = Array.from(meshMapRef.current.entries()).find(([, item]) => item.mesh === hit);
        if (match && onSelectMiniCube) {
          onSelectMiniCube(match[1].data);
        }
      }
    };

    dom.addEventListener('click', onClick);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(mountRef.current);

    // Animation Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isRotatingRef.current && mainGroupRef.current) {
        mainGroupRef.current.rotation.y += 0.008;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, []);

  // Update 3D Objects when parameters change
  useEffect(() => {
    const mainGroup = mainGroupRef.current;
    if (!mainGroup) return;

    // Clear existing objects
    while (mainGroup.children.length > 0) {
      const obj = mainGroup.children[0];
      mainGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }
    meshMapRef.current.clear();

    if (mode === 'shape' && shapeParams) {
      renderMathShape(mainGroup, shapeParams);
    } else if (mode === 'cube_cutting' && cubeCutParams) {
      renderCubeCutting(mainGroup, cubeCutParams, selectedCube, meshMapRef);
    } else if (mode === 'dice' && diceParams) {
      renderDiceScene(mainGroup, diceParams);
    }
  }, [mode, shapeParams, cubeCutParams, diceParams, selectedCube]);

  if (webglError) {
    return (
      <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] rounded-2xl overflow-hidden border border-indigo-500/30 bg-[radial-gradient(circle_at_50%_35%,#172554_0%,#0f172a_42%,#030712_100%)] shadow-2xl flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-3xl">
            ◈
          </div>
          <h3 className="text-base font-bold text-white">
            {language === 'hi' ? '3D मोड तैयार है' : '3D mode is ready'}
          </h3>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            {language === 'hi'
              ? 'इस preview browser में WebGL उपलब्ध नहीं है। किसी WebGL-enabled device/browser पर मॉडल को स्पर्श करके घुमाएं, दो उंगलियों से ज़ूम और पैन करें।'
              : 'WebGL is unavailable in this preview browser. On a WebGL-enabled device/browser, drag to rotate and use two fingers to zoom and pan.'}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] text-indigo-200">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {language === 'hi' ? 'WebGL सक्षम करें' : 'Enable WebGL'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing touch-none select-none"
        aria-label={language === 'hi' ? '3D मॉडल: स्पर्श करके घुमाएं और ज़ूम करें' : '3D model: drag to rotate and pinch to zoom'}
      />

      {/* Floating Control Overlay */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto z-30">
        {showToolbar ? (
          <>
            <button
              id="btn-toggle-rotation"
              onClick={() => setIsRotating(!isRotating)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all flex items-center gap-1.5 shadow-lg ${
                isRotating
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-500/30'
                  : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${isRotating ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isRotating ? (language === 'hi' ? 'रोकें' : 'Stop') : (language === 'hi' ? '3D घूर्णन' : 'Rotate')}</span>
            </button>

            <button
              id="btn-reset-camera"
              onClick={() => {
                if (cameraRef.current) {
                  cameraSphericalRef.current = { radius: 11.5, theta: Math.PI / 4, phi: Math.PI / 3 };
                  cameraTargetRef.current.set(0, 0, 0);
                  const { radius, theta, phi } = cameraSphericalRef.current;
                  cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
                  cameraRef.current.position.y = radius * Math.cos(phi);
                  cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
                  cameraRef.current.lookAt(cameraTargetRef.current);
                  if (mainGroupRef.current) {
                    mainGroupRef.current.rotation.set(0, 0, 0);
                  }
                }
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white backdrop-blur-md transition-all shadow-lg"
            >
              {language === 'hi' ? 'रीसेट' : 'Reset'}
            </button>

            {/* Quick Zoom Buttons */}
            <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-700 backdrop-blur-md overflow-hidden shadow-lg">
              <button
                title="Zoom In"
                onClick={() => {
                  cameraSphericalRef.current.radius = Math.max(4, cameraSphericalRef.current.radius - 2);
                  if (cameraRef.current) {
                    const { radius, theta, phi } = cameraSphericalRef.current;
                    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
                    cameraRef.current.position.y = radius * Math.cos(phi);
                    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
                    cameraRef.current.lookAt(0, 0, 0);
                  }
                }}
                className="px-2.5 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-slate-800 border-r border-slate-700 font-bold"
              >
                +
              </button>
              <button
                title="Zoom Out"
                onClick={() => {
                  cameraSphericalRef.current.radius = Math.min(30, cameraSphericalRef.current.radius + 2);
                  if (cameraRef.current) {
                    const { radius, theta, phi } = cameraSphericalRef.current;
                    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
                    cameraRef.current.position.y = radius * Math.cos(phi);
                    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
                    cameraRef.current.lookAt(0, 0, 0);
                  }
                }}
                className="px-2.5 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-slate-800 font-bold"
              >
                -
              </button>
            </div>

            <button
              onClick={() => setShowToolbar(false)}
              className="px-2 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 bg-slate-900/80 border border-slate-800 shadow-md"
              title={language === 'hi' ? 'कंट्रोल छिपाएं' : 'Hide Controls'}
            >
              ✕
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowToolbar(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 border border-slate-700 backdrop-blur-md transition-all shadow-xl flex items-center gap-1.5"
          >
            <span>⚙️</span>
            <span>{language === 'hi' ? '3D कंट्रोल दिखाएं' : '3D Controls'}</span>
          </button>
        )}

        {mode === 'shape' && (shapeParams?.explodedParts || 0) > 0 && (
          <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md animate-pulse shadow-md">
            ⚡ {language === 'hi' ? 'अलग भाग' : 'Exploded'}
          </span>
        )}
      </div>

      {/* Interactive Helper Legend & Tips */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none text-[11px] text-slate-400 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80">
        <span className="flex items-center gap-1.5">
          <span className="text-indigo-400 font-semibold">☝️ {language === 'hi' ? 'स्पर्श/Drag:' : 'Touch/Drag:'}</span>
          {language === 'hi' ? 'घुमाएं' : 'Rotate'} ·
          <span className="text-indigo-400 font-semibold">{language === 'hi' ? 'दो उंगली:' : '2 fingers:'}</span>
          {language === 'hi' ? 'ज़ूम + पैन' : 'Zoom + Pan'} ·
          <span className="text-indigo-400 font-semibold">Scroll:</span> {language === 'hi' ? 'ज़ूम' : 'Zoom'}
        </span>
        {mode === 'cube_cutting' && (
          <span className="text-amber-400 font-medium hidden sm:inline">
            {language === 'hi' ? '👆 किसी भी टुकड़े पर क्लिक करके जांचें' : '👆 Click any mini-cube to inspect'}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Canvas Text Sprite for 3D Annotations
// ============================================================================
function createTextSprite(text: string, bgColor: string = '#0f172a', textColor: string = '#38bdf8'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 384, 84, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 200, 50);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(3.4, 0.85, 1);
  return sprite;
}

// ============================================================================
// Shape 3D Renderer (Belan, Sanku, Ghan, Ghanabh, Gola, Ardhgola, Chhinnak)
// With Full Exploded Parts / Deconstruction Support
// ============================================================================
function renderMathShape(group: THREE.Group, params: ShapeParams) {
  const {
    type,
    radius,
    radiusOuter = 5,
    radiusTop = 0,
    height,
    length,
    width,
    color,
    wireframe,
    transparent,
    opacity,
    explodedParts = 0,
    showLabels = true,
    unrollNet = false,
  } = params;

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: color || '#3b82f6',
    wireframe: wireframe,
    transparent: transparent,
    opacity: transparent ? opacity : 1,
    roughness: 0.25,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, transparent: true, opacity: 0.6 });

  // Auto-scale normalization so large user values (e.g. radius 100, length 500) fit comfortably in view
  const maxDim = Math.max(
    radius || 1,
    radiusOuter || 1,
    height || 1,
    length || 1,
    width || 1
  );
  const scale = maxDim > 8 ? 6 / maxDim : 1;

  const sRadius = (radius || 1) * scale;
  const sRadiusOuter = (radiusOuter || radius * 1.5 || 1.5) * scale;
  const sRadiusTop = (radiusTop || 0.1) * scale;
  const sHeight = (height || 1) * scale;
  const sLength = (length || 1) * scale;
  const sWidth = (width || 1) * scale;

  // Determine Unfolding vs 3D Exploded state
  const isUnfolding = unrollNet || (params.unfoldStep !== undefined && params.unfoldStep > 0) || (params.unfoldProgress !== undefined && params.unfoldProgress > 0);
  const isExploded = !isUnfolding && (explodedParts || 0) > 0.01;
  const explodeDist = (explodedParts || 0) * 2.8;

  // Compute normalized unfolding progress (0 to 1) for 2D net mode
  let unfoldP = 0;
  if (params.unfoldProgress !== undefined && params.unfoldProgress > 0) {
    unfoldP = Math.max(0, Math.min(1, params.unfoldProgress));
  } else if (params.unfoldStep !== undefined) {
    const maxSteps = (type === 'cube' || type === 'cuboid' || type === 'pyramid' || type === 'prism') ? 5 : (type === 'cylinder' || type === 'hollow_cylinder' || type === 'frustum') ? 4 : (type === 'cone') ? 3 : 2;
    unfoldP = Math.max(0, Math.min(1, params.unfoldStep / maxSteps));
  } else if (unrollNet) {
    unfoldP = 1.0;
  }

  // --------------------------------------------------------------------------
  // Helper to create textured 2D/3D Face Plates with Title & Formula
  // --------------------------------------------------------------------------
  const createFaceTexture = (title: string, formula: string, bgColor: string, borderColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, 494, 494);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, 448, 448);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 210);

    ctx.fillStyle = borderColor;
    ctx.font = 'bold 50px "JetBrains Mono", monospace';
    ctx.fillText(formula, 256, 290);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  };

  const createFaceMesh = (w: number, h: number, title: string, formula: string, bg: string, border: string) => {
    const frontMat = new THREE.MeshStandardMaterial({
      map: createFaceTexture(title, formula, bg, border),
      roughness: 0.25,
      metalness: 0.15,
      side: THREE.FrontSide,
    });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, side: THREE.BackSide });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const geom = new THREE.BoxGeometry(w * 0.98, h * 0.98, 0.06);
    const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
    const mesh = new THREE.Mesh(geom, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // ==========================================================================
  // [A] 2D NET STEP-BY-STEP UNROLLING / UNFOLDING MODE
  // ==========================================================================
  if (isUnfolding) {
    // 1. CUBE & CUBOID - 2D Net Unfolding
    if (type === 'cube' || type === 'cuboid') {
      const L = sLength;
      const H = type === 'cube' ? sLength : sHeight;
      const W = type === 'cube' ? sLength : sWidth;

      const p = unfoldP;
      const pTop = Math.min(1, Math.max(0, p / 0.2));
      const pBot = Math.min(1, Math.max(0, (p - 0.2) / 0.2));
      const pLeft = Math.min(1, Math.max(0, (p - 0.4) / 0.2));
      const pRight = Math.min(1, Math.max(0, (p - 0.6) / 0.2));
      const pBack = Math.min(1, Math.max(0, (p - 0.8) / 0.2));

      const topAngle = (1 - pTop) * (-Math.PI / 2);
      const bottomAngle = (1 - pBot) * (Math.PI / 2);
      const leftAngle = (1 - pLeft) * (-Math.PI / 2);
      const rightAngle = (1 - pRight) * (Math.PI / 2);
      const backAngle = (1 - pBack) * (Math.PI / 2);

      // Front Face
      const frontMesh = createFaceMesh(
        L,
        H,
        type === 'cube' ? 'सामने (Front)' : 'सामने (Front)',
        type === 'cube' ? 'a²' : 'l × h',
        '#1e3a8a',
        '#3b82f6'
      );
      frontMesh.position.set(0, 0, 0);
      group.add(frontMesh);

      // Top Face Hinge
      const topHinge = new THREE.Group();
      topHinge.position.set(0, H / 2, 0);
      const topMesh = createFaceMesh(
        L,
        W,
        type === 'cube' ? 'ऊपर (Top)' : 'ऊपर (Top)',
        type === 'cube' ? 'a²' : 'l × b',
        '#312e81',
        '#6366f1'
      );
      topMesh.position.set(0, W / 2, 0);
      topHinge.add(topMesh);
      topHinge.rotation.x = topAngle;
      group.add(topHinge);

      // Bottom Face Hinge
      const botHinge = new THREE.Group();
      botHinge.position.set(0, -H / 2, 0);
      const botMesh = createFaceMesh(
        L,
        W,
        type === 'cube' ? 'नीचे (Bottom)' : 'नीचे (Bottom)',
        type === 'cube' ? 'a²' : 'l × b',
        '#881337',
        '#f43f5e'
      );
      botMesh.position.set(0, -W / 2, 0);
      botHinge.add(botMesh);
      botHinge.rotation.x = bottomAngle;
      group.add(botHinge);

      // Left Face Hinge
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-L / 2, 0, 0);
      const leftMesh = createFaceMesh(
        W,
        H,
        type === 'cube' ? 'बायां (Left)' : 'बायां (Left)',
        type === 'cube' ? 'a²' : 'b × h',
        '#064e3b',
        '#10b981'
      );
      leftMesh.position.set(-W / 2, 0, 0);
      leftHinge.add(leftMesh);
      leftHinge.rotation.y = leftAngle;
      group.add(leftHinge);

      // Right Face Hinge
      const rightHinge = new THREE.Group();
      rightHinge.position.set(L / 2, 0, 0);
      const rightMesh = createFaceMesh(
        W,
        H,
        type === 'cube' ? 'दायां (Right)' : 'दायां (Right)',
        type === 'cube' ? 'a²' : 'b × h',
        '#78350f',
        '#f59e0b'
      );
      rightMesh.position.set(W / 2, 0, 0);
      rightHinge.add(rightMesh);

      // Back Face Hinge (attached to Right Face)
      const backHinge = new THREE.Group();
      backHinge.position.set(W, 0, 0);
      const backMesh = createFaceMesh(
        L,
        H,
        type === 'cube' ? 'पीछे (Back)' : 'पीछे (Back)',
        type === 'cube' ? 'a²' : 'l × h',
        '#581c87',
        '#a855f7'
      );
      backMesh.position.set(L / 2, 0, 0);
      backHinge.add(backMesh);
      backHinge.rotation.y = backAngle;

      rightHinge.add(backHinge);
      rightHinge.rotation.y = rightAngle;
      group.add(rightHinge);
      return;
    }

    // 2. CYLINDER - 2D Net Unrolling
    if (type === 'cylinder') {
      const p = unfoldP;
      const lidH = Math.max(0.06, sHeight * 0.04);
      const rectW = 2 * Math.PI * sRadius;

      const pTop = Math.min(1, Math.max(0, p / 0.3));
      const topY = (sHeight / 2 + lidH / 2) + pTop * (sRadius + 0.3);
      const topGeom = new THREE.CylinderGeometry(sRadius, sRadius, lidH, 48);
      const topMat = new THREE.MeshStandardMaterial({
        map: createFaceTexture('ऊपरी सिरा', 'π r²', '#064e3b', '#10b981'),
        roughness: 0.3,
      });
      const topMesh = new THREE.Mesh(topGeom, topMat);
      topMesh.position.set(0, topY, 0);
      topMesh.rotation.x = pTop * (Math.PI / 2);
      group.add(topMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(topGeom), edgeMaterial).translateY(topY));

      const pBot = Math.min(1, Math.max(0, (p - 0.3) / 0.3));
      const botY = (-sHeight / 2 - lidH / 2) - pBot * (sRadius + 0.3);
      const botGeom = new THREE.CylinderGeometry(sRadius, sRadius, lidH, 48);
      const botMat = new THREE.MeshStandardMaterial({
        map: createFaceTexture('निचला सिरा', 'π r²', '#083344', '#06b6d4'),
        roughness: 0.3,
      });
      const botMesh = new THREE.Mesh(botGeom, botMat);
      botMesh.position.set(0, botY, 0);
      botMesh.rotation.x = -pBot * (Math.PI / 2);
      group.add(botMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(botGeom), edgeMaterial).translateY(botY));

      const pUnroll = Math.min(1, Math.max(0, (p - 0.5) / 0.5));
      if (pUnroll > 0.05) {
        const alpha = 2 * Math.PI * (1 - pUnroll);
        const isNearFlat = alpha < 0.08;
        const rAlpha = isNearFlat ? 0 : rectW / alpha;
        const nx = 48;
        const ny = 16;
        const positions: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let j = 0; j <= ny; j++) {
          const v = j / ny;
          const y = (v - 0.5) * sHeight;
          for (let i = 0; i <= nx; i++) {
            const u = i / nx;
            const uC = u - 0.5;
            let x = 0;
            let z = 0;
            if (isNearFlat) {
              x = uC * rectW;
              z = 0;
            } else {
              const phi = uC * alpha;
              x = rAlpha * Math.sin(phi);
              z = rAlpha * Math.cos(phi) - rAlpha;
            }
            positions.push(x, y, z);
            uvs.push(u, v);
          }
        }

        for (let j = 0; j < ny; j++) {
          for (let i = 0; i < nx; i++) {
            const a = j * (nx + 1) + i;
            const b = j * (nx + 1) + (i + 1);
            const c = (j + 1) * (nx + 1) + i;
            const d = (j + 1) * (nx + 1) + (i + 1);
            indices.push(a, b, c);
            indices.push(b, d, c);
          }
        }

        const unrollGeom = new THREE.BufferGeometry();
        unrollGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        unrollGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        unrollGeom.setIndex(indices);
        unrollGeom.computeVertexNormals();

        const mantleMat = new THREE.MeshStandardMaterial({
          color: color || '#3b82f6',
          side: THREE.DoubleSide,
          roughness: 0.3,
          metalness: 0.15,
        });
        const mantleMesh = new THREE.Mesh(unrollGeom, mantleMat);
        group.add(mantleMesh);
        group.add(new THREE.LineSegments(new THREE.WireframeGeometry(unrollGeom), edgeMaterial));
      } else {
        const mantleGeom = new THREE.CylinderGeometry(sRadius, sRadius, sHeight, 48, 16, true);
        const mantleMat = new THREE.MeshStandardMaterial({
          color: color || '#3b82f6',
          side: THREE.DoubleSide,
          roughness: 0.3,
          metalness: 0.15,
        });
        const mantleMesh = new THREE.Mesh(mantleGeom, mantleMat);
        group.add(mantleMesh);
        group.add(new THREE.LineSegments(new THREE.EdgesGeometry(mantleGeom), edgeMaterial));
      }

      if (showLabels) {
        const topSprite = createTextSprite('ऊपरी वृत्त (Top: π r²)', '#064e3b', '#34d399');
        topSprite.position.set(0, topY + 0.8, 0);
        group.add(topSprite);

        const midSprite = createTextSprite(
          p > 0.5 ? '2D खुला वक्र पृष्ठ (2πr × h)' : 'वक्र पृष्ठ (CSA: 2πrh)',
          '#1e1b4b',
          '#818cf8'
        );
        midSprite.position.set(0, 0, sRadius + 1.2);
        group.add(midSprite);

        const botSprite = createTextSprite('निचला वृत्त (Base: π r²)', '#083344', '#22d3ee');
        botSprite.position.set(0, botY - 0.8, 0);
        group.add(botSprite);
      }
      return;
    }

    // 3. CONE - 2D Net Unfolding
    if (type === 'cone') {
      const p = unfoldP;
      const lSlant = Math.sqrt(sRadius * sRadius + sHeight * sHeight);
      const thetaSector = (sRadius / lSlant) * 2 * Math.PI;

      const pBase = Math.min(1, Math.max(0, p / 0.4));
      const baseY = (-sHeight / 2) - pBase * (sRadius + 0.4);
      const baseGeom = new THREE.CircleGeometry(sRadius, 48);
      const baseMat = new THREE.MeshStandardMaterial({
        map: createFaceTexture('आधार वृत्त', 'π r²', '#064e3b', '#10b981'),
        side: THREE.DoubleSide,
      });
      const baseMesh = new THREE.Mesh(baseGeom, baseMat);
      baseMesh.position.set(0, baseY, 0);
      baseMesh.rotation.x = Math.PI / 2 + pBase * (Math.PI / 2);
      group.add(baseMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeom), edgeMaterial).translateY(baseY).rotateX(baseMesh.rotation.x));

      const pUnroll = Math.min(1, Math.max(0, (p - 0.3) / 0.7));
      if (pUnroll > 0.1) {
        const sectorGeom = new THREE.RingGeometry(0.01, lSlant, 48, 8, 0, thetaSector);
        const sectorMat = new THREE.MeshStandardMaterial({
          color: color || '#f59e0b',
          side: THREE.DoubleSide,
          roughness: 0.3,
          metalness: 0.15,
        });
        const sectorMesh = new THREE.Mesh(sectorGeom, sectorMat);
        sectorMesh.position.set(0, lSlant / 2, 0);
        group.add(sectorMesh);
        group.add(new THREE.LineSegments(new THREE.EdgesGeometry(sectorGeom), edgeMaterial).translateY(lSlant / 2));
      } else {
        const coneGeom = new THREE.ConeGeometry(sRadius, sHeight, 48, 16, true);
        const coneMat = new THREE.MeshStandardMaterial({ color: color || '#f59e0b', side: THREE.DoubleSide });
        const coneMesh = new THREE.Mesh(coneGeom, coneMat);
        group.add(coneMesh);
        group.add(new THREE.LineSegments(new THREE.EdgesGeometry(coneGeom), edgeMaterial));
      }

      if (showLabels) {
        const topSprite = createTextSprite(
          p > 0.4 ? '2D त्रिज्यखंड वक्र पृष्ठ (πrl)' : 'वक्र पृष्ठ (CSA: πrl)',
          '#451a03',
          '#fbbf24'
        );
        topSprite.position.set(0, sHeight / 2 + 0.8, 0);
        group.add(topSprite);

        const botSprite = createTextSprite('आधार वृत्त (Base: πr²)', '#064e3b', '#34d399');
        botSprite.position.set(0, baseY - 0.8, 0);
        group.add(botSprite);
      }
      return;
    }

    // 4. PYRAMID - 2D Net Unfolding
    if (type === 'pyramid') {
      const a = sLength;
      const H = sHeight;
      const lSlant = Math.sqrt((a / 2) * (a / 2) + H * H);
      const p = unfoldP;

      const slantCloseAngle = Math.atan2(H, a / 2);
      const pFront = Math.min(1, Math.max(0, p / 0.25));
      const pBack = Math.min(1, Math.max(0, (p - 0.25) / 0.25));
      const pLeft = Math.min(1, Math.max(0, (p - 0.5) / 0.25));
      const pRight = Math.min(1, Math.max(0, (p - 0.75) / 0.25));

      const baseGeom = new THREE.PlaneGeometry(a, a);
      const baseMat = new THREE.MeshStandardMaterial({
        map: createFaceTexture('आधार वर्ग', 'a²', '#1e3a8a', '#3b82f6'),
        side: THREE.DoubleSide,
      });
      const baseMesh = new THREE.Mesh(baseGeom, baseMat);
      baseMesh.position.set(0, 0, 0);
      group.add(baseMesh);

      const createTriGeom = () => {
        const geom = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          -a / 2, 0, 0,
          a / 2, 0, 0,
          0, lSlant, 0,
        ]);
        const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
        geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geom.computeVertexNormals();
        return geom;
      };

      const triMat = new THREE.MeshStandardMaterial({
        color: color || '#f59e0b',
        side: THREE.DoubleSide,
        roughness: 0.3,
      });

      // Front Triangle Hinge
      const frontHinge = new THREE.Group();
      frontHinge.position.set(0, -a / 2, 0);
      const frontMesh = new THREE.Mesh(createTriGeom(), triMat);
      frontMesh.rotation.z = Math.PI;
      frontHinge.add(frontMesh);
      frontHinge.rotation.x = (1 - pFront) * (-slantCloseAngle);
      group.add(frontHinge);

      // Back Triangle Hinge
      const backHinge = new THREE.Group();
      backHinge.position.set(0, a / 2, 0);
      const backMesh = new THREE.Mesh(createTriGeom(), triMat);
      backHinge.add(backMesh);
      backHinge.rotation.x = (1 - pBack) * (slantCloseAngle);
      group.add(backHinge);

      // Left Triangle Hinge
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-a / 2, 0, 0);
      const leftMesh = new THREE.Mesh(createTriGeom(), triMat);
      leftMesh.rotation.z = Math.PI / 2;
      leftHinge.add(leftMesh);
      leftHinge.rotation.y = (1 - pLeft) * (slantCloseAngle);
      group.add(leftHinge);

      // Right Triangle Hinge
      const rightHinge = new THREE.Group();
      rightHinge.position.set(a / 2, 0, 0);
      const rightMesh = new THREE.Mesh(createTriGeom(), triMat);
      rightMesh.rotation.z = -Math.PI / 2;
      rightHinge.add(rightMesh);
      rightHinge.rotation.y = (1 - pRight) * (-slantCloseAngle);
      group.add(rightHinge);
      return;
    }

    // 5. PRISM - 2D Net Unfolding
    if (type === 'prism') {
      const a = sLength;
      const H = sHeight;
      const triH = (Math.sqrt(3) / 2) * a;
      const p = unfoldP;

      const pTop = Math.min(1, Math.max(0, p / 0.25));
      const pBot = Math.min(1, Math.max(0, (p - 0.25) / 0.25));
      const pLeft = Math.min(1, Math.max(0, (p - 0.5) / 0.25));
      const pRight = Math.min(1, Math.max(0, (p - 0.75) / 0.25));

      const centerMesh = createFaceMesh(a, H, 'मुख्य आयत', 'a × h', '#1e3a8a', '#3b82f6');
      group.add(centerMesh);

      const leftHinge = new THREE.Group();
      leftHinge.position.set(-a / 2, 0, 0);
      const leftMesh = createFaceMesh(a, H, 'बायां आयत', 'a × h', '#064e3b', '#10b981');
      leftMesh.position.set(-a / 2, 0, 0);
      leftHinge.add(leftMesh);
      leftHinge.rotation.y = (1 - pLeft) * (-Math.PI / 3);
      group.add(leftHinge);

      const rightHinge = new THREE.Group();
      rightHinge.position.set(a / 2, 0, 0);
      const rightMesh = createFaceMesh(a, H, 'दायां आयत', 'a × h', '#78350f', '#f59e0b');
      rightMesh.position.set(a / 2, 0, 0);
      rightHinge.add(rightMesh);
      rightHinge.rotation.y = (1 - pRight) * (Math.PI / 3);
      group.add(rightHinge);

      const createTriGeom = () => {
        const geom = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          -a / 2, 0, 0,
          a / 2, 0, 0,
          0, triH, 0,
        ]);
        geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geom.computeVertexNormals();
        return geom;
      };
      const triMat = new THREE.MeshStandardMaterial({ color: '#6366f1', side: THREE.DoubleSide });

      const topHinge = new THREE.Group();
      topHinge.position.set(0, H / 2, 0);
      const topTri = new THREE.Mesh(createTriGeom(), triMat);
      topHinge.add(topTri);
      topHinge.rotation.x = (1 - pTop) * (-Math.PI / 2);
      group.add(topHinge);

      const botHinge = new THREE.Group();
      botHinge.position.set(0, -H / 2, 0);
      const botTri = new THREE.Mesh(createTriGeom(), triMat);
      botTri.rotation.z = Math.PI;
      botHinge.add(botTri);
      botHinge.rotation.x = (1 - pBot) * (Math.PI / 2);
      group.add(botHinge);
      return;
    }

    // 6. FRUSTUM - 2D Net Unfolding
    if (type === 'frustum') {
      const p = unfoldP;
      const lidH = Math.max(0.06, sHeight * 0.04);
      const topY = sHeight / 2 + p * (sRadiusTop + 0.3);
      const botY = -sHeight / 2 - p * (sRadius + 0.3);

      const topGeom = new THREE.CylinderGeometry(sRadiusTop, sRadiusTop, lidH, 48);
      const topMat = new THREE.MeshStandardMaterial({
        map: createFaceTexture('ऊपरी सिरा', 'π r₂²', '#431407', '#fb923c'),
      });
      const topMesh = new THREE.Mesh(topGeom, topMat);
      topMesh.position.set(0, topY, 0);
      topMesh.rotation.x = p * (Math.PI / 2);
      group.add(topMesh);

      const botGeom = new THREE.CylinderGeometry(sRadius, sRadius, lidH, 48);
      const botMat = new THREE.MeshStandardMaterial({
        map: createFaceTexture('निचला सिरा', 'π r₁²', '#064e3b', '#10b981'),
      });
      const botMesh = new THREE.Mesh(botGeom, botMat);
      botMesh.position.set(0, botY, 0);
      botMesh.rotation.x = -p * (Math.PI / 2);
      group.add(botMesh);

      const bodyGeom = new THREE.CylinderGeometry(sRadiusTop, sRadius, sHeight, 48, 16, true);
      const bodyMat = new THREE.MeshStandardMaterial({ color: color || '#3b82f6', side: THREE.DoubleSide });
      const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
      group.add(bodyMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeom), edgeMaterial));
      return;
    }

    // 7. WHEEL (पहिया) - Circumference 2πr Unrolling along Ground Track
    if (type === 'wheel') {
      const p = unfoldP;
      const w = Math.max(0.4, sWidth || sHeight * 0.4 || 1.2);
      const C = 2 * Math.PI * sRadius;
      const startX = -C / 2;
      const currentX = startX + p * C;
      const rotAngle = -p * 2 * Math.PI;

      // Ground Road Track
      const roadGeom = new THREE.PlaneGeometry(C + 2, w * 2.2);
      const roadMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8, side: THREE.DoubleSide });
      const roadMesh = new THREE.Mesh(roadGeom, roadMat);
      roadMesh.position.set(0, -sRadius - 0.05, 0);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = true;
      group.add(roadMesh);

      // Unrolled Flat Rubber Track ribbon (0 to p * C)
      if (p > 0.01) {
        const ribbonLength = p * C;
        const ribbonGeom = new THREE.PlaneGeometry(ribbonLength, w);
        const ribbonMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4, side: THREE.DoubleSide });
        const ribbonMesh = new THREE.Mesh(ribbonGeom, ribbonMat);
        ribbonMesh.position.set(startX + ribbonLength / 2, -sRadius - 0.02, 0);
        ribbonMesh.rotation.x = -Math.PI / 2;
        group.add(ribbonMesh);

        // Dashed outline for unrolled ribbon
        const ribbonEdges = new THREE.LineSegments(new THREE.EdgesGeometry(ribbonGeom), edgeMaterial);
        ribbonEdges.position.set(startX + ribbonLength / 2, -sRadius - 0.01, 0);
        ribbonEdges.rotation.x = -Math.PI / 2;
        group.add(ribbonEdges);
      }

      // Rolling Wheel Sub-Group
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(currentX, 0, 0);

      // Outer Tire / Rim
      const remainingArc = (1 - p) * 2 * Math.PI;
      const tireGeom = new THREE.CylinderGeometry(sRadius, sRadius, w, 48, 1, false, 0, Math.max(0.01, remainingArc));
      tireGeom.rotateZ(Math.PI / 2);
      const tireMat = new THREE.MeshStandardMaterial({ color: color || '#475569', roughness: 0.4, side: THREE.DoubleSide });
      const tireMesh = new THREE.Mesh(tireGeom, tireMat);
      tireMesh.rotation.x = rotAngle;
      wheelGroup.add(tireMesh);

      // Steel Rim
      const rimGeom = new THREE.CylinderGeometry(sRadius * 0.85, sRadius * 0.85, w * 0.95, 32);
      rimGeom.rotateZ(Math.PI / 2);
      const rimMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.7, roughness: 0.3 });
      const rimMesh = new THREE.Mesh(rimGeom, rimMat);
      rimMesh.rotation.x = rotAngle;
      wheelGroup.add(rimMesh);

      // Central Hub
      const hubGeom = new THREE.CylinderGeometry(sRadius * 0.22, sRadius * 0.22, w * 1.3, 24);
      hubGeom.rotateZ(Math.PI / 2);
      const hubMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.2 });
      const hubMesh = new THREE.Mesh(hubGeom, hubMat);
      hubMesh.rotation.x = rotAngle;
      wheelGroup.add(hubMesh);

      // 8 Spokes
      for (let i = 0; i < 8; i++) {
        const theta = (i * 2 * Math.PI) / 8 + rotAngle;
        const spGeom = new THREE.CylinderGeometry(0.04, 0.04, sRadius * 0.85, 8);
        const spMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.8 });
        const spMesh = new THREE.Mesh(spGeom, spMat);
        spMesh.position.set(0, (sRadius * 0.425) * Math.sin(theta), (sRadius * 0.425) * Math.cos(theta));
        spMesh.rotation.x = theta + Math.PI / 2;
        wheelGroup.add(spMesh);
      }

      group.add(wheelGroup);

      // 3D Distance Labels & Measurement Indicator
      if (showLabels) {
        const distSprite = createTextSprite(
          `1 चक्कर = 2πr दूरी = ${(p * 2 * Math.PI * (radius || 4)).toFixed(1)} cm`,
          '#451a03',
          '#fbbf24'
        );
        distSprite.position.set(currentX, sRadius + 1.2, 0);
        group.add(distSprite);

        const roadSprite = createTextSprite(`सड़क संपर्क = 2πr × w`, '#0f172a', '#38bdf8');
        roadSprite.position.set(0, -sRadius - 0.8, 0);
        group.add(roadSprite);
      }
      return;
    }
  }

  // ==========================================================================
  // [B] 3D EXPLODED DECONSTRUCTION VIEW (STAYS IN FULL 3D, PARTS SEPARATE APART)
  // ==========================================================================
  if (isExploded) {
    // 1. CYLINDER (बेलन): Top Disc + Bottom Disc + Curved Hollow Mantle
    if (type === 'cylinder') {
      const lidH = Math.max(0.12, sHeight * 0.05);
      const topY = sHeight / 2 + explodeDist * 1.5;
      const botY = -sHeight / 2 - explodeDist * 1.5;

      // Top Circular Lid (Disc) in 3D
      const topGeom = new THREE.CylinderGeometry(sRadius, sRadius, lidH, 48);
      const topMat = new THREE.MeshStandardMaterial({
        color: '#10b981', // Emerald green
        roughness: 0.3,
        metalness: 0.2,
      });
      const topMesh = new THREE.Mesh(topGeom, topMat);
      topMesh.position.set(0, topY, 0);
      topMesh.castShadow = true;
      group.add(topMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(topGeom), edgeMaterial).translateY(topY));

      // Bottom Circular Base (Disc) in 3D
      const botGeom = new THREE.CylinderGeometry(sRadius, sRadius, lidH, 48);
      const botMat = new THREE.MeshStandardMaterial({
        color: '#06b6d4', // Cyan
        roughness: 0.3,
        metalness: 0.2,
      });
      const botMesh = new THREE.Mesh(botGeom, botMat);
      botMesh.position.set(0, botY, 0);
      botMesh.castShadow = true;
      group.add(botMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(botGeom), edgeMaterial).translateY(botY));

      // Middle Curved Mantle (Hollow Cylinder Tube) in 3D
      const mantleGeom = new THREE.CylinderGeometry(sRadius, sRadius, sHeight, 48, 16, true);
      const mantleMat = new THREE.MeshStandardMaterial({
        color: color || '#3b82f6',
        side: THREE.DoubleSide,
        roughness: 0.25,
        metalness: 0.2,
      });
      const mantleMesh = new THREE.Mesh(mantleGeom, mantleMat);
      mantleMesh.castShadow = true;
      group.add(mantleMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(mantleGeom), edgeMaterial));

      // Central Dashed Guide Axis Line linking the 3D separated parts
      const axisPoints = [
        new THREE.Vector3(0, botY, 0),
        new THREE.Vector3(0, topY, 0),
      ];
      const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPoints);
      const axisLine = new THREE.Line(
        axisGeom,
        new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.4, gapSize: 0.2, linewidth: 2 })
      );
      axisLine.computeLineDistances();
      group.add(axisLine);

      // 3D Labels
      if (showLabels) {
        const topSprite = createTextSprite('ऊपरी वृत्त (Top: π r²)', '#064e3b', '#34d399');
        topSprite.position.set(0, topY + 0.8, 0);
        group.add(topSprite);

        const midSprite = createTextSprite('वक्र पृष्ठ (CSA: 2πrh)', '#1e1b4b', '#818cf8');
        midSprite.position.set(0, 0, sRadius + 1.2);
        group.add(midSprite);

        const botSprite = createTextSprite('आधार वृत्त (Base: π r²)', '#083344', '#22d3ee');
        botSprite.position.set(0, botY - 0.8, 0);
        group.add(botSprite);
      }
      return;
    }

    // 2. CONE (शंकु): Flat Base Disc + Conical Apex Shell
    if (type === 'cone') {
      const lidH = Math.max(0.12, sHeight * 0.05);
      const baseY = -sHeight / 2 - explodeDist * 1.5;
      const coneY = explodeDist * 1.2;

      // Base Disc in 3D
      const baseGeom = new THREE.CylinderGeometry(sRadius, sRadius, lidH, 48);
      const baseMat = new THREE.MeshStandardMaterial({
        color: '#10b981',
        roughness: 0.3,
        metalness: 0.2,
      });
      const baseMesh = new THREE.Mesh(baseGeom, baseMat);
      baseMesh.position.set(0, baseY, 0);
      baseMesh.castShadow = true;
      group.add(baseMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeom), edgeMaterial).translateY(baseY));

      // Conical Body in 3D
      const coneGeom = new THREE.ConeGeometry(sRadius, sHeight, 48, 16, true);
      const coneMat = new THREE.MeshStandardMaterial({
        color: color || '#f59e0b',
        side: THREE.DoubleSide,
        roughness: 0.3,
        metalness: 0.2,
      });
      const coneMesh = new THREE.Mesh(coneGeom, coneMat);
      coneMesh.position.set(0, coneY, 0);
      coneMesh.castShadow = true;
      group.add(coneMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(coneGeom), edgeMaterial).translateY(coneY));

      // Dashed Axis Line
      const axisPoints = [
        new THREE.Vector3(0, baseY, 0),
        new THREE.Vector3(0, coneY + sHeight / 2, 0),
      ];
      const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPoints);
      const axisLine = new THREE.Line(
        axisGeom,
        new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.3, gapSize: 0.2 })
      );
      axisLine.computeLineDistances();
      group.add(axisLine);

      if (showLabels) {
        const topSprite = createTextSprite('वक्र पृष्ठ (CSA: πrl, l=√(r²+h²))', '#451a03', '#fbbf24');
        topSprite.position.set(0, coneY + sHeight / 2 + 0.8, 0);
        group.add(topSprite);

        const botSprite = createTextSprite('आधार वृत्त (Base: π r²)', '#064e3b', '#34d399');
        botSprite.position.set(0, baseY - 0.8, 0);
        group.add(botSprite);
      }
      return;
    }

    // 3. CUBE (घन): 6 3D Face Slabs separating outwards along X, Y, Z
    if (type === 'cube') {
      const L = sLength;
      const t = Math.max(0.12, L * 0.08); // slab thickness
      const d = L / 2 + explodeDist * 1.3;

      const faces = [
        { name: 'ऊपर (Top: a²)', pos: [0, d, 0], size: [L, t, L], col: '#6366f1' },
        { name: 'नीचे (Bottom: a²)', pos: [0, -d, 0], size: [L, t, L], col: '#f43f5e' },
        { name: 'बायां (Left: a²)', pos: [-d, 0, 0], size: [t, L, L], col: '#10b981' },
        { name: 'दायां (Right: a²)', pos: [d, 0, 0], size: [t, L, L], col: '#f59e0b' },
        { name: 'सामने (Front: a²)', pos: [0, 0, d], size: [L, L, t], col: '#3b82f6' },
        { name: 'पीछे (Back: a²)', pos: [0, 0, -d], size: [L, L, t], col: '#a855f7' },
      ];

      // Central Ghost Wireframe Cube (showing original assembled position)
      const ghostGeom = new THREE.BoxGeometry(L, L, L);
      const ghostLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(ghostGeom),
        new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.35 })
      );
      group.add(ghostLine);

      faces.forEach((f) => {
        const geom = new THREE.BoxGeometry(f.size[0], f.size[1], f.size[2]);
        const mat = new THREE.MeshStandardMaterial({ color: f.col, roughness: 0.3, metalness: 0.2 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(f.pos[0], f.pos[1], f.pos[2]);
        mesh.castShadow = true;
        group.add(mesh);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), edgeMaterial);
        edges.position.set(f.pos[0], f.pos[1], f.pos[2]);
        group.add(edges);

        if (showLabels) {
          const sprite = createTextSprite(f.name, '#0f172a', f.col);
          const sOff = 0.7;
          sprite.position.set(
            f.pos[0] * 1.35 + (f.pos[0] === 0 ? 0 : Math.sign(f.pos[0]) * sOff),
            f.pos[1] * 1.35 + (f.pos[1] === 0 ? 0 : Math.sign(f.pos[1]) * sOff),
            f.pos[2] * 1.35 + (f.pos[2] === 0 ? 0 : Math.sign(f.pos[2]) * sOff)
          );
          group.add(sprite);
        }
      });
      return;
    }

    // 4. CUBOID (घनाभ): 6 3D Face Slabs (l×b, b×h, l×h) separating outwards
    if (type === 'cuboid') {
      const L = sLength;
      const H = sHeight;
      const W = sWidth;
      const t = Math.max(0.12, Math.min(L, H, W) * 0.08);
      const dY = H / 2 + explodeDist * 1.3;
      const dX = L / 2 + explodeDist * 1.3;
      const dZ = W / 2 + explodeDist * 1.3;

      const faces = [
        { name: 'ऊपर (Top: l×b)', pos: [0, dY, 0], size: [L, t, W], col: '#6366f1' },
        { name: 'नीचे (Bottom: l×b)', pos: [0, -dY, 0], size: [L, t, W], col: '#f43f5e' },
        { name: 'बायां (Left: b×h)', pos: [-dX, 0, 0], size: [t, H, W], col: '#10b981' },
        { name: 'दायां (Right: b×h)', pos: [dX, 0, 0], size: [t, H, W], col: '#f59e0b' },
        { name: 'सामने (Front: l×h)', pos: [0, 0, dZ], size: [L, H, t], col: '#3b82f6' },
        { name: 'पीछे (Back: l×h)', pos: [0, 0, -dZ], size: [L, H, t], col: '#a855f7' },
      ];

      // Ghost Wireframe Cuboid
      const ghostGeom = new THREE.BoxGeometry(L, H, W);
      const ghostLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(ghostGeom),
        new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.35 })
      );
      group.add(ghostLine);

      faces.forEach((f) => {
        const geom = new THREE.BoxGeometry(f.size[0], f.size[1], f.size[2]);
        const mat = new THREE.MeshStandardMaterial({ color: f.col, roughness: 0.3, metalness: 0.2 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(f.pos[0], f.pos[1], f.pos[2]);
        mesh.castShadow = true;
        group.add(mesh);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), edgeMaterial);
        edges.position.set(f.pos[0], f.pos[1], f.pos[2]);
        group.add(edges);

        if (showLabels) {
          const sprite = createTextSprite(f.name, '#0f172a', f.col);
          sprite.position.set(
            f.pos[0] * 1.35,
            f.pos[1] * 1.35,
            f.pos[2] * 1.35
          );
          group.add(sprite);
        }
      });
      return;
    }

    // 5. FRUSTUM (छिन्नक): Top Small Circle + Bottom Large Circle + Lateral Mantle
    if (type === 'frustum') {
      const lidH = Math.max(0.12, sHeight * 0.05);
      const topY = sHeight / 2 + explodeDist * 1.5;
      const botY = -sHeight / 2 - explodeDist * 1.5;

      // Top Small Disc
      const topGeom = new THREE.CylinderGeometry(sRadiusTop, sRadiusTop, lidH, 48);
      const topMat = new THREE.MeshStandardMaterial({ color: '#fb923c', roughness: 0.3 });
      const topMesh = new THREE.Mesh(topGeom, topMat);
      topMesh.position.set(0, topY, 0);
      group.add(topMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(topGeom), edgeMaterial).translateY(topY));

      // Bottom Big Disc
      const botGeom = new THREE.CylinderGeometry(sRadius, sRadius, lidH, 48);
      const botMat = new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.3 });
      const botMesh = new THREE.Mesh(botGeom, botMat);
      botMesh.position.set(0, botY, 0);
      group.add(botMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(botGeom), edgeMaterial).translateY(botY));

      // Slant Lateral Body
      const bodyGeom = new THREE.CylinderGeometry(sRadiusTop, sRadius, sHeight, 48, 16, true);
      const bodyMat = new THREE.MeshStandardMaterial({ color: color || '#3b82f6', side: THREE.DoubleSide });
      const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
      group.add(bodyMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeom), edgeMaterial));

      // Axis Line
      const axisPoints = [
        new THREE.Vector3(0, botY, 0),
        new THREE.Vector3(0, topY, 0),
      ];
      const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPoints);
      const axisLine = new THREE.Line(
        axisGeom,
        new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.4, gapSize: 0.2 })
      );
      axisLine.computeLineDistances();
      group.add(axisLine);

      if (showLabels) {
        const topSprite = createTextSprite('ऊपरी वृत्त (Top: π r₂²)', '#431407', '#fb923c');
        topSprite.position.set(0, topY + 0.8, 0);
        group.add(topSprite);

        const midSprite = createTextSprite('वक्र पृष्ठ (CSA: π(r₁+r₂)l)', '#1e1b4b', '#818cf8');
        midSprite.position.set(0, 0, (sRadius + sRadiusTop) / 2 + 1.2);
        group.add(midSprite);

        const botSprite = createTextSprite('निचला वृत्त (Base: π r₁²)', '#064e3b', '#34d399');
        botSprite.position.set(0, botY - 0.8, 0);
        group.add(botSprite);
      }
      return;
    }

    // 6. PYRAMID (पिरामिड): Base Square Slab + 4 Triangular Slant Faces
    if (type === 'pyramid') {
      const a = sLength;
      const H = sHeight;
      const baseY = -explodeDist * 1.5;
      const t = 0.15;

      // Base Square Slab
      const baseGeom = new THREE.BoxGeometry(a, t, a);
      const baseMat = new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.3 });
      const baseMesh = new THREE.Mesh(baseGeom, baseMat);
      baseMesh.position.set(0, baseY, 0);
      group.add(baseMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeom), edgeMaterial).translateY(baseY));

      // 4 Slant Triangular Faces sliding outwards in 3D
      const lSlant = Math.sqrt((a / 2) * (a / 2) + H * H);
      const triGeom = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -a / 2, 0, 0,
        a / 2, 0, 0,
        0, lSlant, 0,
      ]);
      triGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      triGeom.computeVertexNormals();

      const triMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', side: THREE.DoubleSide, roughness: 0.3 });
      const slantAngle = Math.atan2(a / 2, H);
      const outDist = explodeDist * 1.1;

      // Front Face (+Z)
      const fMesh = new THREE.Mesh(triGeom, triMat);
      fMesh.rotation.x = slantAngle;
      fMesh.position.set(0, 0, a / 2 + outDist);
      group.add(fMesh);

      // Back Face (-Z)
      const bMesh = new THREE.Mesh(triGeom, triMat);
      bMesh.rotation.x = -slantAngle;
      bMesh.rotation.y = Math.PI;
      bMesh.position.set(0, 0, -a / 2 - outDist);
      group.add(bMesh);

      // Left Face (-X)
      const lMesh = new THREE.Mesh(triGeom, triMat);
      lMesh.rotation.y = Math.PI / 2;
      lMesh.rotation.x = -slantAngle;
      lMesh.position.set(-a / 2 - outDist, 0, 0);
      group.add(lMesh);

      // Right Face (+X)
      const rMesh = new THREE.Mesh(triGeom, triMat);
      rMesh.rotation.y = -Math.PI / 2;
      rMesh.rotation.x = -slantAngle;
      rMesh.position.set(a / 2 + outDist, 0, 0);
      group.add(rMesh);

      if (showLabels) {
        const baseSprite = createTextSprite('आधार वर्ग (Base: a²)', '#1e3a8a', '#60a5fa');
        baseSprite.position.set(0, baseY - 0.7, 0);
        group.add(baseSprite);

        const faceSprite = createTextSprite('4 पार्श्व त्रिभुज (4 × ½a×l)', '#451a03', '#fbbf24');
        faceSprite.position.set(0, lSlant * 0.6, a / 2 + outDist + 0.8);
        group.add(faceSprite);
      }
      return;
    }

    // 7. PRISM (प्रिज्म): Top Triangle Cap + Bottom Triangle Base + 3 Lateral Rectangles
    if (type === 'prism') {
      const a = sLength;
      const H = sHeight;
      const topY = H / 2 + explodeDist * 1.5;
      const botY = -H / 2 - explodeDist * 1.5;

      const topGeom = new THREE.CylinderGeometry(a * 0.6, a * 0.6, 0.15, 3, 1, false);
      const topMat = new THREE.MeshStandardMaterial({ color: '#6366f1', roughness: 0.3 });
      const topMesh = new THREE.Mesh(topGeom, topMat);
      topMesh.position.set(0, topY, 0);
      group.add(topMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(topGeom), edgeMaterial).translateY(topY));

      const botGeom = new THREE.CylinderGeometry(a * 0.6, a * 0.6, 0.15, 3, 1, false);
      const botMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.3 });
      const botMesh = new THREE.Mesh(botGeom, botMat);
      botMesh.position.set(0, botY, 0);
      group.add(botMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(botGeom), edgeMaterial).translateY(botY));

      // 3 Lateral Rectangular Panels
      const rDist = a * 0.35 + explodeDist * 1.1;
      for (let i = 0; i < 3; i++) {
        const theta = (i * 2 * Math.PI) / 3;
        const rectGeom = new THREE.BoxGeometry(a * 0.95, H, 0.08);
        const rectMat = new THREE.MeshStandardMaterial({ color: i === 0 ? '#3b82f6' : i === 1 ? '#10b981' : '#f59e0b', roughness: 0.3 });
        const rMesh = new THREE.Mesh(rectGeom, rectMat);
        rMesh.position.set(rDist * Math.sin(theta), 0, rDist * Math.cos(theta));
        rMesh.rotation.y = theta;
        group.add(rMesh);
      }

      if (showLabels) {
        const topSprite = createTextSprite('ऊपरी त्रिभुज (Top: ½a×h_t)', '#312e81', '#a5b4fc');
        topSprite.position.set(0, topY + 0.8, 0);
        group.add(topSprite);

        const latSprite = createTextSprite('3 आयताकार फलक (3 × a×h)', '#1e1b4b', '#818cf8');
        latSprite.position.set(0, 0, rDist + 1.2);
        group.add(latSprite);

        const botSprite = createTextSprite('निचला त्रिभुज (Base: ½a×h_t)', '#881337', '#fda4af');
        botSprite.position.set(0, botY - 0.8, 0);
        group.add(botSprite);
      }
      return;
    }

    // 8. HOLLOW CYLINDER (खोखला बेलन): Top Ring + Bottom Ring + Outer Mantle + Inner Core
    if (type === 'hollow_cylinder') {
      const ringHeight = Math.max(0.08, sHeight * 0.05);
      const makeRingGeom = () => {
        const arcShape = new THREE.Shape();
        arcShape.absarc(0, 0, sRadiusOuter, 0, Math.PI * 2, false);
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, sRadius, 0, Math.PI * 2, true);
        arcShape.holes.push(holePath);
        const extrudeSettings = { depth: ringHeight, bevelEnabled: false, curveSegments: 48 };
        const g = new THREE.ExtrudeGeometry(arcShape, extrudeSettings);
        g.center();
        g.rotateX(Math.PI / 2);
        return g;
      };

      const topY = sHeight / 2 + explodeDist * 1.6;
      const botY = -sHeight / 2 - explodeDist * 1.6;

      const topRingGeom = makeRingGeom();
      const topRingMat = new THREE.MeshStandardMaterial({ color: '#10b981', side: THREE.DoubleSide });
      const topRingMesh = new THREE.Mesh(topRingGeom, topRingMat);
      topRingMesh.position.y = topY;
      group.add(topRingMesh);

      const botRingGeom = makeRingGeom();
      const botRingMat = new THREE.MeshStandardMaterial({ color: '#06b6d4', side: THREE.DoubleSide });
      const botRingMesh = new THREE.Mesh(botRingGeom, botRingMat);
      botRingMesh.position.y = botY;
      group.add(botRingMesh);

      const outerGeom = new THREE.CylinderGeometry(sRadiusOuter, sRadiusOuter, sHeight, 48, 16, true);
      const outerMat = new THREE.MeshStandardMaterial({ color: color || '#3b82f6', side: THREE.DoubleSide, opacity: 0.85, transparent: true });
      group.add(new THREE.Mesh(outerGeom, outerMat));

      const innerGeom = new THREE.CylinderGeometry(sRadius, sRadius, sHeight, 48, 16, true);
      const innerMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', side: THREE.DoubleSide, opacity: 0.9, transparent: true });
      group.add(new THREE.Mesh(innerGeom, innerMat));

      if (showLabels) {
        const topSprite = createTextSprite('ऊपरी वलय (Top Ring: π(R²-r²))', '#064e3b', '#34d399');
        topSprite.position.set(0, topY + 0.8, 0);
        group.add(topSprite);

        const outSprite = createTextSprite('बाहरी वक्र पृष्ठ (2πRh)', '#1e1b4b', '#818cf8');
        outSprite.position.set(0, 0, sRadiusOuter + 1.2);
        group.add(outSprite);

        const inSprite = createTextSprite('आंतरिक वक्र पृष्ठ (2πrh)', '#451a03', '#fbbf24');
        inSprite.position.set(0, -0.6, sRadius + 0.6);
        group.add(inSprite);
      }
      return;
    }

    // 9. HEMISPHERE (अर्धगोला): Curved Dome + Flat Base Disc
    if (type === 'hemisphere') {
      const domeY = explodeDist * 1.4;
      const baseY = -explodeDist * 1.2;

      const domeGeom = new THREE.SphereGeometry(sRadius, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshStandardMaterial({ color: color || '#14b8a6', side: THREE.DoubleSide });
      const domeMesh = new THREE.Mesh(domeGeom, domeMat);
      domeMesh.position.y = domeY;
      group.add(domeMesh);

      const baseGeom = new THREE.CylinderGeometry(sRadius, sRadius, 0.12, 48);
      const baseMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', side: THREE.DoubleSide });
      const baseMesh = new THREE.Mesh(baseGeom, baseMat);
      baseMesh.position.y = baseY;
      group.add(baseMesh);

      if (showLabels) {
        const domeSprite = createTextSprite('वक्र पृष्ठ (CSA: 2πr²)', '#0f766e', '#2dd4bf');
        domeSprite.position.set(0, domeY + sRadius * 0.7, 0);
        group.add(domeSprite);

        const baseSprite = createTextSprite('समतल आधार (Base: πr²)', '#78350f', '#fcd34d');
        baseSprite.position.set(0, baseY - 0.8, 0);
        group.add(baseSprite);

        const tsaSprite = createTextSprite('कुल पृष्ठीय क्षेत्रफल TSA = 3πr²', '#1e1b4b', '#a5b4fc');
        tsaSprite.position.set(0, 0, sRadius + 1.0);
        group.add(tsaSprite);
      }
      return;
    }

    // 10. SPHERE (गोला): Top Hemisphere + Bottom Hemisphere + Center Equator Disc
    if (type === 'sphere') {
      const topY = explodeDist * 1.3;
      const botY = -explodeDist * 1.3;

      const topGeom = new THREE.SphereGeometry(sRadius, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2);
      const topMat = new THREE.MeshStandardMaterial({ color: color || '#ec4899', side: THREE.DoubleSide });
      const topMesh = new THREE.Mesh(topGeom, topMat);
      topMesh.position.y = topY;
      group.add(topMesh);

      const botGeom = new THREE.SphereGeometry(sRadius, 48, 48, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const botMat = new THREE.MeshStandardMaterial({ color: '#a855f7', side: THREE.DoubleSide });
      const botMesh = new THREE.Mesh(botGeom, botMat);
      botMesh.position.y = botY;
      group.add(botMesh);

      const centerGeom = new THREE.CylinderGeometry(sRadius, sRadius, 0.08, 48);
      const centerMat = new THREE.MeshStandardMaterial({ color: '#06b6d4', side: THREE.DoubleSide });
      const centerMesh = new THREE.Mesh(centerGeom, centerMat);
      group.add(centerMesh);

      if (showLabels) {
        const topSprite = createTextSprite('ऊपरी अर्धगोला (2πr²)', '#831843', '#f472b6');
        topSprite.position.set(0, topY + sRadius * 0.7, 0);
        group.add(topSprite);

        const centerSprite = createTextSprite('केंद्रीय वृत्ताकार काट (Great Circle: πr²)', '#083344', '#22d3ee');
        centerSprite.position.set(0, 0, sRadius + 1.0);
        group.add(centerSprite);

        const botSprite = createTextSprite('निचला अर्धगोला (2πr²)', '#3b0764', '#c084fc');
        botSprite.position.set(0, botY - sRadius * 0.7, 0);
        group.add(botSprite);
      }
      return;
    }

    // 11. WHEEL (पहिया): 3D Exploded Parts (Tire + Rim + Hub & Axle + Spokes + Road Contact)
    if (type === 'wheel') {
      const w = Math.max(0.4, sWidth || sHeight * 0.4 || 1.2);
      const dZ = explodeDist * 1.6;
      const dY = explodeDist * 1.3;

      // 1. Outer Rubber Tire (displaced along +Z)
      const tireGeom = new THREE.TorusGeometry(sRadius, w * 0.35, 24, 64);
      const tireMat = new THREE.MeshStandardMaterial({ color: color || '#1e293b', roughness: 0.6, metalness: 0.1 });
      const tireMesh = new THREE.Mesh(tireGeom, tireMat);
      tireMesh.position.set(0, 0, dZ * 1.3);
      group.add(tireMesh);

      // 2. Inner Steel Rim (displaced slightly)
      const rimGeom = new THREE.TorusGeometry(sRadius * 0.82, 0.12, 16, 64);
      const rimMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.2 });
      const rimMesh = new THREE.Mesh(rimGeom, rimMat);
      rimMesh.position.set(0, 0, dZ * 0.45);
      group.add(rimMesh);

      // 3. Central Hub & Axle (moves towards -Z)
      const hubGeom = new THREE.CylinderGeometry(sRadius * 0.22, sRadius * 0.22, w * 2.2, 32);
      hubGeom.rotateX(Math.PI / 2);
      const hubMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.6, roughness: 0.3 });
      const hubMesh = new THREE.Mesh(hubGeom, hubMat);
      hubMesh.position.set(0, 0, -dZ * 1.3);
      group.add(hubMesh);

      // 4. 8 Spokes Webbing (Radial spokes separating slightly outward)
      for (let i = 0; i < 8; i++) {
        const theta = (i * 2 * Math.PI) / 8;
        const spGeom = new THREE.CylinderGeometry(0.04, 0.04, sRadius * 0.75, 8);
        const spMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.7 });
        const spMesh = new THREE.Mesh(spGeom, spMat);
        const midR = sRadius * 0.42 + explodeDist * 0.35;
        spMesh.position.set(midR * Math.cos(theta), midR * Math.sin(theta), 0);
        spMesh.rotation.z = theta - Math.PI / 2;
        group.add(spMesh);
      }

      // 5. Road Contact Stamp / Footprint underneath
      const footprintGeom = new THREE.BoxGeometry(sRadius * 0.8, 0.08, w * 1.5);
      const footprintMat = new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.4 });
      const footprintMesh = new THREE.Mesh(footprintGeom, footprintMat);
      footprintMesh.position.set(0, -sRadius - dY, 0);
      group.add(footprintMesh);

      // Dashed Axis Line linking the 3D separated parts
      const axisPoints = [
        new THREE.Vector3(0, 0, -dZ * 1.5),
        new THREE.Vector3(0, 0, dZ * 1.5),
      ];
      const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPoints);
      const axisLine = new THREE.Line(
        axisGeom,
        new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.3, gapSize: 0.2 })
      );
      axisLine.computeLineDistances();
      group.add(axisLine);

      if (showLabels) {
        const tireSprite = createTextSprite('रबर टायर (Tire: 2πr परिधि)', '#0f172a', '#94a3b8');
        tireSprite.position.set(0, sRadius + 0.8, dZ * 1.3);
        group.add(tireSprite);

        const hubSprite = createTextSprite('धुरी व एक्सल (Hub & Axle)', '#451a03', '#fbbf24');
        hubSprite.position.set(0, -sRadius * 0.4, -dZ * 1.3 - 0.6);
        group.add(hubSprite);

        const spSprite = createTextSprite('स्पोक्स (Spokes: r = त्रिज्या)', '#083344', '#38bdf8');
        spSprite.position.set(sRadius * 0.8, sRadius * 0.5, 0.4);
        group.add(spSprite);

        const footSprite = createTextSprite('सड़क संपर्क (Road: 2πr × w)', '#064e3b', '#34d399');
        footSprite.position.set(0, -sRadius - dY - 0.6, 0);
        group.add(footSprite);
      }
      return;
    }
  }

  // --------------------------------------------------------------------------
  // Default Solid 3D Rendering (when unfoldP === 0 && explodedParts === 0)
  // --------------------------------------------------------------------------
  let geom: THREE.BufferGeometry;

  switch (type) {
    case 'wheel': {
      const w = Math.max(0.4, sWidth || sHeight * 0.4 || 1.2);
      // Outer Tire
      const tireGeom = new THREE.CylinderGeometry(sRadius, sRadius, w, 48, 1, false);
      tireGeom.rotateZ(Math.PI / 2);
      const tireMesh = new THREE.Mesh(tireGeom, baseMaterial);
      tireMesh.castShadow = true;
      group.add(tireMesh);

      // Steel Rim
      const rimGeom = new THREE.CylinderGeometry(sRadius * 0.85, sRadius * 0.85, w * 0.95, 32);
      rimGeom.rotateZ(Math.PI / 2);
      const rimMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.8, roughness: 0.2 });
      group.add(new THREE.Mesh(rimGeom, rimMat));

      // Hub
      const hubGeom = new THREE.CylinderGeometry(sRadius * 0.22, sRadius * 0.22, w * 1.25, 24);
      hubGeom.rotateZ(Math.PI / 2);
      const hubMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.6, roughness: 0.3 });
      group.add(new THREE.Mesh(hubGeom, hubMat));

      // 8 Spokes
      for (let i = 0; i < 8; i++) {
        const theta = (i * 2 * Math.PI) / 8;
        const spGeom = new THREE.CylinderGeometry(0.04, 0.04, sRadius * 0.85, 8);
        const spMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.8 });
        const spMesh = new THREE.Mesh(spGeom, spMat);
        spMesh.position.set(0, (sRadius * 0.425) * Math.sin(theta), (sRadius * 0.425) * Math.cos(theta));
        spMesh.rotation.x = theta + Math.PI / 2;
        group.add(spMesh);
      }

      geom = tireGeom;
      break;
    }
    case 'cylinder': {
      geom = new THREE.CylinderGeometry(sRadius, sRadius, sHeight, 48, 16, false);
      break;
    }
    case 'hollow_cylinder': {
      const arcShape = new THREE.Shape();
      arcShape.absarc(0, 0, sRadiusOuter, 0, Math.PI * 2, false);
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, sRadius, 0, Math.PI * 2, true);
      arcShape.holes.push(holePath);

      const extrudeSettings = {
        depth: sHeight,
        bevelEnabled: false,
        curveSegments: 48,
      };
      geom = new THREE.ExtrudeGeometry(arcShape, extrudeSettings);
      geom.center();
      geom.rotateX(Math.PI / 2);
      break;
    }
    case 'cone': {
      geom = new THREE.ConeGeometry(sRadius, sHeight, 48, 16, false);
      break;
    }
    case 'cube': {
      geom = new THREE.BoxGeometry(sLength, sLength, sLength, 8, 8, 8);
      break;
    }
    case 'cuboid': {
      geom = new THREE.BoxGeometry(sLength, sHeight, sWidth, 8, 8, 8);
      break;
    }
    case 'sphere': {
      geom = new THREE.SphereGeometry(sRadius, 48, 48);
      break;
    }
    case 'hemisphere': {
      geom = new THREE.SphereGeometry(sRadius, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2);
      break;
    }
    case 'frustum': {
      geom = new THREE.CylinderGeometry(Math.max(0.05, sRadiusTop), sRadius, sHeight, 48, 16, false);
      break;
    }
    case 'prism': {
      geom = new THREE.CylinderGeometry(sLength * 0.6, sLength * 0.6, sHeight, 3, 1, false);
      break;
    }
    case 'pyramid': {
      geom = new THREE.ConeGeometry(sLength * 0.707, sHeight, 4, 1, false);
      geom.rotateY(Math.PI / 4);
      break;
    }
    default:
      geom = new THREE.BoxGeometry(3, 3, 3);
  }

  const mesh = new THREE.Mesh(geom, baseMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const edges = new THREE.EdgesGeometry(geom);
  const line = new THREE.LineSegments(edges, edgeMaterial);
  group.add(line);

  if (params.showDimensions) {
    addDimensionLines(group, params);
  }
}

function addDimensionLines(group: THREE.Group, params: ShapeParams) {
  const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
  const points: THREE.Vector3[] = [];

  if (params.type === 'cylinder' || params.type === 'cone' || params.type === 'frustum') {
    const h = params.height;
    const r = params.radius;

    // Height vertical line in center
    points.push(new THREE.Vector3(0, -h / 2, 0));
    points.push(new THREE.Vector3(0, h / 2, 0));

    // Base radius line
    points.push(new THREE.Vector3(0, -h / 2, 0));
    points.push(new THREE.Vector3(r, -h / 2, 0));
  } else if (params.type === 'cube') {
    const l = params.length;
    // Length line
    points.push(new THREE.Vector3(-l / 2, -l / 2, l / 2 + 0.2));
    points.push(new THREE.Vector3(l / 2, -l / 2, l / 2 + 0.2));
  } else if (params.type === 'cuboid') {
    const l = params.length;
    const h = params.height;
    const w = params.width;
    points.push(new THREE.Vector3(-l / 2, -h / 2, w / 2 + 0.2));
    points.push(new THREE.Vector3(l / 2, -h / 2, w / 2 + 0.2));
  }

  if (points.length > 0) {
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const dimLine = new THREE.LineSegments(lineGeom, lineMat);
    group.add(dimLine);
  }
}

// ============================================================================
// Cube / Cuboid Cutting & Coloring Reasoning Renderer
// ============================================================================
function renderCubeCutting(
  group: THREE.Group,
  params: CubeCutParams,
  selectedCube: MiniCubeData | null | undefined,
  meshMapRef: React.MutableRefObject<Map<string, { mesh: THREE.Mesh; data: MiniCubeData }>>
) {
  const { miniCubes } = generateMiniCubes(params);

  const countX = params.isCuboid ? params.nx : params.n;
  const countY = params.isCuboid ? params.ny : params.n;
  const countZ = params.isCuboid ? params.nz : params.n;

  const cubeSize = 1.0;
  const gap = 0.08 + params.explosion * 1.2; // Exploded separation distance

  const offsetX = ((countX - 1) * (cubeSize + gap)) / 2;
  const offsetY = ((countY - 1) * (cubeSize + gap)) / 2;
  const offsetZ = ((countZ - 1) * (cubeSize + gap)) / 2;

  const innerColor = '#475569'; // slate-600 unpainted inner core

  const colorHexMap: Record<string, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#10b981',
    yellow: '#eab308',
    purple: '#a855f7',
    orange: '#f97316',
    pink: '#ec4899',
    cyan: '#06b6d4',
    white: '#f8fafc',
    black: '#0f172a',
  };

  const getHex = (c: string) => colorHexMap[c.toLowerCase()] || c || innerColor;

  miniCubes.forEach((cubeData) => {
    if (!cubeData.isVisible) return;

    const posX = cubeData.x * (cubeSize + gap) - offsetX;
    const posY = cubeData.y * (cubeSize + gap) - offsetY;
    const posZ = cubeData.z * (cubeSize + gap) - offsetZ;

    // Build 6 materials for the 6 faces of BoxGeometry:
    // [0: Right (+x), 1: Left (-x), 2: Top (+y), 3: Bottom (-y), 4: Front (+z), 5: Back (-z)]
    const rightPaint = cubeData.paintedFaces.find((f) => f.face === 'right');
    const leftPaint = cubeData.paintedFaces.find((f) => f.face === 'left');
    const topPaint = cubeData.paintedFaces.find((f) => f.face === 'top');
    const bottomPaint = cubeData.paintedFaces.find((f) => f.face === 'bottom');
    const frontPaint = cubeData.paintedFaces.find((f) => f.face === 'front');
    const backPaint = cubeData.paintedFaces.find((f) => f.face === 'back');

    const isSelected = selectedCube?.id === cubeData.id;
    const isHighlighted = cubeData.isHighlighted;

    const createFaceMat = (paint?: { face: string; color: string }) => {
      let faceColor = paint ? getHex(paint.color) : innerColor;
      let opacity = 1.0;
      let emissive = new THREE.Color(0x000000);

      if (isSelected) {
        emissive = new THREE.Color(0xf59e0b); // glowing gold
      } else if (isHighlighted) {
        if (cubeData.type === 'corner') emissive = new THREE.Color(0x221100);
        else if (cubeData.type === 'edge') emissive = new THREE.Color(0x001122);
      } else {
        opacity = 0.15; // Dim non-matching cubes when filtered
      }

      return new THREE.MeshStandardMaterial({
        color: faceColor,
        roughness: 0.3,
        metalness: 0.15,
        transparent: opacity < 1.0,
        opacity: opacity,
        emissive: emissive,
        emissiveIntensity: isSelected ? 0.6 : 0.2,
      });
    };

    const materials = [
      createFaceMat(rightPaint),
      createFaceMat(leftPaint),
      createFaceMat(topPaint),
      createFaceMat(bottomPaint),
      createFaceMat(frontPaint),
      createFaceMat(backPaint),
    ];

    const geom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const mesh = new THREE.Mesh(geom, materials);
    mesh.position.set(posX, posY, posZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Outline / Edges
    const edgesGeom = new THREE.EdgesGeometry(geom);
    const edgesMat = new THREE.LineBasicMaterial({
      color: isSelected ? 0xffea00 : isHighlighted ? 0xffffff : 0x334155,
      linewidth: isSelected ? 3 : 1,
      transparent: true,
      opacity: isHighlighted ? 0.7 : 0.2,
    });
    const edgeLines = new THREE.LineSegments(edgesGeom, edgesMat);
    mesh.add(edgeLines);

    group.add(mesh);
    meshMapRef.current.set(cubeData.id, { mesh, data: cubeData });
  });
}

// ============================================================================
// Dice Scene Renderer (3D Multi-Dice up to 4, Edge-Hinged Step-by-Step 3D Unfold)
// ============================================================================
function renderDiceScene(group: THREE.Group, params: Dice3DParams) {
  const {
    diceValues = [1, 6, 2, 5, 3, 4],
    diceList,
    activeDiceIndex = 0,
    isUnfolded = false,
    unfoldProgress = 0,
    unfoldStep = 0,
    stepByStepMode = false,
  } = params;

  // Create high-res canvas texture with dice pips and numbers
  const createDiceTexture = (
    value: number | string,
    bgColor = '#0f172a',
    borderColor = '#4f46e5',
    accentColor = '#f8fafc',
    label?: string
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Outer Border & Corner Accents
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 18;
    ctx.strokeRect(12, 12, 488, 488);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 464, 464);

    // Face Name Label on top (if provided)
    if (label) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 256, 56);
    }

    const valNum = typeof value === 'number' ? value : parseInt(String(value), 10);

    // If it's 1-6, draw realistic casino/reasoning pips + bold number
    if (!isNaN(valNum) && valNum >= 1 && valNum <= 6) {
      const dotColor = valNum === 1 ? '#ef4444' : valNum === 6 ? '#38bdf8' : '#fbbf24';
      ctx.fillStyle = dotColor;

      const drawPip = (x: number, y: number, r = 36) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner pip highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dotColor;
      };

      const c = 256;
      const l = 120;
      const r = 392;
      const t = 120;
      const b = 392;

      if (valNum === 1) {
        drawPip(c, c, 52);
      } else if (valNum === 2) {
        drawPip(l, t);
        drawPip(r, b);
      } else if (valNum === 3) {
        drawPip(l, t);
        drawPip(c, c);
        drawPip(r, b);
      } else if (valNum === 4) {
        drawPip(l, t);
        drawPip(r, t);
        drawPip(l, b);
        drawPip(r, b);
      } else if (valNum === 5) {
        drawPip(l, t);
        drawPip(r, t);
        drawPip(c, c);
        drawPip(l, b);
        drawPip(r, b);
      } else if (valNum === 6) {
        drawPip(l, t);
        drawPip(r, t);
        drawPip(l, c);
        drawPip(r, c);
        drawPip(l, b);
        drawPip(r, b);
      }

      // Large Watermark Number
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.font = 'bold 96px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(valNum), 256, 256);
    } else {
      // Large Custom Text / Symbol / Letter (e.g. A, B, C or symbols)
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 180px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(value), 256, 256);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  };

  // Helper to create 3D text badge sprite for dice label (e.g., "पासा 1 (Position A)")
  const createLabelSprite = (text: string, subText: string, color = '#38bdf8') => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Group();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.roundRect(10, 10, 492, 140, 24);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 65);

    ctx.fillStyle = color;
    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.fillText(subText, 256, 118);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.2, 1.0, 1);
    return sprite;
  };

  // --------------------------------------------------------------------------
  // SCENARIO 1: Open Net 3D Step-by-Step Folding / Unfolding
  // --------------------------------------------------------------------------
  if (isUnfolded || unfoldProgress > 0 || unfoldStep > 0) {
    const [topVal, bottomVal, frontVal, backVal, leftVal, rightVal] = diceValues;
    const s = 2.4; // Face Plate size

    // Compute folding angles for each face based on progress or step
    // An angle of 0 is flat 2D net.
    // Closed angles: Top: -PI/2, Bottom: +PI/2, Left: +PI/2, Right: -PI/2, Back: -PI/2 (relative to right face)
    let topAngle = 0;
    let bottomAngle = 0;
    let leftAngle = 0;
    let rightAngle = 0;
    let backAngle = 0;

    if (stepByStepMode && unfoldStep !== undefined) {
      // Step 0: All closed into a perfect 3D solid cube
      // Step 1: Top opens 90° up to flat 2D
      // Step 2: Bottom opens 90° down to flat 2D
      // Step 3: Left opens 90° left to flat 2D
      // Step 4: Right opens 90° right to flat 2D
      // Step 5: Back opens 90° right from Right face (Full 2D Cross Net)
      topAngle = unfoldStep >= 1 ? 0 : -Math.PI / 2;
      bottomAngle = unfoldStep >= 2 ? 0 : Math.PI / 2;
      leftAngle = unfoldStep >= 3 ? 0 : -Math.PI / 2;
      rightAngle = unfoldStep >= 4 ? 0 : Math.PI / 2;
      backAngle = unfoldStep >= 5 ? 0 : Math.PI / 2;
    } else {
      // Sequential Smooth Continuous Progress (0 to 1)
      const p = unfoldProgress;
      // Phase 1: Top (0.0 to 0.2)
      const pTop = Math.min(1, Math.max(0, p / 0.2));
      topAngle = (1 - pTop) * (-Math.PI / 2);

      // Phase 2: Bottom (0.2 to 0.4)
      const pBottom = Math.min(1, Math.max(0, (p - 0.2) / 0.2));
      bottomAngle = (1 - pBottom) * (Math.PI / 2);

      // Phase 3: Left (0.4 to 0.6)
      const pLeft = Math.min(1, Math.max(0, (p - 0.4) / 0.2));
      leftAngle = (1 - pLeft) * (-Math.PI / 2);

      // Phase 4: Right (0.6 to 0.8)
      const pRight = Math.min(1, Math.max(0, (p - 0.6) / 0.2));
      rightAngle = (1 - pRight) * (Math.PI / 2);

      // Phase 5: Back (0.8 to 1.0)
      const pBack = Math.min(1, Math.max(0, (p - 0.8) / 0.2));
      backAngle = (1 - pBack) * (Math.PI / 2);
    }

    const createFaceBox = (
      val: number,
      bgColor: string,
      borderColor: string,
      labelHi: string
    ) => {
      const faceMat = new THREE.MeshStandardMaterial({
        map: createDiceTexture(val, bgColor, borderColor, '#ffffff', labelHi),
        roughness: 0.25,
        metalness: 0.15,
      });
      const sideMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const backMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });

      // BoxGeometry: [Right, Left, Top, Bottom, Front (+Z), Back (-Z)]
      const materials = [sideMat, sideMat, sideMat, sideMat, faceMat, backMat];
      const geom = new THREE.BoxGeometry(s * 0.96, s * 0.96, 0.08);
      const mesh = new THREE.Mesh(geom, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // 1. Center Anchor Face: FRONT FACE (fixed at origin)
    const frontFace = createFaceBox(frontVal, '#1e3a8a', '#3b82f6', 'सामने (Front)');
    frontFace.position.set(0, 0, 0);
    group.add(frontFace);

    // 2. TOP FACE HINGE (attached to top edge of Front Face at y = +s/2)
    const topHinge = new THREE.Group();
    topHinge.position.set(0, s / 2, 0);
    const topFace = createFaceBox(topVal, '#312e81', '#6366f1', 'ऊपर (Top)');
    topFace.position.set(0, s / 2, 0);
    topHinge.add(topFace);
    topHinge.rotation.x = topAngle;
    group.add(topHinge);

    // 3. BOTTOM FACE HINGE (attached to bottom edge of Front Face at y = -s/2)
    const bottomHinge = new THREE.Group();
    bottomHinge.position.set(0, -s / 2, 0);
    const bottomFace = createFaceBox(bottomVal, '#881337', '#f43f5e', 'नीचे (Bottom)');
    bottomFace.position.set(0, -s / 2, 0);
    bottomHinge.add(bottomFace);
    bottomHinge.rotation.x = bottomAngle;
    group.add(bottomHinge);

    // 4. LEFT FACE HINGE (attached to left edge of Front Face at x = -s/2)
    const leftHinge = new THREE.Group();
    leftHinge.position.set(-s / 2, 0, 0);
    const leftFace = createFaceBox(leftVal, '#064e3b', '#10b981', 'बाएं (Left)');
    leftFace.position.set(-s / 2, 0, 0);
    leftHinge.add(leftFace);
    leftHinge.rotation.y = leftAngle;
    group.add(leftHinge);

    // 5. RIGHT FACE HINGE (attached to right edge of Front Face at x = +s/2)
    const rightHinge = new THREE.Group();
    rightHinge.position.set(s / 2, 0, 0);
    const rightFace = createFaceBox(rightVal, '#78350f', '#f59e0b', 'दाएं (Right)');
    rightFace.position.set(s / 2, 0, 0);
    rightHinge.add(rightFace);

    // 6. BACK FACE HINGE (attached hierarchically to the outer edge of Right Face at x = +s)
    const backHinge = new THREE.Group();
    backHinge.position.set(s, 0, 0);
    const backFace = createFaceBox(backVal, '#581c87', '#a855f7', 'पीछे (Back)');
    backFace.position.set(s / 2, 0, 0);
    backHinge.add(backFace);
    backHinge.rotation.y = backAngle;

    rightHinge.add(backHinge);
    rightHinge.rotation.y = rightAngle;
    group.add(rightHinge);

    return;
  }

  // --------------------------------------------------------------------------
  // SCENARIO 2: Multi-Dice 3D Mode (1, 2, 3, or 4 Dice positions)
  // --------------------------------------------------------------------------
  const diceArray: SingleDiceView[] =
    diceList && diceList.length > 0
      ? diceList
      : [
          {
            id: 1,
            top: diceValues[0],
            bottom: diceValues[1],
            front: diceValues[2],
            back: diceValues[3],
            left: diceValues[4],
            right: diceValues[5],
            labelHi: 'पासा 1',
            labelEn: 'Dice 1',
          },
        ];

  const count = Math.min(4, Math.max(1, diceArray.length));
  const diceSize = count === 1 ? 3.4 : count === 2 ? 3.0 : 2.5;

  // Compute 3D Positions for up to 4 Dice
  const positions: [number, number, number][] = [];
  if (count === 1) {
    positions.push([0, 0, 0]);
  } else if (count === 2) {
    positions.push([-3.2, 0, 0]);
    positions.push([3.2, 0, 0]);
  } else if (count === 3) {
    positions.push([-5.2, 0, 0]);
    positions.push([0, 0, 0]);
    positions.push([5.2, 0, 0]);
  } else {
    // 4 Dice Layout: 2x2 grid or horizontal line
    positions.push([-3.4, 2.0, 0]);
    positions.push([3.4, 2.0, 0]);
    positions.push([-3.4, -2.0, 0]);
    positions.push([3.4, -2.0, 0]);
  }

  diceArray.slice(0, count).forEach((dice, idx) => {
    const [posX, posY, posZ] = positions[idx];
    const diceGroup = new THREE.Group();
    diceGroup.position.set(posX, posY, posZ);

    // Materials for 6 faces:
    // [0: Right (+X), 1: Left (-X), 2: Top (+Y), 3: Bottom (-Y), 4: Front (+Z), 5: Back (-Z)]
    const rightV = dice.right ?? (diceValues ? diceValues[5] : 4);
    const leftV = dice.left ?? (diceValues ? diceValues[4] : 3);
    const topV = dice.top ?? (diceValues ? diceValues[0] : 1);
    const bottomV = dice.bottom ?? (diceValues ? diceValues[1] : 6);
    const frontV = dice.front ?? (diceValues ? diceValues[2] : 2);
    const backV = dice.back ?? (diceValues ? diceValues[3] : 5);

    const materials = [
      new THREE.MeshStandardMaterial({
        map: createDiceTexture(rightV, '#78350f', '#f59e0b', '#fbbf24', 'Right'),
        roughness: 0.2,
      }),
      new THREE.MeshStandardMaterial({
        map: createDiceTexture(leftV, '#064e3b', '#10b981', '#34d399', 'Left'),
        roughness: 0.2,
      }),
      new THREE.MeshStandardMaterial({
        map: createDiceTexture(topV, '#312e81', '#6366f1', '#818cf8', 'Top'),
        roughness: 0.2,
      }),
      new THREE.MeshStandardMaterial({
        map: createDiceTexture(bottomV, '#881337', '#f43f5e', '#fb7185', 'Bottom'),
        roughness: 0.2,
      }),
      new THREE.MeshStandardMaterial({
        map: createDiceTexture(frontV, '#1e3a8a', '#3b82f6', '#60a5fa', 'Front'),
        roughness: 0.2,
      }),
      new THREE.MeshStandardMaterial({
        map: createDiceTexture(backV, '#581c87', '#a855f7', '#c084fc', 'Back'),
        roughness: 0.2,
      }),
    ];

    const geom = new THREE.BoxGeometry(diceSize, diceSize, diceSize);
    const mesh = new THREE.Mesh(geom, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    diceGroup.add(mesh);

    // Sleek Edge Lines
    const edgesGeom = new THREE.EdgesGeometry(geom);
    const edgesMat = new THREE.LineBasicMaterial({
      color: idx === activeDiceIndex ? 0x38bdf8 : 0x475569,
      linewidth: 2,
    });
    const edgeLines = new THREE.LineSegments(edgesGeom, edgesMat);
    diceGroup.add(edgeLines);

    // Glowing Pedestal Ring under each dice
    const ringGeom = new THREE.RingGeometry(diceSize * 0.65, diceSize * 0.85, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: idx === activeDiceIndex ? 0x6366f1 : 0x334155,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -diceSize / 2 - 0.05;
    diceGroup.add(ringMesh);

    // 3D Text Badge Label
    const diceNameHi = dice.labelHi || `पासा ${idx + 1}`;
    const diceNameEn = dice.labelEn || `Position ${String.fromCharCode(65 + idx)}`;
    const labelSprite = createLabelSprite(
      diceNameHi,
      `T:${topV} F:${frontV} R:${rightV}`,
      idx === activeDiceIndex ? '#38bdf8' : '#94a3b8'
    );
    labelSprite.position.set(0, diceSize / 2 + 0.8, 0);
    diceGroup.add(labelSprite);

    group.add(diceGroup);
  });
}
