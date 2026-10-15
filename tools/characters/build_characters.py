"""從 MakeHuman CC0 資料產生公園人物 GLB（離線工具）。

用法：python3 build_characters.py <makehuman/data 路徑> <輸出目錄> [人物 id ...]
只用 numpy；不需要 MakeHuman 程式或 Blender。
"""
import json
import struct
import sys
import zlib
from pathlib import Path

import numpy as np

DATA = Path(sys.argv[1])
OUT = Path(sys.argv[2])
ONLY = set(sys.argv[3:])

SCALE = 0.1  # MakeHuman 單位是公寸

# ---------- 讀取基礎網格 ----------

def load_obj(path):
    verts, uvs, faces = [], [], []  # faces: (group, [(vi, ti), ...])
    group = None
    for line in open(path, encoding='utf-8'):
        if line.startswith('v '):
            verts.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '):
            uvs.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('g '):
            group = line.split(maxsplit=1)[1].strip()
        elif line.startswith('f '):
            corners = []
            for token in line.split()[1:]:
                parts = token.split('/')
                corners.append((int(parts[0]) - 1, int(parts[1]) - 1))
            faces.append((group, corners))
    return np.array(verts, dtype=np.float64), np.array(uvs, dtype=np.float64), faces


def load_target(path):
    idx, delta = [], []
    for line in open(path, encoding='utf-8'):
        if not line.strip() or line.startswith('#'):
            continue
        p = line.split()
        idx.append(int(p[0]))
        delta.append([float(p[1]), float(p[2]), float(p[3])])
    return np.array(idx, dtype=np.int64), np.array(delta, dtype=np.float64)


def age_values(years):
    """MakeHuman A8 年齡權重（apps/human.py _setAgeVals）。"""
    if years < 25:
        age = 0.1875 * (years - 1) / 9 if years <= 10 else 0.1875 + 0.3125 * (years - 10) / 15
    else:
        age = 0.5 + 0.5 * (years - 25) / 65
    if age < 0.5:
        baby = max(0.0, 1 - age * 5.333)
        young = max(0.0, (age - 0.1875) * 3.2)
        child = max(0.0, min(1.0, 5.333 * age) - young)
        old = 0.0
    else:
        baby = child = 0.0
        old = max(0.0, age * 2 - 1)
        young = 1 - old
    return {'baby': baby, 'child': child, 'young': young, 'old': old}


def three_way(value):
    """肌肉／體重 0..1 → min/average/max 權重（0.5 = 平均）。"""
    if value < 0.5:
        return {'min': (0.5 - value) * 2, 'average': value * 2, 'max': 0.0}
    return {'min': 0.0, 'average': (1 - value) * 2, 'max': (value - 0.5) * 2}


def macro_targets(spec):
    gender = {'female': 1 - spec['gender'], 'male': spec['gender']}
    ages = age_values(spec['age'])
    muscle = three_way(spec.get('muscle', 0.5))
    weight = three_way(spec.get('weight', 0.5))
    race = spec.get('race', {'asian': 1.0})
    out = []
    for g, gw in gender.items():
        for a, aw in ages.items():
            for m, mw in muscle.items():
                for w, ww in weight.items():
                    total = gw * aw * mw * ww
                    if total > 1e-4:
                        out.append((f'macrodetails/universal-{g}-{a}-{m}muscle-{w}weight.target', total))
            for r, rw in race.items():
                total = rw * gw * aw
                if total > 1e-4:
                    out.append((f'macrodetails/{r}-{g}-{a}.target', total))
    return out


# ---------- 骨架 ----------

KEEP = [
    'root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'neck02', 'neck03', 'head',
    'clavicle.L', 'shoulder01.L', 'upperarm01.L', 'upperarm02.L', 'lowerarm01.L', 'lowerarm02.L', 'wrist.L',
    'clavicle.R', 'shoulder01.R', 'upperarm01.R', 'upperarm02.R', 'lowerarm01.R', 'lowerarm02.R', 'wrist.R',
    'pelvis.L', 'upperleg01.L', 'upperleg02.L', 'lowerleg01.L', 'lowerleg02.L', 'foot.L',
    'pelvis.R', 'upperleg01.R', 'upperleg02.R', 'lowerleg01.R', 'lowerleg02.R', 'foot.R',
]


def build_skeleton(verts):
    skel = json.load(open(DATA / 'rigs/default.mhskel'))
    bones, joints = skel['bones'], skel['joints']
    joint_pos = {name: verts[idx].mean(axis=0) for name, idx in joints.items()}
    keep = {}
    for name in KEEP:
        b = bones[name]
        parent = b['parent']
        while parent is not None and parent not in KEEP:
            parent = bones[parent]['parent']
        keep[name] = {'head': joint_pos[b['head']], 'tail': joint_pos[b['tail']], 'parent': parent}
    # 未保留的骨頭權重併到最近的保留祖先。
    mapping = {}
    for name in bones:
        n = name
        while n not in KEEP:
            n = bones[n]['parent']
        mapping[name] = n
    return keep, mapping


