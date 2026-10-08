import {
  CircleGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  Vector3,
} from 'three';

/** 安全區的相機姿態：約 5–8 歲兒童的視線高度，面向公園中央。 */
const SAFE_CAMERA_POSITION = new Vector3(0, 1.1, 3.5);
const SAFE_CAMERA_TARGET = new Vector3(0, 0.6, 0);
const CAMERA_FOV = 60;

// 顏色維持低飽和（HSL S ≤ 0.6，S1 預設）。
const SKY_COLOR = new Color().setHSL(205 / 360, 0.35, 0.82);
const GROUND_COLOR = new Color().setHSL(100 / 360, 0.3, 0.42);
const MARKER_COLOR = new Color().setHSL(40 / 360, 0.45, 0.72);
const MARKER_EDGE_COLOR = new Color().setHSL(40 / 360, 0.35, 0.92);

/**
 * 單一公園場景：地面、安全標記、相機與柔和光照。
 * 材質用 PBR（MeshStandardMaterial），之後可接寫實素材（Q6）；不做陰影、粒子、模糊或晃動。
 */
export class ParkScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 500);

  private readonly geometries = [
    new PlaneGeometry(400, 400),
    new CircleGeometry(0.9, 48),
    new RingGeometry(0.9, 1.05, 48),
  ] as const;
  private readonly materials = [
    new MeshStandardMaterial({ color: GROUND_COLOR, roughness: 0.95, metalness: 0 }),
    new MeshStandardMaterial({ color: MARKER_COLOR, roughness: 0.8, metalness: 0 }),
    new MeshStandardMaterial({ color: MARKER_EDGE_COLOR, roughness: 0.8, metalness: 0 }),
  ] as const;
  private disposed = false;

  constructor() {
    this.scene.background = SKY_COLOR;

    const [groundGeometry, markerGeometry, edgeGeometry] = this.geometries;
    const [groundMaterial, markerMaterial, edgeMaterial] = this.materials;

    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.name = 'ground';
    ground.rotation.x = -Math.PI / 2;

    // 安全標記略高於地面，避免 z-fighting 閃爍。
    const marker = new Mesh(markerGeometry, markerMaterial);
    marker.name = 'safety-marker';
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.01;

    const edge = new Mesh(edgeGeometry, edgeMaterial);
    edge.name = 'safety-marker-edge';
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.012;

    const sky = new HemisphereLight(0xf2f5f7, 0x6b7a5a, 1.2);
    const sun = new DirectionalLight(0xfff4e5, 1.4);
    sun.position.set(4, 8, 3);

    this.scene.add(ground, marker, edge, sky, sun);
    this.resetToSafety();
  }

  /** 把相機放回安全區的固定姿態。 */
  resetToSafety(): void {
    this.camera.position.copy(SAFE_CAMERA_POSITION);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(SAFE_CAMERA_TARGET);
    this.camera.updateMatrixWorld();
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** 釋放本場景擁有的 geometry 與 material；可重複呼叫。 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.scene.clear();
  }
}
