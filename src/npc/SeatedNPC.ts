import {
  BoxGeometry,
  CylinderGeometry,
  LatheGeometry,
  Vector2,
  Vector3,
  CatmullRomCurve3,
  TubeGeometry,
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { BufferGeometry, Vector3Like } from 'three';
import type { CircularObstacle } from '../input/FirstPersonController';

/** 單一坐姿工程人形；僅明確互動觸發單次動作，不追人或追蹤視線。 */
export class SeatedNPC {
  readonly root = new Group();
  readonly obstacle: CircularObstacle = { x: 0, z: -2, radius: 1.2 };
  readonly materials = [
    new MeshStandardMaterial({ color: new Color().setHSL(28 / 360, 0.42, 0.69), roughness: 0.9 }),
    new MeshStandardMaterial({ color: new Color().setHSL(155 / 360, 0.24, 0.61), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(215 / 360, 0.18, 0.37), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(25 / 360, 0.32, 0.16), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.3, 0.45), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.2, 0.94), roughness: 0.9 }),
    new MeshStandardMaterial({ color: new Color().setHSL(25 / 360, 0.25, 0.17), roughness: 0.8 }),
    new MeshStandardMaterial({ color: new Color().setHSL(8 / 360, 0.22, 0.65), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(40 / 360, 0.4, 0.64), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(155 / 360, 0.18, 0.53), roughness: 1 }),
    new MeshStandardMaterial({ color: new Color().setHSL(215 / 360, 0.12, 0.3), roughness: 1 }),
  ] as const;
  private readonly geometries: BufferGeometry[] = [];
  private disposed = false;
  private gesture: 'wave' | 'nod' | null = null;
  private gestureTime = 0;
  private motionEnabled = true;
  private readonly headPivot = new Group();
  private readonly armPivot = new Group();

  constructor() {
    this.root.name = 'park-friend';
    this.root.position.set(this.obstacle.x, 0, this.obstacle.z);
    const [skin, shirt, trousers, hair, wood, ivory, eyes, blush, accent, clothShade, seam] =
      this.materials;
    for (let slat = 0; slat < 4; slat += 1) {
      this.addPart(
        'bench-seat',
        new BoxGeometry(1.8, 0.065, 0.105),
        wood,
        0,
        0.45,
        -0.18 + slat * 0.12,
      );
      this.addPart(
        'bench-back',
        new BoxGeometry(1.8, 0.1, 0.065),
        wood,
        0,
        0.61 + slat * 0.13,
        -0.25,
      );
    }
    for (const x of [-0.82, 0.82]) {
      this.addPart('bench-arm', new BoxGeometry(0.08, 0.06, 0.46), wood, x, 0.65, 0);
      this.addPart('bench-arm-support', new BoxGeometry(0.06, 0.2, 0.06), wood, x, 0.54, 0.12);
    }
    for (const x of [-0.7, 0.7]) {
      for (const z of [-0.15, 0.15])
        this.addPart('bench-leg', new BoxGeometry(0.09, 0.4, 0.09), hair, x, 0.2, z);
    }
    // 輪廓截面取代球形頭／膠囊衣服，保持自製模型與可釋放資源。
    const profile = (points: readonly (readonly [number, number])[]): LatheGeometry =>
      new LatheGeometry(
        new CatmullRomCurve3(points.map(([radius, height]) => new Vector3(radius, height, 0)))
          .getPoints(64)
          .map((point) => new Vector2(Math.max(0, point.x), point.y)),
        32,
      );
    const oval = (
      name: string,
      material: MeshStandardMaterial,
      position: readonly [number, number, number],
      size: readonly [number, number, number],
    ): Mesh => {
      const part = this.addPart(name, new SphereGeometry(1, 20, 14), material, ...position);
      part.scale.set(...size);
      return part;
    };
    const segment = (
      name: string,
      material: MeshStandardMaterial,
      from: readonly [number, number, number],
      to: readonly [number, number, number],
      startRadius: number,
      endRadius: number,
    ): Mesh => {
      const a = new Vector3(...from),
        b = new Vector3(...to);
      const direction = b.clone().sub(a);
      const midpoint = a.clone().add(b).multiplyScalar(0.5);
      const part = this.addPart(
        name,
        new CylinderGeometry(endRadius, startRadius, direction.length(), 16, 1),
        material,
        midpoint.x,
        midpoint.y,
        midpoint.z,
      );
      part.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
      return part;
    };
    const curve = (
      name: string,
      material: MeshStandardMaterial,
      points: readonly (readonly [number, number, number])[],
      radius: number,
    ): Mesh =>
      this.addPart(
        name,
        new TubeGeometry(
          new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
          16,
          radius,
          6,
          false,
        ),
        material,
        0,
        0,
        0,
      );
    const torso = this.addPart(
      'body',
      profile([
        [0, 0],
        [0.095, 0.01],
        [0.125, 0.035],
        [0.128, 0.08],
        [0.118, 0.16],
        [0.135, 0.255],
        [0.145, 0.305],
        [0.132, 0.33],
        [0.07, 0.37],
        [0.045, 0.375],
      ]),
      shirt,
      0,
      0.535,
      -0.012,
    );
    torso.scale.set(1.4, 1, 0.76);
    curve(
      'shirt-hem',
      clothShade,
      [
        [-0.154, 0.576, 0.052],
        [-0.09, 0.568, 0.079],
        [0, 0.566, 0.084],
        [0.09, 0.568, 0.079],
        [0.154, 0.576, 0.052],
      ],
      0.003,
    );
    for (const side of [-1, 1]) {
      curve(
        'shirt-fold',
        clothShade,
        [
          [side * 0.12, 0.63, 0.071],
          [side * 0.07, 0.646, 0.079],
          [side * 0.095, 0.66, 0.077],
        ],
        0.002,
      );
      curve(
        'shoulder-seam',
        clothShade,
        [
          [side * 0.061, 0.901, 0.002],
          [side * 0.14, 0.871, 0.038],
          [side * 0.186, 0.84, 0.047],
        ],
        0.0025,
      );
    }
    segment('neck', skin, [0, 0.894, -0.012], [0, 0.96, -0.012], 0.047, 0.041);
    const collar = this.addPart(
      'collar',
      new TorusGeometry(0.049, 0.008, 8, 32),
      clothShade,
      0,
      0.908,
      -0.012,
    );
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(1.1, 0.85, 1);
    for (const side of [-1, 1]) {
      const badge = oval(
        'leaf-badge',
        accent,
        [0.07 + side * 0.005, 0.819, 0.088],
        [0.006, 0.012, 0.002],
      );
      badge.rotation.z = side * 0.4;
    }
    this.headPivot.position.set(0, 0.99, -0.012);
    this.headPivot.name = 'head-pivot';
    this.root.add(this.headPivot);
    const face = (
      name: string,
      material: MeshStandardMaterial,
      position: readonly [number, number, number],
      size: readonly [number, number, number],
    ): Mesh => {
      const part = oval(name, material, position, size);
      this.headPivot.attach(part);
      return part;
    };
    const head = this.addPart(
      'head',
      profile([
        [0, 0],
        [0.045, 0.008],
        [0.073, 0.027],
        [0.092, 0.06],
        [0.114, 0.095],
        [0.123, 0.14],
        [0.122, 0.185],
        [0.118, 0.22],
        [0.101, 0.252],
        [0.066, 0.275],
        [0, 0.285],
      ]),
      skin,
      0,
      0.985,
      -0.012,
    );
    head.scale.set(1, 1, 0.93);
    this.headPivot.attach(head);
    const hairCap = this.addPart(
      'hair',
      new SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hair,
      0,
      1.198,
      -0.023,
    );
    hairCap.scale.set(0.126, 0.087, 0.119);
    this.headPivot.attach(hairCap);
    for (let lockIndex = 0; lockIndex < 7; lockIndex++) {
      const x = -0.096 + lockIndex * 0.03;
      const lock = face(
        'hair-lock',
        hair,
        [x, 1.211 + lockIndex * 0.0035, 0.071 - Math.abs(x) * 0.23],
        [0.025, 0.018, 0.015],
      );
      lock.rotation.z = -0.3;
    }
    for (const side of [-1, 1]) {
      face('ear', skin, [side * 0.124, 1.117, -0.012], [0.017, 0.03, 0.018]);
      face('ear-inner', blush, [side * 0.132, 1.117, 0.003], [0.006, 0.018, 0.005]);
      face('eye-white', ivory, [side * 0.046, 1.152, 0.094], [0.025, 0.012, 0.008]);
      face('eye', eyes, [side * 0.046, 1.152, 0.101], [0.0105, 0.0105, 0.003]);
      face('eye-glint', ivory, [side * 0.046 - 0.003, 1.156, 0.104], [0.0025, 0.0025, 0.001]);
      const lid = curve(
        'eyelid',
        skin,
        [
          [side * 0.022, 1.152, 0.098],
          [side * 0.046, 1.164, 0.099],
          [side * 0.069, 1.154, 0.086],
        ],
        0.0035,
      );
      this.headPivot.attach(lid);
      const brow = curve(
        'eyebrow',
        hair,
        [
          [side * 0.022, 1.182, 0.093],
          [side * 0.047, 1.187, 0.091],
          [side * 0.074, 1.177, 0.08],
        ],
        0.003,
      );
      this.headPivot.attach(brow);
      face('cheek', blush, [side * 0.075, 1.108, 0.072], [0.021, 0.011, 0.001]);
    }
    face('nose-bridge', skin, [0, 1.129, 0.098], [0.012, 0.026, 0.012]);
    face('nose', skin, [0, 1.109, 0.107], [0.017, 0.012, 0.018]);
    for (const side of [-1, 1])
      face('nose-wing', skin, [side * 0.013, 1.108, 0.103], [0.008, 0.007, 0.009]);
    const smile = curve(
      'smile',
      blush,
      [
        [-0.03, 1.08, 0.079],
        [-0.015, 1.071, 0.091],
        [0, 1.07, 0.094],
        [0.015, 1.071, 0.091],
        [0.03, 1.08, 0.079],
      ],
      0.003,
    );
    this.headPivot.attach(smile);
    face('lower-lip', blush, [0, 1.065, 0.092], [0.02, 0.003, 0.002]);
    oval('hips', trousers, [0, 0.505, 0.034], [0.171, 0.082, 0.13]);
    this.armPivot.position.set(-0.19, 0.844, -0.004);
    this.armPivot.name = 'arm-pivot';
    this.root.add(this.armPivot);
    for (const side of [-1, 1]) {
      const x = side * 0.105;
      const legPath = new CatmullRomCurve3([
        new Vector3(x, 0.503, 0.036),
        new Vector3(x, 0.492, 0.18),
        new Vector3(x, 0.477, 0.312),
        new Vector3(x, 0.425, 0.35),
        new Vector3(side * 0.117, 0.25, 0.328),
        new Vector3(side * 0.12, 0.117, 0.315),
      ]);
      const legGeometry = new TubeGeometry(legPath, 32, 0.071, 16, false);
      const vertices = legGeometry.getAttribute('position');
      for (let ring = 0; ring <= 32; ring++) {
        const center = legPath.getPointAt(ring / 32);
        const taper = 1 - 0.38 * (ring / 32);
        for (let radial = 0; radial <= 16; radial++) {
          const vertex = ring * 17 + radial;
          vertices.setXYZ(
            vertex,
            center.x + (vertices.getX(vertex) - center.x) * taper,
            center.y + (vertices.getY(vertex) - center.y) * taper,
            center.z + (vertices.getZ(vertex) - center.z) * taper,
          );
        }
      }
      legGeometry.computeVertexNormals();
      this.addPart('trouser-leg', legGeometry, trousers, 0, 0, 0);
      curve(
        'trouser-seam',
        seam,
        [
          [x + side * 0.058, 0.478, 0.29],
          [x + side * 0.053, 0.401, 0.347],
          [side * 0.12 + side * 0.035, 0.143, 0.321],
        ],
        0.002,
      );
      curve(
        'knee-fold',
        seam,
        [
          [x - 0.042, 0.449, 0.392],
          [x, 0.443, 0.41],
          [x + 0.044, 0.459, 0.39],
        ],
        0.0025,
      );
      segment(
        'sock',
        ivory,
        [side * 0.12, 0.089, 0.315],
        [side * 0.12, 0.129, 0.315],
        0.043,
        0.044,
      );
      oval('shoe', ivory, [side * 0.12, 0.063, 0.375], [0.06, 0.048, 0.116]);
      oval('shoe-sole', seam, [side * 0.12, 0.028, 0.377], [0.061, 0.014, 0.117]);
      oval('shoe-tongue', ivory, [side * 0.12, 0.102, 0.352], [0.035, 0.009, 0.04]);
      for (let lace = 0; lace < 3; lace++)
        segment(
          'shoe-lace',
          clothShade,
          [side * 0.12 - 0.025, 0.108 - lace * 0.002, 0.345 + lace * 0.017],
          [side * 0.12 + 0.025, 0.108 - lace * 0.002, 0.345 + lace * 0.017],
          0.002,
          0.002,
        );
      oval('shoulder', shirt, [side * 0.184, 0.838, -0.003], [0.066, 0.065, 0.064]);
      segment(
        'upper-arm',
        shirt,
        [side * 0.193, 0.825, 0],
        [side * 0.227, 0.707, 0.046],
        0.062,
        0.046,
      );
      segment(
        'sleeve-cuff',
        clothShade,
        [side * 0.225, 0.716, 0.042],
        [side * 0.229, 0.702, 0.047],
        0.047,
        0.047,
      );
      segment(
        'elbow',
        skin,
        [side * 0.229, 0.704, 0.047],
        [side * 0.228, 0.66, 0.083],
        0.038,
        0.038,
      );
      oval('elbow-joint', skin, [side * 0.228, 0.655, 0.086], [0.038, 0.037, 0.037]);
      segment(
        'forearm',
        skin,
        [side * 0.228, 0.655, 0.086],
        [side * 0.145, 0.574, 0.286],
        0.037,
        0.025,
      );
      oval('hand', skin, [side * 0.14, 0.562, 0.318], [0.038, 0.018, 0.046]);
      for (let finger = 0; finger < 4; finger++) {
        const fingerX = side * 0.14 + (finger - 1.5) * 0.015;
        const length = [0.038, 0.049, 0.046, 0.034][finger] ?? 0.038;
        const digit = this.addPart(
          'finger',
          new CapsuleGeometry(0.007, length, 4, 10),
          skin,
          fingerX,
          0.556,
          0.356 + length / 2,
        );
        digit.rotation.x = Math.PI / 2 + 0.08;
        oval('fingernail', ivory, [fingerX, 0.561, 0.356 + length], [0.0045, 0.001, 0.006]);
      }
      segment(
        'thumb',
        skin,
        [side * 0.115, 0.564, 0.316],
        [side * 0.096, 0.555, 0.35],
        0.011,
        0.009,
      );
      oval('thumb-tip', skin, [side * 0.096, 0.555, 0.35], [0.009, 0.009, 0.009]);
    }
    // 縮短外露頸部，頭部維持原點頭 pivot；五官整組同步移動。
    for (const part of this.headPivot.children) part.position.y -= 0.045;
    const movingParts = [
      'shoulder',
      'upper-arm',
      'sleeve-cuff',
      'elbow',
      'elbow-joint',
      'forearm',
      'hand',
      'finger',
      'fingernail',
      'thumb',
      'thumb-tip',
    ];
    for (const part of [...this.root.children]) {
      if (part.position.x < 0 && movingParts.includes(part.name)) this.armPivot.attach(part);
    }
  }

  setMotionEnabled(enabled: boolean): void {
    this.motionEnabled = enabled;
    if (!enabled) this.resetGesture();
  }

  playGesture(gesture: 'wave' | 'nod' | null): void {
    this.resetGesture();
    if (!this.disposed && this.motionEnabled) this.gesture = gesture;
  }

  /** 共用引擎模擬 delta，僅單次柔和動作；暫停不更新，不自動循環。 */
  update(delta: number): void {
    if (this.disposed || !this.gesture || !Number.isFinite(delta) || delta <= 0) return;
    this.gestureTime = Math.min(1.6, this.gestureTime + Math.min(delta, 0.05));
    const envelope = Math.sin((Math.PI * this.gestureTime) / 1.6) ** 2;
    if (this.gesture === 'nod') this.headPivot.rotation.x = 0.16 * envelope;
    else this.armPivot.rotation.z = -2 * envelope;
    if (this.gestureTime >= 1.6) this.resetGesture();
  }

  private resetGesture(): void {
    this.gesture = null;
    this.gestureTime = 0;
    this.headPivot.rotation.x = 0;
    this.armPivot.rotation.z = 0;
  }

  distanceTo(position: Vector3Like): number {
    return Math.hypot(position.x - this.obstacle.x, position.z - this.obstacle.z);
  }

  /** 接近／離開採不同門檻，避免邊界反覆改字；不偵測眼神或鏡頭朝向。 */
  isNear(position: Vector3Like, wasNear: boolean): boolean {
    return this.distanceTo(position) <= (wasNear ? 3.2 : 2.8);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resetGesture();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.headPivot.clear();
    this.armPivot.clear();
    this.root.clear();
    this.root.removeFromParent();
  }

  private addPart(
    name: string,
    geometry: BufferGeometry,
    material: MeshStandardMaterial,
    x: number,
    y: number,
    z: number,
  ): Mesh {
    this.geometries.push(geometry);
    const part = new Mesh(geometry, material);
    part.name = name;
    part.position.set(x, y, z);
    this.root.add(part);
    return part;
  }
}