def build_weights(nverts, mapping):
    w = json.load(open(DATA / 'rigs/default_weights.mhw'))['weights']
    index = {name: i for i, name in enumerate(KEEP)}
    dense = np.zeros((nverts, len(KEEP)), dtype=np.float64)
    for bone, pairs in w.items():
        target = index[mapping[bone]]
        for vi, wt in pairs:
            dense[vi, target] += wt
    # 沒有權重的頂點（多為輔助網格）交給 head 或 root，之後依位置補。
    joints = np.argsort(-dense, axis=1)[:, :4]
    weights = np.take_along_axis(dense, joints, axis=1)
    sums = weights.sum(axis=1, keepdims=True)
    empty = sums[:, 0] <= 1e-8
    weights = np.where(sums > 1e-8, weights / np.maximum(sums, 1e-8), 0)
    return joints, weights, empty, dense


# ---------- 輸出 GLB ----------

class Gltf:
    def __init__(self):
        self.bin = bytearray()
        self.doc = {'asset': {'version': '2.0', 'generator': 'park build_characters.py (MakeHuman CC0 data)'},
                    'buffers': [], 'bufferViews': [], 'accessors': [], 'meshes': [], 'nodes': [],
                    'materials': [], 'scenes': [{'nodes': []}], 'scene': 0, 'skins': [],
                    'images': [], 'textures': [], 'samplers': []}

    def _view(self, data, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        offset = len(self.bin)
        self.bin += data
        view = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(data)}
        if target:
            view['target'] = target
        self.doc['bufferViews'].append(view)
        return len(self.doc['bufferViews']) - 1

    def accessor(self, array, kind, component, target=None, minmax=False):
        array = np.ascontiguousarray(array)
        view = self._view(array.tobytes(), target)
        acc = {'bufferView': view, 'componentType': component, 'count': int(array.shape[0]), 'type': kind}
        if minmax:
            acc['min'] = array.min(axis=0).tolist()
            acc['max'] = array.max(axis=0).tolist()
        self.doc['accessors'].append(acc)
        return len(self.doc['accessors']) - 1

    def weights(self, w):
        """權重存成正規化 unsigned byte，總和維持 255。"""
        q = np.floor(w * 255).astype(np.int32)
        q[:, 0] += 255 - q.sum(axis=1)
        view = self._view(np.ascontiguousarray(q.astype(np.uint8)).tobytes(), 34962)
        self.doc['accessors'].append({'bufferView': view, 'componentType': 5121, 'normalized': True,
                                      'count': int(len(q)), 'type': 'VEC4'})
        return len(self.doc['accessors']) - 1

    def image(self, png_bytes):
        view = self._view(png_bytes)
        self.doc['images'].append({'bufferView': view, 'mimeType': 'image/png'})
        if not self.doc['samplers']:
            self.doc['samplers'].append({'magFilter': 9729, 'minFilter': 9987})
        self.doc['textures'].append({'source': len(self.doc['images']) - 1, 'sampler': 0})
        return len(self.doc['textures']) - 1

    def material(self, name, color, rough=0.8, texture=None):
        m = {'name': name, 'pbrMetallicRoughness': {'baseColorFactor': list(color) + [1.0],
                                                     'metallicFactor': 0.0, 'roughnessFactor': rough}}
        if texture is not None:
            m['pbrMetallicRoughness']['baseColorTexture'] = {'index': texture}
        self.doc['materials'].append(m)
        return len(self.doc['materials']) - 1

    def write(self, path):
        for key in ['images', 'textures', 'samplers', 'skins']:
            if not self.doc[key]:
                del self.doc[key]
        while len(self.bin) % 4:
            self.bin.append(0)
        self.doc['buffers'] = [{'byteLength': len(self.bin)}]
        js = json.dumps(self.doc, separators=(',', ':')).encode()
        js += b' ' * ((4 - len(js) % 4) % 4)
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, total))
            f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
            f.write(struct.pack('<II', len(self.bin), 0x004E4942) + bytes(self.bin))


def srgb(hex_color):
    c = [((hex_color >> s) & 255) / 255 for s in (16, 8, 0)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def vertex_normals(positions, tris):
    n = np.zeros_like(positions)
    a, b, c = positions[tris[:, 0]], positions[tris[:, 1]], positions[tris[:, 2]]
    fn = np.cross(b - a, c - a)
    for k in range(3):
        np.add.at(n, tris[:, k], fn)
    length = np.linalg.norm(n, axis=1, keepdims=True)
    return n / np.maximum(length, 1e-12)


def png_rgb(img):
    """把 uint8 RGB 陣列存成 PNG（只用標準函式庫的 zlib）。"""
    h, w, _ = img.shape
    raw = b''.join(b'\x00' + img[y].tobytes() for y in range(h))

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) \
        + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')


