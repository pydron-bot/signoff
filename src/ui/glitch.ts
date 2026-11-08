/**
 * The VHS layer reacting to the fight: a tracking wobble and colour split
 * on big hits, a burst of static on a KO, and the PLEASE STAND BY card over
 * the Technical Difficulties cinematic (the broadcast censoring the worst
 * of it). Reduce Motion keeps the card and drops the wobble and static.
 * Timed in simulation steps.
 */
import { TD_CINEMATIC_FRAMES, type SimEvent } from '../sim';

export class Glitch {
  private readonly app: HTMLElement;
  private readonly staticLayer: HTMLElement;
  private readonly standby: HTMLElement;
  private wobble = 0;
  private staticLeft = 0;
  private standbyLeft = 0;

  constructor(
    parent: HTMLElement,
    private readonly reduceMotion: boolean,
  ) {
    this.app = document.getElementById('app')!;
    this.staticLayer = document.createElement('div');
    this.staticLayer.className = 'vhs-static';
    this.staticLayer.hidden = true;
    this.staticLayer.style.backgroundImage = `url(${noiseUrl()})`;
    this.standby = document.createElement('div');
    this.standby.className = 'standby';
    this.standby.innerHTML = '<div class="standby-card">PLEASE STAND BY</div><div class="standby-sub">CHANNEL 0 IS EXPERIENCING TECHNICAL DIFFICULTIES</div>';
    this.standby.hidden = true;
    parent.append(this.staticLayer, this.standby);
  }

  onEvents(ev: readonly SimEvent[]): void {
    for (const e of ev) {
      if (e.type === 'hit' && (e.damage >= 60 || e.counter)) this.wobble = Math.max(this.wobble, 12);
      else if (e.type === 'hazardStrike' && e.hazard === 'lightning') this.wobble = Math.max(this.wobble, 16);
      else if (e.type === 'ko') this.staticLeft = 24;
      else if (e.type === 'superHit') this.standbyLeft = TD_CINEMATIC_FRAMES;
    }
  }

  step(): void {
    if (this.reduceMotion) this.wobble = this.staticLeft = 0;
    this.app.classList.toggle('wobble', this.wobble > 0);
    if (this.wobble > 0) this.wobble--;
    this.staticLayer.hidden = this.staticLeft <= 0;
    if (this.staticLeft > 0) this.staticLeft--;
    this.standby.hidden = this.standbyLeft <= 0;
    if (this.standbyLeft > 0) this.standbyLeft--;
  }

  clear(): void {
    this.wobble = this.staticLeft = this.standbyLeft = 0;
    this.step();
  }
}

/** One frame of TV snow, made once. */
function noiseUrl(): string {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  if (!g) return '';
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}
