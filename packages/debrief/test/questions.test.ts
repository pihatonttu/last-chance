import { describe, expect, it } from 'vitest';
import { pickQuestions, QUESTION_IDS, THRESHOLDS, type QuestionFacts } from '../src/questions.ts';
import type { QuestionId } from '../src/types.ts';

/** A game where nothing stands out: only the always-on question is asked. */
function quiet(overrides: Partial<QuestionFacts> = {}): QuestionFacts {
  return {
    totalMonths: 15,
    monthsPlayed: 15,
    grade: 4,
    crises: [],
    unshelteredMonths: 5,
    ties: 0,
    emptyMonths: 0,
    votesCast: 100,
    votesPossible: 100,
    actions: { food: 40, fields: 10, materials: 30, explore: 10, skills: 10, recreation: 0 },
    unused: 0,
    springFoundMonth: 3,
    ...overrides,
  };
}

const ids = (facts: QuestionFacts) => pickQuestions(facts).map((q) => q.id);
const find = (facts: QuestionFacts, id: QuestionId) => pickQuestions(facts).find((q) => q.id === id);

describe('pickQuestions', () => {
  it("asks only 'decision-making' when nothing stands out", () => {
    expect(pickQuestions(quiet())).toEqual([{ id: 'decision-making', params: {} }]);
  });

  it("asks about hunger with the first hungry month and the most hungry in one month", () => {
    const facts = quiet({
      crises: [
        { kind: 'no-shelter', month: 1, people: 12, resolvedMonth: 4 },
        { kind: 'hunger', month: 6, people: 4, resolvedMonth: 7 },
        { kind: 'hunger', month: 9, people: 9, resolvedMonth: null },
      ],
    });
    expect(find(facts, 'hunger')).toEqual({ id: 'hunger', params: { month: 6, people: 9 } });
    expect(ids(quiet({ crises: [{ kind: 'no-shelter', month: 1, people: 3, resolvedMonth: 2 }] }))).not.toContain('hunger');
  });

  it(`asks about shelter after ${THRESHOLDS.noShelterMonths} months with someone unsheltered`, () => {
    expect(find(quiet({ unshelteredMonths: 6 }), 'no-shelter-long')).toEqual({ id: 'no-shelter-long', params: { months: 6 } });
    expect(ids(quiet({ unshelteredMonths: 5 }))).not.toContain('no-shelter-long');
  });

  it('asks about ties from two ties on', () => {
    expect(find(quiet({ ties: 2, emptyMonths: 2 }), 'ties')).toEqual({ id: 'ties', params: { count: 2 } });
    expect(ids(quiet({ ties: 1, emptyMonths: 1 }))).not.toContain('ties');
  });

  it('asks about empty months from three on, unless the ties question already explains them', () => {
    expect(find(quiet({ emptyMonths: 3 }), 'empty-months')).toEqual({ id: 'empty-months', params: { count: 3 } });
    expect(ids(quiet({ emptyMonths: 2 }))).not.toContain('empty-months');
    // Two of four empty months were ties and the ties question is asked: only two left.
    expect(ids(quiet({ emptyMonths: 4, ties: 2 }))).toEqual(['ties', 'decision-making']);
    // Three empty months besides the ties: both questions.
    expect(ids(quiet({ emptyMonths: 5, ties: 2 }))).toEqual(['ties', 'empty-months', 'decision-making']);
    // One tie is not asked about, so it does not explain anything away.
    expect(find(quiet({ emptyMonths: 3, ties: 1 }), 'empty-months')).toEqual({ id: 'empty-months', params: { count: 3 } });
  });

  it('asks about heavy self-development from 30 % of the actions used', () => {
    const actions = (skills: number) => ({ food: 100 - skills, fields: 0, materials: 0, explore: 0, skills, recreation: 0 });
    expect(find(quiet({ actions: actions(30) }), 'skills-heavy')).toEqual({ id: 'skills-heavy', params: { percent: 30 } });
    expect(ids(quiet({ actions: actions(29) }))).not.toContain('skills-heavy');
  });

  it('compares the rounded percent it shows, so 29.6 % counts as 30 %', () => {
    const facts = quiet({ actions: { food: 704, fields: 0, materials: 0, explore: 0, skills: 296, recreation: 0 } });
    expect(find(facts, 'skills-heavy')).toEqual({ id: 'skills-heavy', params: { percent: 30 } });
  });

  it('asks why nobody studied or made tools once a third of the game was played', () => {
    const none = { food: 50, fields: 10, materials: 30, explore: 10, skills: 0, recreation: 0 };
    expect(find(quiet({ actions: none }), 'skills-none')).toEqual({ id: 'skills-none', params: {} });
    expect(ids(quiet({ actions: none, monthsPlayed: 5 }))).toContain('skills-none');
    expect(ids(quiet({ actions: none, monthsPlayed: 4 }))).not.toContain('skills-none');
  });

  it('asks about a spring never found once a third of the game was played', () => {
    expect(find(quiet({ springFoundMonth: null }), 'spring-never')).toEqual({ id: 'spring-never', params: {} });
    expect(ids(quiet({ springFoundMonth: null, totalMonths: 10, monthsPlayed: 4 }))).toContain('spring-never');
    expect(ids(quiet({ springFoundMonth: null, totalMonths: 10, monthsPlayed: 3 }))).not.toContain('spring-never');
  });

  it('asks about a spring found in the last third of the planned months', () => {
    expect(find(quiet({ springFoundMonth: 11 }), 'spring-late')).toEqual({ id: 'spring-late', params: { month: 11 } });
    expect(ids(quiet({ springFoundMonth: 10 }))).not.toContain('spring-late');
    expect(find(quiet({ totalMonths: 10, monthsPlayed: 10, springFoundMonth: 7 }), 'spring-late')).toEqual({
      id: 'spring-late',
      params: { month: 7 },
    });
    expect(ids(quiet({ totalMonths: 10, monthsPlayed: 10, springFoundMonth: 6 }))).not.toContain('spring-late');
  });

  it('asks about unused actions from 15 % of all actions', () => {
    const used = (n: number) => ({ food: n, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 });
    expect(find(quiet({ actions: used(85), unused: 15 }), 'unused-actions')).toEqual({ id: 'unused-actions', params: { percent: 15 } });
    expect(ids(quiet({ actions: used(86), unused: 14 }))).not.toContain('unused-actions');
  });

  it('asks about participation below 70 % of the possible votes', () => {
    expect(find(quiet({ votesCast: 69 }), 'low-participation')).toEqual({ id: 'low-participation', params: { percent: 69 } });
    expect(ids(quiet({ votesCast: 70 }))).not.toContain('low-participation');
    expect(ids(quiet({ votesCast: 0, votesPossible: 0 }))).not.toContain('low-participation');
  });

  it('asks what worked when the grade is 5 or 6', () => {
    expect(find(quiet({ grade: 5 }), 'good-result')).toEqual({ id: 'good-result', params: { grade: 5 } });
    expect(find(quiet({ grade: 6 }), 'good-result')).toEqual({ id: 'good-result', params: { grade: 6 } });
    expect(ids(quiet({ grade: 4 }))).not.toContain('good-result');
  });

  it('asks nothing extra about a game that ended before any month was played', () => {
    const facts = quiet({
      monthsPlayed: 0,
      unshelteredMonths: 0,
      votesCast: 0,
      votesPossible: 0,
      actions: { food: 0, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 },
      springFoundMonth: null,
    });
    expect(ids(facts)).toEqual(['decision-making']);
  });

  it("keeps the priority order, at most four triggered questions, and 'decision-making' last", () => {
    const everything = quiet({
      grade: 6,
      crises: [{ kind: 'hunger', month: 2, people: 3, resolvedMonth: 3 }],
      unshelteredMonths: 9,
      ties: 3,
      emptyMonths: 8,
      votesCast: 10,
      actions: { food: 10, fields: 0, materials: 0, explore: 0, skills: 10, recreation: 0 },
      unused: 10,
      springFoundMonth: 14,
    });
    expect(ids(everything)).toEqual(['hunger', 'no-shelter-long', 'ties', 'empty-months', 'decision-making']);

    const lower = quiet({ grade: 5, springFoundMonth: null, unused: 50, votesCast: 10 });
    expect(ids(lower)).toEqual(['spring-never', 'unused-actions', 'low-participation', 'good-result', 'decision-making']);
  });

  it('only ever returns known question ids, each at most once', () => {
    const facts = quiet({ grade: 5, ties: 2, emptyMonths: 9, springFoundMonth: null });
    const picked = ids(facts);
    for (const id of picked) expect(QUESTION_IDS).toContain(id);
    expect(new Set(picked).size).toBe(picked.length);
  });
});

describe('QUESTION_IDS', () => {
  it("lists every question id once in priority order, 'decision-making' last", () => {
    expect(QUESTION_IDS).toEqual([
      'hunger',
      'no-shelter-long',
      'ties',
      'empty-months',
      'skills-heavy',
      'skills-none',
      'spring-never',
      'spring-late',
      'unused-actions',
      'low-participation',
      'good-result',
      'decision-making',
    ]);
  });
});