def eye_texture(size=512):
    """柔和的眼睛貼圖：乾淨眼白、深棕虹膜、較大的瞳孔。

    位置與 MakeHuman brown_eye.png 相同（兩個眼球的 UV 中心），但不畫血絲、虹膜不偏紅。
    """
    y, x = np.mgrid[0:size, 0:size] / size
    img = np.empty((size, size, 3))
    img[:] = [0.93, 0.92, 0.9]
    for cx, cy in ((0.703, 0.278), (0.288, 0.688)):
        r = np.hypot(x - cx, y - cy) / 0.13  # 虹膜半徑 = 1（比原貼圖稍大，眼神柔和）
        ang = np.arctan2(y - cy, x - cx)
        iris = np.array([0.40, 0.27, 0.19]) * (1 - 0.45 * np.clip(r, 0, 1) ** 2)[..., None]
        iris *= (1 + 0.06 * np.sin(ang * 23) * np.clip(r - 0.4, 0, 1))[..., None]  # 淡淡的放射紋
        t = np.clip((1.04 - r) / 0.08, 0, 1)[..., None]  # 虹膜邊緣柔和過渡到眼白
        img = img * (1 - t) + iris * t
        pupil = np.clip((0.42 - r) / 0.05, 0, 1)[..., None]
        img = img * (1 - pupil) + np.array([0.05, 0.04, 0.04]) * pupil
    return png_rgb(np.round(np.clip(img, 0, 1) * 255).astype(np.uint8))


def brow_strip(surface_z, eye, head_scale, thickness):
    """沿眉骨貼在皮膚上的細長眉毛（兩排頂點的帶狀網格）。"""
    side = np.sign(eye[0])
    pts = []
    for k in range(13):
        u = -1 + 2 * k / 12  # -1 靠鼻子、1 靠耳朵（在 +x 側）
        x = eye[0] + side * u * 0.019 * head_scale
        y = eye[1] + (0.024 + 0.0045 * (1 - u ** 2) - 0.002 * max(u, 0)) * head_scale
        w = thickness * head_scale * (1.0 - 0.55 * (u + 1) / 2)  # 眉頭較粗、眉尾漸細
        for yy in (y - w / 2, y + w / 2):
            pts.append([x, yy, surface_z(x, yy) + 0.0012])
    quads = [[2 * k, 2 * k + 2, 2 * k + 3, 2 * k + 1] for k in range(12)]
    if side < 0:
        quads = [q[::-1] for q in quads]
    return np.array(pts), quads


# ---------- 人物 ----------

CHARACTERS = {
    'xiaoyu': {'gender': 1.0, 'age': 8, 'weight': 0.55, 'skin': 0xe9b896, 'hair': 0x2a211c,
               'shirt': 0xd9b26a, 'pants': 0x4d6a8c, 'shoes': 0xf2f0ea, 'hairstyle': 'short'},
    'xiaoqing': {'gender': 0.0, 'age': 7, 'skin': 0xf0c4a4, 'hair': 0x2b1f1a,
                 'shirt': 0xd98f9a, 'pants': 0x5f7a6e, 'shoes': 0xf2f0ea, 'hairstyle': 'bob'},
    'xiaoan': {'gender': 1.0, 'age': 7, 'skin': 0xeebb98, 'hair': 0x3b2a20,
               'shirt': 0x7ea6ad, 'pants': 0x516a86, 'shoes': 0xf2f0ea, 'hairstyle': 'short'},
    'mom': {'gender': 0.0, 'age': 36, 'skin': 0xecbf9f, 'hair': 0x231a16,
            'shirt': 0x93a985, 'pants': 0x4b5263, 'shoes': 0x6b5848, 'hairstyle': 'long', 'skirt': True,
            'extra': [('breast/female-young-averagemuscle-averageweight-mincup-averagefirmness.target', 1.0),
                      ('breast/breast-point-decr.target', 1.0)]},
}

HEAD = {'neck01', 'neck02', 'neck03', 'head'}
HAND = {'lowerarm01.L', 'lowerarm01.R', 'lowerarm02.L', 'lowerarm02.R', 'wrist.L', 'wrist.R'}
ARM = {'shoulder01.L', 'shoulder01.R', 'upperarm01.L', 'upperarm01.R', 'upperarm02.L', 'upperarm02.R'}
FOOT = {'foot.L', 'foot.R'}


def adjacency(quads, nverts):
    nb = [set() for _ in range(nverts)]
    for corners in quads:
        ids = [v for v, _ in corners]
        for i, a in enumerate(ids):
            nb[a].add(ids[i - 1])
            nb[a].add(ids[(i + 1) % len(ids)])
    return nb


