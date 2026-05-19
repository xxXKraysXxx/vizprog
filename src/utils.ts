import Papa from 'papaparse';
import type { Cell, CellAddress, CellNumberFormat, CellRange, CellsMap, SpreadsheetData } from './types';

export function uid(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${prefix}${t}${r}`;
}

export function colName(col: number): string {
  let n = col;
  let res = '';
  while (n >= 0) {
    res = String.fromCharCode((n % 26) + 65) + res;
    n = Math.floor(n / 26) - 1;
  }
  return res;
}

export function colNumber(letters: string): number {
  let acc = 0;
  for (let i = 0; i < letters.length; i++) {
    acc = acc * 26 + (letters.charCodeAt(i) - 64);
  }
  return acc - 1;
}

export function cellName(addr: CellAddress): string {
  return `${colName(addr.col)}${addr.row + 1}`;
}

export function cellPos(key: string): CellAddress | null {
  const matched = /^([A-Z]+)(\d+)$/i.exec(key);
  if (!matched) return null;
  const stolb = colNumber(matched[1].toUpperCase());
  const stroka = parseInt(matched[2], 10) - 1;
  if (stroka < 0 || stolb < 0) return null;
  return { row: stroka, col: stolb };
}

export function normRange(range: CellRange): CellRange {
  const a = range.start;
  const b = range.end;
  return {
    start: { row: Math.min(a.row, b.row), col: Math.min(a.col, b.col) },
    end: { row: Math.max(a.row, b.row), col: Math.max(a.col, b.col) },
  };
}

export function inRange(range: CellRange, addr: CellAddress): boolean {
  const r = normRange(range);
  return addr.row >= r.start.row && addr.row <= r.end.row && addr.col >= r.start.col && addr.col <= r.end.col;
}

export function* walkRange(range: CellRange): Generator<CellAddress> {
  const r = normRange(range);
  for (let i = r.start.row; i <= r.end.row; i++) {
    for (let j = r.start.col; j <= r.end.col; j++) {
      yield { row: i, col: j };
    }
  }
}

export type FormulaValue = number | string | boolean;

const RANGE_RE = /^([A-Z]+\d+):([A-Z]+\d+)$/i;
const REF_RE = /^[A-Z]+\d+$/i;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

export function parseValue(raw: string): FormulaValue {
  const t = raw.trim();
  if (t === '') return '';
  if (t === 'TRUE' || t === 'true') return true;
  if (t === 'FALSE' || t === 'false') return false;
  const norm = t.replace(',', '.');
  const num = Number(norm);
  if (!Number.isNaN(num) && NUMBER_RE.test(norm)) return num;
  return raw;
}

interface Ctx {
  cells: CellsMap;
  visit: Set<string>;
}

function getVal(key: string, ctx: Ctx): FormulaValue {
  const addr = cellPos(key);
  if (!addr) return '#REF!';
  const k = cellName(addr);
  if (ctx.visit.has(k)) return '#CYCLE!';
  const c = ctx.cells[k];
  if (!c || c.raw === '') return 0;
  return calcCell(c, k, ctx);
}

function openRange(s: string): string[] {
  const m = RANGE_RE.exec(s);
  if (!m) return [];
  const a = cellPos(m[1]);
  const b = cellPos(m[2]);
  if (!a || !b) return [];
  const out: string[] = [];
  for (const addr of walkRange({ start: a, end: b })) out.push(cellName(addr));
  return out;
}

function getNums(args: string[], ctx: Ctx): number[] | string {
  const out: number[] = [];
  for (const arg of args) {
    if (RANGE_RE.test(arg)) {
      for (const k of openRange(arg)) {
        const v = getVal(k, ctx);
        if (typeof v === 'string' && v.startsWith('#')) return v;
        if (typeof v === 'number') out.push(v);
      }
    } else if (REF_RE.test(arg)) {
      const v = getVal(arg, ctx);
      if (typeof v === 'string' && v.startsWith('#')) return v;
      if (typeof v === 'number') out.push(v);
    } else {
      const n = Number(arg);
      if (!Number.isNaN(n)) out.push(n);
      else return '#ERROR!';
    }
  }
  return out;
}

const FUNCS: Record<string, (args: string[], ctx: Ctx) => FormulaValue> = {
  SUM: (a, c) => {
    const ns = getNums(a, c);
    return typeof ns === 'string' ? ns : ns.reduce((s, x) => s + x, 0);
  },
  AVERAGE: (a, c) => {
    const ns = getNums(a, c);
    if (typeof ns === 'string') return ns;
    return ns.length === 0 ? 0 : ns.reduce((s, x) => s + x, 0) / ns.length;
  },
  AVG: (a, c) => FUNCS.AVERAGE(a, c),
  COUNT: (a, c) => {
    const ns = getNums(a, c);
    return typeof ns === 'string' ? ns : ns.length;
  },
  MIN: (a, c) => {
    const ns = getNums(a, c);
    if (typeof ns === 'string') return ns;
    return ns.length === 0 ? 0 : Math.min(...ns);
  },
  MAX: (a, c) => {
    const ns = getNums(a, c);
    if (typeof ns === 'string') return ns;
    return ns.length === 0 ? 0 : Math.max(...ns);
  },
};

function hasBadJoin(expr: string): boolean {
  const token = '(?:[A-Z]+\\d+|\\d+(?:\\.\\d+)?|\\))';
  const next = '(?:[A-Z]+\\d+|\\d+(?:\\.\\d+)?|\\()';
  return new RegExp(`${token}\\s*${next}`, 'i').test(expr);
}

function countExpr(expr: string): number | null {
  let i = 0;

  const skip = (): void => {
    while (expr[i] === ' ') i++;
  };

  const num = (): number | null => {
    skip();
    let s = '';
    while (i < expr.length && /[\d.]/.test(expr[i])) {
      s += expr[i];
      i++;
    }
    if (!s || s === '.') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const factor = (): number | null => {
    skip();
    if (expr[i] === '+') {
      i++;
      return factor();
    }
    if (expr[i] === '-') {
      i++;
      const v = factor();
      return v === null ? null : -v;
    }
    if (expr[i] === '(') {
      i++;
      const v = sum();
      skip();
      if (expr[i] !== ')') return null;
      i++;
      return v;
    }
    return num();
  };

  const mult = (): number | null => {
    let left = factor();
    if (left === null) return null;
    for (;;) {
      skip();
      const op = expr[i];
      if (op !== '*' && op !== '/') return left;
      i++;
      const right = factor();
      if (right === null) return null;
      left = op === '*' ? left * right : left / right;
      if (!Number.isFinite(left)) return null;
    }
  };

  function sum(): number | null {
    let left = mult();
    if (left === null) return null;
    for (;;) {
      skip();
      const op = expr[i];
      if (op !== '+' && op !== '-') return left;
      i++;
      const right = mult();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
  }

  const res = sum();
  skip();
  if (i !== expr.length || res === null || !Number.isFinite(res)) return null;
  return res;
}

function calcExpr(expr: string, ctx: Ctx): FormulaValue {
  const t = expr.trim();
  const fnMatch = /^([A-Z]+)\(([^)]*)\)$/i.exec(t);
  if (fnMatch) {
    const name = fnMatch[1].toUpperCase();
    const args = fnMatch[2].split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const fn = FUNCS[name];
    if (!fn) return '#NAME?';
    return fn(args, ctx);
  }

  if (hasBadJoin(t)) return '#ERROR!';

  let err: string | null = null;
  const replaced = t.replace(/[A-Z]+\d+/gi, (ref) => {
    const v = getVal(ref.toUpperCase(), ctx);
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'string' && v.startsWith('#')) {
      err = v;
      return '0';
    }
    return '0';
  });
  if (err) return err;
  if (!/^[-+*/().\d\s]+$/.test(replaced)) return '#ERROR!';

  const r = countExpr(replaced);
  return r === null ? '#ERROR!' : r;
}

export function calcCell(cell: Cell, key: string, ctx: Ctx): FormulaValue {
  const raw = cell.raw;
  if (!raw) return '';
  if (!raw.startsWith('=')) return parseValue(raw);
  ctx.visit.add(key);
  try {
    return calcExpr(raw.slice(1), ctx);
  } finally {
    ctx.visit.delete(key);
  }
}

export function calcAll(cells: CellsMap): Record<string, FormulaValue> {
  const ctx: Ctx = { cells, visit: new Set() };
  const out: Record<string, FormulaValue> = {};
  for (const k of Object.keys(cells)) out[k] = calcCell(cells[k], k, ctx);
  return out;
}

export function calcOne(cells: CellsMap, key: string): FormulaValue {
  const ctx: Ctx = { cells, visit: new Set() };
  const c = cells[key];
  if (!c) return '';
  return calcCell(c, key, ctx);
}

export function showValue(value: FormulaValue, fmt: CellNumberFormat | undefined): string {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') return value;
  if (fmt === 'percent') return `${(value * 100).toFixed(2)}%`;
  if (fmt === 'currency') return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(value);
  if (fmt === 'date') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('ru-RU');
  }
  return String(value);
}

export function sheetToCsv(data: SpreadsheetData): string {
  const matrix: string[][] = [];
  for (let r = 0; r < data.rows; r++) {
    const line: string[] = [];
    for (let c = 0; c < data.cols; c++) {
      const k = cellName({ row: r, col: c });
      const cell = data.cells[k];
      line.push(cell ? cell.raw : '');
    }
    matrix.push(line);
  }
  return Papa.unparse(matrix);
}

export function csvToSheet(csv: string): { cells: CellsMap; rows: number; cols: number } {
  const parsed = Papa.parse<string[]>(csv.trim(), { skipEmptyLines: true });
  const rows = parsed.data;
  const cells: CellsMap = {};
  let maxCols = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.length > maxCols) maxCols = r.length;
    for (let c = 0; c < r.length; c++) {
      const v = r[c] ?? '';
      if (v === '') continue;
      cells[cellName({ row: i, col: c })] = { raw: v };
    }
  }

  return {
    cells,
    rows: Math.max(rows.length, 1),
    cols: Math.max(maxCols, 1),
  };
}

export function download(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const FORMULA_FUNCTIONS = ['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX'] as const;

export function rangeText(range: CellRange): string {
  const r = normRange(range);
  const start = cellName(r.start);
  const end = cellName(r.end);
  return start === end ? start : `${start}:${end}`;
}

export function insertCellText(current: string, selectionStart: number, selectionEnd: number, text: string): { value: string; cursor: number } {
  const replacesWholeFormula = selectionStart === 0 && selectionEnd === current.length && current.startsWith('=');
  const start = replacesWholeFormula ? current.length : selectionStart;
  const end = replacesWholeFormula ? current.length : selectionEnd;
  const value = `${current.slice(0, start)}${text}${current.slice(end)}`;
  return { value, cursor: start + text.length };
}

export function insertFuncText(current: string, selectionStart: number, selectionEnd: number, name: string): { value: string; cursor: number } {
  const prefix = current.startsWith('=') ? '' : '=';
  const base = prefix ? `${prefix}${current}` : current;
  const startOffset = prefix ? 1 : 0;
  const adjustedStart = selectionStart + startOffset;
  const adjustedEnd = selectionEnd + startOffset;
  const replacesWholeFormula = adjustedStart === 0 && adjustedEnd === base.length && base.startsWith('=');
  const start = replacesWholeFormula ? 1 : adjustedStart;
  const end = replacesWholeFormula ? base.length : adjustedEnd;
  const snippet = `${name}()`;
  const value = `${base.slice(0, start)}${snippet}${base.slice(end)}`;
  return { value, cursor: start + name.length + 1 };
}

export const FORMULA_REFERENCE_EVENT = 'spreadsheet:formula-reference';

export interface FormulaReferenceEventDetail {
  range: CellRange;
}
