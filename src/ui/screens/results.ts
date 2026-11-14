/**
 * Results: the winner's close-up (their portrait, name and a line of
 * theirs), the night's figures from the match's events
 * (src/game/matchFigures.ts), and then REMATCH, CHANGE FIGHTERS, WATCH
 * REPLAY and TITLE in the menu below.
 */
import { publicUrl } from '../../core/paths';
import { FIGHTER_COLORS } from '../../core/fighterLook';
import { figureRows, type MatchFigures } from '../../game/matchFigures';
import type { MenuKey } from '../../input/devices';
import { fighterData } from '../../sim';
import type { Menu, Row } from '../menu';

export class ResultsScreen {
  readonly root: HTMLElement;
  private readonly card: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly menu: Menu,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'results';
    this.root.hidden = true;
    this.card = document.createElement('div');
    this.card.className = 'results-card';
    this.root.append(this.card, menu.root);
    parent.append(this.root);
  }

  get open(): boolean {
    return !this.root.hidden;
  }

  /** `winner` 0 or 1 (anything else a draw); `line` the winner's word; `rows` the menu under it. */
  show(fighters: readonly [string, string], winner: number, line: string, f: MatchFigures, maxHealth: readonly number[], rows: Row[]): void {
    const won = winner === 0 || winner === 1 ? fighters[winner] : '';
    const accent = (id: string) => `#${(FIGHTER_COLORS[id] ?? 0xcccccc).toString(16).padStart(6, '0')}`;
    const head = won
      ? `<div class="results-winner" style="--accent:${accent(won)}"><img class="results-portrait" alt="" src="${publicUrl(`assets/portraits/${won}-win.webp`)}" onerror="this.hidden=true"><div><div class="results-tag">TONIGHT'S WINNER</div><div class="results-name">${fighterData(won).name.toUpperCase()}</div><div class="results-line">“${line}”</div></div></div>`
      : `<div class="results-winner"><div><div class="results-tag">TONIGHT</div><div class="results-name">A DRAW</div></div></div>`;
    const names = `<tr><th></th><th style="color:${accent(fighters[0])}">${fighterData(fighters[0]).name.toUpperCase()}</th><th style="color:${accent(fighters[1])}">${fighterData(fighters[1]).name.toUpperCase()}</th></tr>`;
    const body = figureRows(f, maxHealth)
      .map(([label, a, b]) => `<tr><td>${label}</td><td>${a}</td><td>${b}</td></tr>`)
      .join('');
    this.card.innerHTML = `${head}<table class="results-figures">${names}${body}<tr><td>TIME ON AIR</td><td colspan="2">${f.time()}</td></tr></table>`;
    this.root.hidden = false;
    this.menu.show('', rows);
  }

  hide(): void {
    this.root.hidden = true;
    this.menu.hide();
  }

  key(k: MenuKey): void {
    this.menu.key(k);
  }
}
