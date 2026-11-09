/**
 * The VHS layer reacting to the fight: a tracking wobble and colour split
 * on big hits, a burst of static on a KO, and the PLEASE STAND BY card over
 * the Technical Difficulties cinematic (the broadcast censoring the worst
 * of it), and a finisher's cut away: snow, colour bars, the stand-by card
 * or the set switching off. Reduce Motion keeps the cards and drops the
 * wobble and static (a cut to snow shows the bars instead).
 * Timed in simulation steps.
 */
import { TD_CINEMATIC_FRAMES, type Censor, type SimEvent } from '../sim';

export class Glitch {
  private readonly app: HTMLElement;
  private readonly staticLayer: HTMLElement;
  private readonly standby: HTMLElement;
  private wobble = 0;
  private staticLeft = 0;
  private standbyLeft = 0;
  /** A finisher's cut away: opaque, until its closing card. */
  private readonly censor: HTMLElement;
  private censorLeft = 0;

  /** Settings: 0 strict, 1 normal, 2 late night (docs/DESIGN.md, Tone and rating). */
  censorLevel = 1;
  /** Settings: the VHS look, 0 off to 2 full; off drops the wobble and static bursts. */
  vhs = 2;
  /** Late night: the cut comes this many steps late, and the snow is thin enough to see through. */
  private censorDelay = 0;
  private pendingCut: { kind: Censor; frames: number } | null = null;

  constructor(
    parent: HTMLElement,
    public reduceMotion: boolean,
  ) {
    this.app = document.getElementById('app')!;
    this.staticLayer = document.createElement('div');
    this.staticLayer.className = 'vhs-static';
    this.staticLayer.hidden = true;
    const snow = `url(${noiseUrl()})`;
    this.staticLayer.style.backgroundImage = snow;
    this.standby = document.createElement('div');
    this.standby.className = 'standby';
    this.standby.innerHTML = '<div class="standby-card">PLEASE STAND BY</div><div class="standby-sub">CHANNEL 0 IS EXPERIENCING TECHNICAL DIFFICULTIES</div>';
    this.standby.hidden = true;
    this.censor = document.createElement('div');
    this.censor.className = 'censor';
    this.censor.hidden = true;
    this.censor.style.setProperty('--snow', snow);
    parent.append(this.staticLayer, this.standby, this.censor);
  }

  onEvents(ev: readonly SimEvent[]): void {
    for (const e of ev) {
      // The tracking wobble on heavy hits and counters, longer on an ender.
      if (e.type === 'hit' && (e.weight >= 2 || e.counter)) this.wobble = Math.max(this.wobble, e.weight === 3 ? 16 : 10);
      else if (e.type === 'hazardStrike' && e.hazard === 'lightning') this.wobble = Math.max(this.wobble, 16);
      else if (e.type === 'ko') this.staticLeft = 24;
      else if (e.type === 'superHit') this.standbyLeft = TD_CINEMATIC_FRAMES;
      else if (e.type === 'finisherCut') {
        if (this.censorLevel === 2) {
          // Late night: a little more is seen before the cut.
          this.censorDelay = LATE_NIGHT_DELAY;
          this.pendingCut = { kind: e.censor, frames: e.frames - LATE_NIGHT_DELAY };
        } else if (this.censorLevel === 1 || this.standbyLeft === 0) this.cut(e.censor, e.frames);
      } else if (e.type === 'finisher' && this.censorLevel === 0 && e.kind === 'signoff') {
        // Strict: nothing of a Sign-Off is shown, only heard; the card holds until the closing card.
        this.cut('standby', 99999);
      } else if (e.type === 'finisherCard') {
        this.censorLeft = this.standbyLeft = this.censorDelay = 0;
        this.pendingCut = null;
      }
    }
  }

  private cut(kind: Censor, frames: number): void {
    this.wobble = 0;
    if (kind === 'standby') {
      this.standbyLeft = frames;
      return;
    }
    this.censor.dataset.kind = kind === 'static' && this.reduceMotion ? 'bars' : kind;
    this.censor.classList.toggle('thin', this.censorLevel === 2);
    this.censorLeft = frames;
  }

  step(): void {
    if (this.reduceMotion || this.vhs === 0) this.wobble = this.staticLeft = 0;
    if (this.censorDelay > 0 && --this.censorDelay === 0 && this.pendingCut) {
      this.cut(this.pendingCut.kind, this.pendingCut.frames);
      this.pendingCut = null;
    }
    this.app.classList.toggle('wobble', this.wobble > 0);
    if (this.wobble > 0) this.wobble--;
    this.staticLayer.hidden = this.staticLeft <= 0;
    if (this.staticLeft > 0) this.staticLeft--;
    this.standby.hidden = this.standbyLeft <= 0;
    if (this.standbyLeft > 0) this.standbyLeft--;
    this.censor.hidden = this.censorLeft <= 0;
    if (this.censorLeft > 0) this.censorLeft--;
  }

  clear(): void {
    this.wobble = this.staticLeft = this.standbyLeft = this.censorLeft = this.censorDelay = 0;
    this.pendingCut = null;
    this.step();
  }
}

const LATE_NIGHT_DELAY = 24;

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
