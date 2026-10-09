import { describe, expect, it } from 'vitest';
import { chebyshev, inBounds, indexOf, neighbors4, neighbors8 } from '../src/grid.ts';

describe('grid helpers', () => {
  it('indexOf is row-major', () => {
    expect(indexOf(5, { x: 2, y: 3 })).toBe(17);
  });

  it('inBounds rejects coordinates outside the grid', () => {
    expect(inBounds(4, 3, { x: 0, y: 0 })).toBe(true);
    expect(inBounds(4, 3, { x: 3, y: 2 })).toBe(true);
    expect(inBounds(4, 3, { x: 4, y: 0 })).toBe(false);
    expect(inBounds(4, 3, { x: 0, y: -1 })).toBe(false);
  });

  it('neighbors4 returns only orthogonal in-bounds neighbours', () => {
    expect(neighbors4(3, 3, { x: 0, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    expect(neighbors4(3, 3, { x: 1, y: 1 })).toHaveLength(4);
  });

  it('neighbors8 includes diagonals and stays in bounds', () => {
    expect(neighbors8(3, 3, { x: 1, y: 1 })).toHaveLength(8);
    expect(neighbors8(3, 3, { x: 0, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
  });

  it('chebyshev is the king-move distance', () => {
    expect(chebyshev({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(3);
    expect(chebyshev({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
    expect(chebyshev({ x: 5, y: 1 }, { x: 1, y: 4 })).toBe(4);
  });
});
