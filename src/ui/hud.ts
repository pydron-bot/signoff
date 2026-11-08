/**
 * The broadcast HUD: health as channel-strength meters, the round clock,
 * round pips, Signal meters, captions for round calls, the commercial break
 * card, and training mode's readout. DOM only; it reads the match and the
 * step's events.
 */
import { BAR, STEPS_PER_SECOND, fighterData, stageData, type MatchState, type SimEvent } from '../sim';
import type { Advantage } from '../game/advantage';

const SEGMENTS = 20;

/** Fake ads for the commercial break, by the segment coming up. */
const ADS = [
  ['SLEEPWELL MATTRESS BARN', 'Lie down. Stay down. Open all night.'],
  ['DIAL-A-FORECAST', 'Call 555-0333. Someone is always listening.'],
  ['AQUA-PAL FLOOD SANDBAGS', "When it rains, it's already too late."],
];

interface Side {
  root: HTMLElement;
  name: HTMLElement;
  bars: HTMLElement[];
  pips: HTMLElement[];
  meter: HTMLElement;
  meterFill: HTMLElement[];
  combo: HTMLElement;
}

export class Hud {
  readonly root: HTMLElement;
  private readonly sides: [Side, Side];
  private readonly clock: HTMLElement;
  private readonly caption: HTMLElement;
  private readonly captionSub: HTMLElement;
  private readonly breakCard: HTMLElement;
  private readonly training: HTMLElement;
  private captionLeft = 0;
  private comboLeft = [0, 0];
  private lastHealth = [-1, -1];
  private lastMeter = [-1, -1];
  private lastWins = [-1, -1];
  private lastSecs = -1;

  constructor(parent: HTMLElement) {
    this.root = div('hud');
    this.root.hidden = true;
    const top = div('hud-top');
    this.sides = [this.side(0), this.side(1)];
    this.clock = div('hud-clock');
    top.append(this.sides[0].root, this.clock, this.sides[1].root);
    const logo = div('hud-logo');
    logo.textContent = 'CH 0';
    const cap = div('hud-caption');
    this.caption = div('hud-caption-main');
    this.captionSub = div('hud-caption-sub');
    cap.append(this.caption, this.captionSub);
    this.breakCard = div('hud-break');
    this.breakCard.hidden = true;
    this.training = div('hud-training');
    this.training.hidden = true;
    const meters = div('hud-meters');
    meters.append(this.sides[0].meter, this.sides[1].meter);
    this.root.append(top, logo, cap, this.breakCard, this.training, meters, this.sides[0].combo, this.sides[1].combo);
    parent.append(this.root);
  }

  /** P1's meter, for touch: tapping it spends the meter. */
  get p1Meter(): HTMLElement {
    return this.sides[0].meter;
  }

  private side(i: number): Side {
    const root = div(`hud-side hud-side-${i}`);
    const name = div('hud-name');
    const health = div('hud-health');
    const bars: HTMLElement[] = [];
    for (let k = 0; k < SEGMENTS; k++) {
      const b = div('hud-seg');
      bars.push(b);
      health.append(b);
    }
    const pipRow = div('hud-pips');
    const pips = [div('hud-pip'), div('hud-pip')];
    pipRow.append(...pips);
    root.append(name, health, pipRow);
    const meter = div(`hud-meter hud-meter-${i}`);
    const meterFill: HTMLElement[] = [];
    for (let k = 0; k < 3; k++) {
      const cell = div('hud-meter-cell');
      const fill = div('hud-meter-fill');
      cell.append(fill);
      meter.append(cell);
      meterFill.push(fill);
    }
    const combo = div(`hud-combo hud-combo-${i}`);
    return { root, name, bars, pips, meter, meterFill, combo };
  }

  start(m: MatchState, training: boolean): void {
    this.root.hidden = false;
    m.fighters.forEach((f, i) => (this.sides[i].name.textContent = fighterData(f.fighter).name.toUpperCase()));
    this.training.hidden = !training;
    this.clock.classList.toggle('off', training);
    this.breakCard.hidden = true;
    this.captionLeft = 0;
    this.caption.textContent = '';
    this.captionSub.textContent = '';
    this.lastHealth = [-1, -1];
    this.lastMeter = [-1, -1];
    this.lastWins = [-1, -1];
    this.lastSecs = -1;
  }

