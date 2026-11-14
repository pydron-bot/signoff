/**
 * Fighter select, "the dial": the living room's TV changes channel to each
 * fighter in turn (main.ts turns the demo behind the title to them on their
 * own set, with the channel flip's static and click), and beside it, for each
 * player, a caption plate: the channel, a portrait, name and show, their
 * style, bars for health, speed, reach and difficulty worked out from the
 * data (src/game/fighterStats.ts) and the trials cleared. Below them, the
 * stage, the CPU level and the rules (or CPU VS CPU's levels, view and
 * endless channel), then START. Worked by the same menu as everything else:
 * keyboard, pad or touch.
 */
import { fighterStats } from '../../game/fighterStats';
import { publicUrl } from '../../core/paths';
import { FIGHTER_COLORS } from '../../core/fighterLook';
import type { MenuKey } from '../../input/devices';
import { fighterData } from '../../sim';
import type { Menu, Row } from '../menu';

/** What the select screen is choosing for. */
export type SelectFor = 'cpu' | 'versus' | 'training' | 'watch' | 'arcade';

/** The choices, as the title's setup keeps them (indexes). */
export interface SelectSetup {
  p1: number;
  p2: number;
  stage: number;
  level: number;
  studio: number;
  watch1: number;
  watch2: number;
  watchView: number;
  endless: number;
}

export interface SelectHost {
  ids: readonly string[];
  stages: readonly string[];
  /** Trials cleared and in all, for a fighter. */
  trials(id: string): readonly [number, number];
  /** A player turned the dial to fighter `index`. */
  turned(player: number, index: number): void;
  start(): void;
  back(): void;
  save(): void;
}

const STYLE_LINE: Readonly<Record<string, string>> = {
  zoner: 'ZONER · KEEPS YOU OUT',
  rushdown: 'RUSHDOWN · ALWAYS IN YOUR FACE',
  grappler: 'GRAPPLER · GETS HOLD OF YOU',
  trickster: 'TRICKSTER · NEVER WHERE YOU LOOK',
  footsies: 'FOOTSIES · WINS THE SPACE BETWEEN',
  midrange: 'MIDRANGE · HITS FROM ARM’S LENGTH',
  allrounder: 'ALL-ROUNDER · A BIT OF EVERYTHING',
};
const LEVELS = ['EASY', 'NORMAL', 'HARD'];
const WATCH_LEVELS = ['EASY', 'NORMAL', 'HARD', 'DIRECTOR'];
const BARS = ['HEALTH', 'SPEED', 'REACH', 'DIFFICULTY'] as const;

interface Card {
  root: HTMLElement;
  channel: HTMLElement;
  portrait: HTMLImageElement;
  name: HTMLElement;
  show: HTMLElement;
  style: HTMLElement;
  bars: HTMLElement[];
  trials: HTMLElement;
}

export class SelectScreen {
  readonly root: HTMLElement;
  private readonly cards: [Card, Card];
  private mode: SelectFor = 'cpu';
  private setup!: SelectSetup;

  constructor(
    parent: HTMLElement,
    private readonly menu: Menu,
    private readonly host: SelectHost,
  ) {
    this.root = el('div', 'select');
    this.root.hidden = true;
    this.cards = [this.card(0), this.card(1)];
    const cards = el('div', 'select-cards');
    cards.append(this.cards[0].root, this.cards[1].root);
    this.root.append(cards, menu.root);
    parent.append(this.root);
  }

  get open(): boolean {
    return !this.root.hidden;
  }

  private card(i: number): Card {
    const root = el('div', `select-card select-card-${i}`);
    const channel = el('div', 'select-channel');
    const portrait = document.createElement('img');
    portrait.className = 'select-portrait';
    portrait.alt = '';
    // No portrait yet (tools/portraits.mjs): the plate stands alone.
    portrait.addEventListener('error', () => (portrait.hidden = true));
    portrait.addEventListener('load', () => (portrait.hidden = false));
    const plate = el('div', 'select-plate');
    const name = el('div', 'select-name');
    const show = el('div', 'select-show');
    const style = el('div', 'select-style');
    plate.append(name, show, style);
    const bars = el('div', 'select-bars');
    const fills = BARS.map((b) => {
      const row = el('div', 'select-bar');
      const label = el('span', 'select-bar-label');
      label.textContent = b;
      const track = el('span', 'select-bar-track');
      const fill = el('span', 'select-bar-fill');
      track.append(fill);
      row.append(label, track);
      bars.append(row);
      return fill;
    });
    const trials = el('div', 'select-trials');
    root.append(channel, portrait, plate, bars, trials);
    return { root, channel, portrait, name, show, style, bars: fills, trials };
  }

