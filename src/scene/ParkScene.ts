import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Fog,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  Texture,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { ParkEnvironment } from './ParkEnvironment';
import { ParkCharacter } from '../npc/SeatedNPC';
import { PARK_LIMIT } from '../input/FirstPersonController';
import type { CircularObstacle } from '../input/FirstPersonController';

/** 安全區的相機姿態：約 5–8 歲兒童的視線高度，面向公園中央。 */
const SAFE_CAMERA_POSITION = new Vector3(0, 1.1, 3.5);
const SAFE_CAMERA_TARGET = new Vector3(0, 0.6, 0);
const CAMERA_FOV = 60;

// 顏色維持低飽和（HSL S ≤ 0.6，S1 預設）。
const SKY_COLOR = new Color().setHSL(205 / 360, 0.35, 0.82);
const GROUND_COLOR = new Color().setHSL(100 / 360, 0.42, 0.73);
const MARKER_COLOR = new Color().setHSL(40 / 360, 0.45, 0.72);
const MARKER_EDGE_COLOR = new Color().setHSL(40 / 360, 0.35, 0.92);

/**
 * 單一公園場景：地面、安全標記、相機與柔和光照。
 * 材質用 PBR（MeshStandardMaterial），之後可接寫實素材（Q6）；不做即時陰影、粒子、模糊或晃動。
 */
/**
 * 公園裡固定位置的人物。彼此距離大於靠近範圍（約 6.4m），一次只會靠近一位。
 * 出發點 (0, 3.5) 面向 -z，所有人都在前方：長椅小安、左前小宇、右前小晴與溜滑梯，
 * 最遠的公園入口是媽媽。小宇、小晴各在出發點左右 45° 的方向（轉三次「向左／右看」
 * 就在正前方），並略轉向玩家走來的方向，手機直向也看得到臉。
 */
function createCharacters(): readonly ParkCharacter[] {
  return [
    new ParkCharacter({
      look: {
        hair: 'short',
        hairColor: 0x4a3326,
        shirt: 0x78a9b0,
        bottom: 'shorts',
        bottomColor: 0x55708f,
      },
    }),
    new ParkCharacter({
      id: 'xiaoyu',
      x: -6.5,
      z: -3,
      // 面向出發點方向（固定，不追蹤玩家）。
      rotationY: Math.PI / 4,
      pose: 'standing',
      radius: 1,
      look: {
        hair: 'spiky',
        hairColor: 0x3e2c22,
        skin: 0xeebd9a,
        shirt: 0xe0bb6c,
        bottom: 'shorts',
        bottomColor: 0x4f6d8f,
        accent: 0xf1ede4,
      },
      prop: 'ball',
    }),
    new ParkCharacter({
      id: 'xiaoqing',
      x: 6.5,
      z: -3,
      // 側身排隊、回頭朝公園中央（固定角度，不追蹤玩家），走近時看得到四分之三側臉。
      rotationY: -1.2,
      pose: 'standing',
      radius: 1,
      look: {
        hair: 'bob',
        hairColor: 0x4b3227,
        skin: 0xf3c9aa,
        shirt: 0xe3a1aa,
        bottom: 'skirt',
        bottomColor: 0x6f8f80,
        accent: 0xe9cf7a,
      },
    }),
    new ParkCharacter({
      id: 'mom',
      // 站在入口內、步道左側，從長椅左邊走過去就在正前方。
      x: -1.2,
      z: -8.6,
      rotationY: 0,
      pose: 'standing',
      radius: 1,
      look: {
        adult: true,
        hair: 'ponytail',
        hairColor: 0x4a3329,
        skin: 0xefc3a2,
        shirt: 0x97b089,
        bottom: 'long-skirt',
        bottomColor: 0x535b6e,
        shoes: 0x7a6250,
        accent: 0xc9a77a,
      },
    }),
  ];
}

/** 溜滑梯位置：小晴排在梯子前方（+z），滑道往 -z 方向。 */
const SLIDE = { x: 6.5, z: -4.6 } as const;
/** 公園入口在最遠端（-z），媽媽站在入口內側。 */
const GATE_Z = -9.6;

