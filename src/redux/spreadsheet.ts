import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  Cell,
  CellRange,
  CellStyle,
  CellsMap,
  SpreadsheetData,
} from '@/types';
import { cellName, normRange, walkRange } from '@/utils';

interface History {
  before: SpreadsheetData;
  after: SpreadsheetData;
}

export interface SpreadsheetState {
  data: SpreadsheetData;
  selection: CellRange | null;
  active: { row: number; col: number } | null;
  editing: boolean;
  clipboard: { range: CellRange; cells: CellsMap; cut: boolean } | null;
  stylePreviewBefore: SpreadsheetData | null;
  past: History[];
  future: History[];
  dirty: boolean;
}

function emptyTable(): SpreadsheetData {
  return { rows: 100, cols: 26, cells: {}, columnWidths: {}, rowHeights: {} };
}

const initialState: SpreadsheetState = {
  data: emptyTable(),
  selection: null,
  active: null,
  editing: false,
  clipboard: null,
  stylePreviewBefore: null,
  past: [],
  future: [],
  dirty: false,
};

function copy(d: SpreadsheetData): SpreadsheetData {
  return JSON.parse(JSON.stringify(d)) as SpreadsheetData;
}

function saveHist(s: SpreadsheetState, before: SpreadsheetData): void {
  s.past.push({ before, after: copy(s.data) });
  if (s.past.length > 100) s.past.shift();
  s.future = [];
  s.dirty = true;
}

function clearStyle(style: CellStyle): CellStyle | undefined {
  const next = Object.fromEntries(Object.entries(style).filter(([, value]) => value !== undefined)) as CellStyle;
  return Object.keys(next).length > 0 ? next : undefined;
}

function paintCell(data: SpreadsheetData, range: CellRange, stylePatch: Partial<CellStyle>): void {
  const r = normRange(range);
  for (const a of walkRange(r)) {
    const k = cellName(a);
    const ex: Cell = data.cells[k] ?? { raw: '' };
    const style: CellStyle = { ...(ex.style ?? {}), ...stylePatch };
    const nextStyle = clearStyle(style);
    if (ex.raw === '' && !nextStyle) delete data.cells[k];
    else data.cells[k] = { ...ex, style: nextStyle };
  }
}

function moveCell(key: string, dr: number, dc: number): string | null {
  const m = /^([A-Z]+)(\d+)$/.exec(key);
  if (!m) return null;
  let col = 0;
  for (let i = 0; i < m[1].length; i++) col = col * 26 + (m[1].charCodeAt(i) - 64);
  col -= 1;
  const row = parseInt(m[2], 10) - 1;
  const newCol = col + dc;
  const newRow = row + dr;
  if (newCol < 0 || newRow < 0) return null;
  return cellName({ row: newRow, col: newCol });
}

