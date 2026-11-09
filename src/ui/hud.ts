/**
 * The broadcast HUD: health as channel-strength meters (a bar under a
 * segment mask, with a red chunk that drains a moment after each hit),
 * name plates with each fighter's show, the round clock, round pips, Signal
 * meters, the station bug, captions for round calls, the fighters' lower
 * thirds as a match goes on air, the commercial break card, and training
 * mode's readout. DOM only; it reads the match and the step's events.
 */
import { finisherData } from '../sim/finisher';
import { BAR, DONATIONS_MAX, STEPS_PER_SECOND, fighterData, stageData, type FinisherKind, type MatchState, type SimEvent } from '../sim';
import { segmentData } from '../sim/stages';
import type { Advantage } from '../game/advantage';
import { FIGHTER_COLORS } from '../core/fighterLook';
import { tickerText } from './ticker';

/** The red chunk of lost health: held this many steps after the last hit, then drained this much a step. */
const DRAIN_HOLD = 32;
const DRAIN_RATE = 0.012;
/** How long the fighters' lower thirds stay up at the start of a match (steps). */
const INTRO_STEPS = 100;

/** Fake ads for the commercial break, by stage and the segment coming up. */
const ADS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  weather: [
    ['SLEEPWELL MATTRESS BARN', 'Lie down. Stay down. Open all night.'],
    ['DIAL-A-FORECAST', 'Call 555-0333. Someone is always listening.'],
    ['AQUA-PAL FLOOD SANDBAGS', "When it rains, it's already too late."],
  ],
  burn: [
    ['VEGA-VISION WORKOUT TAPES', 'Twelve cassettes. No rewind button.'],
    ['TURBO-TAPE VCR', 'Plays every tape faster. It only gets faster.'],
    ['GLASSWORKS MIRROR & PANE', 'Seven years bad luck? Call us in eight.'],
  ],
  news: [
    ['OKAFOR & SONS TYPEWRITERS', 'Every key strikes. Every word stays.'],
    ['DOREEN\'S ICE CREAM', 'Listen for the chimes. Cobble Row, every evening.'],
    ['NIGHT-LITE BULB CO.', 'Our lamps never fall. Almost never.'],
  ],
  kitchen: [
    ['LAMARRE NON-STICK', 'Nothing sticks. Nothing ever leaves.'],
    ['FIRE-OUT BLANKETS', "Smother it. Don't think about it."],
    ['THERMO-KING OVENS', 'Preheats in seconds. Never cools.'],
  ],
};

/** The News stage's ticker runs from its second segment on. */
function tickerOn(m: MatchState): boolean {
  return m.stage === 'news' && m.segment >= 1;
}

interface Side {
  root: HTMLElement;
  name: HTMLElement;
  show: HTMLElement;
  fill: HTMLElement;
  damage: HTMLElement;
  /** The lower third that introduces them. */
  intro: HTMLElement;
  pips: HTMLElement[];
  meter: HTMLElement;
  meterFill: HTMLElement[];
  combo: HTMLElement;
  /** Gideon's donations: a row of coins under the health bar. */
  coins: HTMLElement;
  coin: HTMLElement[];
}

export class Hud {
  readonly root: HTMLElement;
  private readonly sides: [Side, Side];
  private readonly clock: HTMLElement;
  private readonly caption: HTMLElement;
  private readonly captionSub: HTMLElement;
  private readonly breakCard: HTMLElement;
  private readonly training: HTMLElement;
  private readonly warning: HTMLElement;
  private readonly counter: HTMLElement;
  private readonly ticker: HTMLElement;
  private warningLeft = 0;
  private counterLeft = 0;
  private captionLeft = 0;
  private comboLeft = [0, 0];
  /** Damage in each side's current combo, for the % beside the hits. */
  private comboDamage = [0, 0];
  private lastHealth = [-1, -1];
  /** The health bar's red chunk (fractions of full) and how long it holds. */
  private damage = [1, 1];
  private hold = [0, 0];
  private target = [1, 1];
  private lastDamage = [-1, -1];
  private introLeft = 0;
  private lastMeter = [-1, -1];
  private lastWins = [-1, -1];
  private lastSecs = -1;
  private lastCoins = [-1, -1];
  private lastAdv: Advantage | null | undefined = undefined;
  private lastLine = '';

