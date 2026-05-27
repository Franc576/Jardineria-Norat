import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent implements OnInit, OnDestroy {
  @ViewChild('rendererCanvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  // Three.js core objects
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private plantGroup!: THREE.Group;

  // Animation
  private animationFrameId = 0;
  private mouse = { x: 0, y: 0 };

  // Bound event handlers (for cleanup)
  private onMouseMoveBound = this.onMouseMove.bind(this);
  private onResizeBound = this.onResize.bind(this);

  constructor(private ngZone: NgZone) {}

  // ────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────

  ngOnInit(): void {
    this.initScene();
    this.createLights();
    this.createPlantModel();

    // Run the render loop outside Angular's change detection
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.onMouseMoveBound);
      window.addEventListener('resize', this.onResizeBound);
      this.animate();
    });
  }

  ngOnDestroy(): void {
    // Stop animation loop
    cancelAnimationFrame(this.animationFrameId);

    // Remove listeners
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    window.removeEventListener('resize', this.onResizeBound);

    // Dispose Three.js resources
    this.disposeGroup(this.plantGroup);
    this.renderer.dispose();
  }

  // ────────────────────────────────────────
  // Scene setup
  // ────────────────────────────────────────

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.parentElement?.clientWidth ?? canvas.clientWidth;
    const height = canvas.parentElement?.clientHeight ?? canvas.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true, // Transparent background to blend with page
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 2.5, 8);
    this.camera.lookAt(0, 1.2, 0);
  }

  // ────────────────────────────────────────
  // Lights
  // ────────────────────────────────────────

  private createLights(): void {
    // Soft ambient fill
    const ambient = new THREE.AmbientLight(0xd5e8d4, 0.7);
    this.scene.add(ambient);

    // Main directional light with shadows
    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(5, 8, 6);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 20;
    this.scene.add(directional);

    // Subtle warm fill from below-left
    const fillLight = new THREE.DirectionalLight(0x52b788, 0.3);
    fillLight.position.set(-3, 0, 4);
    this.scene.add(fillLight);
  }

  // ────────────────────────────────────────
  // 3D Plant model (stylised placeholder)
  // ────────────────────────────────────────

  private createPlantModel(): void {
    this.plantGroup = new THREE.Group();

    // ── Pot (cylinder) ──
    const potGeometry = new THREE.CylinderGeometry(0.7, 0.5, 1.1, 32);
    const potMaterial = new THREE.MeshStandardMaterial({
      color: 0x5e3a1a,
      roughness: 0.75,
      metalness: 0.05,
    });
    const pot = new THREE.Mesh(potGeometry, potMaterial);
    pot.position.y = 0.55;
    pot.castShadow = true;
    pot.receiveShadow = true;
    this.plantGroup.add(pot);

    // ── Soil disc ──
    const soilGeometry = new THREE.CylinderGeometry(0.66, 0.66, 0.1, 32);
    const soilMaterial = new THREE.MeshStandardMaterial({
      color: 0x3e2a0e,
      roughness: 0.9,
    });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.y = 1.1;
    this.plantGroup.add(soil);

    // ── Trunk (thin cylinder) ──
    const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.13, 1.6, 12);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4226,
      roughness: 0.8,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.9;
    trunk.castShadow = true;
    this.plantGroup.add(trunk);

    // ── Foliage spheres (stylised tree crown) ──
    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x40916c,
      roughness: 0.6,
      metalness: 0.05,
    });

    const foliagePositions: [number, number, number, number][] = [
      // [x, y, z, radius]
      [0, 3.2, 0, 0.9],       // centre large
      [0.5, 3.5, 0.3, 0.6],   // right-top
      [-0.5, 3.4, -0.2, 0.6], // left-top
      [0.1, 3.8, -0.1, 0.5],  // top
      [-0.3, 3.0, 0.4, 0.55], // left-bottom
      [0.4, 2.9, -0.3, 0.5],  // right-bottom
    ];

    for (const [x, y, z, r] of foliagePositions) {
      const geo = new THREE.SphereGeometry(r, 24, 24);
      const mesh = new THREE.Mesh(geo, foliageMaterial);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      this.plantGroup.add(mesh);
    }

    // ── Accent leaves (small bright spheres) ──
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x52b788,
      roughness: 0.5,
    });

    const accentPositions: [number, number, number][] = [
      [0.7, 3.6, 0.5],
      [-0.6, 3.7, 0.3],
      [0.3, 4.0, -0.4],
      [-0.4, 3.1, -0.5],
    ];

    for (const [x, y, z] of accentPositions) {
      const geo = new THREE.SphereGeometry(0.22, 16, 16);
      const mesh = new THREE.Mesh(geo, accentMaterial);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      this.plantGroup.add(mesh);
    }

    // ── Ground shadow receiver disc ──
    const groundGeo = new THREE.CircleGeometry(2, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.01;
    ground.receiveShadow = true;
    this.plantGroup.add(ground);

    this.scene.add(this.plantGroup);
  }

  // ────────────────────────────────────────
  // Animation loop
  // ────────────────────────────────────────

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Continuous gentle rotation
    this.plantGroup.rotation.y += 0.004;

    // Mouse-driven parallax tilt (smoothed)
    const targetRotX = this.mouse.y * 0.3;
    const targetRotZ = -this.mouse.x * 0.15;
    this.plantGroup.rotation.x += (targetRotX - this.plantGroup.rotation.x) * 0.05;
    this.plantGroup.rotation.z += (targetRotZ - this.plantGroup.rotation.z) * 0.05;

    this.renderer.render(this.scene, this.camera);
  }

  // ────────────────────────────────────────
  // Event handlers
  // ────────────────────────────────────────

  private onMouseMove(event: MouseEvent): void {
    // Normalise to range [-1, 1]
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
  }

  private onResize(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ────────────────────────────────────────
  // Cleanup helpers
  // ────────────────────────────────────────

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(group);
  }
}
