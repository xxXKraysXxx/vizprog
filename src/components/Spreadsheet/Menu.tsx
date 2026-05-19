import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { uiActions } from '@/redux/ui';
import { spreadsheetActions } from '@/redux/spreadsheet';
import { normRange, inRange } from '@/utils';
import type { CellAddress } from '@/types';

interface Props {
  onCutPreview: (target: CellAddress | null) => void;
}

export function Menu({ onCutPreview }: Props) {
  const menu = useAppSelector((s) => s.ui.contextMenu);
  const selection = useAppSelector((s) => s.spreadsheet.selection);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!menu) return;
    const close = (): void => {
      dispatch(uiActions.closeContextMenu());
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu, dispatch]);

  if (!menu) return null;

  const items: Array<{ label: string; action: () => void }> = [];
  if (menu.target.kind === 'cell') {
    const row = menu.target.row;
    const col = menu.target.col;
    const clicked = { row, col };
    const range = selection && inRange(selection, clicked) ? normRange(selection) : { start: clicked, end: clicked };
    const multi = range.start.row !== range.end.row || range.start.col !== range.end.col;
    items.push({ label: multi ? 'Удалить диапазон' : 'Удалить ячейку', action: () => dispatch(spreadsheetActions.clearCells(range)) });
    items.push({
      label: multi ? 'Вырезать диапазон' : 'Вырезать ячейку',
      action: () => {
        onCutPreview(null);
        dispatch(spreadsheetActions.setBufer({ range, cut: true }));
      },
    });
    items.push({
      label: multi ? 'Скопировать диапазон' : 'Скопировать ячейку',
      action: () => {
        onCutPreview(null);
        dispatch(spreadsheetActions.setBufer({ range, cut: false }));
      },
    });
    items.push({
      label: 'Вставить в ячейку',
      action: () => {
        onCutPreview(null);
        dispatch(spreadsheetActions.pasteBufer({ target: range.start }));
      },
    });
  }
  if (menu.target.kind === 'rowHeader') {
    const row = menu.target.row;
    items.push({ label: 'Вставить строку выше', action: () => dispatch(spreadsheetActions.addStr({ at: row })) });
    items.push({ label: 'Вставить строку ниже', action: () => dispatch(spreadsheetActions.addStr({ at: row + 1 })) });
    items.push({ label: 'Удалить строку', action: () => dispatch(spreadsheetActions.delStr({ at: row })) });
  }
  if (menu.target.kind === 'colHeader') {
    const col = menu.target.col;
    items.push({ label: 'Вставить столбец слева', action: () => dispatch(spreadsheetActions.addStlb({ at: col })) });
    items.push({ label: 'Вставить столбец справа', action: () => dispatch(spreadsheetActions.addStlb({ at: col + 1 })) });
    items.push({ label: 'Удалить столбец', action: () => dispatch(spreadsheetActions.delStlb({ at: col })) });
  }

  return (
    <div className="context-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
      {items.map((item) => (
        <button
          key={item.label}
          onMouseEnter={() => {
            if (menu.target.kind === 'cell' && item.label === 'Вставить в ячейку') {
              const clicked = { row: menu.target.row, col: menu.target.col };
              const range = selection && inRange(selection, clicked) ? normRange(selection) : { start: clicked, end: clicked };
              onCutPreview(range.start);
            } else {
              onCutPreview(null);
            }
          }}
          onClick={() => {
            item.action();
            dispatch(uiActions.closeContextMenu());
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
