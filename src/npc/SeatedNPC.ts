import {
  BoxGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Euler, Vector3Like } from 'three';
import { Bubbles } from './Bubbles';
import { CartoonFace } from './CartoonFace';
import type { Expression } from '../dialogue/Scenario';
import type { CircularObstacle } from '../input/FirstPersonController';

export type HairStyle = 'short' | 'spiky' | 'bob' | 'ponytail';
export type Bottom = 'shorts' | 'skirt' | 'long-skirt';

export interface CharacterLook {
  /** 大人比例（頭比例較小、身體較長）。 */
  readonly adult?: boolean;
  readonly hair?: HairStyle;
  readonly skin?: number;
  readonly hairColor?: number;
  readonly shirt?: number;
  readonly bottom?: Bottom;
  readonly bottomColor?: number;
  readonly shoes?: number;
  /** 髮夾、球等點綴色。 */
  readonly accent?: number;
}

export interface CharacterOptions {
  /** 與對話情境對應的人物 id；預設為長椅上的小安。 */
  readonly id?: string;
  readonly x?: number;
  readonly z?: number;
  /** 人物正面預設朝 +z；只在建立時設定，之後不轉向玩家。 */
  readonly rotationY?: number;
  readonly pose?: 'seated' | 'standing';
  /** 個人空間半徑（公尺）。 */
  readonly radius?: number;
  readonly look?: CharacterLook;
  /** 球（雙手抱著）或泡泡棒（右手舉到嘴前，會吹出泡泡）。 */
  readonly prop?: 'ball' | 'bubbles';
  /** 站在高處（例如溜滑梯平台）時的高度。 */
  readonly y?: number;
  /** 坐姿時是否附長椅；坐在溜滑梯平台等地方時不要長椅。 */
  readonly bench?: boolean;
  /** 雙手往前（例如扶著梯子）。 */
  readonly reach?: boolean;
  /** 閒置動態（呼吸、看四周、眨眼、晃腿等）；仍受「人物動作」開關控制。 */
  readonly idle?: boolean;
}

interface Dims {
  readonly head: Vector3;
  readonly neckY: number;
  readonly shoulderY: number;
  readonly chestY: number;
  readonly waistY: number;
  readonly hipY: number;
  readonly shoulderX: number;
  /** 腰、胸、肚子、肩的半徑。 */
  readonly torso: readonly [number, number, number, number];
  readonly depth: number;
  readonly upperArm: number;
  readonly forearm: number;
  readonly armRadius: number;
  readonly hand: number;
  readonly hipX: number;
  readonly thigh: number;
  readonly shin: number;
  readonly legRadius: number;
  readonly shoe: Vector3;
}

/** 卡通比例（公尺）：小孩頭大、四肢短；大人頭比例較小。 */
const KID: Dims = {
  head: new Vector3(0.175, 0.165, 0.16),
  neckY: 0.8,
  shoulderY: 0.76,
  chestY: 0.68,
  waistY: 0.55,
  hipY: 0.47,
  shoulderX: 0.145,
  torso: [0.105, 0.125, 0.13, 0.115],
  depth: 0.78,
  upperArm: 0.16,
  forearm: 0.14,
  armRadius: 0.036,
  hand: 0.04,
  hipX: 0.062,
  thigh: 0.2,
  shin: 0.2,
  legRadius: 0.048,
  shoe: new Vector3(0.05, 0.042, 0.085),
};
const ADULT: Dims = {
  head: new Vector3(0.13, 0.142, 0.128),
  neckY: 1.3,
  shoulderY: 1.26,
  chestY: 1.12,
  waistY: 0.97,
  hipY: 0.84,
  shoulderX: 0.175,
  torso: [0.13, 0.12, 0.145, 0.135],
  depth: 0.72,
  upperArm: 0.27,
  forearm: 0.24,
  armRadius: 0.04,
  hand: 0.045,
  hipX: 0.08,
  thigh: 0.38,
  shin: 0.4,
  legRadius: 0.06,
  shoe: new Vector3(0.05, 0.04, 0.1),
};

const X = new Vector3(1, 0, 0);

/**
 * 公園固定人物（坐姿或站姿）的卡通造型：大頭、圓臉、表情豐富。
 * 不移動位置、不追人、不追蹤視線。閒置時有慢而小的動態（呼吸、看四周、眨眼、晃腿、玩球、吹泡泡），
 * 關閉「人物動作」或系統減少動態時全部停止；對話中的揮手、點頭優先。
 */
