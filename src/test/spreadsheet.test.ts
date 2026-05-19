import { describe, expect, it } from 'vitest';
import reducer, { spreadsheetActions } from '../redux/spreadsheet';

describe('spreadsheet', () => {
  it('selects A1 after loading spreadsheet data', () => {
    const next = reducer(undefined, spreadsheetActions.loadSheet({ rows: 100, cols: 26, cells: {}, columnWidths: {}, rowHeights: {} }));
    expect(next.active).toEqual({ row: 0, col: 0 });
    expect(next.selection).toEqual({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } });
  });

  it('selects active cell', () => {
    const next = reducer(undefined, spreadsheetActions.setCell({ row: 2, col: 3 }));
    expect(next.active).toEqual({ row: 2, col: 3 });
    expect(next.selection).toEqual({ start: { row: 2, col: 3 }, end: { row: 2, col: 3 } });
  });

  it('extends selection and moves active cell to range end', () => {
    let s = reducer(undefined, spreadsheetActions.setCell({ row: 1, col: 1 }));
    s = reducer(s, spreadsheetActions.setSelectEnd({ row: 3, col: 2 }));
    expect(s.selection).toEqual({ start: { row: 1, col: 1 }, end: { row: 3, col: 2 } });
    expect(s.active).toEqual({ row: 3, col: 2 });
  });

  it('writes value to cell', () => {
    const s1 = reducer(undefined, spreadsheetActions.setValue({ row: 0, col: 0, raw: '42' }));
    expect(s1.data.cells.A1.raw).toBe('42');
    expect(s1.dirty).toBe(true);
  });

  it('undo reverts change', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 0, col: 0, raw: '1' }));
    s = reducer(s, spreadsheetActions.setValue({ row: 0, col: 0, raw: '2' }));
    expect(s.data.cells.A1.raw).toBe('2');
    s = reducer(s, spreadsheetActions.undo());
    expect(s.data.cells.A1.raw).toBe('1');
  });

  it('redo repeats reverted change', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 0, col: 0, raw: '1' }));
    s = reducer(s, spreadsheetActions.setValue({ row: 0, col: 0, raw: '2' }));
    s = reducer(s, spreadsheetActions.undo());
    s = reducer(s, spreadsheetActions.redo());
    expect(s.data.cells.A1.raw).toBe('2');
  });

  it('applies styles', () => {
    let s = reducer(undefined, spreadsheetActions.setCell({ row: 0, col: 0 }));
    s = reducer(s, spreadsheetActions.setStyle({
      range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
      style: { bold: true, align: 'center' },
    }));
    expect(s.data.cells.A1.style?.bold).toBe(true);
    expect(s.data.cells.A1.style?.align).toBe('center');
  });

  it('inserts row', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 1, col: 0, raw: 'hello' }));
    expect(s.data.cells.A2.raw).toBe('hello');
    s = reducer(s, spreadsheetActions.addStr({ at: 0 }));
    expect(s.data.cells.A3.raw).toBe('hello');
    expect(s.data.cells.A2).toBeUndefined();
    expect(s.data.rows).toBe(101);
  });

  it('deletes row', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 2, col: 0, raw: 'x' }));
    s = reducer(s, spreadsheetActions.delStr({ at: 0 }));
    expect(s.data.cells.A2.raw).toBe('x');
  });

  it('clears range', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 0, col: 0, raw: 'a' }));
    s = reducer(s, spreadsheetActions.setValue({ row: 0, col: 1, raw: 'b' }));
    s = reducer(s, spreadsheetActions.clearCells({ start: { row: 0, col: 0 }, end: { row: 0, col: 1 } }));
    expect(s.data.cells.A1).toBeUndefined();
    expect(s.data.cells.B1).toBeUndefined();
  });

  it('copies and pastes range', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 0, col: 0, raw: 'a' }));
    s = reducer(s, spreadsheetActions.setBufer({ range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }, cut: false }));
    s = reducer(s, spreadsheetActions.pasteBufer({ target: { row: 5, col: 5 } }));
    expect(s.data.cells.F6?.raw).toBe('a');
  });

  it('copying empty cells clears the pasted target cells', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 0, col: 0, raw: 'filled' }));
    s = reducer(s, spreadsheetActions.setStyle({
      range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
      style: { bold: true, bgColor: '#ff0000' },
    }));
    s = reducer(s, spreadsheetActions.setBufer({ range: { start: { row: 9, col: 9 }, end: { row: 9, col: 9 } }, cut: false }));
    s = reducer(s, spreadsheetActions.pasteBufer({ target: { row: 0, col: 0 } }));
    expect(s.data.cells.A1).toBeUndefined();
  });

  it('allows repeated paste after cutting a cell snapshot', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 0, col: 0, raw: 'a' }));
    s = reducer(s, spreadsheetActions.setBufer({ range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }, cut: true }));
    s = reducer(s, spreadsheetActions.pasteBufer({ target: { row: 0, col: 1 } }));
    s = reducer(s, spreadsheetActions.pasteBufer({ target: { row: 0, col: 2 } }));
    expect(s.data.cells.A1).toBeUndefined();
    expect(s.data.cells.B1?.raw).toBe('a');
    expect(s.data.cells.C1?.raw).toBe('a');
  });

  it('changes column and row sizes', () => {
    let s = reducer(undefined, spreadsheetActions.setColWidth({ col: 0, width: 140 }));
    s = reducer(s, spreadsheetActions.setRowHeight({ row: 0, height: 36 }));
    expect(s.data.columnWidths[0]).toBe(140);
    expect(s.data.rowHeights[0]).toBe(36);
    expect(s.dirty).toBe(true);
  });

  it('cut pasted onto the same range keeps cells intact', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 0, col: 0, raw: 'a' }));
    s = reducer(s, spreadsheetActions.setValue({ row: 0, col: 1, raw: 'b' }));
    s = reducer(s, spreadsheetActions.setBufer({ range: { start: { row: 0, col: 0 }, end: { row: 0, col: 1 } }, cut: true }));
    s = reducer(s, spreadsheetActions.pasteBufer({ target: { row: 0, col: 0 } }));
    expect(s.data.cells.A1?.raw).toBe('a');
    expect(s.data.cells.B1?.raw).toBe('b');
  });

  it('cut pasted into an overlapping range moves the snapshot without deleting it', () => {
    let s = reducer(undefined, spreadsheetActions.setValue({ row: 0, col: 0, raw: 'a' }));
    s = reducer(s, spreadsheetActions.setValue({ row: 1, col: 0, raw: 'b' }));
    s = reducer(s, spreadsheetActions.setBufer({ range: { start: { row: 0, col: 0 }, end: { row: 1, col: 0 } }, cut: true }));
    s = reducer(s, spreadsheetActions.pasteBufer({ target: { row: 1, col: 0 } }));
    expect(s.data.cells.A1).toBeUndefined();
    expect(s.data.cells.A2?.raw).toBe('a');
    expect(s.data.cells.A3?.raw).toBe('b');
  });

  it('stores throttled color preview as one undo step', () => {
    const range = { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } };
    let s = reducer(undefined, spreadsheetActions.showStyle({ range, style: { textColor: '#111111' } }));
    s = reducer(s, spreadsheetActions.showStyle({ range, style: { textColor: '#222222' } }));
    s = reducer(s, spreadsheetActions.showStyle({ range, style: { textColor: '#333333' } }));
    expect(s.data.cells.A1.style?.textColor).toBe('#333333');
    expect(s.past).toHaveLength(0);
    s = reducer(s, spreadsheetActions.saveStylePreview());
    expect(s.past).toHaveLength(1);
    s = reducer(s, spreadsheetActions.undo());
    expect(s.data.cells.A1).toBeUndefined();
  });
});