  /** Opens for a mode, on the title's setup (changed in place, and saved as it changes). */
  show(mode: SelectFor, setup: SelectSetup): void {
    this.mode = mode;
    this.setup = setup;
    this.root.hidden = false;
    this.root.dataset.mode = mode;
    // Arcade and training have one fighter to pick: the other card is the opponent the run (or the dummy) decides.
    this.cards[1].root.hidden = mode === 'arcade';
    this.paint(0);
    this.paint(1);
    this.menu.show(TITLES[mode], this.rows());
  }

  hide(): void {
    this.root.hidden = true;
    this.menu.hide();
  }

  key(k: MenuKey): void {
    if (k === 'back' || k === 'pause') this.host.back();
    else this.menu.key(k);
  }

  private rows(): Row[] {
    const s = this.setup;
    const names = this.host.ids.map((id) => fighterData(id).name.toUpperCase());
    const turn = (player: 0 | 1) => (v: number) => {
      if (player === 0) s.p1 = v;
      else s.p2 = v;
      this.host.save();
      this.paint(player);
      this.host.turned(player, v);
    };
    const save = () => this.host.save();
    const rows: Row[] = [{ label: this.mode === 'watch' ? 'CHANNEL 1' : 'PLAYER 1', options: names, value: s.p1, onChange: turn(0) }];
    if (this.mode !== 'arcade') rows.push({ label: this.mode === 'watch' ? 'CHANNEL 2' : this.mode === 'training' ? 'DUMMY' : 'PLAYER 2', options: names, value: s.p2, onChange: turn(1) });
    if (this.mode !== 'arcade') rows.push({ label: 'STAGE', options: this.host.stages, value: s.stage, onChange: (v) => ((s.stage = v), save()) });
    if (this.mode === 'cpu') rows.push({ label: 'CPU', options: LEVELS, value: s.level, onChange: (v) => ((s.level = v), save()) });
    if (this.mode === 'watch') {
      rows.push(
        { label: 'PLAYER 1 CPU', options: WATCH_LEVELS, value: s.watch1, onChange: (v) => ((s.watch1 = v), save()) },
        { label: 'PLAYER 2 CPU', options: WATCH_LEVELS, value: s.watch2, onChange: (v) => ((s.watch2 = v), save()) },
        { label: 'VIEW', options: ['FULL SCREEN', 'ON THE TV'], value: s.watchView, onChange: (v) => ((s.watchView = v), save()) },
        { label: 'ENDLESS', options: ['OFF', 'ON'], value: s.endless, onChange: (v) => ((s.endless = v), save()) },
      );
    }
    if (this.mode === 'cpu' || this.mode === 'versus' || this.mode === 'watch') rows.push({ label: 'RULES', options: ['LIVE BROADCAST', 'STUDIO'], value: s.studio, onChange: (v) => ((s.studio = v), save()) });
    rows.push({ label: 'START', id: 'select-start', run: () => this.host.start() }, { label: 'BACK', id: 'select-back', run: () => this.host.back() });
    return rows;
  }

  private paint(player: 0 | 1): void {
    const c = this.cards[player];
    const index = player === 0 ? this.setup.p1 : this.setup.p2;
    const id = this.host.ids[index];
    const d = fighterData(id);
    c.root.style.setProperty('--accent', `#${(FIGHTER_COLORS[id] ?? 0xcccccc).toString(16).padStart(6, '0')}`);
    c.channel.textContent = `CH ${index + 2}`;
    c.portrait.src = publicUrl(`assets/portraits/${id}.webp`);
    c.name.textContent = d.name.toUpperCase();
    c.show.textContent = d.show.toUpperCase();
    c.style.textContent = STYLE_LINE[d.style] ?? d.style.toUpperCase();
    const st = fighterStats(id);
    const v = [st.health, st.speed, st.reach, st.difficulty];
    for (let k = 0; k < 4; k++) c.bars[k].style.transform = `scaleX(${v[k] / 5})`;
    const [n, of] = this.host.trials(id);
    c.trials.textContent = `TRIALS ${n}/${of}`;
  }
}

const TITLES: Readonly<Record<SelectFor, string>> = {
  cpu: 'VS CPU',
  versus: 'VS PLAYER',
  training: 'TRAINING',
  watch: 'CPU VS CPU',
  arcade: 'ARCADE',
};

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}
