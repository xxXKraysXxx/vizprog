import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  clearActive,
  getDoc,
  saveDoc,
  renameDoc,
} from '@/redux/documents';
import { spreadsheetActions } from '@/redux/spreadsheet';
import { uiActions } from '@/redux/ui';
import { cancelAutosave, saveNow } from '@/store';
import { Spreadsheet } from '@components/Spreadsheet/Spreadsheet';
import { Formula } from '@components/Spreadsheet/Formula';
import { Toolbar } from '@components/Spreadsheet/Toolbar';
import { Modal } from '@components/Modal';
import { useKeys } from '@/store';
import { useExitWarn } from '@/store';
import { csvToSheet } from '@/utils';
import { cellName, normRange } from '@/utils';
import type { SpreadsheetData } from '@/types';

export function SpreadsheetPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const doc = useAppSelector((s) => s.documents.active);
  const status = useAppSelector((s) => s.documents.activeStatus);
  const documentError = useAppSelector((s) => s.documents.error);
  const data = useAppSelector((s) => s.spreadsheet.data);
  const dirty = useAppSelector((s) => s.spreadsheet.dirty);
  const selection = useAppSelector((s) => s.spreadsheet.selection);
  const active = useAppSelector((s) => s.spreadsheet.active);
  const editing = useAppSelector((s) => s.spreadsheet.editing);
  const modal = useAppSelector((s) => s.ui.modal);
  const loadedDocumentIdRef = useRef<string | null>(null);
  const forbiddenNotificationRef = useRef<string | null>(null);
  const activeStyle = active ? data.cells[cellName(active)]?.style : undefined;

  useEffect(() => {
    if (!documentId) return;
    loadedDocumentIdRef.current = null;
    void dispatch(getDoc(documentId));
    return () => {
      dispatch(clearActive());
    };
  }, [documentId, dispatch]);

  useLayoutEffect(() => {
    if (!doc || loadedDocumentIdRef.current === doc.id) return;
    loadedDocumentIdRef.current = doc.id;
    dispatch(spreadsheetActions.loadSheet(doc.data));
  }, [doc, dispatch]);

  useExitWarn(dirty);

  useEffect(() => {
    if (status !== 'forbidden') {
      forbiddenNotificationRef.current = null;
      return;
    }
    const key = documentId ?? 'unknown';
    if (forbiddenNotificationRef.current === key) return;
    forbiddenNotificationRef.current = key;
    dispatch(uiActions.addNotification({ type: 'error', message: 'Нет доступа к документу' }));
  }, [dispatch, documentId, status]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return dirty && currentLocation.pathname !== nextLocation.pathname;
  });

  const moveArrow = (dr: number, dc: number): void => {
    if (!active || editing) return;
    const row = Math.max(0, Math.min(data.rows - 1, active.row + dr));
    const col = Math.max(0, Math.min(data.cols - 1, active.col + dc));
    dispatch(spreadsheetActions.setCell({ row, col }));
  };

  const selectShiftom = (dr: number, dc: number): void => {
    if (!selection || editing) return;
    const row = Math.max(0, Math.min(data.rows - 1, selection.end.row + dr));
    const col = Math.max(0, Math.min(data.cols - 1, selection.end.col + dc));
    dispatch(spreadsheetActions.setSelectEnd({ row, col }));
  };

  useKeys(
    [
      {
        combo: 'mod+s',
        allowInInputs: true,
        handler: async () => {
          if (!doc) return;
          dispatch(uiActions.setSaveStatus('saving'));
          const r = await dispatch(saveDoc({ id: doc.id, data }));
          if (saveDoc.fulfilled.match(r)) {
            dispatch(uiActions.setSaveStatus('saved'));
            dispatch(spreadsheetActions.setSaved());
          }
        },
      },
      { combo: 'mod+z', handler: () => dispatch(spreadsheetActions.undo()) },
      { combo: 'mod+y', handler: () => dispatch(spreadsheetActions.redo()) },
      { combo: 'mod+shift+z', handler: () => dispatch(spreadsheetActions.redo()) },
      { combo: 'mod+a', handler: () => dispatch(spreadsheetActions.selectAllCells()) },
      {
        combo: 'mod+c',
        handler: () => {
          if (selection) dispatch(spreadsheetActions.setBufer({ range: selection, cut: false }));
        },
      },
      {
        combo: 'mod+x',
        handler: () => {
          if (selection) dispatch(spreadsheetActions.setBufer({ range: selection, cut: true }));
        },
      },
      {
        combo: 'mod+v',
        handler: () => {
          const target = selection ? normRange(selection).start : active;
          if (target) dispatch(spreadsheetActions.pasteBufer({ target }));
        },
      },
      {
        combo: 'delete',
        handler: () => {
          if (selection) dispatch(spreadsheetActions.clearCells(selection));
        },
      },
      {
        combo: 'backspace',
        handler: () => {
          if (selection) dispatch(spreadsheetActions.clearCells(selection));
        },
      },
      {
        combo: 'enter',
        handler: () => {
          if (active && !editing) dispatch(spreadsheetActions.startEdit());
        },
      },
      { combo: 'arrowup', handler: () => moveArrow(-1, 0) },
      { combo: 'arrowdown', handler: () => moveArrow(1, 0) },
      { combo: 'arrowleft', handler: () => moveArrow(0, -1) },
      { combo: 'arrowright', handler: () => moveArrow(0, 1) },
      { combo: 'tab', handler: () => moveArrow(0, 1) },
      { combo: 'shift+tab', handler: () => moveArrow(0, -1) },
      { combo: 'shift+arrowup', handler: () => selectShiftom(-1, 0) },
      { combo: 'shift+arrowdown', handler: () => selectShiftom(1, 0) },
      { combo: 'shift+arrowleft', handler: () => selectShiftom(0, -1) },
      { combo: 'shift+arrowright', handler: () => selectShiftom(0, 1) },
      { combo: 'escape', handler: () => dispatch(spreadsheetActions.stopEdit()) },
      {
        combo: 'mod+b',
        handler: () => selection && dispatch(spreadsheetActions.setStyle({ range: selection, style: { bold: !activeStyle?.bold } })),
      },
      {
        combo: 'mod+i',
        handler: () => selection && dispatch(spreadsheetActions.setStyle({ range: selection, style: { italic: !activeStyle?.italic } })),
      },
      {
        combo: 'mod+u',
        handler: () => selection && dispatch(spreadsheetActions.setStyle({ range: selection, style: { underline: !activeStyle?.underline } })),
      },
    ],
  );

  if (status === 'loading') return <div style={{ padding: 24 }}>Загрузка...</div>;
  if (status === 'forbidden') {
    return <Renav />;
  }
  if (status === 'notFound') return <div style={{ padding: 24 }}>Документ не найден. <Link to="/dashboard">К списку</Link></div>;
  if (status === 'error') {
    return (
      <div className="page-error">
        <h1>Не удалось открыть документ</h1>
        <p>{documentError ?? 'Произошла ошибка загрузки документа.'}</p>
        <Link to="/dashboard">Вернуться к документам</Link>
      </div>
    );
  }
  if (!doc) return null;

  return (
    <div className="spreadsheet-page">
      <div className="breadcrumbs">
        <Link to="/dashboard">Документы</Link>
        <span className="breadcrumb-separator">/</span>
        <Titleedit title={doc.title} id={doc.id} />
      </div>
      <Toolbar />
      <Formula />
      <Spreadsheet />

      {modal?.kind === 'importCsv' && <Importcsv />}

      {blocker.state === 'blocked' && (
        <Modal title="Несохранённые изменения" onClose={() => blocker.reset()}>
          <p>В документе есть несохранённые изменения. Покинуть страницу?</p>
          <div className="actions">
            <button onClick={() => blocker.reset()}>Остаться</button>
            <button
              className="primary"
              onClick={async () => {
                dispatch(saveNow());
                blocker.proceed();
              }}
            >
              Сохранить и выйти
            </button>
            <button
              className="danger"
              onClick={() => {
                dispatch(cancelAutosave());
                blocker.proceed();
              }}
            >
              Выйти без сохранения
            </button>
          </div>
        </Modal>
      )}

      <button
        style={{ display: 'none' }}
        onClick={() => navigate('/dashboard')}
      />
    </div>
  );
}

