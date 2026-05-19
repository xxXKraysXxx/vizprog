import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { spreadsheetActions } from '@/redux/spreadsheet';
import { uiActions } from '@/redux/ui';
import { cellName } from '@/utils';
import type { CellAlign, CellNumberFormat, CellRange, CellStyle } from '@/types';
import { sheetToCsv, download } from '@/utils';

function copyRange(range: CellRange): CellRange {
  return {
    start: { ...range.start },
    end: { ...range.end },
  };
}

interface ColorControlProps {
  label: string;
  title: string;
  value: string | undefined;
  autoValue: string;
  selection: CellRange | null;
  onPreview: (range: CellRange, value: string | undefined) => void;
  onCommit: () => void;
}

function ColorControl({ label, title, value, autoValue, selection, onPreview, onCommit }: ColorControlProps) {
  const [draft, setDraft] = useState(value ?? autoValue);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const rootRef = useRef<HTMLSpanElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<CellRange | null>(null);
  const lastPreviewAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const latestRef = useRef(draft);

  useEffect(() => {
    if (!open) setDraft(value ?? autoValue);
  }, [autoValue, open, value]);

  useEffect(() => {
    latestRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (!open || rootRef.current?.contains(target) || dropRef.current?.contains(target)) return;
      applyColor(latestRef.current);
      onCommit();
      setOpen(false);
      rangeRef.current = null;
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  });

  useEffect(() => {
    if (!open) return;
    const move = (): void => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setPos({ left: rect.left, top: rect.bottom + 4 });
    };
    move();
    window.addEventListener('resize', move);
    window.addEventListener('scroll', move, true);
    return () => {
      window.removeEventListener('resize', move);
      window.removeEventListener('scroll', move, true);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const saveEditRange = (): CellRange | null => {
    if (!rangeRef.current && selection) rangeRef.current = copyRange(selection);
    return rangeRef.current;
  };

  const applyColor = (next: string | undefined): void => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const range = saveEditRange();
    if (!range) return;
    lastPreviewAtRef.current = Date.now();
    onPreview(range, next);
  };

  const delayPreview = (next: string): void => {
    latestRef.current = next;
    const elapsed = Date.now() - lastPreviewAtRef.current;
    if (elapsed >= 100) {
      applyColor(next);
      return;
    }
    if (timerRef.current) return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      applyColor(latestRef.current);
    }, 100 - elapsed);
  };

  const saveColor = (): void => {
    applyColor(latestRef.current);
    onCommit();
    setOpen(false);
    rangeRef.current = null;
  };

  return (
    <span className="color-control" ref={rootRef}>
      <button
        type="button"
        className="color-trigger"
        title={title}
        onMouseDown={() => {
          rangeRef.current = selection ? copyRange(selection) : null;
        }}
        onClick={() => {
          const rect = rootRef.current?.getBoundingClientRect();
          if (rect) setPos({ left: rect.left, top: rect.bottom + 4 });
          setOpen((current) => !current);
        }}
      >
        <span className="color-label">{label}</span>
        <span className="color-swatch" style={{ backgroundColor: value ?? autoValue }} />
      </button>
      {open && createPortal(
        <div ref={dropRef} className="color-dropdown" style={{ position: 'fixed', left: pos.left, top: pos.top }}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setDraft(autoValue);
              applyColor(undefined);
              onCommit();
              setOpen(false);
              rangeRef.current = null;
            }}
          >
            Авто
          </button>
          <input
            type="color"
            value={draft}
            onFocus={saveEditRange}
            onChange={(e) => {
              setDraft(e.target.value);
              delayPreview(e.target.value);
            }}
            onBlur={saveColor}
          />
        </div>,
        document.body,
      )}
    </span>
  );
}