export class ParkCharacter {
  readonly id: string;
  readonly root = new Group();
  readonly obstacle: CircularObstacle;
  readonly materials: readonly MeshStandardMaterial[];
  readonly face: CartoonFace;
  /** 長椅木頭材質（ParkScene 讓環境的木紋貼圖也套到長椅）。 */
  readonly benchMaterial: MeshStandardMaterial;
  private readonly geometries: BufferGeometry[] = [];
  private disposed = false;
  private gesture: 'wave' | 'nod' | null = null;
  private gestureTime = 0;
  private motionEnabled = true;
  private readonly headPivot = new Group();
  private readonly arms: { side: number; shoulder: Group; elbow: Group; wrist: Group }[] = [];
  private readonly rest = new Map<Group, Euler>();
  private readonly knees: { side: number; pivot: Group }[] = [];
  private readonly idleEnabled: boolean;
  private idleTime = 0;
  private readonly phase: number;
  private readonly seated: boolean;
  private readonly reach: boolean;
  private body: Mesh | null = null;
  private ball: Mesh | null = null;
  private ballRestY = 0;
  private readonly bubbles: Bubbles | null = null;

  constructor(options: CharacterOptions = {}) {
    this.id = options.id ?? 'xiaoan';
    const look = options.look ?? {};
    const seated = (options.pose ?? 'seated') === 'seated';
    const holdsBall = options.prop === 'ball';
    const blowsBubbles = options.prop === 'bubbles';
    this.seated = seated;
    this.reach = options.reach ?? false;
    this.idleEnabled = options.idle ?? true;
    // 每個人的動作節奏錯開（依 id 決定，可重現）。
    const seed =
      Array.from(this.id).reduce((sum, ch) => sum * 31 + (ch.codePointAt(0) ?? 0), 7) >>> 0;
    this.phase = ((seed % 1000) / 1000) * Math.PI * 2;
    const d: Dims = look.adult ? ADULT : KID;
    this.obstacle = { x: options.x ?? 0, z: options.z ?? -2, radius: options.radius ?? 1.2 };
    this.root.name = this.id === 'xiaoan' ? 'park-friend' : `park-friend-${this.id}`;
    this.root.position.set(this.obstacle.x, options.y ?? 0, this.obstacle.z);
    this.root.rotation.y = options.rotationY ?? 0;

    const standard = (hex: number, roughness = 0.8): MeshStandardMaterial =>
      new MeshStandardMaterial({ color: hex, roughness });
    const skinHex = look.skin ?? 0xf1c4a3;
    const skin = standard(skinHex, 0.65);
    const shirt = standard(look.shirt ?? 0x7aa7ad, 0.9);
    const bottom = standard(look.bottomColor ?? 0x55708f, 0.9);
    const hair = standard(look.hairColor ?? 0x4a3226, 0.55);
    hair.side = DoubleSide; // 髮型的開口邊緣從內側看也是頭髮
    const wood = new MeshStandardMaterial({
      color: new Color().setHSL(30 / 360, 0.3, 0.45),
      roughness: 0.95,
    });
    const sock = standard(0xf4f1ea, 0.9);
    const shoe = standard(look.shoes ?? 0xe9e6df, 0.7);
    const metal = standard(0x5c605d, 0.6);
    const accent = standard(look.accent ?? 0xe7c873, 0.7);
    const lid = standard(new Color(skinHex).multiplyScalar(0.92).getHex(), 0.65);
    const eyeWhite = standard(0xfbf8f2, 0.3);
    const iris = standard(0x5a3b2a, 0.35);
    const pupil = standard(0x1c1410, 0.3);
    const highlight = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.7,
    });
    const brow = standard(new Color(look.hairColor ?? 0x4a3226).multiplyScalar(0.85).getHex(), 0.8);
    const mouth = standard(0x8a4a43, 0.6);
    // 嘴巴、腮紅貼在臉上：深度偏移避免與臉的表面互相穿插。
    mouth.polygonOffset = true;
    mouth.polygonOffsetFactor = -2;
    const blush = new MeshStandardMaterial({
      color: new Color().setHSL(5 / 360, 0.55, 0.74),
      roughness: 0.9,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const collar = standard(new Color(look.shirt ?? 0x7aa7ad).multiplyScalar(0.85).getHex(), 0.9);
    this.benchMaterial = wood;
    this.materials = [
      skin,
      shirt,
      bottom,
      hair,
      wood,
      sock,
      shoe,
      metal,
      accent,
      lid,
      eyeWhite,
      iris,
      pupil,
      highlight,
      brow,
      mouth,
      blush,
      collar,
    ];

    if (seated && (options.bench ?? true)) this.buildBench(wood, metal);
    // 坐姿：臀部在長椅座面上，略往後坐；站姿：腳在地面。
    const lift = seated ? 0.5 - d.hipY : 0;
    const back = seated ? -0.03 : 0;
    const at = (y: number, z = 0): [number, number, number] => [0, y + lift, z + back];

    // 身體：上衣是一個圓潤的旋轉體，下擺略寬。
    const [waistR, chestR, bellyR, shoulderR] = d.torso;
    const torso = this.part(
      'body',
      this.lathe([
        [0, d.hipY - 0.02],
        [waistR * 1.05, d.hipY + 0.01],
        [bellyR, d.waistY],
        [chestR, d.chestY],
        [shoulderR, d.shoulderY],
        [shoulderR * 0.55, d.neckY - 0.005],
        [0, d.neckY],
      ]),
      shirt,
      ...at(0),
    );
    torso.scale.z = d.depth;
    this.body = torso;
    const collarRing = this.part(
      'collar',
      new TorusGeometry(d.head.x * 0.32, 0.012, 8, 24),
      collar,
      ...at(d.neckY - 0.01),
    );
    collarRing.rotation.x = Math.PI / 2;
    collarRing.scale.y = d.depth;
    this.part(
      'neck',
      new CylinderGeometry(d.head.x * 0.28, d.head.x * 0.3, 0.06, 16),
      skin,
      ...at(d.neckY + 0.02),
    );

    // 下半身。
    const style = look.bottom ?? 'shorts';
    if (style === 'shorts') {
      const hips = this.part(
        'hips',
        this.lathe([
          [0, d.hipY - 0.06],
          [waistR * 1.05, d.hipY - 0.05],
          [waistR * 1.08, d.waistY - 0.02],
          [0, d.waistY],
        ]),
        bottom,
        ...at(0),
      );
      hips.scale.z = d.depth + 0.05;
    } else {
      const length = style === 'skirt' ? d.thigh * 0.75 : d.waistY - 0.1;
      const skirt = this.part(
        'skirt',
        // 裙頭比上衣腰圍寬一點，蓋住上衣下擺，兩個面不互相穿插。
        new CylinderGeometry(
          bellyR * 1.06,
          waistR * (style === 'skirt' ? 1.75 : 1.6),
          length,
          28,
          1,
          true,
        ),
        bottom,
        ...at(d.waistY - length / 2 + 0.02),
      );
      skirt.scale.z = d.depth + 0.12;
    }

    // 腿：膠囊（短褲褲管、襪子、鞋子）。坐姿大腿往前、小腿往下。
    for (const side of [-1, 1]) {
      const hip = new Vector3(side * d.hipX, d.hipY + lift, back + 0.01);
      const knee = seated
        ? hip.clone().add(new Vector3(side * 0.01, 0.0, d.thigh))
        : hip.clone().add(new Vector3(side * 0.008, -d.thigh, 0));
      const ankle = seated
        ? knee.clone().add(new Vector3(0, -Math.min(d.shin, knee.y - 0.08), 0.02))
        : new Vector3(side * (d.hipX + 0.012), 0.075, 0);
      this.limb('thigh', hip, knee, d.legRadius, skin);
      const lowerLeg: Mesh[] = [this.limb('shin', knee, ankle, d.legRadius * 0.86, skin)];
      if (style === 'shorts')
        this.limb('shorts-leg', hip, hip.clone().lerp(knee, 0.62), d.legRadius * 1.38, bottom);
      if (!look.adult) {
        const sockTop = ankle.clone().lerp(knee, 0.22);
        lowerLeg.push(this.limb('sock', ankle, sockTop, d.legRadius * 0.92, sock));
      }
      const foot = this.part(
        'shoe',
        new SphereGeometry(1, 20, 14),
        shoe,
        ankle.x,
        ankle.y - 0.025,
        ankle.z + d.shoe.z * 0.45,
      );
      foot.scale.copy(d.shoe);
      lowerLeg.push(foot);
      if (seated) {
        // 坐著晃腿：小腿、襪子、鞋子掛在膝蓋軸點上。
        const knee_ = new Group();
        knee_.name = 'knee-pivot';
        knee_.position.copy(knee);
        this.root.add(knee_);
        for (const mesh of lowerLeg) {
          mesh.position.sub(knee);
          knee_.add(mesh);
        }
        this.knees.push({ side, pivot: knee_ });
      }
    }

    // 頭：以脖子為軸點頭；臉、頭髮、耳朵都在頭部群組內。
    this.headPivot.name = 'head-pivot';
    this.headPivot.position.set(...at(d.neckY + 0.03));
    this.root.add(this.headPivot);
    const headCenter = new Group();
    headCenter.name = 'head-center';
    headCenter.position.y = d.head.y * 0.92;
    this.headPivot.add(headCenter);
    const head = new Mesh(this.geometry(new SphereGeometry(1, 40, 28)), skin);
    head.name = 'head';
    head.scale.copy(d.head);
    headCenter.add(head);
    for (const side of [-1, 1]) {
      const ear = new Mesh(this.geometry(new SphereGeometry(1, 16, 12)), skin);
      ear.name = 'ear';
      ear.position.set(side * d.head.x * 0.97, -d.head.y * 0.05, -d.head.z * 0.05);
      ear.scale.set(d.head.x * 0.13, d.head.y * 0.2, d.head.z * 0.13);
      headCenter.add(ear);
    }
    this.face = new CartoonFace(
      d.head,
      {
        skin,
        lid,
        eyeWhite,
        iris,
        pupil,
        highlight,
        brow,
        mouth,
        blush,
      },
      seed,
    );
    headCenter.add(this.face.root);
    this.buildHair(headCenter, d.head, look.hair ?? 'short', hair, accent);

    // 手臂：肩、肘、腕三個軸點；揮手時只動 -x 側。
    for (const side of [-1, 1]) {
      const shoulder = new Group();
      shoulder.name = side < 0 ? 'arm-pivot' : 'arm-pivot-right';
      shoulder.position.set(...at(d.shoulderY - 0.02));
      shoulder.position.x = side * d.shoulderX;
      this.root.add(shoulder);
      const sleeve = new Mesh(
        this.geometry(new CapsuleGeometry(d.armRadius * 1.35, d.upperArm * 0.55, 6, 14)),
        shirt,
      );
      sleeve.name = 'sleeve';
      sleeve.position.y = -d.upperArm * 0.3;
      shoulder.add(sleeve);
      const upper = new Mesh(
        this.geometry(new CapsuleGeometry(d.armRadius, d.upperArm, 6, 12)),
        skin,
      );
      upper.name = 'upper-arm';
      upper.position.y = -d.upperArm / 2;
      shoulder.add(upper);
      const elbow = new Group();
      elbow.name = side < 0 ? 'elbow-pivot' : 'elbow-pivot-right';
      elbow.position.y = -d.upperArm;
      shoulder.add(elbow);
      const forearm = new Mesh(
        this.geometry(new CapsuleGeometry(d.armRadius * 0.9, d.forearm, 6, 12)),
        skin,
      );
      forearm.name = 'forearm';
      forearm.position.y = -d.forearm / 2;
      elbow.add(forearm);
      const wrist = new Group();
      wrist.name = side < 0 ? 'wrist-pivot' : 'wrist-pivot-right';
      wrist.position.y = -d.forearm;
      elbow.add(wrist);
      const hand = new Mesh(this.geometry(new SphereGeometry(1, 16, 12)), skin);
      hand.name = 'hand';
      hand.scale.set(d.hand * 0.85, d.hand, d.hand * 0.7);
      hand.position.y = -d.hand * 0.6;
      wrist.add(hand);
      // 姿勢：自然下垂略張開；坐著手放腿上；拿球時兩手往前抱球。
      shoulder.rotation.z = side * 0.12;
      if (seated) {
        shoulder.rotation.x = -0.25;
        elbow.rotation.x = -1.05;
      } else if (holdsBall) {
        shoulder.rotation.set(-0.35, 0, side * 0.25);
        elbow.rotation.set(-1.25, 0, -side * 0.35);
      } else if (this.reach) {
        shoulder.rotation.set(-1.2, 0, side * 0.05);
        elbow.rotation.x = -0.35;
      } else if (blowsBubbles && side > 0) {
        // 右手把泡泡棒舉到嘴巴前。
        shoulder.rotation.set(-0.55, 0, 0.1);
        elbow.rotation.set(-2.05, 0, -0.55);
      } else {
        elbow.rotation.x = -0.15;
      }
      this.arms.push({ side, shoulder, elbow, wrist });
      for (const pivot of [shoulder, elbow, wrist]) this.rest.set(pivot, pivot.rotation.clone());
    }
    if (holdsBall) {
      const ball = this.part(
        'ball',
        new SphereGeometry(1, 28, 20),
        accent,
        ...at(d.waistY + 0.07, 0.17),
      );
      ball.scale.setScalar(0.11);
      this.ball = ball;
      this.ballRestY = ball.position.y;
    }
    const wrist = this.arms.find((arm) => arm.side > 0)?.wrist;
    if (blowsBubbles && wrist) {
      const stick = new Mesh(this.geometry(new CylinderGeometry(0.005, 0.005, 0.12, 6)), accent);
      stick.name = 'bubble-wand';
      stick.position.y = -0.07;
      wrist.add(stick);
      const ring = new Mesh(this.geometry(new TorusGeometry(0.028, 0.005, 6, 16)), accent);
      ring.name = 'bubble-wand-ring';
      ring.position.y = -0.155;
      ring.rotation.y = Math.PI / 2;
      wrist.add(ring);
      this.root.updateMatrixWorld(true);
      const origin = this.root
        .worldToLocal(ring.getWorldPosition(new Vector3()))
        .add(new Vector3(0, 0, 0.04));
      this.bubbles = new Bubbles(origin, 18, seed);
      this.root.add(this.bubbles.mesh);
      this.materials = [...this.materials, this.bubbles.material];
    }
    this.face.setIdle(this.idleEnabled);
  }

  get expression(): Expression {
    return this.face.expression;
  }

  /** 換表情；animate 為 false 時立即切換（停用動作、減少動態）。 */
  setExpression(expression: Expression, animate = true): void {
    if (this.disposed) return;
    this.face.setExpression(expression, animate && this.motionEnabled);
  }

  setMotionEnabled(enabled: boolean): void {
    this.motionEnabled = enabled;
    this.face.setIdle(enabled && this.idleEnabled);
    this.bubbles?.setEnabled(enabled && this.idleEnabled);
    if (!enabled) {
      this.resetGesture();
      this.resetIdle();
      this.face.setExpression(this.face.expression, false);
    }
  }

  playGesture(gesture: 'wave' | 'nod' | null): void {
    this.resetGesture();
    if (!this.disposed && this.motionEnabled) this.gesture = gesture;
  }

  /** 共用引擎模擬 delta；暫停不更新，不自動循環。 */
  update(delta: number): void {
    if (this.disposed || !Number.isFinite(delta) || delta <= 0) return;
    this.face.update(delta);
    if (this.motionEnabled && this.idleEnabled) this.updateIdle(Math.min(delta, 0.05));
    if (!this.gesture) return;
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
      const waving = Math.max(0, Math.min(1, (this.gestureTime - 0.65) / 1.5));
      const arm = this.arms.find((item) => item.side < 0);
      if (arm) {
        // -x 側手臂往側上方舉起、前臂朝上，手腕柔和擺兩次；不動頭或相機。
        const restShoulder = this.rest.get(arm.shoulder);
        const restElbow = this.rest.get(arm.elbow);
        if (restShoulder && restElbow) {
          arm.shoulder.rotation.set(restShoulder.x * (1 - lift), 0, restShoulder.z - 2.25 * lift);
          arm.elbow.rotation.set(restElbow.x * (1 - lift), 0, -0.85 * lift);
        }
        arm.wrist.rotation.z = 0.4 * Math.sin(waving * Math.PI * 4) * lift;
      }
    }
    if (this.gestureTime >= duration) this.resetGesture();
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
    this.face.dispose();
    this.bubbles?.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.headPivot.clear();
    this.root.clear();
    this.root.removeFromParent();
  }

  /** 閒置動態：都很慢、幅度小；之後的手勢（揮手、點頭）會覆寫同一個軸點。 */
  private updateIdle(dt: number): void {
    this.idleTime += dt;
    const t = this.idleTime;
    const p = this.phase;
    const wave = (period: number, offset = 0): number =>
      Math.sin((Math.PI * 2 * t) / period + p + offset);
    if (this.body) {
      const breath = 1 + 0.012 * wave(3.4);
      this.body.scale.x = breath;
    }
    this.headPivot.rotation.y = 0.12 * wave(8.5);
    this.headPivot.rotation.z = 0.035 * wave(5.7, 1);
    if (!this.seated && !this.ball && !this.bubbles && !this.reach) {
      for (const { side, shoulder } of this.arms) {
        const rest = this.rest.get(shoulder);
        if (rest) shoulder.rotation.x = rest.x + 0.05 * wave(3.6, side * 1.3);
      }
    }
    for (const { side, pivot } of this.knees)
      pivot.rotation.x = 0.22 * wave(2.2, side > 0 ? 0 : Math.PI);
    if (this.ball) {
      // 手上的球輕輕往上拋一點再接住。
      const lift = 0.5 - 0.5 * Math.cos((Math.PI * 2 * t) / 1.6 + p);
      this.ball.position.y = this.ballRestY + 0.035 * lift;
      for (const { elbow } of this.arms) {
        const rest = this.rest.get(elbow);
        if (rest) elbow.rotation.x = rest.x - 0.12 * lift;
      }
    }
    this.bubbles?.update(dt);
  }

  private resetIdle(): void {
    this.idleTime = 0;
    if (this.body) this.body.scale.x = 1;
    this.headPivot.rotation.y = 0;
    this.headPivot.rotation.z = 0;
    for (const { pivot } of this.knees) pivot.rotation.x = 0;
    if (this.ball) this.ball.position.y = this.ballRestY;
    for (const [pivot, rotation] of this.rest) pivot.rotation.copy(rotation);
  }

  private resetGesture(): void {
    this.gesture = null;
    this.gestureTime = 0;
    this.headPivot.rotation.x = 0;
    for (const [pivot, rotation] of this.rest) pivot.rotation.copy(rotation);
  }

  private buildBench(wood: MeshStandardMaterial, metal: MeshStandardMaterial): void {
    for (let slat = 0; slat < 4; slat += 1) {
      this.part(
        'bench-seat',
        new BoxGeometry(1.8, 0.065, 0.105),
        wood,
        0,
        0.45,
        -0.18 + slat * 0.12,
      );
      this.part('bench-back', new BoxGeometry(1.8, 0.1, 0.065), wood, 0, 0.61 + slat * 0.13, -0.25);
    }
    for (const x of [-0.82, 0.82]) {
      this.part('bench-arm', new BoxGeometry(0.08, 0.06, 0.46), wood, x, 0.65, 0);
      this.part('bench-arm-support', new BoxGeometry(0.06, 0.2, 0.06), wood, x, 0.54, 0.12);
    }
    for (const x of [-0.7, 0.7])
      for (const z of [-0.15, 0.15])
        this.part('bench-leg', new BoxGeometry(0.09, 0.4, 0.09), metal, x, 0.2, z);
  }

  /** 卡通髮型：都是圓潤的大塊形狀，臉部保持露出。 */
  private buildHair(
    head: Group,
    r: Vector3,
    style: HairStyle,
    hair: MeshStandardMaterial,
    accent: MeshStandardMaterial,
  ): void {
    const add = (name: string, geometry: BufferGeometry, material = hair): Mesh => {
      const mesh = new Mesh(this.geometry(geometry), material);
      mesh.name = name;
      head.add(mesh);
      return mesh;
    };
    // 頭頂髮帽：向後傾，前面髮際線在額頭上方、後面蓋到後頸。
    const cap = add('hair', new SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, 1.46));
    cap.scale.set(r.x * 1.07, r.y * 1.08, r.z * 1.1);
    cap.rotation.x = -0.42;
    const front = Math.PI / 2;
    if (style === 'short' || style === 'bob') {
      // 瀏海：前額一圈，停在眉毛上方。
      const fringe = add(
        'hair-fringe',
        new SphereGeometry(1, 28, 6, front - 0.95, 1.9, 0.62, style === 'bob' ? 0.55 : 0.42),
      );
      fringe.scale.set(r.x * 1.09, r.y * 1.08, r.z * 1.12);
      fringe.rotation.x = -0.12;
    }
    if (style === 'short') {
      for (let i = 0; i < 3; i += 1) {
        const tuft = add('hair-tuft', new SphereGeometry(1, 16, 10));
        tuft.position.set(r.x * (-0.35 + i * 0.32), r.y * 0.62, r.z * 0.78);
        tuft.scale.set(r.x * 0.26, r.y * 0.16, r.z * 0.14);
        tuft.rotation.z = 0.5;
      }
    }
    if (style === 'spiky') {
      // 幾撮往上翹的頭髮，圓頭錐形，不尖銳。
      const spikes: [number, number][] = [
        [0, 0.15],
        [-0.45, 0.35],
        [0.45, 0.35],
        [-0.25, -0.15],
        [0.25, -0.15],
        [0, -0.5],
        [-0.6, -0.25],
        [0.6, -0.25],
      ];
      for (const [a, tilt] of spikes) {
        const spike = add('hair-spike', new ConeGeometry(r.x * 0.3, r.y * 0.55, 12));
        const dir = new Vector3(Math.sin(a) * 0.7, 1, 0.55 + tilt).normalize();
        spike.position.copy(dir.clone().multiply(r).multiplyScalar(1.12));
        spike.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
        spike.rotateOnAxis(X, -0.35);
      }
      const fringe = add('hair-fringe', new SphereGeometry(1, 24, 6, front - 0.8, 1.6, 0.62, 0.32));
      fringe.scale.set(r.x * 1.09, r.y * 1.08, r.z * 1.12);
    }
    if (style === 'bob') {
      // 鮑伯頭：側面與後面蓬蓬地垂到下巴，前面留出臉。
      const bob = add(
        'hair-bob',
        new SphereGeometry(1, 40, 20, front + 1.05, Math.PI * 2 - 2.1, 0.2, 1.85),
      );
      bob.scale.set(r.x * 1.16, r.y * 1.1, r.z * 1.14);
      bob.position.y = -r.y * 0.06;
      const clip = add('hair-clip', new CapsuleGeometry(r.x * 0.05, r.x * 0.18, 4, 8), accent);
      clip.position.set(r.x * 0.62, r.y * 0.6, r.z * 0.62);
      clip.rotation.z = -0.9;
    }
    if (style === 'ponytail') {
      // 往後梳、旁分瀏海，後腦綁一束馬尾。
      const sweep = add('hair-fringe', new SphereGeometry(1, 20, 12));
      sweep.position.set(-r.x * 0.22, r.y * 0.62, r.z * 0.72);
      sweep.scale.set(r.x * 0.62, r.y * 0.2, r.z * 0.28);
      sweep.rotation.set(-0.5, 0, 0.35);
      const back = add('hair-back', new SphereGeometry(1, 28, 18));
      back.position.set(0, -r.y * 0.05, -r.z * 0.3);
      back.scale.set(r.x * 1.04, r.y * 0.98, r.z * 0.85);
      const tie = add('hair-tie', new TorusGeometry(r.x * 0.12, r.x * 0.04, 8, 16), accent);
      tie.position.set(0, -r.y * 0.25, -r.z * 1.12);
      for (let i = 0; i < 3; i += 1) {
        const tail = add('hair-ponytail', new SphereGeometry(1, 18, 14));
        tail.position.set(0, -r.y * (0.42 + i * 0.3), -r.z * (1.18 + i * 0.04));
        tail.scale.set(r.x * (0.22 - i * 0.03), r.y * 0.26, r.z * (0.2 - i * 0.025));
      }
    }
  }

  /** 兩點之間的膠囊。 */
  private limb(
    name: string,
    from: Vector3,
    to: Vector3,
    radius: number,
    material: MeshStandardMaterial,
  ): Mesh {
    const direction = to.clone().sub(from);
    const length = direction.length();
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const mesh = this.part(
      name,
      new CapsuleGeometry(radius, Math.max(0.001, length), 6, 14),
      material,
      mid.x,
      mid.y,
      mid.z,
    );
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }

  private lathe(points: readonly (readonly [number, number])[]): LatheGeometry {
    return new LatheGeometry(
      new CatmullRomCurve3(points.map(([radius, height]) => new Vector3(radius, height, 0)))
        .getPoints(48)
        .map((point) => new Vector2(Math.max(0, point.x), point.y)),
      32,
    );
  }

  private geometry<T extends BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private part(
    name: string,
    geometry: BufferGeometry,
    material: MeshStandardMaterial,
    x: number,
    y: number,
    z: number,
  ): Mesh {
    const mesh = new Mesh(this.geometry(geometry), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    this.root.add(mesh);
    return mesh;
  }
}

/** 舊名稱：公園長椅上的小安。 */
export { ParkCharacter as SeatedNPC };