def shell(P, quads, offset, smooth_iters, edge_offset, drape=0, border_iters=None, taper=0):
    """把一組面複製成往外推的殼（疊在完整皮膚上）。

    內部頂點：Taubin 平滑（不縮小）後，保證至少在皮膚外 0.6*offset。
    邊界頂點：只沿邊界線互相平滑，讓衣領、袖口、髮際線變順，並保持貼近皮膚。
    taper：離邊界幾圈內的厚度逐漸增加（頭髮前緣變薄，不像帽簷）。
    """
    used = sorted({v for c in quads for v, _ in c})
    if not used:
        return P.copy()
    edge_count = {}
    for corners in quads:
        ids = [v for v, _ in corners]
        for i, a in enumerate(ids):
            e = tuple(sorted((a, ids[(i + 1) % len(ids)])))
            edge_count[e] = edge_count.get(e, 0) + 1
    border_nb = {}
    for (a, b), count in edge_count.items():
        if count == 1:
            border_nb.setdefault(a, set()).add(b)
            border_nb.setdefault(b, set()).add(a)
    nb = adjacency(quads, len(P))
    n = np.zeros_like(P)
    for corners in quads:
        ids = [v for v, _ in corners]
        for i in range(1, len(ids) - 1):
            a, b, c = P[ids[0]], P[ids[i]], P[ids[i + 1]]
            fn = np.cross(b - a, c - a)
            for k in (ids[0], ids[i], ids[i + 1]):
                n[k] += fn
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    # 法線先在鄰近幾圈內平均：細密小面（胸點、肚臍）被平滑後可能折疊，原始法線會亂指。
    used_arr = np.array(used)
    for _ in range(8):
        m = n.copy()
        for v in used:
            if nb[v]:
                m[v] = n[v] + np.sum([n[u] for u in nb[v]], axis=0)
        m[used_arr] /= np.maximum(np.linalg.norm(m[used_arr], axis=1, keepdims=True), 1e-12)
        n = m
    thick = {v: offset for v in used}
    ring, frontier = 0, set(border_nb)
    seen = set(frontier)
    while frontier and ring <= taper:
        for v in frontier:
            thick[v] = edge_offset + (offset - edge_offset) * ring / (taper + 1)
        frontier = {u for v in frontier for u in nb[v] if u not in seen}
        seen |= frontier
        ring += 1
    Q = P.copy()
    for v in used:
        Q[v] = P[v] + n[v] * thick[v]
    interior = [v for v in used if v not in border_nb]
    border = list(border_nb)
    for _ in range(smooth_iters):
        for factor in (0.5, -0.53):
            R = Q.copy()
            for v in interior:
                if nb[v]:
                    R[v] = Q[v] + factor * (np.mean([Q[u] for u in nb[v]], axis=0) - Q[v])
            Q = R
    # 布料垂墜：以平滑後的身體當「布料要包住的形狀」，小凸點（胸點、肚臍）不會透出。
    S = P.copy()
    for _ in range(drape):
        T = S.copy()
        for v in used:
            if nb[v]:
                T[v] = np.mean([S[u] for u in nb[v]], axis=0)
        S = T
    for _ in range(drape):
        R = Q.copy()
        for v in interior:
            if nb[v]:
                R[v] = Q[v] * 0.4 + np.mean([Q[u] for u in nb[v]], axis=0) * 0.6
        Q = R
        for v in interior:
            raw = np.dot(Q[v] - P[v], n[v])
            if raw < offset * 0.5:  # 不讓身體穿出布料
                Q[v] += n[v] * (offset * 0.5 - raw)
    for _ in range(border_iters or smooth_iters * 2):
        R = Q.copy()
        for v in border:
            R[v] = Q[v] * 0.5 + np.mean([Q[u] for u in border_nb[v]], axis=0) * 0.5
        Q = R
    for v in used:
        floor = edge_offset if v in border_nb else min(offset * 0.6, thick[v])
        depth = np.dot(Q[v] - P[v], n[v])
        if depth < floor:
            Q[v] += n[v] * (floor - depth)
    return Q


def radial_blur(P, quads, fixed, dominant, sigma_y=0.03, sigma_a=0.35):
    """把軀幹看成圓柱：以「離中心軸距離」做高度、角度方向的模糊，去掉胸點等小凸起。"""
    verts = sorted({v for c in quads for v, _ in c} - set(fixed))
    # 胸大肌、胸點的權重多在 shoulder01，只排除真正的上臂。
    verts = [v for v in verts if not dominant[v].startswith('upperarm')]
    if not verts:
        return P
    pts = P[verts]
    # 每個高度的軸心：該高度範圍前後、左右的中點。
    center = np.zeros((len(verts), 2))
    for i, p in enumerate(pts):
        band = pts[np.abs(pts[:, 1] - p[1]) < 0.015]
        center[i] = [(band[:, 0].max() + band[:, 0].min()) / 2, (band[:, 2].max() + band[:, 2].min()) / 2]
    dx, dz = pts[:, 0] - center[:, 0], pts[:, 2] - center[:, 1]
    radius = np.hypot(dx, dz)
    angle = np.arctan2(dx, dz)
    da = np.angle(np.exp(1j * (angle[:, None] - angle[None, :])))
    dy = pts[:, 1][:, None] - pts[:, 1][None, :]
    w = np.exp(-0.5 * ((dy / sigma_y) ** 2 + (da / sigma_a) ** 2))
    smooth = (w @ radius) / w.sum(axis=1)
    Q = P.copy()
    Q[verts, 0] = center[:, 0] + np.sin(angle) * smooth
    Q[verts, 2] = center[:, 1] + np.cos(angle) * smooth
    return Q