export class ParkScene {
  readonly scene = new Scene();
  readonly characters = createCharacters();
  /** 長椅上的小安（第一位人物）。 */
  readonly npc: ParkCharacter = this.characters[0] as ParkCharacter;
  /** 人物以外會擋住移動的設施。 */
  readonly obstacles: readonly CircularObstacle[] = [{ x: SLIDE.x, z: SLIDE.z - 1, radius: 1.4 }];
  readonly environment: ParkEnvironment;
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
  private readonly boundaryGeometry = new BufferGeometry().setFromPoints([
    new Vector3(-PARK_LIMIT, 0.03, -PARK_LIMIT),
    new Vector3(PARK_LIMIT, 0.03, -PARK_LIMIT),
    new Vector3(PARK_LIMIT, 0.03, PARK_LIMIT),
    new Vector3(-PARK_LIMIT, 0.03, PARK_LIMIT),
  ]);
  private readonly boundaryMaterial = new LineBasicMaterial({
    color: new Color().setHSL(40 / 360, 0.12, 0.45),
  });
  /** 溜滑梯與公園入口：靜態自製幾何，不動、不發光。 */
  private readonly propGeometries: BoxGeometry[] = [];
  private readonly propMaterials = [
    new MeshStandardMaterial({ color: new Color().setHSL(205 / 360, 0.25, 0.55), roughness: 0.7 }),
    new MeshStandardMaterial({ color: new Color().setHSL(40 / 360, 0.35, 0.62), roughness: 0.6 }),
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.15, 0.4), roughness: 0.9 }),
  ] as const;
  private readonly postGeometry = new CylinderGeometry(0.05, 0.05, 1, 12);
  private disposed = false;
  private dfgTexture: Texture | null = null;
  private dfgSourceId: string | null = null;

  constructor(loadTextures = false) {
    this.environment = new ParkEnvironment(
      this.materials[0],
      this.npc.benchMaterial,
      loadTextures,
      SKY_COLOR,
    );
    this.scene.background = SKY_COLOR;
    this.scene.fog = new Fog(SKY_COLOR, 28, 95);

    for (const material of [
      ...this.materials,
      ...this.characters.flatMap((character) => character.materials),
      ...this.propMaterials,
      ...this.environment.materials,
      ...this.environment.details.materials,
    ])
      this.prepareMaterial(material);

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

    const sky = new HemisphereLight(0xf2f5f7, 0x6b7a5a, 2.2);
    const sun = new DirectionalLight(0xfff4e5, 2.4);
    sun.position.set(4, 8, 3);

    const boundary = new LineLoop(this.boundaryGeometry, this.boundaryMaterial);
    boundary.name = 'park-boundary';
    this.scene.add(
      ground,
      marker,
      edge,
      sky,
      sun,
      boundary,
      this.environment.root,
      ...this.characters.map((character) => character.root),
    );
    this.buildSlide();
    this.buildGate();
    this.resetToSafety();
  }

  /**
   * three 0.186.1 的共用 DFG_LUT 會保留各 context 的 dispose listener。
   * 透過公開材質 hook／uniform value，讓 renderer 上傳本場景擁有的 clone；
   * 不修改共用貼圖，其他場景的 context 仍可獨立使用與釋放。
   */
  private prepareMaterial(material: Material): void {
    material.onBeforeCompile = (shader) => {
      // 實拍素材與人物模型也限制表面 HSL 飽和度；不做畫面後製。
      if (typeof shader.fragmentShader === 'string') {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float parkMax = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
          float parkMin = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
          float parkLight = (parkMax + parkMin) * 0.5;
          float parkSat = (parkMax - parkMin) / max(0.00001, 1.0 - abs(2.0 * parkLight - 1.0));
          diffuseColor.rgb = mix(vec3(parkLight), diffuseColor.rgb, min(1.0, 0.6 / max(0.00001, parkSat)));
        `,
        );
      }
      if (!shader.uniforms['dfgLUT']) return;
      const uniform: { value: Texture | null } = { value: null };
      Object.defineProperty(uniform, 'value', {
        enumerable: true,
        get: () => this.dfgTexture,
        set: (source: unknown) => {
          if (this.disposed || !(source instanceof Texture)) return;
          if (this.dfgSourceId === source.uuid) return;
          this.dfgTexture?.dispose();
          this.dfgTexture = source.clone();
          this.dfgTexture.needsUpdate = true;
          this.dfgSourceId = source.uuid;
        },
      });
      shader.uniforms['dfgLUT'] = uniform;
    };
  }

  /** 低矮溜滑梯：梯子在 +z（排隊端），平台、滑道往 -z 降到地面。 */
  private buildSlide(): void {
    const [frame, chute] = this.propMaterials;
    const box = (
      name: string,
      material: MeshStandardMaterial,
      size: readonly [number, number, number],
      position: readonly [number, number, number],
      tiltX = 0,
    ): void => {
      const geometry = new BoxGeometry(...size);
      this.propGeometries.push(geometry);
      const mesh = new Mesh(geometry, material);
      mesh.name = name;
      mesh.position.set(SLIDE.x + position[0], position[1], SLIDE.z + position[2]);
      mesh.rotation.x = tiltX;
      this.scene.add(mesh);
    };
    for (const side of [-0.3, 0.3])
      box('slide-ladder-rail', frame, [0.05, 1.3, 0.05], [side, 0.65, 0]);
    for (let step = 0; step < 4; step += 1)
      box('slide-ladder-step', frame, [0.6, 0.04, 0.08], [0, 0.25 + step * 0.3, 0]);
    box('slide-platform', frame, [0.7, 0.06, 0.6], [0, 1.3, -0.3]);
    for (const side of [-0.32, 0.32])
      box('slide-platform-post', frame, [0.05, 1.3, 0.05], [side, 0.65, -0.6]);
    // 滑道從平台 (y 1.3) 斜降到 z -2.6 的地面。
    box('slide-chute', chute, [0.6, 0.05, 2.4], [0, 0.68, -1.6], -0.52);
    for (const side of [-0.32, 0.32])
      box('slide-chute-edge', chute, [0.04, 0.12, 2.4], [side, 0.74, -1.6], -0.52);
  }

  /** 公園入口：兩根柱子與橫梁，媽媽站在入口內側。 */
  private buildGate(): void {
    const [, , post] = this.propMaterials;
    for (const x of [-2.2, 2.2]) {
      const pillar = new Mesh(this.postGeometry, post);
      pillar.name = 'park-gate-post';
      pillar.scale.set(1.6, 2.2, 1.6);
      pillar.position.set(x, 1.1, GATE_Z);
      this.scene.add(pillar);
    }
    const beamGeometry = new BoxGeometry(4.6, 0.12, 0.12);
    this.propGeometries.push(beamGeometry);
    const beam = new Mesh(beamGeometry, post);
    beam.name = 'park-gate-beam';
    beam.position.set(0, 2.2, GATE_Z);
    this.scene.add(beam);
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
    for (const character of this.characters) character.dispose();
    for (const geometry of this.propGeometries) geometry.dispose();
    for (const material of this.propMaterials) material.dispose();
    this.postGeometry.dispose();
    this.environment.dispose();
    this.boundaryGeometry.dispose();
    this.boundaryMaterial.dispose();
    this.dfgTexture?.dispose();
    this.dfgTexture = null;
    this.dfgSourceId = null;
    this.scene.clear();
  }
}
