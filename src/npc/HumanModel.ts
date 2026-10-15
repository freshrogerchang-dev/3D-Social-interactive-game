import { Bone, Mesh, SkinnedMesh, Texture } from 'three';
import type { Material, Object3D } from 'three';

/**
 * MakeHuman CC0 人物模型（tools/characters/build_characters.py 產生）的骨頭查詢。
 * GLTFLoader 會移除名稱中的「.」，所以 `shoulder01.L` 會變成 `shoulder01L`。
 */
export type BoneName =
  'shoulder01' | 'lowerarm01' | 'wrist' | 'upperleg01' | 'lowerleg01' | 'neck02' | 'head';

export class HumanRig {
  private readonly bones = new Map<string, Bone>();
  /** 綁定姿勢下各骨頭在模型座標的 x（建立時骨頭都沒有旋轉，可直接累加位移）。 */
  private readonly modelX = new Map<Bone, number>();

  constructor(readonly root: Object3D) {
    root.traverse((object) => {
      if (!(object instanceof Bone)) return;
      const bone = object as Bone;
      this.bones.set(bone.name, bone);
      let x = 0;
      for (let node: Object3D | null = bone; node instanceof Bone; node = node.parent)
        x += node.position.x;
      this.modelX.set(bone, x);
    });
  }

  get boneCount(): number {
    return this.bones.size;
  }

  /** 取得骨頭；side 為 1 表示模型 +x 那一側、-1 為 -x 側，省略表示中央骨頭。 */
  bone(name: BoneName, side?: 1 | -1): Bone | undefined {
    if (side === undefined) return this.bones.get(name);
    for (const suffix of ['L', 'R']) {
      const bone = this.bones.get(name + suffix);
      if (bone && Math.sign(this.modelX.get(bone) ?? 0) === side) return bone;
    }
    return undefined;
  }
}

/** 釋放模型擁有的 geometry、material、texture 與骨架資料。 */
export function disposeModel(root: Object3D): void {
  const materials = new Set<Material>();
  root.traverse((object) => {
    if (object instanceof SkinnedMesh) object.skeleton.dispose();
    if (object instanceof Mesh) {
      (object.geometry as { dispose(): void }).dispose();
      const list: Material[] = Array.isArray(object.material)
        ? (object.material as Material[])
        : [object.material as Material];
      for (const material of list) materials.add(material);
    }
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
    material.dispose();
  }
  root.removeFromParent();
}