def smooth_normals(positions, quads, rings=3):
    """以原始頂點為單位計算法線（面積加權），再對鄰近幾圈平均。
    平滑後被擠扁的細小面（胸點、肚臍）不會讓光影出現假凸點。"""
    n = np.zeros_like(positions)
    edges = set()
    for corners in quads:
        ids = [v for v, _ in corners]
        for i in range(1, len(ids) - 1):
            a, b, c = positions[ids[0]], positions[ids[i]], positions[ids[i + 1]]
            fn = np.cross(b - a, c - a)
            for k in (ids[0], ids[i], ids[i + 1]):
                n[k] += fn
        for i, a in enumerate(ids):
            edges.add((a, ids[(i + 1) % len(ids)]))
    e = np.array(list(edges))
    for _ in range(rings):
        m = n.copy()
        np.add.at(m, e[:, 0], n[e[:, 1]])
        np.add.at(m, e[:, 1], n[e[:, 0]])
        n = m / np.maximum(np.linalg.norm(m, axis=1, keepdims=True), 1e-12)
    return n


def taubin(P, edges, fixed, pairs, lam=0.6, mu=-0.62):
    """在邊所連的頂點上做 Taubin 平滑；fixed 頂點不動。"""
    a = np.concatenate([edges[:, 0], edges[:, 1]])
    b = np.concatenate([edges[:, 1], edges[:, 0]])
    count = np.bincount(a, minlength=len(P)).astype(np.float64)
    movable = count > 0
    movable[list(fixed)] = False
    Q = P.copy()
    for _ in range(pairs):
        for factor in (lam, mu):
            total = np.zeros_like(Q)
            np.add.at(total, a, Q[b])
            mean = total[movable] / count[movable, None]
            Q[movable] += factor * (mean - Q[movable])
    return Q


def load_eye_proxy():
    """low-poly 眼睛：每個頂點對應基礎網格的一個頂點，帶有正確的眼睛貼圖 UV。"""
    lines = open(DATA / 'eyes/low-poly/low-poly.mhclo', encoding='utf-8').read().split('\n')
    start = lines.index('verts 0') + 1
    mapping = []
    for line in lines[start:]:
        parts = line.split()
        if len(parts) != 1 or not parts[0].isdigit():
            break
        mapping.append(int(parts[0]))
    v, uv, faces = load_obj(DATA / 'eyes/low-poly/low-poly.obj')
    assert len(mapping) == len(v), (len(mapping), len(v))
    return np.array(mapping), uv, [c for _, c in faces]


