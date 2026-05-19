import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { spreadsheetActions } from '@/redux/spreadsheet';
import { cellName, colName } from '@/utils';
import { FORMULA_REFERENCE_EVENT, type FormulaReferenceEventDetail } from '@/utils';
import { rangeText, insertFuncText, insertCellText } from '@/utils';
import type { CellAddress } from '@/types';
import { FormulaMenu } from './FormulaMenu';

export function Formula() {
  const dispatch = useAppDispatch();
  const active = useAppSelector((s) => s.spreadsheet.active);
  const cells = useAppSelector((s) => s.spreadsheet.data.cells);

  const key = active ? cellName(active) : '';
  const cell = key ? cells[key] : undefined;
  const [value, setValue] = useState(cell?.raw ?? '');
  const editTargetRef = useRef<CellAddress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(cell?.raw ?? '');
  const [functionMenu, setFunctionMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (editTargetRef.current) return;
    const next = cell?.raw ?? '';
    valueRef.current = next;
    setValue(next);
  }, [cell?.raw, key]);

  const addr = active ? `${colName(active.col)}${active.row + 1}` : '';

  useEffect(() => {
    const onFormulaReference = (event: Event): void => {
      const target = editTargetRef.current;
      const current = valueRef.current;
      if (!target || !current.trimStart().startsWith('=')) return;
      const input = inputRef.current;
      const { range } = (event as CustomEvent<FormulaReferenceEventDetail>).detail;
      const selectedStart = input?.selectionStart ?? current.length;
      const selectedEnd = input?.selectionEnd ?? selectedStart;
      const { value: next, cursor } = insertCellText(current, selectedStart, selectedEnd, rangeText(range));
      valueRef.current = next;
      setValue(next);
      event.preventDefault();
      requestAnimationFrame(() => {
        input?.focus();
        input?.setSelectionRange(cursor, cursor);
      });
    };
    window.addEventListener(FORMULA_REFERENCE_EVENT, onFormulaReference);
    return () => window.removeEventListener(FORMULA_REFERENCE_EVENT, onFormulaReference);
  }, []);

  const saveFormulaInput = (): void => {
    const target = editTargetRef.current;
    if (!target) return;
    const targetKey = cellName(target);
    if (valueRef.current !== (cells[targetKey]?.raw ?? '')) {
      dispatch(spreadsheetActions.setValue({ row: target.row, col: target.col, raw: valueRef.current }));
    }
    editTargetRef.current = null;
  };

  const insertFunction = (name: string): void => {
    const input = inputRef.current;
    const current = valueRef.current;
    const selectedStart = input?.selectionStart ?? current.length;
    const selectedEnd = input?.selectionEnd ?? selectedStart;
    const { value: next, cursor } = insertFuncText(current, selectedStart, selectedEnd, name);
    valueRef.current = next;
    setValue(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="formula-bar">
      <div className="addr">{addr}</div>
      <input
        ref={inputRef}
        value={value}
        disabled={!active}
        placeholder="Введите значение или формулу"
        onFocus={() => {
          editTargetRef.current = active;
        }}
        onChange={(e) => {
          valueRef.current = e.target.value;
          setValue(e.target.value);
        }}
        onContextMenu={(e) => {
          if (!valueRef.current.trimStart().startsWith('=')) return;
          e.preventDefault();
          setFunctionMenu({ x: e.clientX, y: e.clientY });
        }}
        onKeyDown={(e) => {
          if (!active && !editTargetRef.current) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            saveFormulaInput();
          } else if (e.key === 'Escape') {
            const target = editTargetRef.current ?? active;
            const next = target ? (cells[cellName(target)]?.raw ?? '') : '';
            valueRef.current = next;
            setValue(next);
            editTargetRef.current = null;
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={() => {
          saveFormulaInput();
        }}
      />
      {functionMenu && (
        <FormulaMenu
          x={functionMenu.x}
          y={functionMenu.y}
          onPick={insertFunction}
          onClose={() => setFunctionMenu(null)}
        />
      )}
    </div>
  );
}