  hide(): void {
    this.root.hidden = true;
  }

  private say(main: string, sub = '', frames = 90): void {
    this.caption.textContent = main;
    this.captionSub.textContent = sub;
    this.captionLeft = frames;
  }

  onEvents(m: MatchState, ev: readonly SimEvent[]): void {
    const stage = stageData(m.stage);
    for (const e of ev) {
      switch (e.type) {
        case 'roundStart':
          this.breakCard.hidden = true;
          this.say(`ROUND ${e.round}`, `${stage.name.toUpperCase()} · ${stage.segments[e.segment].name.toUpperCase()}`, 90);
          break;
        case 'fight':
          this.say('ON AIR', '', 40);
          break;
        case 'ko':
          this.say('K.O.', '', 150);
          break;
        case 'roundOver':
          if (e.reason === 'time') this.say('TIME', e.winner < 0 ? 'DRAW' : '', 150);
          else if (e.winner < 0) this.say('DOUBLE K.O.', '', 150);
          break;
        case 'commercialBreak': {
          const [title, line] = ADS[e.nextSegment] ?? ADS[0];
          this.breakCard.innerHTML = `<div class="hud-break-top">WE'LL BE RIGHT BACK</div><div class="hud-break-ad">${title}</div><div class="hud-break-line">${line}</div>`;
          this.breakCard.hidden = false;
          this.captionLeft = 0;
          this.caption.textContent = '';
          this.captionSub.textContent = '';
          break;
        }
        case 'stayTuned':
          this.say('STAY TUNED', `${fighterData(m.fighters[e.winner].fighter).name.toUpperCase()} WINS`, 240);
          break;
        case 'superHit':
          this.say('TECHNICAL DIFFICULTIES', 'PLEASE STAND BY', 150);
          break;
        case 'cutAway':
          this.say('CUT AWAY', '', 40);
          break;
        case 'hit':
          if (e.combo >= 2) {
            const c = this.sides[e.attacker].combo;
            c.textContent = `${e.combo} HITS`;
            this.comboLeft[e.attacker] = 70;
          }
          break;
      }
    }
  }

  /** Every frame: touches the DOM only where something changed. */
  update(m: MatchState, adv: Advantage | null, trainingLine: string): void {
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      const s = this.sides[i];
      if (f.health !== this.lastHealth[i]) {
        this.lastHealth[i] = f.health;
        const lit = Math.ceil((f.health / f.maxHealth) * SEGMENTS);
        for (let k = 0; k < SEGMENTS; k++) {
          s.bars[k].classList.toggle('on', k < lit);
          s.bars[k].classList.toggle('weak', lit <= SEGMENTS * 0.3);
        }
      }
      if (f.wins !== this.lastWins[i]) {
        this.lastWins[i] = f.wins;
        for (let k = 0; k < s.pips.length; k++) s.pips[k].classList.toggle('on', k < f.wins);
      }
      if (f.meter !== this.lastMeter[i]) {
        this.lastMeter[i] = f.meter;
        for (let k = 0; k < 3; k++) {
          const v = Math.max(0, Math.min(1, (f.meter - k * BAR) / BAR));
          s.meterFill[k].style.transform = `scaleX(${v})`;
          s.meterFill[k].classList.toggle('full', v >= 1);
        }
      }
      if (this.comboLeft[i] > 0 && --this.comboLeft[i] === 0) s.combo.textContent = '';
    }
    const secs = Math.max(0, Math.ceil(m.timer / STEPS_PER_SECOND));
    if (secs !== this.lastSecs) {
      this.lastSecs = secs;
      this.clock.textContent = `0:${String(secs).padStart(2, '0')}`;
    }
    if (this.captionLeft > 0 && --this.captionLeft === 0) {
      this.caption.textContent = '';
      this.captionSub.textContent = '';
    }
    if (!this.training.hidden) {
      const a = adv ? `${adv.move} on ${adv.kind}: ${adv.frames > 0 ? '+' : ''}${adv.frames}` : 'Hit or block for frame advantage';
      this.training.textContent = `${a}\n${trainingLine}`;
    }
  }
}

function div(cls: string): HTMLElement {
  const e = document.createElement('div');
  e.className = cls;
  return e;
}
