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
  Quaternion,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { BufferGeometry, Vector3Like } from 'three';
import { createFriendlyFaceTexture } from './FriendlyFaceTexture';
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
    new MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }),
  ] as const;
  private readonly geometries: BufferGeometry[] = [];
  private readonly faceTexture = createFriendlyFaceTexture();
  private disposed = false;
  private gesture: 'wave' | 'nod' | null = null;
  private gestureTime = 0;
  private motionEnabled = true;
  private readonly headPivot = new Group();
  private readonly armPivot = new Group();
  private readonly elbowPivot = new Group();
  private readonly wristPivot = new Group();
  private readonly neutralElbow = new Quaternion();
  private readonly raisedElbow = new Quaternion().setFromUnitVectors(
    new Vector3(0.089, -0.138, 0.268).normalize(),
    new Vector3(0, 0.31, 0.035).applyAxisAngle(new Vector3(0, 0, 1), 1.35).normalize(),
  );

  constructor() {
    this.root.name = 'park-friend';
    this.root.position.set(this.obstacle.x, 0, this.obstacle.z);
    const [skin, shirt, trousers, hair, wood, ivory, , , accent, clothShade, seam, faceMaterial] =
      this.materials;
    skin.color.setHex(0xeeb694);
    skin.emissive.setHex(0xb87251);
    skin.emissiveIntensity = 0.22;
    faceMaterial.map = this.faceTexture;
    faceMaterial.emissive.setHex(0xffffff);
    faceMaterial.emissiveMap = this.faceTexture;
    faceMaterial.emissiveIntensity = 0.18;
    shirt.color.setHex(0x769ba2);
    clothShade.color.setHex(0x66838c);
    hair.color.setHex(0x63452f);
    trousers.color.setHex(0x526780);
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
    const softLimb = (
      name: string,
      material: MeshStandardMaterial,
      points: readonly (readonly [number, number, number])[],
      radius: number,
      taper: number,
    ): Mesh => {
      const path = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
      const geometry = new TubeGeometry(path, 24, radius, 16, false);
      const vertices = geometry.getAttribute('position');
      const anchor = path.getPointAt(0.5);
      for (let ring = 0; ring <= 24; ring++) {
        const center = path.getPointAt(ring / 24);
        const factor = 1 - taper * (ring / 24);
        for (let radial = 0; radial <= 16; radial++) {
          const i = ring * 17 + radial;
          vertices.setXYZ(
            i,
            center.x + (vertices.getX(i) - center.x) * factor - anchor.x,
            center.y + (vertices.getY(i) - center.y) * factor - anchor.y,
            center.z + (vertices.getZ(i) - center.z) * factor - anchor.z,
          );
        }
      }
      geometry.computeVertexNormals();
      return this.addPart(name, geometry, material, anchor.x, anchor.y, anchor.z);
    };
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
    torso.scale.set(1.48, 1, 0.9);
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
        [0.07 + side * 0.005, 0.819, 0.11],
        [0.006, 0.012, 0.002],
      );
      badge.rotation.z = side * 0.4;
    }
    this.headPivot.position.set(0, 0.945, -0.005);
    this.headPivot.name = 'head-pivot';
    this.root.add(this.headPivot);
    // 五官繪於連續皮膚表面，鼻子僅保留輕微體積，移除分離眼球／腮紅／嘴唇。
    const headGeometry = new SphereGeometry(1, 48, 32);
    const vertices = headGeometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const y = vertices.getY(i);
      const jaw = y < -0.1 ? 0.86 + 0.14 * ((y + 1) / 0.9) : 1;
      vertices.setX(i, vertices.getX(i) * jaw);
      if (y < -0.55) vertices.setY(i, -0.55 + (y + 0.55) * 0.72);
    }
    headGeometry.computeVertexNormals();
    const head = this.addPart('head', headGeometry, faceMaterial, 0, 1.08, 0.008);
    head.scale.set(0.174, 0.192, 0.157);
    this.headPivot.attach(head);
    for (const side of [-1, 1]) {
      const ear = oval('ear', skin, [side * 0.165, 1.062, -0.006], [0.02, 0.03, 0.023]);
      this.headPivot.attach(ear);
    }
    const nose = oval('nose', skin, [0, 1.066, 0.16], [0.019, 0.016, 0.014]);
    this.headPivot.attach(nose);
    const cap = this.addPart(
      'hair',
      new SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.37),
      hair,
      0,
      1.08,
      -0.003,
    );
    cap.position.z = 0.01;
    cap.scale.set(0.183, 0.202, 0.17);
    this.headPivot.attach(cap);
    // 偏側瀏海連成髮束，不再排列五顆球形髮片。
    for (let lock = 0; lock < 4; lock++) {
      const x = -0.107 + lock * 0.051;
      const strand = oval(
        'hair-lock',
        hair,
        [x, 1.188 + lock * 0.006, 0.15 - Math.abs(x) * 0.16],
        [0.041, 0.023, 0.018],
      );
      strand.rotation.z = -0.35;
      this.headPivot.attach(strand);
    }
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
      const legGeometry = new TubeGeometry(legPath, 32, 0.077, 16, false);
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

      segment(
        'sock',
        ivory,
        [side * 0.12, 0.089, 0.315],
        [side * 0.12, 0.129, 0.315],
        0.043,
        0.044,
      );
      oval('shoe', ivory, [side * 0.12, 0.063, 0.375], [0.065, 0.052, 0.12]);
      oval('shoe-sole', seam, [side * 0.12, 0.028, 0.377], [0.066, 0.015, 0.121]);
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
      softLimb(
        'upper-arm',
        shirt,
        [
          [side * 0.163, 0.844, -0.009],
          [side * 0.205, 0.821, 0.006],
          [side * 0.226, 0.745, 0.031],
          [side * 0.229, 0.7, 0.05],
        ],
        0.058,
        0.2,
      );
      softLimb(
        'forearm',
        skin,
        [
          [side * 0.229, 0.706, 0.047],
          [side * 0.227, 0.655, 0.087],
          [side * 0.201, 0.624, 0.178],
          [side * 0.145, 0.574, 0.294],
        ],
        0.037,
        0.32,
      );
      oval('hand', skin, [side * 0.14, 0.562, 0.318], [0.04, 0.021, 0.046]);
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
    // 肩、肘、腕分開控制；attach 保留中立坐姿，單一引擎 RAF 驅動。
    this.elbowPivot.name = 'elbow-pivot';
    this.elbowPivot.position.set(-0.229, 0.7, 0.05);
    this.wristPivot.name = 'wrist-pivot';
    this.wristPivot.rotation.order = 'ZYX';
    this.wristPivot.position.set(-0.14, 0.562, 0.318);
    this.root.add(this.elbowPivot, this.wristPivot);
    const handParts = ['hand', 'finger', 'fingernail', 'thumb', 'thumb-tip'];
    for (const part of [...this.root.children]) {
      if (part.position.x >= 0) continue;
      if (part.name === 'upper-arm') this.armPivot.attach(part);
      else if (part.name === 'forearm') this.elbowPivot.attach(part);
      else if (handParts.includes(part.name)) this.wristPivot.attach(part);
    }
    this.elbowPivot.attach(this.wristPivot);
    this.armPivot.attach(this.elbowPivot);
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
    const duration = this.gesture === 'wave' ? 2.8 : 1.6;
    this.gestureTime = Math.min(duration, this.gestureTime + Math.min(delta, 0.05));
    if (this.gesture === 'nod') {
      this.headPivot.rotation.x = 0.16 * Math.sin((Math.PI * this.gestureTime) / duration) ** 2;
    } else {
      const ease = (value: number): number => {
        const t = Math.max(0, Math.min(1, value));
        return t * t * (3 - 2 * t);
      };
      const lift = ease(this.gestureTime / 0.65) * (1 - ease((this.gestureTime - 2.15) / 0.65));
      this.armPivot.rotation.z = -1.35 * lift;
      this.elbowPivot.quaternion.slerpQuaternions(this.neutralElbow, this.raisedElbow, lift);
      // 到臉旁才開始兩次柔和擺手，不自動循環、不動頭或相機。
      const waving = Math.max(0, Math.min(1, (this.gestureTime - 0.65) / 1.5));
      this.wristPivot.rotation.z = 1.77 * lift;
      this.wristPivot.rotation.y = 0.3 * Math.sin(waving * Math.PI * 4) * lift;
    }
    if (this.gestureTime >= duration) this.resetGesture();
  }

  private resetGesture(): void {
    this.gesture = null;
    this.gestureTime = 0;
    this.headPivot.rotation.x = 0;
    this.armPivot.rotation.z = 0;
    this.elbowPivot.quaternion.identity();
    this.wristPivot.rotation.set(0, 0, 0);
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
    this.faceTexture.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.headPivot.clear();
    this.wristPivot.clear();
    this.elbowPivot.clear();
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
