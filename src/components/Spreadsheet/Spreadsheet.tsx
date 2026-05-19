import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { spreadsheetActions } from '@/redux/spreadsheet';
import { uiActions } from '@/redux/ui';
import {
  FORMULA_REFERENCE_EVENT,
  type FormulaReferenceEventDetail,
  calcAll,
  cellName,
  colName,
  inRange as checkRange,
  insertCellText,
  insertFuncText,
  normRange,
  rangeText,
  showValue,
} from '@/utils';
import type { CellAddress, CellRange } from '@/types';
import { Menu } from './Menu';
import { FormulaMenu } from './FormulaMenu';

const COL_W = 100;
const ROW_H = 24;
const RH_W = 48;
const HD_H = 24;
const OVER = 5;

function makeOffsets(count: number, custom: Record<number, number>, def: number): number[] {
  const arr = new Array(count + 1);
  arr[0] = 0;
  for (let i = 0; i < count; i++) arr[i + 1] = arr[i] + (custom[i] ?? def);
  return arr;
}

function visiblePart(offsets: number[], size: number, start: number, viewport: number): { start: number; end: number } {
  let a = 0;
  let b = size - 1;
  while (a < size && offsets[a + 1] < start) a++;
  while (b > a && offsets[b] > start + viewport) b--;
  return { start: Math.max(0, a - OVER), end: Math.min(size - 1, b + OVER) };
}

function rangeEdges(range: CellRange | null, addr: CellAddress) {
  if (!range) return { inR: false, top: false, right: false, bottom: false, left: false };
  const r = normRange(range);
  const inR = addr.row >= r.start.row && addr.row <= r.end.row && addr.col >= r.start.col && addr.col <= r.end.col;
  return {
    inR,
    top: inR && addr.row === r.start.row,
    right: inR && addr.col === r.end.col,
    bottom: inR && addr.row === r.end.row,
    left: inR && addr.col === r.start.col,
  };
}

interface EditorProps {
  addr: CellAddress;
  left: number;
  top: number;
  width: number;
  height: number;
  initial: string;
  saveDraft: (draft: { row: number; col: number; raw: string } | null) => void;
  formulaClick: (fn: ((range: CellRange) => boolean) | null) => void;
}

function CellEditor({ addr, left, top, width, height, initial, saveDraft, formulaClick }: EditorProps) {
  const dispatch = useAppDispatch();
  const rows = useAppSelector((s) => s.spreadsheet.data.rows);
  const cols = useAppSelector((s) => s.spreadsheet.data.cols);
  const [val, setVal] = useState(initial);
  const valRef = useRef(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    valRef.current = val;
  }, [val]);

  const addRef = useCallback((range: CellRange): boolean => {
    const cur = valRef.current;
    if (!cur.trimStart().startsWith('=')) return false;
    const input = inputRef.current;
    const start = input?.selectionStart ?? cur.length;
    const end = input?.selectionEnd ?? start;
    const next = insertCellText(cur, start, end, rangeText(range));
    valRef.current = next.value;
    setVal(next.value);
    saveDraft({ row: addr.row, col: addr.col, raw: next.value });
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(next.cursor, next.cursor);
    });
    return true;
  }, [addr.col, addr.row, saveDraft]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    saveDraft({ row: addr.row, col: addr.col, raw: initial });
    formulaClick(addRef);
    return () => {
      formulaClick(null);
      saveDraft(null);
    };
  }, [addRef, addr.col, addr.row, formulaClick, initial, saveDraft]);

  const saveCell = (move?: { dr: number; dc: number }): void => {
    dispatch(spreadsheetActions.setValue({ row: addr.row, col: addr.col, raw: valRef.current }));
    saveDraft(null);
    dispatch(spreadsheetActions.stopEdit());
    if (move) {
      const row = Math.max(0, Math.min(rows - 1, addr.row + move.dr));
      const col = Math.max(0, Math.min(cols - 1, addr.col + move.dc));
      dispatch(spreadsheetActions.setCell({ row, col }));
    }
  };

  const addFunc = (name: string): void => {
    const input = inputRef.current;
    const cur = valRef.current;
    const start = input?.selectionStart ?? cur.length;
    const end = input?.selectionEnd ?? start;
    const next = insertFuncText(cur, start, end, name);
    valRef.current = next.value;
    setVal(next.value);
    saveDraft({ row: addr.row, col: addr.col, raw: next.value });
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(next.cursor, next.cursor);
    });
  };

  return (
    <>
      <input
        ref={inputRef}
        className="cell-input"
        style={{ left: left + RH_W, top: top + HD_H, width, height }}
        value={val}
        onChange={(e) => {
          valRef.current = e.target.value;
          setVal(e.target.value);
          saveDraft({ row: addr.row, col: addr.col, raw: e.target.value });
        }}
        onBlur={() => saveCell()}
        onContextMenu={(e) => {
          if (!valRef.current.trimStart().startsWith('=')) return;
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveCell();
          }
          if (e.key === 'Tab') {
            e.preventDefault();
            saveCell({ dr: 0, dc: e.shiftKey ? -1 : 1 });
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            saveDraft(null);
            dispatch(spreadsheetActions.stopEdit());
          }
        }}
      />
      {menu && <FormulaMenu x={menu.x} y={menu.y} onPick={addFunc} onClose={() => setMenu(null)} />}
    </>
  );
}

