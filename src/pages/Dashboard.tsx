import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  getDocs,
  createDoc,
  delDoc,
  copyDoc,
  renameDoc,
} from '@/redux/documents';
import { uiActions } from '@/redux/ui';
import { Modal } from '@components/Modal';
import { cellName } from '@/utils';
import type { Cell, SpreadsheetDocument } from '@/types';

function Prev({ doc }: { doc: SpreadsheetDocument }) {
  const items: Array<{ key: string; cell: Cell | undefined }> = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const key = cellName({ row: r, col: c });
      items.push({ key, cell: doc.data.cells[key] });
    }
  }
  return (
    <div className="preview">
      {items.map(({ key, cell }) => {
        const style = cell?.style;
        return (
          <div
            key={key}
            style={{
              backgroundColor: style?.bgColor,
              color: style?.textColor,
              fontWeight: style?.bold ? 700 : undefined,
              justifyContent: style?.align === 'center' ? 'center' : style?.align === 'right' ? 'flex-end' : 'flex-start',
              textAlign: style?.align,
            }}
          >
            {cell?.raw ?? ''}
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const docs = useAppSelector((s) => s.documents.list);
  const status = useAppSelector((s) => s.documents.listStatus);
  const error = useAppSelector((s) => s.documents.error);
  const modal = useAppSelector((s) => s.ui.modal);

  useEffect(() => {
    dispatch(getDocs());
  }, [dispatch]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const startRename = (doc: SpreadsheetDocument): void => {
    setEditingId(doc.id);
    setEditingTitle(doc.title);
  };

  const commitRename = (id: string): void => {
    if (editingTitle.trim()) {
      void dispatch(renameDoc({ id, title: editingTitle.trim() }));
    }
    setEditingId(null);
  };

  const onDelete = (doc: SpreadsheetDocument): void => {
    dispatch(uiActions.openModal({ kind: 'confirmDelete', documentId: doc.id, title: doc.title }));
  };

  return (
    <div className="dashboard">
      <h1>Мои документы</h1>
      <button className="primary" onClick={() => dispatch(uiActions.openModal({ kind: 'createDocument' }))}>
        + Новый документ
      </button>

      {status === 'loading' && <p style={{ marginTop: 16 }}>Загрузка...</p>}
      {status === 'error' && (
        <div className="page-error inline">
          <h2>Не удалось загрузить документы</h2>
          <p>{error ?? 'Произошла ошибка загрузки списка документов.'}</p>
          <button onClick={() => dispatch(getDocs())}>Повторить</button>
        </div>
      )}
      {status === 'ready' && docs.length === 0 && (
        <div className="empty-state">У вас пока нет документов. Создайте первый!</div>
      )}

      <div className="doc-grid">
        {docs.map((doc) => (
          <div key={doc.id} className="doc-card">
            <Prev doc={doc} />
            {editingId === doc.id ? (
              <input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => commitRename(doc.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(doc.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
              />
            ) : (
              <div className="title">
                <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
              </div>
            )}
            <div className="meta">
              Создан: {new Date(doc.createdAt).toLocaleDateString('ru-RU')}
              <br />
              Изменён: {new Date(doc.updatedAt).toLocaleDateString('ru-RU')}
            </div>
            <div className="actions">
              <button onClick={() => navigate(`/documents/${doc.id}`)}>Открыть</button>
              <button onClick={() => startRename(doc)}>Переименовать</button>
              <button onClick={() => dispatch(copyDoc(doc.id))}>Дублировать</button>
              <button className="danger" onClick={() => onDelete(doc)}>Удалить</button>
            </div>
          </div>
        ))}
      </div>

      {modal?.kind === 'createDocument' && <CreateDocument />}
      {modal?.kind === 'confirmDelete' && <ConfirmDelete id={modal.documentId} title={modal.title} />}
    </div>
  );
}

function CreateDocument() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [title, setTitle] = useState('Новый документ');
  const [rows, setRows] = useState(100);
  const [cols, setCols] = useState(26);

  const onCreate = async (): Promise<void> => {
    const r = await dispatch(createDoc({ title, rows, cols }));
    if (createDoc.fulfilled.match(r)) {
      dispatch(uiActions.closeModal());
      navigate(`/documents/${r.payload.id}`);
    }
  };

  return (
    <Modal title="Новый документ" onClose={() => dispatch(uiActions.closeModal())}>
      <div className="form-row">
        <label>Название</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="form-row">
        <label>Строк</label>
        <input type="number" min={1} max={10000} value={rows} onChange={(e) => setRows(Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label>Столбцов</label>
        <input type="number" min={1} max={702} value={cols} onChange={(e) => setCols(Number(e.target.value))} />
      </div>
      <div className="actions">
        <button onClick={() => dispatch(uiActions.closeModal())}>Отмена</button>
        <button className="primary" onClick={onCreate}>Создать</button>
      </div>
    </Modal>
  );
}

function ConfirmDelete({ id, title }: { id: string; title: string }) {
  const dispatch = useAppDispatch();

  const onConfirm = async (): Promise<void> => {
    await dispatch(delDoc(id));
    dispatch(uiActions.closeModal());
    dispatch(uiActions.addNotification({ type: 'success', message: `Документ «${title}» удалён` }));
  };

  return (
    <Modal title="Удалить документ" onClose={() => dispatch(uiActions.closeModal())}>
      <p>Удалить документ «{title}»? Это действие нельзя отменить.</p>
      <div className="actions">
        <button onClick={() => dispatch(uiActions.closeModal())}>Отмена</button>
        <button className="danger" onClick={onConfirm}>Удалить</button>
      </div>
    </Modal>
  );
}
