import { Euler, MathUtils, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';

export const PARK_LIMIT = 8;
export interface CircularObstacle {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}
const STOP_DISTANCE = 0.08;
const GROUND = new Plane(new Vector3(0, 1, 0), 0);

/** 一個引擎擁有一個控制器；沒有自己的 RAF、計時器或 pointer lock。 */
export class FirstPersonController {
  private enabled = false;
  private disposed = false;
  private readonly keys = new Set<string>();
  private readonly velocity = new Vector2();
  private readonly target = new Vector2();
  private hasTarget = false;
  private readonly rotation = new Euler(0, 0, 0, 'YXZ');
  private yaw = 0;
  private pitch = 0;
  private turnX = 0;
  private turnY = 0;
  private speed = 1;
  private sensitivity = 0.002;
  private canvas: HTMLCanvasElement | null = null;
  private controls: HTMLElement | null = null;
  private owner: Document | null = null;
  private view: Window | null = null;
  private pointer: {
    id: number;
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    dragged: boolean;
  } | null = null;
  private readonly touches = new Set<number>();
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly groundPoint = new Vector3();

  constructor(
    readonly camera: PerspectiveCamera,
    private readonly obstacles: readonly CircularObstacle[] = [],
  ) {
    this.syncCamera();
  }

  attach(canvas: HTMLCanvasElement): void {
    if (this.disposed || this.canvas) return;
    this.canvas = canvas;
    this.owner = canvas.ownerDocument;
    this.view = this.owner.defaultView;
    this.controls = this.owner.getElementById('movement-controls');
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerCancel);
    canvas.addEventListener('lostpointercapture', this.pointerLost);
    this.owner.addEventListener('keydown', this.keyDown);
    this.owner.addEventListener('keyup', this.keyUp);
    this.owner.addEventListener('focusin', this.focusChanged);
    this.view?.addEventListener('blur', this.clearInput);
    this.controls?.addEventListener('click', this.controlClick);
    this.controls?.addEventListener('input', this.settingChanged);
    this.controls?.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      this.configure(input);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled && !this.disposed;
    this.clearInput();
    if (this.controls) this.controls.hidden = !this.enabled;
  }

  /** 暫停、失焦、取消與安全區都丟棄待執行輸入。 */
  readonly clearInput = (): void => {
    this.keys.clear();
    this.velocity.set(0, 0);
    this.hasTarget = false;
    this.turnX = 0;
    this.turnY = 0;
    const pointer = this.pointer;
    this.pointer = null;
    this.touches.clear();
    if (pointer && this.canvas?.hasPointerCapture(pointer.id))
      this.canvas.releasePointerCapture(pointer.id);
  };

  syncCamera(): void {
    this.clearInput();
    this.rotation.setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = this.rotation.y;
    this.pitch = this.rotation.x;
  }

  moveTo(x: number, z: number): void {
    if (!this.enabled || !Number.isFinite(x) || !Number.isFinite(z)) return;
    this.keys.clear();
    this.target.set(
      MathUtils.clamp(x, -PARK_LIMIT, PARK_LIMIT),
      MathUtils.clamp(z, -PARK_LIMIT, PARK_LIMIT),
    );
    this.hasTarget = true;
  }

  /** 由引擎同一條 RAF 更新；高度固定、斜向不加速、邊界不穿越。 */
  update(delta: number): void {
    if (!this.enabled || !Number.isFinite(delta) || delta <= 0) return;
    const dt = Math.min(delta, 0.05);
    this.yaw -= MathUtils.clamp(this.turnX, -0.08, 0.08);
    this.pitch = MathUtils.clamp(
      this.pitch - MathUtils.clamp(this.turnY, -0.08, 0.08),
      -Math.PI / 4,
      Math.PI / 4,
    );
    this.turnX = 0;
    this.turnY = 0;
    this.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this.rotation);
    let x = 0;
    let z = 0;
    if (this.hasTarget) {
      x = this.target.x - this.camera.position.x;
      z = this.target.y - this.camera.position.z;
      const distance = Math.hypot(x, z);
      if (distance <= STOP_DISTANCE) {
        this.hasTarget = false;
        this.velocity.set(0, 0);
        return;
      }
      // 接近目標時減速，避免來回越過目標。
      const speed = Math.min(this.speed, distance * 3);
      x = (x / distance) * speed;
      z = (z / distance) * speed;
    } else {
      const forward =
        Number(this.keys.has('w') || this.keys.has('arrowup')) -
        Number(this.keys.has('s') || this.keys.has('arrowdown'));
      const right =
        Number(this.keys.has('d') || this.keys.has('arrowright')) -
        Number(this.keys.has('a') || this.keys.has('arrowleft'));
      const length = Math.hypot(forward, right);
      if (length > 0) {
        x = ((-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * right) / length) * this.speed;
        z = ((-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * right) / length) * this.speed;
      }
    }
    const blend = 1 - Math.exp(-8 * dt);
    this.velocity.x += (x - this.velocity.x) * blend;
    this.velocity.y += (z - this.velocity.y) * blend;
    const nextX = this.camera.position.x + this.velocity.x * dt;
    const nextZ = this.camera.position.z + this.velocity.y * dt;
    for (const obstacle of this.obstacles) {
      if (Math.hypot(nextX - obstacle.x, nextZ - obstacle.z) < obstacle.radius) {
        this.velocity.set(0, 0);
        this.hasTarget = false;
        return;
      }
    }
    this.camera.position.x = MathUtils.clamp(nextX, -PARK_LIMIT, PARK_LIMIT);
    this.camera.position.z = MathUtils.clamp(nextZ, -PARK_LIMIT, PARK_LIMIT);
    if (nextX !== this.camera.position.x) this.velocity.x = 0;
    if (nextZ !== this.camera.position.z) this.velocity.y = 0;
    this.camera.updateMatrixWorld();
  }

  dispose(): void {
    if (this.disposed) return;
    this.setEnabled(false);
    this.disposed = true;
    this.canvas?.removeEventListener('pointerdown', this.pointerDown);
    this.canvas?.removeEventListener('pointermove', this.pointerMove);
    this.canvas?.removeEventListener('pointerup', this.pointerUp);
    this.canvas?.removeEventListener('pointercancel', this.pointerCancel);
    this.canvas?.removeEventListener('lostpointercapture', this.pointerLost);
    this.owner?.removeEventListener('keydown', this.keyDown);
    this.owner?.removeEventListener('keyup', this.keyUp);
    this.owner?.removeEventListener('focusin', this.focusChanged);
    this.view?.removeEventListener('blur', this.clearInput);
    this.controls?.removeEventListener('click', this.controlClick);
    this.controls?.removeEventListener('input', this.settingChanged);
    this.canvas = null;
    this.controls = null;
    this.owner = null;
    this.view = null;
  }

  private readonly keyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (
      !this.enabled ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      this.owner?.activeElement !== this.canvas ||
      !['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)
    )
      return;
    event.preventDefault();
    this.hasTarget = false;
    this.keys.add(key);
  };
  private readonly keyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };
  private readonly focusChanged = (): void => {
    if (this.owner?.activeElement !== this.canvas) this.clearInput();
  };

  private readonly pointerDown = (event: PointerEvent): void => {
    if (!this.enabled || event.button !== 0) return;
    this.touches.add(event.pointerId);
    if (this.touches.size > 1 || !event.isPrimary) {
      // 多指清空待執行轉向與前往，直到所有手指放開。
      const activeTouches = [...this.touches];
      this.clearInput();
      for (const id of activeTouches) this.touches.add(id);
      return;
    }
    this.canvas?.focus({ preventScroll: true });
    this.clearInput();
    this.touches.add(event.pointerId);
    this.pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      dragged: false,
    };
    this.canvas?.setPointerCapture(event.pointerId);
  };
  private readonly pointerMove = (event: PointerEvent): void => {
    const p = this.pointer;
    if (!this.enabled || !p || p.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - p.x, event.clientY - p.y) > 8) p.dragged = true;
    if (p.dragged) {
      this.turnX += (event.clientX - p.lastX) * this.sensitivity;
      this.turnY += (event.clientY - p.lastY) * this.sensitivity;
    }
    p.lastX = event.clientX;
    p.lastY = event.clientY;
  };
  private readonly pointerUp = (event: PointerEvent): void => {
    this.touches.delete(event.pointerId);
    const p = this.pointer;
    if (!p || p.id !== event.pointerId) return;
    this.pointer = null;
    if (this.canvas?.hasPointerCapture(event.pointerId))
      this.canvas.releasePointerCapture(event.pointerId);
    if (!p.dragged && this.enabled && this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      this.ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      );
      this.camera.updateMatrixWorld();
      this.raycaster.setFromCamera(this.ndc, this.camera);
      if (this.raycaster.ray.intersectPlane(GROUND, this.groundPoint))
        this.moveTo(this.groundPoint.x, this.groundPoint.z);
    }
  };
  private readonly pointerCancel = (): void => {
    this.clearInput();
  };
  private readonly pointerLost = (): void => {
    if (this.pointer) this.clearInput();
  };

  private readonly controlClick = (event: MouseEvent): void => {
    if (!this.enabled || !(event.target instanceof Element)) return;
    const action = event.target.closest<HTMLButtonElement>('button[data-move]')?.dataset.move;
    if (!action) return;
    this.clearInput();
    if (action === 'stop') return;
    if (action === 'turn-left' || action === 'turn-right') {
      this.yaw += ((action === 'turn-left' ? 1 : -1) * Math.PI) / 12;
      this.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(this.rotation);
      return;
    }
    const forward = action === 'forward' ? 0.6 : action === 'back' ? -0.6 : 0;
    const right = action === 'right' ? 0.6 : action === 'left' ? -0.6 : 0;
    this.moveTo(
      this.camera.position.x - Math.sin(this.yaw) * forward + Math.cos(this.yaw) * right,
      this.camera.position.z - Math.cos(this.yaw) * forward - Math.sin(this.yaw) * right,
    );
  };
  private readonly settingChanged = (event: Event): void => {
    if (event.target instanceof HTMLInputElement) {
      this.clearInput();
      this.configure(event.target);
    }
  };
  private configure(input: HTMLInputElement): void {
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    if (input.name === 'speed') this.speed = MathUtils.clamp(value, 0.6, 1.8);
    if (input.name === 'sensitivity') this.sensitivity = MathUtils.clamp(value, 0.001, 0.005);
    if (input.name === 'fov') {
      this.camera.fov = MathUtils.clamp(value, 50, 75);
      this.camera.updateProjectionMatrix();
    }
  }
}