const slice = createSlice({
  name: 'spreadsheet',
  initialState,
  reducers: {
    loadSheet(state, action: PayloadAction<SpreadsheetData>) {
      state.data = action.payload;
      state.past = [];
      state.future = [];
      state.dirty = false;
      state.active = { row: 0, col: 0 };
      state.selection = { start: state.active, end: state.active };
      state.editing = false;
      state.clipboard = null;
      state.stylePreviewBefore = null;
    },
    setSaved(state) {
      state.dirty = false;
    },
    setCell(state, action: PayloadAction<{ row: number; col: number }>) {
      state.active = action.payload;
      state.selection = { start: action.payload, end: action.payload };
      state.editing = false;
    },
    setSelectEnd(state, action: PayloadAction<{ row: number; col: number }>) {
      if (!state.selection) {
        state.active = action.payload;
        state.selection = { start: action.payload, end: action.payload };
        return;
      }
      state.selection = { start: state.selection.start, end: action.payload };
      state.active = action.payload;
    },
    selectAllCells(state) {
      state.active = { row: 0, col: 0 };
      state.selection = {
        start: { row: 0, col: 0 },
        end: { row: state.data.rows - 1, col: state.data.cols - 1 },
      };
      state.editing = false;
    },
    startEdit(state) {
      if (state.active) state.editing = true;
    },
    stopEdit(state) {
      state.editing = false;
    },
    setValue(state, action: PayloadAction<{ row: number; col: number; raw: string }>) {
      const before = copy(state.data);
      const k = cellName(action.payload);
      const ex = state.data.cells[k];
      if (action.payload.raw === '' && (!ex || !ex.style)) {
        delete state.data.cells[k];
      } else {
        state.data.cells[k] = { ...(ex ?? { raw: '' }), raw: action.payload.raw };
      }
      saveHist(state, before);
    },
    clearCells(state, action: PayloadAction<CellRange>) {
      const before = copy(state.data);
      const r = normRange(action.payload);
      for (const a of walkRange(r)) {
        const k = cellName(a);
        const ex = state.data.cells[k];
        if (!ex) continue;
        if (ex.style) state.data.cells[k] = { raw: '', style: ex.style };
        else delete state.data.cells[k];
      }
      saveHist(state, before);
    },
    setStyle(state, action: PayloadAction<{ range: CellRange; style: Partial<CellStyle> }>) {
      const before = copy(state.data);
      paintCell(state.data, action.payload.range, action.payload.style);
      saveHist(state, before);
    },
    showStyle(state, action: PayloadAction<{ range: CellRange; style: Partial<CellStyle> }>) {
      if (!state.stylePreviewBefore) state.stylePreviewBefore = copy(state.data);
      paintCell(state.data, action.payload.range, action.payload.style);
      state.dirty = true;
    },
    saveStylePreview(state) {
      if (!state.stylePreviewBefore) return;
      saveHist(state, state.stylePreviewBefore);
      state.stylePreviewBefore = null;
    },
    setColWidth(state, action: PayloadAction<{ col: number; width: number }>) {
      state.data.columnWidths[action.payload.col] = Math.max(40, action.payload.width);
      state.dirty = true;
    },
    setRowHeight(state, action: PayloadAction<{ row: number; height: number }>) {
      state.data.rowHeights[action.payload.row] = Math.max(20, action.payload.height);
      state.dirty = true;
    },
    addStr(state, action: PayloadAction<{ at: number }>) {
      const before = copy(state.data);
      const at = action.payload.at;
      const next: CellsMap = {};
      for (const k of Object.keys(state.data.cells)) {
        const m = /^([A-Z]+)(\d+)$/.exec(k);
        if (!m) continue;
        const r = parseInt(m[2], 10) - 1;
        if (r >= at) next[`${m[1]}${r + 2}`] = state.data.cells[k];
        else next[k] = state.data.cells[k];
      }
      state.data.cells = next;
      state.data.rows += 1;
      saveHist(state, before);
    },
    delStr(state, action: PayloadAction<{ at: number }>) {
      const before = copy(state.data);
      const at = action.payload.at;
      const next: CellsMap = {};
      for (const k of Object.keys(state.data.cells)) {
        const m = /^([A-Z]+)(\d+)$/.exec(k);
        if (!m) continue;
        const r = parseInt(m[2], 10) - 1;
        if (r === at) continue;
        if (r > at) next[`${m[1]}${r}`] = state.data.cells[k];
        else next[k] = state.data.cells[k];
      }
      state.data.cells = next;
      state.data.rows = Math.max(1, state.data.rows - 1);
      saveHist(state, before);
    },
    addStlb(state, action: PayloadAction<{ at: number }>) {
      const before = copy(state.data);
      const at = action.payload.at;
      const next: CellsMap = {};
      for (const k of Object.keys(state.data.cells)) {
        const shifted = moveCell(k, 0, 0);
        if (!shifted) continue;
        const m = /^([A-Z]+)(\d+)$/.exec(k);
        if (!m) continue;
        let col = 0;
        for (let i = 0; i < m[1].length; i++) col = col * 26 + (m[1].charCodeAt(i) - 64);
        col -= 1;
        if (col >= at) {
          const nk = moveCell(k, 0, 1);
          if (nk) next[nk] = state.data.cells[k];
        } else {
          next[k] = state.data.cells[k];
        }
      }
      state.data.cells = next;
      if (state.data.columnLabels) {
        const labels: Record<number, string> = {};
        for (const [key, label] of Object.entries(state.data.columnLabels)) {
          const col = Number(key);
          labels[col >= at ? col + 1 : col] = label;
        }
        state.data.columnLabels = labels;
      }
      state.data.cols += 1;
      saveHist(state, before);
    },
    delStlb(state, action: PayloadAction<{ at: number }>) {
      const before = copy(state.data);
      const at = action.payload.at;
      const next: CellsMap = {};
      for (const k of Object.keys(state.data.cells)) {
        const m = /^([A-Z]+)(\d+)$/.exec(k);
        if (!m) continue;
        let col = 0;
        for (let i = 0; i < m[1].length; i++) col = col * 26 + (m[1].charCodeAt(i) - 64);
        col -= 1;
        if (col === at) continue;
        if (col > at) {
          const nk = moveCell(k, 0, -1);
          if (nk) next[nk] = state.data.cells[k];
        } else {
          next[k] = state.data.cells[k];
        }
      }
      state.data.cells = next;
      if (state.data.columnLabels) {
        const labels: Record<number, string> = {};
        for (const [key, label] of Object.entries(state.data.columnLabels)) {
          const col = Number(key);
          if (col === at) continue;
          labels[col > at ? col - 1 : col] = label;
        }
        state.data.columnLabels = labels;
      }
      state.data.cols = Math.max(1, state.data.cols - 1);
      saveHist(state, before);
    },
    setBufer(state, action: PayloadAction<{ range: CellRange; cut: boolean } | null>) {
      if (action.payload === null) {
        state.clipboard = null;
        return;
      }
      const range = normRange(action.payload.range);
      const cells: CellsMap = {};
      for (const a of walkRange(range)) {
        const k = cellName(a);
        const c = state.data.cells[k];
        const rk = cellName({ row: a.row - range.start.row, col: a.col - range.start.col });
        cells[rk] = c ? { ...c, style: c.style ? { ...c.style } : undefined } : { raw: '' };
      }
      state.clipboard = { range, cells, cut: action.payload.cut };
    },
    pasteBufer(state, action: PayloadAction<{ target: { row: number; col: number } }>) {
      if (!state.clipboard) return;
      const before = copy(state.data);
      const tg = action.payload.target;
      if (state.clipboard.cut) {
        for (const a of walkRange(state.clipboard.range)) {
          delete state.data.cells[cellName(a)];
        }
      }
      for (const rk of Object.keys(state.clipboard.cells)) {
        const m = /^([A-Z]+)(\d+)$/.exec(rk);
        if (!m) continue;
        let col = 0;
        for (let i = 0; i < m[1].length; i++) col = col * 26 + (m[1].charCodeAt(i) - 64);
        col -= 1;
        const row = parseInt(m[2], 10) - 1;
        const nk = cellName({ row: tg.row + row, col: tg.col + col });
        const src = state.clipboard.cells[rk];
        if (src.raw === '' && !src.style) delete state.data.cells[nk];
        else state.data.cells[nk] = { ...src, style: src.style ? { ...src.style } : undefined };
      }
      if (state.clipboard.cut) {
        state.clipboard.cut = false;
      }
      saveHist(state, before);
    },
    undo(state) {
      const last = state.past.pop();
      if (!last) return;
      state.future.push({ before: last.before, after: copy(state.data) });
      state.data = last.before;
      state.dirty = true;
    },
    redo(state) {
      const next = state.future.pop();
      if (!next) return;
      state.past.push({ before: copy(state.data), after: next.after });
      state.data = next.after;
      state.dirty = true;
    },
  },
});

export const spreadsheetActions = slice.actions;
export default slice.reducer;
