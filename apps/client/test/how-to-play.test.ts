/**
 * "Näin pelataan" and the goal's word (docs/12-selkeys.md §4): four short steps whose first
 * one is the goal, and the visible word for the village's score is "tyytyväisyys".
 */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import HowToPlay from '../src/components/HowToPlay.svelte';
import { allMessageKeys, t } from '../src/i18n/index.ts';
import { PARAMS } from '../src/lib/rules-info.ts';

/** Visible text of server-rendered HTML: tags and Svelte's hydration comments dropped. */
function text(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The rendered steps, one HTML chunk per list item. */
function steps(): string[] {
  const { body } = render(HowToPlay);
  return body.match(/<li[\s\S]*?<\/li>/g) ?? [];
}

describe('how to play', () => {
  it('has four steps', () => {
    expect(steps()).toHaveLength(4);
  });

  it('shows one picture per step', () => {
    for (const step of steps()) {
      expect(step.match(/class="art[\s"]/g)).toHaveLength(1);
      expect(step).toMatch(/<img|<svg/);
    }
  });

  it('keeps every step to one short sentence a second-grader can read', () => {
    for (const step of steps()) {
      const sentence = text(step);
      expect(sentence.length).toBeLessThanOrEqual(90);
      // No full stop, exclamation or question mark in the middle of the step.
      expect(sentence.replace(/[.!?]$/, '')).not.toMatch(/[.!?]/);
    }
  });

  it('the first step is the goal: keep the village satisfied and earn stars at the aurora party', () => {
    const goal = text(steps()[0]!);
    expect(goal).toMatch(/tyytyväisenä/);
    expect(goal).toMatch(/tähtiä/);
    expect(goal).toMatch(/revontulijuhla/);
  });

  it('the second step is the energy: N a month, every action uses one', () => {
    const energy = text(steps()[1]!);
    expect(energy).toContain(`${PARAMS.baseActions} energiaa`);
    expect(energy).toMatch(/kuussa/);
    expect(energy).toMatch(/vie yhden/);
  });

  it('the third step is the shared store and the fire that needs wood', () => {
    const store = text(steps()[2]!);
    expect(store).toMatch(/yhteiseen varastoon/);
    expect(store).toMatch(/nuotio tarvitsee puuta/);
  });

  it('the fourth step is the village meeting', () => {
    expect(text(steps()[3]!)).toMatch(/kyläkokous/);
  });
});

describe('the word for the village score', () => {
  it('no message still says onnellisuus, mieliala or iloinen', () => {
    const offenders = allMessageKeys()
      .filter((key) => /onnelli|mieliala|\biloi/i.test(t(key as never)))
      .map((key) => `${key}: ${t(key as never)}`);
    expect(offenders).toEqual([]);
  });

  it('the score is called tyytyväisyys wherever it is shown', () => {
    expect(t('bar.happiness')).toBe('Tyytyväisyys');
    expect(t('bar.lossLimitHint', { n: '−60' })).toBe('Jos tyytyväisyys putoaa alle −60, kylä luovuttaa.');
    expect(t('summary.mood')).toBe('Tyytyväisyys');
    expect(t('summary.mood.total')).toBe('Kuukauden tyytyväisyys');
    expect(t('summary.happiness')).toBe('Tyytyväisyys yhteensä');
    expect(t('end.happiness', { n: '−12' })).toBe('Tyytyväisyys −12');
    expect(t('debrief.chart.mood')).toBe('Kuukauden tyytyväisyys');
    expect(t('debrief.chart.happiness')).toBe('Tyytyväisyys yhteensä');
  });

  it('the teacher help and the hot spring and gathering house follow the same word', () => {
    expect(t('help.4')).toMatch(/tyytyväisyys laskee/);
    expect(t('help.4')).toMatch(/Jos tyytyväisyys putoaa alle rajan/);
    expect(t('terrain.spring.description')).toMatch(/tyytyväisyyttä/);
    expect(t('building.gathering.description')).toMatch(/tyytyväisyyttä/);
  });
});
