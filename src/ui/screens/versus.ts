/**
 * The versus card: two seconds before the cold open, both fighters split
 * across the screen in colour bars, their portraits and names, "TONIGHT ON
 * CHANNEL 0" and the night's show (the stage). Any button or a tap skips it. Timed on
 * display time by main.ts (the match isn't stepped while it shows).
 */
import { publicUrl } from '../../core/paths';
import { FIGHTER_COLORS } from '../../core/fighterLook';
import { fighterData, stageData } from '../../sim';

/** Seconds it shows. */
export const VERSUS_SECONDS = 2;

export class VersusCard {
  readonly root: HTMLElement;
  private left = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'versus';
    this.root.hidden = true;
    this.root.addEventListener('pointerdown', () => this.end());
    parent.append(this.root);
  }

  get active(): boolean {
    return this.left > 0;
  }

  show(p1: string, p2: string, stage: string): void {
    const side = (id: string, i: number) => {
      const d = fighterData(id);
      const accent = `#${(FIGHTER_COLORS[id] ?? 0xcccccc).toString(16).padStart(6, '0')}`;
      return `<div class="versus-side versus-side-${i}" style="--accent:${accent}"><img class="versus-portrait" alt="" src="${publicUrl(`assets/portraits/${id}.webp`)}" onerror="this.hidden=true"><div class="versus-name">${d.name.toUpperCase()}</div><div class="versus-show">${d.show.toUpperCase()}</div></div>`;
    };
    this.root.innerHTML = `${side(p1, 0)}${side(p2, 1)}<div class="versus-mid"><div class="versus-tonight">TONIGHT ON CHANNEL 0</div><div class="versus-vs">VS</div><div class="versus-stage">${stageData(stage).name.toUpperCase()}</div></div>`;
    this.root.hidden = false;
    this.left = VERSUS_SECONDS;
  }

  /** Each drawn frame: false once it's over. */
  update(dt: number): boolean {
    if (this.left <= 0) return false;
    this.left -= dt;
    if (this.left <= 0) this.end();
    return this.left > 0;
  }

  end(): void {
    this.left = 0;
    this.root.hidden = true;
  }
}
