import { describe, expect, it } from 'vitest';
import { calcAll, calcOne, parseValue } from '../utils';
import type { CellsMap } from '@/types';

describe('parseValue', () => {
  it('parses numbers', () => {
    expect(parseValue('42')).toBe(42);
    expect(parseValue('-3.14')).toBe(-3.14);
  });
  it('parses booleans', () => {
    expect(parseValue('true')).toBe(true);
    expect(parseValue('FALSE')).toBe(false);
  });
  it('returns string as is', () => {
    expect(parseValue('hello')).toBe('hello');
  });
});

describe('formula evaluator', () => {
  const cells = (): CellsMap => ({
    A1: { raw: '10' },
    A2: { raw: '20' },
    A3: { raw: '30' },
    B1: { raw: '=SUM(A1:A3)' },
    B2: { raw: '=AVERAGE(A1:A3)' },
    B3: { raw: '=A1+A2*2' },
    C1: { raw: '=A1' },
    C2: { raw: '=C2' },
  });

  it('calculates SUM by range', () => {
    expect(calcOne(cells(), 'B1')).toBe(60);
  });

  it('calculates AVERAGE', () => {
    expect(calcOne(cells(), 'B2')).toBe(20);
  });

  it('calculates arithmetic expressions with operator precedence', () => {
    expect(calcOne(cells(), 'B3')).toBe(50);
  });

  it('resolves simple references', () => {
    expect(calcOne(cells(), 'C1')).toBe(10);
  });

  it('detects circular references', () => {
    const v = calcOne(cells(), 'C2');
    expect(typeof v === 'string' ? v : '').toMatch(/CYCLE|ERROR/);
  });

  it('calcAll returns results for all cells', () => {
    const all = calcAll(cells());
    expect(all.B1).toBe(60);
    expect(all.A1).toBe(10);
  });

  it('rejects adjacent references without an operator', () => {
    const v = calcOne({ A1: { raw: '1' }, A2: { raw: '2' }, B1: { raw: '=A1A2' } }, 'B1');
    expect(v).toBe('#ERROR!');
  });

  it('rejects invalid function arguments', () => {
    const v = calcOne({ A1: { raw: '1' }, A2: { raw: '2' }, B1: { raw: '=SUM(A1A2)' } }, 'B1');
    expect(v).toBe('#ERROR!');
  });
});