export function Spreadsheet() {
  const dispatch = useAppDispatch();
  const data = useAppSelector((s) => s.spreadsheet.data);
  const selection = useAppSelector((s) => s.spreadsheet.selection);
  const active = useAppSelector((s) => s.spreadsheet.active);
  const editing = useAppSelector((s) => s.spreadsheet.editing);
  const clipboard = useAppSelector((s) => s.spreadsheet.clipboard);
  const draftRef = useRef<{ row: number; col: number; raw: string } | null>(null);
  const formulaClickRef = useRef<((range: CellRange) => boolean) | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ left: 0, top: 0, width: 900, height: 500 });
  const [drag, setDrag] = useState(false);
  const [formulaDrag, setFormulaDrag] = useState<CellRange | null>(null);
  const formulaDragRef = useRef<CellRange | null>(null);
  const [cutPreview, setCutPreview] = useState<CellAddress | null>(null);
  const [resize, setResize] = useState<
    | { kind: 'col'; col: number; x: number; w: number }
    | { kind: 'row'; row: number; y: number; h: number }
    | null
  >(null);

  const colOffsets = useMemo(() => makeOffsets(data.cols, data.columnWidths, COL_W), [data.cols, data.columnWidths]);
  const rowOffsets = useMemo(() => makeOffsets(data.rows, data.rowHeights, ROW_H), [data.rows, data.rowHeights]);
  const calc = useMemo(() => calcAll(data.cells), [data.cells]);
  const visibleRows = visiblePart(rowOffsets, data.rows, Math.max(0, view.top - HD_H), view.height + HD_H);
  const visibleCols = visiblePart(colOffsets, data.cols, Math.max(0, view.left - RH_W), view.width + RH_W);

  const updateView = useCallback((): void => {
    const el = boxRef.current;
    if (!el) return;
    setView({ left: el.scrollLeft, top: el.scrollTop, width: el.clientWidth, height: el.clientHeight });
  }, []);

  const saveDrafter = (): void => {
    const d = draftRef.current;
    if (!d) return;
    draftRef.current = null;
    dispatch(spreadsheetActions.setValue(d));
    dispatch(spreadsheetActions.stopEdit());
  };

  useEffect(() => {
    updateView();
    window.addEventListener('resize', updateView);
    return () => window.removeEventListener('resize', updateView);
  }, [updateView]);

  useEffect(() => {
    if (!drag && !formulaDrag) return;
    const up = (): void => {
      setDrag(false);
      const r = formulaDragRef.current;
      formulaDragRef.current = null;
      setFormulaDrag(null);
      if (!r) return;
      if (formulaClickRef.current?.(r)) return;
      const ev = new CustomEvent<FormulaReferenceEventDetail>(FORMULA_REFERENCE_EVENT, { cancelable: true, detail: { range: r } });
      window.dispatchEvent(ev);
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [drag, formulaDrag]);

  useEffect(() => {
    if (!resize) return;
    const move = (e: MouseEvent): void => {
      if (resize.kind === 'col') dispatch(spreadsheetActions.setColWidth({ col: resize.col, width: resize.w + e.clientX - resize.x }));
      else dispatch(spreadsheetActions.setRowHeight({ row: resize.row, height: resize.h + e.clientY - resize.y }));
    };
    const up = (): void => setResize(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [dispatch, resize]);

  const startFormula = (addr: CellAddress): void => {
    const r = { start: addr, end: addr };
    formulaDragRef.current = r;
    setFormulaDrag(r);
    setDrag(false);
  };

  const rangeForView = formulaDrag ?? selection;
  const range = rangeForView ? normRange(rangeForView) : null;
  const cutRange = clipboard?.cut ? normRange(clipboard.range) : null;
  const cells: React.ReactNode[] = [];

  for (let r = visibleRows.start; r <= visibleRows.end; r++) {
    for (let c = visibleCols.start; c <= visibleCols.end; c++) {
      const addr = { row: r, col: c };
      const k = cellName(addr);
      const cell = data.cells[k];
      const activeNow = active?.row === r && active?.col === c;
      const e = rangeEdges(range, addr);
      const ce = rangeEdges(cutRange, addr);
      const st = cell?.style;
      cells.push(
        <div
          key={k}
          className={`cell${activeNow ? ' selected' : ''}${e.inR && !activeNow ? ' in-range' : ''}${e.inR ? ' range-selected' : ''}${e.top ? ' selection-top' : ''}${e.right ? ' selection-right' : ''}${e.bottom ? ' selection-bottom' : ''}${e.left ? ' selection-left' : ''}${ce.inR ? ' cut-selected' : ''}${ce.top ? ' cut-top' : ''}${ce.right ? ' cut-right' : ''}${ce.bottom ? ' cut-bottom' : ''}${ce.left ? ' cut-left' : ''}`}
          style={{
            position: 'absolute',
            left: colOffsets[c] + RH_W,
            top: rowOffsets[r] + HD_H,
            width: colOffsets[c + 1] - colOffsets[c],
            height: rowOffsets[r + 1] - rowOffsets[r],
            fontWeight: st?.bold ? 700 : undefined,
            fontStyle: st?.italic ? 'italic' : undefined,
            textDecoration: st?.underline ? 'underline' : undefined,
            backgroundColor: st?.bgColor,
            color: st?.textColor,
            justifyContent: st?.align === 'center' ? 'center' : st?.align === 'right' ? 'flex-end' : 'flex-start',
            textAlign: st?.align,
          }}
          onMouseDown={(ev) => {
            if (ev.button === 2) return;
            if (ev.ctrlKey) {
              ev.preventDefault();
              startFormula(addr);
              return;
            }
            saveDrafter();
            if (ev.shiftKey) dispatch(spreadsheetActions.setSelectEnd(addr));
            else {
              dispatch(spreadsheetActions.setCell(addr));
              setDrag(true);
            }
          }}
          onMouseEnter={() => {
            if (formulaDragRef.current) {
              const next = { start: formulaDragRef.current.start, end: addr };
              formulaDragRef.current = next;
              setFormulaDrag(next);
            } else if (drag) dispatch(spreadsheetActions.setSelectEnd(addr));
          }}
          onDoubleClick={() => {
            dispatch(spreadsheetActions.setCell(addr));
            dispatch(spreadsheetActions.startEdit());
          }}
          onContextMenu={(ev) => {
            ev.preventDefault();
            if (!selection || !checkRange(selection, addr)) dispatch(spreadsheetActions.setCell(addr));
            dispatch(uiActions.openContextMenu({ x: ev.clientX, y: ev.clientY, target: { kind: 'cell', row: r, col: c } }));
          }}
        >
          {cell ? showValue(calc[k] ?? '', st?.numberFormat) : ''}
        </div>,
      );
    }
  }

  const colHeads: React.ReactNode[] = [];
  for (let c = visibleCols.start; c <= visibleCols.end; c++) {
    const inSel = !!range && c >= range.start.col && c <= range.end.col;
    colHeads.push(
      <div
        key={c}
        className={`h-cell${active?.col === c ? ' active-col-header' : ''}${inSel ? ' range-header' : ''}`}
        style={{ position: 'absolute', left: colOffsets[c] + RH_W, top: 0, width: colOffsets[c + 1] - colOffsets[c], height: HD_H }}
        onContextMenu={(e) => {
          e.preventDefault();
          dispatch(uiActions.openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'colHeader', col: c } }));
        }}
        onMouseDown={() => {
          saveDrafter();
          dispatch(spreadsheetActions.setCell({ row: 0, col: c }));
          dispatch(spreadsheetActions.setSelectEnd({ row: data.rows - 1, col: c }));
        }}
      >
        {colName(c)}
        <div
          className="resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setResize({ kind: 'col', col: c, x: e.clientX, w: colOffsets[c + 1] - colOffsets[c] });
          }}
        />
      </div>,
    );
  }

  const rowHeads: React.ReactNode[] = [];
  for (let r = visibleRows.start; r <= visibleRows.end; r++) {
    const inSel = !!range && r >= range.start.row && r <= range.end.row;
    rowHeads.push(
      <div
        key={r}
        className={`row-header-cell${active?.row === r ? ' active-row-header' : ''}${inSel ? ' range-header' : ''}`}
        style={{ position: 'absolute', left: 0, top: rowOffsets[r] + HD_H, width: RH_W, height: rowOffsets[r + 1] - rowOffsets[r] }}
        onContextMenu={(e) => {
          e.preventDefault();
          dispatch(uiActions.openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'rowHeader', row: r } }));
        }}
        onMouseDown={() => {
          saveDrafter();
          dispatch(spreadsheetActions.setCell({ row: r, col: 0 }));
          dispatch(spreadsheetActions.setSelectEnd({ row: r, col: data.cols - 1 }));
        }}
      >
        {r + 1}
        <div
          className="row-resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setResize({ kind: 'row', row: r, y: e.clientY, h: rowOffsets[r + 1] - rowOffsets[r] });
          }}
        />
      </div>,
    );
  }

  const preview = (() => {
    if (!clipboard?.cut || !cutPreview) return null;
    const src = normRange(clipboard.range);
    const endRow = Math.min(data.rows - 1, cutPreview.row + src.end.row - src.start.row);
    const endCol = Math.min(data.cols - 1, cutPreview.col + src.end.col - src.start.col);
    return (
      <div
        className="cut-preview"
        style={{
          left: colOffsets[cutPreview.col] + RH_W,
          top: rowOffsets[cutPreview.row] + HD_H,
          width: colOffsets[endCol + 1] - colOffsets[cutPreview.col],
          height: rowOffsets[endRow + 1] - rowOffsets[cutPreview.row],
        }}
      />
    );
  })();

  const editorPos = active
    ? {
        left: colOffsets[active.col],
        top: rowOffsets[active.row],
        width: colOffsets[active.col + 1] - colOffsets[active.col],
        height: rowOffsets[active.row + 1] - rowOffsets[active.row],
      }
    : null;

  return (
    <div ref={boxRef} className="spreadsheet-container" onScroll={updateView}>
      <div style={{ position: 'relative', width: colOffsets[data.cols] + RH_W, height: rowOffsets[data.rows] + HD_H }}>
        <div className="grid-corner" />
        <div className="col-header" style={{ width: colOffsets[data.cols] + RH_W, height: HD_H }}>
          {colHeads}
        </div>
        {rowHeads}
        {cells}
        {preview}
        {editing && active && editorPos && (
          <CellEditor
            addr={active}
            left={editorPos.left}
            top={editorPos.top}
            width={editorPos.width}
            height={editorPos.height}
            initial={data.cells[cellName(active)]?.raw ?? ''}
            saveDraft={(d) => {
              draftRef.current = d;
            }}
            formulaClick={(fn) => {
              formulaClickRef.current = fn;
            }}
          />
        )}
      </div>
      <Menu onCutPreview={setCutPreview} />
    </div>
  );
}
