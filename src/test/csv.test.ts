import { describe, expect, it } from 'vitest';
import { csvToSheet, sheetToCsv } from '../utils';

describe('csv utils', () => {
  it('imports first CSV row as spreadsheet data', () => {
    const csv = 'Name,Age\nIvan,30\nMaria,25';
    const result = csvToSheet(csv);
    expect(result.cells.A1.raw).toBe('Name');
    expect(result.cells.B1.raw).toBe('Age');
    expect(result.cells.A2.raw).toBe('Ivan');
    expect(result.cells.B3.raw).toBe('25');
  });

  it('exports spreadsheet data back to CSV', () => {
    const csv = sheetToCsv({
      rows: 2,
      cols: 2,
      cells: { A1: { raw: 'a' }, B1: { raw: 'b' }, A2: { raw: '1' }, B2: { raw: '2' } },
      columnWidths: {},
      rowHeights: {},
    });
    expect(csv).toContain('a,b');
    expect(csv).toContain('1,2');
  });

  it('exports raw formulas instead of evaluated values', () => {
    const csv = sheetToCsv({
      rows: 1,
      cols: 2,
      cells: { A1: { raw: '=' }, B1: { raw: '=A1+1' } },
      columnWidths: {},
      rowHeights: {},
    });
    expect(csv).toContain('=');
    expect(csv).toContain('=A1+1');
    expect(csv).not.toContain('#ERROR!');
  });

  it('does not export internal column labels as CSV rows', () => {
    const csv = sheetToCsv({
      rows: 1,
      cols: 2,
      cells: { A1: { raw: 'Ivan' }, B1: { raw: '30' } },
      columnWidths: {},
      rowHeights: {},
      columnLabels: { 0: 'Name', 1: 'Age' },
    });
    expect(csv).not.toContain('Name,Age');
    expect(csv).toContain('Ivan,30');
  });
});