def build(char_id, spec, base_verts, uvs, faces):
    verts = base_verts.copy()
    child = spec['age'] < 15
    eyes = spec.get('eyes', 1.5 if child else 1.15)
    opening = spec.get('eye_opening', 0.3 if child else 0.4)
    # 模擬人生式的柔和臉：微笑嘴角、大而張開的眼睛；小孩臉頰較圓、臉型較稚嫩。
    face = [('mouth/mouth-angles-up.target', 0.6 if child else 0.45)]
    for side in 'lr':
        face += [(f'eyes/{side}-eye-scale-incr.target', eyes),
                 (f'eyes/{side}-eye-height2-incr.target', opening)]
    if child:
        face += [('cheek/l-cheek-volume-incr.target', 0.4), ('cheek/r-cheek-volume-incr.target', 0.4),
                 ('head/head-age-decr.target', 0.5)]
    targets = macro_targets(spec) + face + list(spec.get('extra', []))
    for rel, weight in targets:
        idx, delta = load_target(DATA / 'targets' / rel)
        if idx.size:  # 「平均」組合是基準，檔案沒有位移
            verts[idx] += delta * weight
    skel, mapping = build_skeleton(verts)
    joints, weights, empty, dense = build_weights(len(verts), mapping)
    dominant = np.array(KEEP)[np.argmax(dense, axis=1)]
    ground = verts[:, 1].min()
    P = (verts - [0, ground, 0]) * SCALE

    def head_of(name):
        return (skel[name]['head'] - [0, ground, 0]) * SCALE

    group_verts = {}
    for g, c in faces:
        group_verts.setdefault(g, set()).update(v for v, _ in c)
    eyeL = P[sorted(group_verts['helper-l-eye'])].mean(axis=0)
    eyeR = P[sorted(group_verts['helper-r-eye'])].mean(axis=0)
    eye_y, eye_z = (eyeL[1] + eyeR[1]) / 2, max(eyeL[2], eyeR[2])
    mjson = json.load(open(DATA / 'rigs/default.mhskel'))['joints']
    mouth = np.mean([(verts[idx].mean(axis=0) - [0, ground, 0]) * SCALE
                     for name, idx in mjson.items() if name.startswith('oris') and name.endswith('head')], axis=0)
    neck_y = head_of('neck01')[1]
    waist_y = head_of('spine04')[1]
    hip_y = head_of('upperleg01.L')[1]
    ankle_y = head_of('foot.L')[1]
    head_scale = abs(eyeL[0] - eyeR[0]) / 0.064  # 以成人瞳距 6.4cm 比例調整臉部尺寸

    body = [c for g, c in faces if g == 'body']
    regions = {'skin': list(body), 'shirt': [], 'pants': [], 'shoes': [], 'hair': []}
    sleeve = spec.get('sleeve', 0.55)
    hair = spec['hairstyle']
    head_faces = [P[[v for v, _ in c]].mean(axis=0) for c in body
                  if {dominant[v] for v, _ in c} == {'head'}]
    # 耳朵：眼睛高度附近往側面突出最多的地方。
    band = [c for c in head_faces if abs(c[1] - eye_y) < 0.03 * head_scale]
    ear_x = max(abs(c[0]) for c in band)
    ear_z = max(band, key=lambda c: abs(c[0]))[2]
    for corners in body:
        ids = [v for v, _ in corners]
        doms = {dominant[v] for v in ids}
        c = P[ids].mean(axis=0)
        if doms <= HEAD | {'spine01'} and doms & {'head'}:
            # 耳朵比頭骨寬，留給皮膚，避免頭髮像耳罩。
            if abs(c[2] - ear_z) < 0.034 * head_scale and abs(c[1] - eye_y + 0.004) < 0.042 * head_scale \
                    and abs(c[0]) > ear_x * 0.8:
                continue
            front = c[2] > eye_z - 0.075 * head_scale
            if hair == 'short':
                scalp = c[1] > eye_y + 0.036 * head_scale or (not front and c[1] > mouth[1] + 0.005)
            elif hair == 'bob':
                scalp = c[1] > eye_y + 0.03 * head_scale or (c[2] < eye_z - 0.055 * head_scale and c[1] > mouth[1] - 0.025 * head_scale)
            else:
                scalp = c[1] > eye_y + 0.036 * head_scale or (c[2] < eye_z - 0.05 * head_scale and c[1] > mouth[1] - 0.04 * head_scale)
            if scalp:
                regions['hair'].append(corners)
            continue
        if doms & HAND or doms & HEAD:
            continue
        if doms <= FOOT or c[1] < ankle_y + 0.01:
            regions['shoes'].append(corners)
            continue
        on_arm = bool(doms & ARM) and not doms & {'spine01', 'spine02', 'spine03'}
        if on_arm:
            side = '.L' if c[0] > 0 else '.R'
            s0, e0 = head_of('shoulder01' + side), head_of('lowerarm01' + side)
            axis = e0 - s0
            t = np.dot(c - s0, axis) / np.dot(axis, axis)
            if t < sleeve:
                regions['shirt'].append(corners)
            continue
        hem = waist_y - 0.01 if spec.get('skirt') else hip_y - 0.03
        if c[1] < neck_y - 0.03 * head_scale and c[1] > hem:
            regions['shirt'].append(corners)
        # 褲頭到腰，與上衣下擺重疊（上衣較厚，蓋在外面），避免露出一圈皮膚。
        if c[1] < waist_y and not spec.get('skirt'):
            regions['pants'].append(corners)


    # 衣服底下看不到的身體先抹平（胸點、肚臍、肋骨），衣服再從平滑後的身體往外推。
    # 衣服底下看不到的身體先抹平（胸點、肚臍、肋骨），衣服再從平滑後的身體往外推。
    # Taubin 平滑去掉小凸點但不縮小整體；以陣列運算加速。
    for name, pairs in (('shirt', 80), ('pants', 20)):
        quads = regions[name]
        if not quads:
            continue
        edge = {}
        for corners in quads:
            ids = [v for v, _ in corners]
            for i, a in enumerate(ids):
                e = tuple(sorted((a, ids[(i + 1) % len(ids)])))
                edge[e] = edge.get(e, 0) + 1
        fixed = {v for e, k in edge.items() if k == 1 for v in e}
        P = taubin(P, np.array(list(edge)), fixed, pairs)
        if name == 'shirt' and not child:
            P = radial_blur(P, quads, fixed, dominant)
    shells = {}
    shells['shirt'] = shell(P, regions['shirt'], 0.01 if child else 0.014, 16, 0.004, border_iters=30,
                            drape=0 if child else 30)
    shells['pants'] = shell(P, regions['pants'], 0.007, 4, 0.003)
    shells['shoes'] = shell(P, regions['shoes'], 0.01, 4, 0.004)
    thick = {'short': 0.012, 'bob': 0.018, 'long': 0.02}[hair]
    shells['hair'] = shell(P, regions['hair'], thick, 6, 0.002, border_iters=40, taper=3)
    # 臉部表面（眉毛貼合用）：眼睛附近、朝前的皮膚頂點。
    surface = P[sorted({v for c in body for v, _ in c})]
    surface = surface[(np.abs(surface[:, 1] - eye_y) < 0.08 * head_scale) & (surface[:, 2] > eye_z - 0.03)]

    def surface_z(x, y):
        dist = np.hypot(surface[:, 0] - x, surface[:, 1] - y)
        return surface[np.argsort(dist)[:6], 2].max()

    hair_edges = {}
    for corners in regions['hair']:
        ids = [v for v, _ in corners]
        for i, a in enumerate(ids):
            e = tuple(sorted((a, ids[(i + 1) % len(ids)])))
            hair_edges[e] = hair_edges.get(e, 0) + 1
    hair_border = {v for e, k in hair_edges.items() if k == 1 for v in e}

    # 臉部顏色：嘴唇、淡淡腮紅（頂點色，線性色彩空間）。
    skin_rgb = np.array(srgb(spec['skin']))
    color = np.tile(skin_rgb, (len(P), 1))
    lip_rgb, blush_rgb = np.array(srgb(0xc9787a)), np.array(srgb(0xe8a0a0))
    for eye in (eyeL, eyeR):
        cheek = np.linalg.norm(P - (eye + [np.sign(eye[0]) * 0.008, -0.03 * head_scale, 0]), axis=1)
        blush = np.clip(1 - cheek / (0.018 * head_scale), 0, 1)[:, None] * 0.35 * (P[:, 2:3] > eye[2] - 0.02)
        color = color * (1 - blush) + blush_rgb * blush
    # 頭皮染成髮色（只染髮殼內部，邊界留膚色，髮際線才不會出現深色三角形）。
    scalp = sorted({v for c in regions['hair'] for v, _ in c} - hair_border)
    color[scalp] = np.array(srgb(spec['hair'])) * 0.9
    dm = P - mouth
    lips = np.clip(1 - np.hypot(dm[:, 0] / (0.022 * head_scale), dm[:, 1] / (0.009 * head_scale)), 0, 1)
    lips = (np.clip(lips * 2.5, 0, 1) * (dm[:, 2] > -0.006))[:, None] * 0.55
    color = color * (1 - lips) + lip_rgb * lips

    gl = Gltf()
    eye_tex = gl.image(eye_texture())
    mats = {
        'skin': gl.material('skin', [1, 1, 1], 0.62),
        'shirt': gl.material('shirt', srgb(spec['shirt']), 0.9),
        'pants': gl.material('pants', srgb(spec['pants']), 0.92),
        'shoes': gl.material('shoes', srgb(spec['shoes']), 0.7),
        'hair': gl.material('hair', srgb(spec['hair']), 0.6),
        'eye': gl.material('eye', [1, 1, 1], 0.2, eye_tex),
        # 眉毛比頭髮淡一些（混一點膚色），看起來柔和。
        'brow': gl.material('brow', list(np.array(srgb(spec['hair'])) * 0.85 + np.array(srgb(spec['skin'])) * 0.15), 0.85),
        'skirt': gl.material('skirt', srgb(spec.get('skirt_color', spec['pants'])), 0.9),
    }
    parts = [(k, quads, shells.get(k, P)) for k, quads in regions.items()]
    if spec.get('skirt'):
        skirt = [c for g, c in faces if g == 'helper-skirt']
        parts.append(('skirt', skirt, shell(P, skirt, 0.006, 3, 0.006)))

    primitives, all_pos = [], []
    for region, quads, positions in parts:
        if not quads:
            continue
        key_index, src_v, src_t, tris = {}, [], [], []
        for corners in quads:
            ids = []
            for v, t in corners:
                k = (v, t)
                if k not in key_index:
                    key_index[k] = len(src_v)
                    src_v.append(v)
                    src_t.append(t)
                ids.append(key_index[k])
            for i in range(1, len(ids) - 1):
                tris.append([ids[0], ids[i], ids[i + 1]])
        src_v = np.array(src_v)
        tris = np.array(tris, dtype=np.uint32)
        p = positions[src_v]
        n = smooth_normals(positions, quads, 6 if region == 'shirt' else 3)[src_v] if region in ('skin', 'shirt', 'pants') \
            else vertex_normals(p, tris.astype(np.int64))
        j = joints[src_v].astype(np.uint16)
        w = weights[src_v].astype(np.float32)
        no_w = empty[src_v]
        j[no_w] = [KEEP.index('head'), 0, 0, 0]
        w[no_w] = [1, 0, 0, 0]
        attrs = {
            'POSITION': gl.accessor(p.astype(np.float32), 'VEC3', 5126, 34962, True),
            'NORMAL': gl.accessor(n.astype(np.float32), 'VEC3', 5126, 34962),
            'JOINTS_0': gl.accessor(j.astype(np.uint8), 'VEC4', 5121, 34962),
            'WEIGHTS_0': gl.weights(w),
        }
        if region == 'skin':
            attrs['COLOR_0'] = gl.accessor(color[src_v].astype(np.float32), 'VEC3', 5126, 34962)
        idx = tris.reshape(-1)
        idx_acc = gl.accessor(idx.astype(np.uint16), 'SCALAR', 5123, 34963) if idx.max() < 65535 \
            else gl.accessor(idx, 'SCALAR', 5125, 34963)
        primitives.append({'attributes': attrs, 'indices': idx_acc,
                           'material': mats[region]})
        all_pos.append(p)

    # 眉毛：貼在臉部皮膚表面的細帶，跟著頭部骨頭。
    for eye in (eyeL, eyeR):
        bp, bq = brow_strip(surface_z, eye, head_scale, spec.get('brow', 0.0038 if child else 0.0042))
        tris = np.array([[q[0], q[i], q[i + 1]] for q in bq for i in (1, 2)], dtype=np.uint32)
        nb = np.tile([0.0, 0.25, 0.97], (len(bp), 1)) / np.linalg.norm([0.0, 0.25, 0.97])
        head_joint = np.tile([KEEP.index('head'), 0, 0, 0], (len(bp), 1)).astype(np.uint8)
        primitives.append({'attributes': {
            'POSITION': gl.accessor(bp.astype(np.float32), 'VEC3', 5126, 34962, True),
            'NORMAL': gl.accessor(nb.astype(np.float32), 'VEC3', 5126, 34962),
            'JOINTS_0': gl.accessor(head_joint, 'VEC4', 5121, 34962),
            'WEIGHTS_0': gl.weights(np.tile([1.0, 0, 0, 0], (len(bp), 1))),
        }, 'indices': gl.accessor(tris.reshape(-1).astype(np.uint16), 'SCALAR', 5123, 34963),
            'material': mats['brow']})

    # 眼睛：low-poly 代理，位置取自基礎網格對應頂點。
    eye_map, eye_uv, eye_faces = EYE
    tris = []
    eye_uvs = np.zeros((len(eye_map), 2), dtype=np.float32)
    for corners in eye_faces:
        for v, t in corners:
            eye_uvs[v] = eye_uv[t]
        ids = [v for v, _ in corners]
        for i in range(1, len(ids) - 1):
            tris.append([ids[0], ids[i], ids[i + 1]])
    tris = np.array(tris, dtype=np.uint32)
    p = P[eye_map]
    eye_uvs[:, 1] = 1 - eye_uvs[:, 1]
    j = joints[eye_map].astype(np.uint16)
    w = weights[eye_map].astype(np.float32)
    j[empty[eye_map]] = [KEEP.index('head'), 0, 0, 0]
    w[empty[eye_map]] = [1, 0, 0, 0]
    primitives.append({'attributes': {
        'POSITION': gl.accessor(p.astype(np.float32), 'VEC3', 5126, 34962, True),
        'NORMAL': gl.accessor(vertex_normals(p, tris.astype(np.int64)).astype(np.float32), 'VEC3', 5126, 34962),
        'TEXCOORD_0': gl.accessor(eye_uvs, 'VEC2', 5126, 34962),
        'JOINTS_0': gl.accessor(j.astype(np.uint8), 'VEC4', 5121, 34962),
        'WEIGHTS_0': gl.weights(w),
    }, 'indices': gl.accessor(tris.reshape(-1), 'SCALAR', 5125, 34963), 'material': mats['eye']})
    gl.doc['meshes'].append({'name': char_id, 'primitives': primitives})
    bone_nodes = {}
    heads = {name: head_of(name) for name in KEEP}
    for i, name in enumerate(KEEP):
        parent = skel[name]['parent']
        t = heads[name] - (heads[parent] if parent else 0)
        gl.doc['nodes'].append({'name': name, 'translation': [float(x) for x in t]})
        bone_nodes[name] = i
    for name in KEEP:
        kids = [bone_nodes[k] for k in KEEP if skel[k]['parent'] == name]
        if kids:
            gl.doc['nodes'][bone_nodes[name]]['children'] = kids
    ibm = np.zeros((len(KEEP), 16), dtype=np.float32)
    for i, name in enumerate(KEEP):
        m = np.eye(4, dtype=np.float32)
        m[:3, 3] = -heads[name]
        ibm[i] = m.T.reshape(-1)
    gl.doc['skins'].append({'joints': [bone_nodes[n] for n in KEEP], 'skeleton': bone_nodes['root'],
                            'inverseBindMatrices': gl.accessor(ibm, 'MAT4', 5126)})
    mesh_node = len(gl.doc['nodes'])
    gl.doc['nodes'].append({'name': f'{char_id}-body', 'mesh': 0, 'skin': 0})
    top = len(gl.doc['nodes'])
    gl.doc['nodes'].append({'name': char_id, 'children': [bone_nodes['root'], mesh_node]})
    gl.doc['scenes'][0]['nodes'] = [top]
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{char_id}.glb'
    gl.write(path)
    allp = np.concatenate(all_pos)
    print(f'{char_id}: height {allp[:, 1].max():.3f} m, {sum(len(x) for x in all_pos)} verts, '
          f'{path.stat().st_size / 1024:.0f} KiB, faces ' + ', '.join(f'{k}={len(v)}' for k, v in regions.items()))


base_verts, uvs, faces = load_obj(DATA / '3dobjs/base.obj')
EYE = load_eye_proxy()
for cid, spec in CHARACTERS.items():
    if not ONLY or cid in ONLY:
        build(cid, spec, base_verts, uvs, faces)