  constructor(parent: HTMLElement) {
    this.root = div('hud');
    this.root.hidden = true;
    const top = div('hud-top');
    this.sides = [this.side(0), this.side(1)];
    this.clock = div('hud-clock');
    top.append(this.sides[0].root, this.clock, this.sides[1].root);
    const logo = div('hud-logo');
    logo.innerHTML = 'CH 0 <span class="hud-live">LIVE</span>';
    const cap = div('hud-caption');
    this.caption = div('hud-caption-main');
    this.captionSub = div('hud-caption-sub');
    cap.append(this.caption, this.captionSub);
    this.breakCard = div('hud-break');
    this.breakCard.hidden = true;
    this.training = div('hud-training');
    this.training.hidden = true;
    this.warning = div('hud-warning');
    this.warning.hidden = true;
    this.counter = div('hud-counter');
    this.counter.textContent = 'COUNTER';
    this.counter.hidden = true;
    this.ticker = div('hud-ticker');
    const crawl = div('hud-ticker-crawl');
    crawl.textContent = tickerText();
    this.ticker.append(crawl);
    this.ticker.hidden = true;
    const meters = div('hud-meters');
    meters.append(this.sides[0].meter, this.sides[1].meter);
    this.root.append(top, logo, cap, this.ticker, this.warning, this.counter, this.breakCard, this.training, meters, this.sides[0].combo, this.sides[1].combo, this.sides[0].intro, this.sides[1].intro);
    parent.append(this.root);
  }

  /** P1's meter, for touch: tapping it spends the meter. */
  get p1Meter(): HTMLElement {
    return this.sides[0].meter;
  }

  private side(i: number): Side {
    const root = div(`hud-side hud-side-${i}`);
    const plate = div('hud-plate');
    const name = div('hud-name');
    const show = div('hud-show');
    plate.append(name, show);
    const health = div('hud-health');
    const damage = div('hud-health-damage');
    const fill = div('hud-health-fill');
    health.append(damage, fill);
    const intro = div(`hud-intro hud-intro-${i}`);
    const pipRow = div('hud-pips');
    const pips = [div('hud-pip'), div('hud-pip')];
    pipRow.append(...pips);
    const coins = div('hud-coins');
    const coin: HTMLElement[] = [];
    for (let k = 0; k < DONATIONS_MAX; k++) {
      const c = div('hud-coin');
      coin.push(c);
      coins.append(c);
    }
    root.append(plate, health, pipRow, coins);
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
    return { root, name, show, fill, damage, intro, pips, meter, meterFill, combo, coins, coin };
  }

