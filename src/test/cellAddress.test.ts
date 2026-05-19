import { describe, expect, it } from 'vitest';
import { cellName, colName, cellPos, colNumber, normRange } from '../utils';

describe('cellAddress', () => {
  it('converts column index to letters', () => {
    expect(colName(0)).toBe('A');
    expect(colName(25)).toBe('Z');
    expect(colName(26)).toBe('AA');
    expect(colName(701)).toBe('ZZ');
  });

  it('converts letters back to column index', () => {
    expect(colNumber('A')).toBe(0);
    expect(colNumber('Z')).toBe(25);
    expect(colNumber('AA')).toBe(26);
    expect(colNumber('ZZ')).toBe(701);
  });

  it('converts address to key', () => {
    expect(cellName({ row: 0, col: 0 })).toBe('A1');
    expect(cellName({ row: 99, col: 25 })).toBe('Z100');
  });

  it('parses key back to address', () => {
    expect(cellPos('A1')).toEqual({ row: 0, col: 0 });
    expect(cellPos('AA10')).toEqual({ row: 9, col: 26 });
    expect(cellPos('bad')).toBeNull();
  });

  it('normalizes range', () => {
    const r = normRange({ start: { row: 5, col: 5 }, end: { row: 1, col: 2 } });
    expect(r).toEqual({ start: { row: 1, col: 2 }, end: { row: 5, col: 5 } });
  });
});
