import { annotatedText } from './GreetingPresentation';
import { PLACES } from '../scene/Neighborhood';
import type { PlaceId, WorldSnapshot } from '../scene/Neighborhood';

/** 北向固定小地圖；只指路，不傳送、不自動移動。使用引擎的既有 RAF 資料更新位置。 */
export class NeighborhoodUI {
  private open = false;
  private previousFocus: HTMLElement | null = null;
  private goal: PlaceId | null = null;
  private running = false;
  private hint = '';
  constructor(
    private readonly root: HTMLElement,
    private readonly trigger: HTMLElement,
    private readonly onOpen: (open: boolean) => void,
  ) {
    for (const el of root.querySelectorAll<HTMLElement>('h2, p, button')) {
      const text = el.textContent.trim();
      const label = document.createElement('span');
      label.append(annotatedText(text));
      el.replaceChildren(label);
      if (el instanceof HTMLButtonElement) el.setAttribute('aria-label', text);
    }
    trigger.addEventListener('click', () => {
      this.toggle();
    });
    root.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('button');
      if (!button) return;
      if (button.dataset.destination) {
        this.goal = PLACES.find((p) => p.id === button.dataset.destination)?.id ?? null;
        this.close();
      } else if (button.id === 'district-map-close') this.close();
    });
  }
  setRunning(running: boolean): void {
    this.running = running;
    this.trigger.hidden = !running;
    if (!running) this.close(false);
    const hint = document.getElementById('district-hint');
    if (hint) hint.hidden = !running;
  }
  setGoal(id: PlaceId): void {
    this.goal = id;
  }
  toggle(): void {
    if (!this.running) return;
    if (!this.open && document.activeElement instanceof HTMLElement)
      this.previousFocus = document.activeElement;
    this.open = !this.open;
    this.root.hidden = !this.open;
    this.onOpen(this.open);
    if (this.open) this.root.querySelector<HTMLButtonElement>('button')?.focus();
    else this.trigger.focus();
  }
  close(focus = true): void {
    this.root.hidden = true;
    if (this.open) {
      this.open = false;
      this.onOpen(false);
      if (focus) {
        const previous = this.previousFocus;
        (previous?.isConnected && previous.getClientRects().length
          ? previous
          : this.trigger
        ).focus();
      }
    }
  }
  update(snapshot: WorldSnapshot): void {
    const dot = this.root.querySelector<SVGCircleElement>('#map-player');
    dot?.setAttribute('cx', String(12 + (snapshot.x + 8) * 6));
    dot?.setAttribute('cy', String(12 + (snapshot.z + 11) * 6));
    const arrow = this.root.querySelector<SVGPathElement>('#map-heading');
    arrow?.setAttribute(
      'transform',
      `translate(${String(12 + (snapshot.x + 8) * 6)} ${String(12 + (snapshot.z + 11) * 6)}) rotate(${String((-snapshot.heading * 180) / Math.PI)})`,
    );
    for (const el of this.root.querySelectorAll<SVGCircleElement>('[data-map-place]'))
      el.setAttribute('r', el.dataset.mapPlace === this.goal ? '7' : '4');
    const goal = PLACES.find((p) => p.id === this.goal);
    const message = snapshot.place
      ? `這裡是${snapshot.place.short}。想練習時按「${snapshot.place.label}」。`
      : goal
        ? snapshot.x < 20 && goal.x >= 24
          ? `前往${goal.short}：先到路口練習，再過斑馬線。`
          : `指引：${goal.short}。打開街區地圖查看位置。`
        : '公園東側有街區步道。打開地圖，走近地點再開始。';
    if (message !== this.hint) {
      this.hint = message;
      const hint = document.getElementById('district-hint');
      if (hint) hint.replaceChildren(annotatedText(message));
    }
  }
}