function Renav() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);
  return null;
}

function Titleedit({ title, id }: { title: string; id: string }) {
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  useEffect(() => setValue(title), [title]);

  if (!editing) {
    return (
      <span className="title-editor">
        <span className="document-title">{title}</span>
        <button type="button" className="rename-title-button" onClick={() => setEditing(true)}>
          Переименовать
        </button>
      </span>
    );
  }
  return (
    <input
      className="title-input"
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value.trim() && value !== title) dispatch(renameDoc({ id, title: value.trim() }));
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setValue(title);
          setEditing(false);
        }
      }}
    />
  );
}

function Importcsv() {
  const dispatch = useAppDispatch();
  const [csv, setCsv] = useState('');

  const onImport = (): void => {
    const result = csvToSheet(csv);
    const data: SpreadsheetData = {
      rows: Math.max(result.rows, 100),
      cols: Math.max(result.cols, 26),
      cells: result.cells,
      columnWidths: {},
      rowHeights: {},
    };
    dispatch(spreadsheetActions.loadSheet(data));
    dispatch(uiActions.closeModal());
    dispatch(uiActions.addNotification({ type: 'success', message: 'CSV импортирован' }));
  };

  return (
    <Modal title="Импорт CSV" onClose={() => dispatch(uiActions.closeModal())}>
      <div className="form-row">
        <label>Файл CSV</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setCsv(String(reader.result ?? ''));
            reader.readAsText(file);
          }}
        />
      </div>
      <div className="actions">
        <button onClick={() => dispatch(uiActions.closeModal())}>Отмена</button>
        <button className="primary" onClick={onImport} disabled={!csv}>
          Импортировать
        </button>
      </div>
    </Modal>
  );
}