export function Toolbar() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const selection = useAppSelector((s) => s.spreadsheet.selection);
  const active = useAppSelector((s) => s.spreadsheet.active);
  const cells = useAppSelector((s) => s.spreadsheet.data.cells);
  const data = useAppSelector((s) => s.spreadsheet.data);
  const doc = useAppSelector((s) => s.documents.active);

  const activeStyle = active ? cells[cellName(active)]?.style : undefined;

  const apply = (style: Partial<CellStyle>): void => {
    if (!selection) return;
    dispatch(spreadsheetActions.setStyle({ range: selection, style }));
  };

  const previewTextColor = (range: CellRange, textColor: string | undefined): void => {
    dispatch(spreadsheetActions.showStyle({ range, style: { textColor } }));
  };

  const previewBgColor = (range: CellRange, bgColor: string | undefined): void => {
    dispatch(spreadsheetActions.showStyle({ range, style: { bgColor } }));
  };

  const commitPreview = (): void => {
    dispatch(spreadsheetActions.saveStylePreview());
  };

  const setAlign = (align: CellAlign): void => apply({ align });
  const setFormat = (numberFormat: CellNumberFormat): void => apply({ numberFormat });

  const exportCsv = (): void => {
    const csv = sheetToCsv(data);
    download(csv, `${doc?.title ?? 'spreadsheet'}.csv`, 'text/csv;charset=utf-8');
  };

  const exportJson = (): void => {
    const json = JSON.stringify(data, null, 2);
    download(json, `${doc?.title ?? 'spreadsheet'}.json`, 'application/json');
  };

  return (
    <div className="toolbar">
      <div className="group">
        <button
          title="Жирный (Ctrl+B)"
          className={activeStyle?.bold ? 'active' : ''}
          onClick={() => apply({ bold: !activeStyle?.bold })}
        >
          <b>B</b>
        </button>
        <button
          title="Курсив (Ctrl+I)"
          className={activeStyle?.italic ? 'active' : ''}
          onClick={() => apply({ italic: !activeStyle?.italic })}
        >
          <i>I</i>
        </button>
        <button
          title="Подчёркивание (Ctrl+U)"
          className={activeStyle?.underline ? 'active' : ''}
          onClick={() => apply({ underline: !activeStyle?.underline })}
        >
          <u>U</u>
        </button>
      </div>

      <div className="group">
        <ColorControl
          label="A"
          title="Цвет текста"
          value={activeStyle?.textColor}
          autoValue={theme === 'dark' ? '#e6edf3' : '#1f2328'}
          selection={selection}
          onPreview={previewTextColor}
          onCommit={commitPreview}
        />
        <ColorControl
          label="■"
          title="Цвет фона"
          value={activeStyle?.bgColor}
          autoValue={theme === 'dark' ? '#0d1117' : '#ffffff'}
          selection={selection}
          onPreview={previewBgColor}
          onCommit={commitPreview}
        />
      </div>

      <div className="group">
        <button title="По левому краю" className={activeStyle?.align === 'left' ? 'active' : ''} onClick={() => setAlign('left')}>
          <span className="align-icon align-left" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <button title="По центру" className={activeStyle?.align === 'center' ? 'active' : ''} onClick={() => setAlign('center')}>
          <span className="align-icon align-center" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <button title="По правому краю" className={activeStyle?.align === 'right' ? 'active' : ''} onClick={() => setAlign('right')}>
          <span className="align-icon align-right" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <div className="group">
        <select
          value={activeStyle?.numberFormat ?? 'plain'}
          onChange={(e) => setFormat(e.target.value as CellNumberFormat)}
          title="Формат числа"
        >
          <option value="plain">Обычный</option>
          <option value="percent">Процент</option>
          <option value="currency">Валюта</option>
          <option value="date">Дата</option>
        </select>
      </div>

      <div className="group">
        <button onClick={() => dispatch(spreadsheetActions.undo())} title="Undo (Ctrl+Z)">↶</button>
        <button onClick={() => dispatch(spreadsheetActions.redo())} title="Redo (Ctrl+Y)">↷</button>
      </div>

      <div className="group">
        <button onClick={exportCsv}>Экспорт CSV</button>
        <button onClick={exportJson}>Экспорт JSON</button>
        <button onClick={() => dispatch(uiActions.openModal({ kind: 'importCsv' }))}>Импорт CSV</button>
      </div>
    </div>
  );
}