  start(m: MatchState, training: boolean): void {
    this.root.hidden = false;
    m.fighters.forEach((f, i) => {
      const s = this.sides[i];
      const name = fighterData(f.fighter).name.toUpperCase();
      const show = fighterData(f.fighter).show;
      s.name.textContent = name;
      s.show.textContent = show.toUpperCase();
      s.coins.hidden = fighterData(f.fighter).resource !== 'donations';
      s.root.style.setProperty('--accent', `#${(FIGHTER_COLORS[f.fighter] ?? 0xcccccc).toString(16).padStart(6, '0')}`);
      s.intro.style.setProperty('--accent', s.root.style.getPropertyValue('--accent'));
      s.intro.innerHTML = `<div class="hud-intro-tag">${i === 0 ? 'TONIGHT' : 'AND'}</div><div class="hud-intro-name">${name}</div><div class="hud-intro-show">${show}</div>`;
      s.intro.classList.remove('in');
      this.damage[i] = this.target[i] = 1;
      this.hold[i] = 0;
    });
    this.introLeft = 0;
    this.training.hidden = !training;
    this.clock.classList.toggle('off', training);
    this.breakCard.hidden = true;
    this.breakCard.classList.remove('hud-signoff');
    this.ticker.hidden = !tickerOn(m);
    this.captionLeft = 0;
    this.warningLeft = 0;
    this.counterLeft = 0;
    this.caption.textContent = '';
    this.captionSub.textContent = '';
    this.lastHealth = [-1, -1];
    this.lastDamage = [-1, -1];
    this.lastMeter = [-1, -1];
    // A new view of a match: no combo counter left over from the last one.
    for (let i = 0; i < 2; i++) {
      this.comboLeft[i] = 0;
      this.comboDamage[i] = 0;
      this.sides[i].combo.textContent = '';
    }
    this.lastWins = [-1, -1];
    this.lastCoins = [-1, -1];
    this.lastSecs = -1;
    this.lastAdv = undefined;
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
    // The red chunk: held after each hit, then drained down to the health left.
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      const t = f.health / f.maxHealth;
      if (t < this.target[i]) this.hold[i] = DRAIN_HOLD;
      this.target[i] = t;
      if (this.damage[i] < t) this.damage[i] = t;
      else if (this.hold[i] > 0) this.hold[i]--;
      else this.damage[i] = Math.max(t, this.damage[i] - DRAIN_RATE);
    }
    for (const e of ev) {
      switch (e.type) {
        case 'roundStart':
          this.breakCard.hidden = true;
          // A match going on air: who's on tonight, as lower thirds.
          if (e.round === 1 && this.training.hidden) {
            this.introLeft = INTRO_STEPS;
            for (const s of this.sides) s.intro.classList.add('in');
          }
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
          this.breakCard.classList.remove('hud-signoff');
          const ads = ADS[m.stage] ?? ADS.weather;
          const [title, line] = ads[e.nextSegment] ?? ads[0];
          this.breakCard.innerHTML = `<div class="hud-break-top">WE'LL BE RIGHT BACK</div><div class="hud-break-ad">${title}</div><div class="hud-break-line">${line}</div>`;
          this.breakCard.hidden = false;
          this.captionLeft = 0;
          this.caption.textContent = '';
          this.captionSub.textContent = '';
          break;
        }
        case 'finisher':
          this.captionLeft = 1;
          break;
        case 'finisherCard':
          this.closingCard(m, e.player, e.id, e.kind);
          break;
        case 'stayTuned':
          this.say('STAY TUNED', `${fighterData(m.fighters[e.winner].fighter).name.toUpperCase()} WINS`, 240);
          break;
        case 'superHit':
          this.say('TECHNICAL DIFFICULTIES', 'PLEASE STAND BY', 150);
          break;
        case 'superReady':
          this.callout(e.player, 'SIGNAL RESTORED');
          break;
        case 'firstHit': {
          const c = this.sides[e.player].combo;
          c.textContent = 'FIRST HIT';
          this.comboLeft[e.player] = 70;
          break;
        }
        case 'cutAway':
          this.say('CUT AWAY', '', 40);
          break;
        case 'counter':
          this.say('OFF THE SCRIPT', '', 40);
          break;
        case 'flawless':
          this.callout(e.player, 'FLAWLESS BLOCK');
          break;
        case 'punish':
          this.callout(e.player, 'PUNISH');
          break;
        case 'reversal':
          this.callout(e.player, 'REVERSAL');
          break;
        case 'delayedGetup':
          this.callout(e.player, 'STAYED DOWN');
          break;
        case 'guardCrush':
          this.say('GUARD CRUSHED', '', 40);
          break;
        case 'heal':
          if (e.amount > 0) this.say('A MIRACLE', '', 40);
          break;
        case 'hazardWarn':
          this.warning.textContent = `⚠ ${e.caption} ⚠`;
          this.warningLeft = segmentData(m.stage, m.segment).hazards.find((h) => h.id === e.hazard)?.warn ?? 60;
          break;
        case 'hazardStrike':
          this.warningLeft = 0;
          break;
        case 'hit':
          if (e.counter) this.callout(e.attacker, 'COUNTER');
          this.comboDamage[e.attacker] = e.combo === 1 ? e.damage : this.comboDamage[e.attacker] + e.damage;
          if (e.combo >= 2) {
            const c = this.sides[e.attacker].combo;
            const pct = Math.round((this.comboDamage[e.attacker] * 100) / m.fighters[e.defender].maxHealth);
            c.textContent = `${e.combo} HITS ${pct}%`;
            this.comboLeft[e.attacker] = 70;
          }
          break;
      }
    }
  }

  /** A word on one player's side for a moment: COUNTER, PUNISH, REVERSAL, FLAWLESS BLOCK. */
  private callout(player: number, text: string): void {
    this.counter.textContent = text;
    this.counter.style.left = player === 0 ? '20px' : '';
    this.counter.style.right = player === 1 ? '20px' : '';
    this.counterLeft = 45;
  }

  /** The end of a finisher: the loser's show goes off the air, or (a Rerun) they wake up at home. */
  private closingCard(m: MatchState, winner: number, id: string, kind: FinisherKind): void {
    const loser = fighterData(m.fighters[1 - winner].fighter);
    const show = loser.show.toUpperCase();
    const c = this.breakCard;
    c.classList.add('hud-signoff');
    if (kind === 'rerun') {
      c.innerHTML = `<div class="hud-signoff-show">3:34 A.M.</div><div class="hud-signoff-line">${loser.name.toUpperCase()} WAKES UP ON THE SOFA.<br>THE TV IS SHOWING STATIC.</div><div class="hud-signoff-stamp">RERUN</div>`;
    } else {
      const stamp = kind === 'cancellation' ? 'CANCELLED' : 'SIGNED OFF';
      const name = finisherData(m.fighters[winner].fighter, id).name;
      c.innerHTML = `<div class="hud-break-top">CHANNEL 0</div><div class="hud-signoff-show">${show}</div><div class="hud-signoff-stamp">${stamp}</div><div class="hud-signoff-line">${name.toUpperCase()} · THANK YOU FOR WATCHING</div>`;
    }
    c.hidden = false;
    this.captionLeft = 1;
  }

  /** Once per simulation step: captions and callouts keep sim time. */
  step(): void {
    for (let i = 0; i < 2; i++) if (this.comboLeft[i] > 0 && --this.comboLeft[i] === 0) this.sides[i].combo.textContent = '';
    if (this.introLeft > 0 && --this.introLeft === 0) for (const s of this.sides) s.intro.classList.remove('in');
    if (this.captionLeft > 0 && --this.captionLeft === 0) {
      this.caption.textContent = '';
      this.captionSub.textContent = '';
    }
    if (this.warningLeft > 0) this.warningLeft--;
    if (this.warning.hidden !== (this.warningLeft === 0)) this.warning.hidden = this.warningLeft === 0;
    if (this.counterLeft > 0) this.counterLeft--;
    if (this.counter.hidden !== (this.counterLeft === 0)) this.counter.hidden = this.counterLeft === 0;
  }

  /** Every frame: touches the DOM only where something changed. */
  update(m: MatchState, adv: Advantage | null, trainingLine: string): void {
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      const s = this.sides[i];
      if (f.health !== this.lastHealth[i]) {
        this.lastHealth[i] = f.health;
        const t = f.health / f.maxHealth;
        s.fill.style.transform = `scaleX(${t})`;
        s.fill.classList.toggle('weak', t <= 0.3);
      }
      if (this.damage[i] !== this.lastDamage[i]) {
        this.lastDamage[i] = this.damage[i];
        s.damage.style.transform = `scaleX(${this.damage[i]})`;
      }
      if (f.wins !== this.lastWins[i]) {
        this.lastWins[i] = f.wins;
        for (let k = 0; k < s.pips.length; k++) s.pips[k].classList.toggle('on', k < f.wins);
      }
      if (f.donations !== this.lastCoins[i]) {
        this.lastCoins[i] = f.donations;
        for (let k = 0; k < s.coin.length; k++) s.coin[k].classList.toggle('on', k < f.donations);
      }
      if (f.meter !== this.lastMeter[i]) {
        this.lastMeter[i] = f.meter;
        for (let k = 0; k < 3; k++) {
          const v = Math.max(0, Math.min(1, (f.meter - k * BAR) / BAR));
          s.meterFill[k].style.transform = `scaleX(${v})`;
          s.meterFill[k].classList.toggle('full', v >= 1);
        }
      }
    }
    // Read every frame so training's segment switch shows it too.
    const ticker = tickerOn(m);
    if (this.ticker.hidden === ticker) this.ticker.hidden = !ticker;
    const secs = Math.max(0, Math.ceil(m.timer / STEPS_PER_SECOND));
    if (secs !== this.lastSecs) {
      this.lastSecs = secs;
      this.clock.textContent = `0:${String(secs).padStart(2, '0')}`;
    }
    // Rebuilt only when it changes: no string or DOM write per frame.
    if (!this.training.hidden && (adv !== this.lastAdv || trainingLine !== this.lastLine)) {
      this.lastAdv = adv;
      this.lastLine = trainingLine;
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
