import {
  BufferGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { MeshStandardMaterial } from 'three';
import type { Expression } from '../dialogue/Scenario';

export interface FaceMaterials {
  readonly skin: MeshStandardMaterial;
  readonly lid: MeshStandardMaterial;
  readonly eyeWhite: MeshStandardMaterial;
  readonly iris: MeshStandardMaterial;
  readonly pupil: MeshStandardMaterial;
  readonly highlight: MeshStandardMaterial;
  readonly brow: MeshStandardMaterial;
  readonly mouth: MeshStandardMaterial;
  readonly blush: MeshStandardMaterial;
}

/** 嘴型：基本形是微笑，其餘是 morph target（依序對應 FaceState.mouth）。 */
const MOUTH_SHAPES = ['grin', 'open', 'flat', 'wobble', 'smirk'] as const;

interface FaceState {
  /** 上眼皮張開程度（0 閉、1 全開）。 */
  upper: number;
  /** 下眼皮上推（笑眼）。 */
  lower: number;
  eyeScale: number;
  lookX: number;
  lookY: number;
  browY: number;
  /** 正值：眉頭上揚（擔心）；負值：眉頭下壓。 */
  browTilt: number;
  /** 正值：右眉（+x）抬高、左眉放低（思考）。 */
  browAsym: number;
  blush: number;
  mouth: [number, number, number, number, number];
}

const EXPRESSIONS: Readonly<Record<Expression, FaceState>> = {
  neutral: {
    upper: 0.86,
    lower: 0.15,
    eyeScale: 1,
    lookX: 0,
    lookY: 0,
    browY: 0,
    browTilt: 0,
    browAsym: 0,
    blush: 0.8,
    mouth: [0, 0, 0, 0, 0],
  },
  happy: {
    upper: 0.8,
    lower: 0.62,
    eyeScale: 1,
    lookX: 0,
    lookY: 0,
    browY: 0.15,
    browTilt: 0.1,
    browAsym: 0,
    blush: 1.1,
    mouth: [1, 0, 0, 0, 0],
  },
  excited: {
    upper: 1,
    lower: 0.25,
    eyeScale: 1.08,
    lookX: 0,
    lookY: 0.1,
    browY: 0.45,
    browTilt: 0.05,
    browAsym: 0,
    blush: 1.2,
    mouth: [0.6, 0.45, 0, 0, 0],
  },
  thinking: {
    upper: 0.8,
    lower: 0.1,
    eyeScale: 1,
    lookX: 0.55,
    lookY: 0.5,
    browY: 0.1,
    browTilt: -0.1,
    browAsym: 0.6,
    blush: 0.8,
    mouth: [0, 0, 0, 0, 1],
  },
  surprised: {
    upper: 1,
    lower: 0,
    eyeScale: 1.14,
    lookX: 0,
    lookY: 0,
    browY: 0.8,
    browTilt: 0.15,
    browAsym: 0,
    blush: 0.9,
    mouth: [0, 1, 0, 0, 0],
  },
  worried: {
    upper: 0.88,
    lower: 0.05,
    eyeScale: 1,
    lookX: 0,
    lookY: -0.15,
    browY: 0.25,
    browTilt: 0.75,
    browAsym: 0,
    blush: 0.9,
    mouth: [0, 0, 0.3, 0.7, 0],
  },
};

const Z = new Vector3(0, 0, 1);

/**
 * 卡通臉：眼白、虹膜、瞳孔與高光、上下眼皮、眉毛、嘴巴（morph target）、腮紅。
 * 表情只在呼叫 setExpression 時改變，過渡約 0.3 秒；沒有自動眨眼或循環動作。
 */
export class CartoonFace {
  readonly root = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly current: FaceState = cloneState(EXPRESSIONS.neutral);
  private target: FaceState = cloneState(EXPRESSIONS.neutral);
  private expressionName: Expression = 'neutral';
  private readonly eyes: { side: number; eye: Group; iris: Group; upper: Mesh; lower: Mesh }[] = [];
  private readonly brows: { side: number; mesh: Mesh; baseY: number }[] = [];
  private readonly blushes: Mesh[] = [];
  private readonly mouth: Mesh;
  private readonly eyeSize: number;

  /** radii：頭（橢球）三軸半徑；臉朝 +z。 */
  constructor(
    private readonly radii: Vector3,
    materials: FaceMaterials,
  ) {
    this.root.name = 'face';
    const r = radii.x;
    this.eyeSize = r * 0.24;
    const sphere = this.geometry(new SphereGeometry(1, 24, 16));
    const upperDome = this.geometry(new SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2));
    const lowerDome = this.geometry(
      new SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    );
    const part = (
      name: string,
      geometry: BufferGeometry,
      material: MeshStandardMaterial,
      parent: Group,
    ): Mesh => {
      const mesh = new Mesh(geometry, material);
      mesh.name = name;
      parent.add(mesh);
      return mesh;
    };
    for (const side of [-1, 1]) {
      const eye = this.mount('eye', side * 0.34, 0.04, -this.eyeSize * 0.15);
      const w = this.eyeSize;
      // 深色外框（像卡通的眼睛輪廓線），眼白疊在前面。
      const outline = part('eye-outline', sphere, materials.pupil, eye);
      outline.scale.set(w * 0.86, w * 1.04, w * 0.4);
      outline.position.z = -w * 0.04;
      const white = part('eye-white', sphere, materials.eyeWhite, eye);
      white.scale.set(w * 0.82, w, w * 0.45);
      const iris = new Group();
      iris.name = 'iris-group';
      eye.add(iris);
      const irisMesh = part('iris', sphere, materials.iris, iris);
      irisMesh.scale.set(w * 0.6, w * 0.72, w * 0.12);
      irisMesh.position.z = w * 0.36;
      const pupil = part('pupil', sphere, materials.pupil, iris);
      pupil.scale.set(w * 0.3, w * 0.36, w * 0.08);
      pupil.position.z = w * 0.43;
      // 高光固定在左上方（光源方向），表情改變時一起移動。
      const glint = part('eye-glint', sphere, materials.highlight, iris);
      glint.scale.set(w * 0.16, w * 0.16, w * 0.05);
      glint.position.set(-w * 0.2, w * 0.25, w * 0.47);
      const small = part('eye-glint', sphere, materials.highlight, iris);
      small.scale.set(w * 0.07, w * 0.07, w * 0.03);
      small.position.set(w * 0.2, -w * 0.22, w * 0.47);
      const upper = part('eyelid-upper', upperDome, materials.lid, eye);
      upper.scale.set(w * 0.84, w * 1.02, w * 0.56);
      const lower = part('eyelid-lower', lowerDome, materials.skin, eye);
      lower.scale.set(w * 0.84, w * 1.02, w * 0.56);
      this.eyes.push({ side, eye, iris, upper, lower });

      const browMount = this.mount('brow', side * 0.37, 0.42, r * 0.012);
      const brow = part(
        'brow',
        this.geometry(new CapsuleGeometry(r * 0.042, r * 0.26, 4, 8)),
        materials.brow,
        browMount,
      );
      brow.rotation.z = Math.PI / 2;
      this.brows.push({ side, mesh: brow, baseY: 0 });

      const cheek = this.mount('cheek', side * 0.52, -0.2, r * 0.004);
      const blush = part(
        'blush',
        this.geometry(new CircleGeometry(r * 0.13, 24)),
        materials.blush,
        cheek,
      );
      blush.scale.set(1.25, 0.8, 1);
      this.blushes.push(blush);
    }
    const nose = part('nose', sphere, materials.skin, this.mount('nose', 0, -0.12, 0));
    nose.scale.set(r * 0.09, r * 0.07, r * 0.08);
    this.mouth = part(
      'mouth',
      this.mouthGeometry(r * 0.27),
      materials.mouth,
      this.mount('mouth-mount', 0, -0.38, r * 0.012),
    );
    this.mouth.updateMorphTargets();
    this.apply();
  }

  get expression(): Expression {
    return this.expressionName;
  }

  /** 換表情；animate 為 false（停用動作或減少動態）時立即切換。 */
  setExpression(expression: Expression, animate = true): void {
    this.expressionName = expression;
    this.target = cloneState(EXPRESSIONS[expression]);
    if (!animate) {
      copyState(this.current, this.target);
      this.apply();
    }
  }

  /** 由引擎的單一 RAF 驅動；delta 0（剛恢復）不改變畫面。 */
  update(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) return;
    const k = 1 - Math.exp(-Math.min(delta, 0.05) * 12);
    const c = this.current;
    const t = this.target;
    c.upper += (t.upper - c.upper) * k;
    c.lower += (t.lower - c.lower) * k;
    c.eyeScale += (t.eyeScale - c.eyeScale) * k;
    c.lookX += (t.lookX - c.lookX) * k;
    c.lookY += (t.lookY - c.lookY) * k;
    c.browY += (t.browY - c.browY) * k;
    c.browTilt += (t.browTilt - c.browTilt) * k;
    c.browAsym += (t.browAsym - c.browAsym) * k;
    c.blush += (t.blush - c.blush) * k;
    for (let i = 0; i < c.mouth.length; i += 1)
      c.mouth[i] = (c.mouth[i] ?? 0) + ((t.mouth[i] ?? 0) - (c.mouth[i] ?? 0)) * k;
    this.apply();
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.geometries.length = 0;
    this.root.clear();
    this.root.removeFromParent();
  }

  private apply(): void {
    const c = this.current;
    const w = this.eyeSize;
    for (const { eye, iris, upper, lower } of this.eyes) {
      eye.scale.setScalar(c.eyeScale);
      iris.position.set(c.lookX * w * 0.22, c.lookY * w * 0.25, 0);
      // 上眼皮：-1.45 rad 全開、π/2 閉合；下眼皮：1.45 rad 收起、往 0 推成笑眼。
      upper.rotation.x = Math.PI / 2 + (-1.45 - Math.PI / 2) * c.upper;
      lower.rotation.x = 1.45 - 1.35 * c.lower;
    }
    for (const { side, mesh } of this.brows) {
      mesh.position.y = this.eyeSize * (0.32 * c.browY + 0.28 * c.browAsym * side);
      mesh.rotation.z = Math.PI / 2 - 0.45 * c.browTilt * side;
    }
    for (const blush of this.blushes) blush.scale.set(1.25 * c.blush, 0.8 * c.blush, 1);
    const influences = this.mouth.morphTargetInfluences;
    if (influences) c.mouth.forEach((value, i) => (influences[i] = value));
  }

  /** 臉上某一點（u、v 是以頭部半徑為單位的左右、上下位置）的掛點，朝向表面法線；lift 沿法線外移（負值陷入）。 */
  private mount(name: string, u: number, v: number, lift: number): Group {
    const { x: rx, y: ry, z: rz } = this.radii;
    const x = u * rx;
    const y = v * ry;
    const z = rz * Math.sqrt(Math.max(0, 1 - u * u - v * v));
    const group = new Group();
    group.name = name;
    const normal = new Vector3(x / (rx * rx), y / (ry * ry), z / (rz * rz)).normalize();
    group.position.set(x, y, z).addScaledVector(normal, lift);
    group.quaternion.copy(new Quaternion().setFromUnitVectors(Z, normal));
    this.root.add(group);
    return group;
  }

  /** 嘴巴：上下兩條曲線之間的帶狀網格；各嘴型的頂點數相同，可用 morph target 平順過渡。 */
  private mouthGeometry(halfWidth: number): BufferGeometry {
    const samples = 17;
    type Shape = (x: number) => readonly [number, number, number];
    // 回傳 [x 位置, 上緣, 下緣]，單位是嘴巴半寬。
    const shapes: Record<'smile' | (typeof MOUTH_SHAPES)[number], Shape> = {
      smile: (x) => [x * 0.75, 0.3 * x * x - 0.14 + 0.08, 0.3 * x * x - 0.14 - 0.08],
      grin: (x) => {
        const top = 0.15 * x * x + 0.08;
        return [x, top, top - 0.8 * Math.pow(Math.max(0, 1 - x * x), 0.8)];
      },
      open: (x) => {
        const h = Math.sqrt(Math.max(0, 1 - x * x));
        return [x * 0.42, 0.45 * h, -0.55 * h];
      },
      flat: (x) => [x * 0.6, 0.06, -0.06],
      wobble: (x) => {
        const mid = -0.14 * x * x + 0.04 + 0.04 * Math.sin(Math.PI * 2 * x);
        return [x * 0.62, mid + 0.07, mid - 0.07];
      },
      smirk: (x) => {
        const mid = 0.22 * ((x + 1) / 2) ** 2 - 0.06;
        return [x * 0.55 + 0.15, mid + 0.07, mid - 0.07];
      },
    };
    const build = (shape: Shape): number[] => {
      const out: number[] = [];
      for (let i = 0; i < samples; i += 1) {
        const [x, top, bottom] = shape(-1 + (2 * i) / (samples - 1));
        for (const y of [top, bottom]) {
          const px = x * halfWidth;
          const py = y * halfWidth;
          // 貼合臉的弧度。
          out.push(px, py, -(px * px) / (2 * this.radii.x) - (py * py) / (2 * this.radii.y));
        }
      }
      return out;
    };
    const geometry = this.geometry(new BufferGeometry());
    geometry.setAttribute('position', new Float32BufferAttribute(build(shapes.smile), 3));
    const normals: number[] = [];
    for (let i = 0; i < samples * 2; i += 1) normals.push(0, 0, 1);
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    const index: number[] = [];
    for (let i = 0; i < samples - 1; i += 1) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    geometry.setIndex(index);
    geometry.morphAttributes['position'] = MOUTH_SHAPES.map(
      (name) => new Float32BufferAttribute(build(shapes[name]), 3),
    );
    return geometry;
  }

  private geometry<T extends BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }
}

function cloneState(state: FaceState): FaceState {
  return { ...state, mouth: [...state.mouth] };
}

function copyState(into: FaceState, from: FaceState): void {
  Object.assign(into, from, { mouth: [...from.mouth] });
}
