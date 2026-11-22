import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Small orbitable 3D preview of the generated mesh. */
export class Preview3D {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10000);
  private controls: OrbitControls | null = null;
  private mesh: THREE.Mesh | null = null;
  private material = new THREE.MeshStandardMaterial({ color: 0x2f9e8f, roughness: 0.55, metalness: 0.05, flatShading: false });
  private grid: THREE.GridHelper | null = null;
  private lastSize = 0;
  private raf = 0;
  readonly available: boolean;

  constructor(private host: HTMLElement) {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
    } catch {
      this.renderer = null;
    }
    this.available = !!this.renderer;
    if (!this.renderer) {
      host.textContent = 'WebGL unavailable';
      return;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.append(this.renderer.domElement);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(60, -90, 70);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener('change', () => this.render());
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(50, -80, 120);
    this.scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dir2.position.set(-60, 60, -40);
    this.scene.add(dir2);
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  setColor(hex: number): void {
    this.material.color.setHex(hex);
    this.render();
  }

  private resize(): void {
    if (!this.renderer) return;
    const w = this.host.clientWidth || 300;
    const h = this.host.clientHeight || 220;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  /** Replace the displayed mesh. Re-frames the camera when the size changes a lot. */
  update(tris: Float32Array, forceFit = false): void {
    if (!this.renderer) return;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (tris.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(tris, 3));
      g.computeVertexNormals();
      this.mesh = new THREE.Mesh(g, this.material);
      this.scene.add(this.mesh);
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      const size = bb.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z, 1);
      const center = bb.getCenter(new THREE.Vector3());
      if (forceFit || Math.abs(radius - this.lastSize) / Math.max(this.lastSize, 1e-6) > 0.25) {
        this.lastSize = radius;
        this.controls!.target.copy(center);
        const dir = new THREE.Vector3(0.45, -0.75, 0.6).normalize();
        this.camera.position.copy(center).addScaledVector(dir, radius * 1.9);
        this.camera.near = radius / 100;
        this.camera.far = radius * 100;
        this.camera.updateProjectionMatrix();
        if (this.grid) this.scene.remove(this.grid);
        const step = Math.pow(10, Math.floor(Math.log10(radius)));
        const gsize = Math.ceil((radius * 1.6) / step) * step;
        this.grid = new THREE.GridHelper(gsize, Math.round(gsize / (step / 2)), 0x888888, 0x555555);
        this.grid.rotation.x = Math.PI / 2;
        this.grid.position.set(center.x, center.y, -0.01);
        (this.grid.material as THREE.Material).transparent = true;
        (this.grid.material as THREE.Material).opacity = 0.35;
        this.scene.add(this.grid);
      }
    }
    this.render();
  }

  render(): void {
    if (!this.renderer || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      const moving = this.controls!.update();
      this.renderer!.render(this.scene, this.camera);
      if (moving) this.render();
    });
  }
}
