import { useEffect } from 'react';
import { configureStore, type AnyAction, type Middleware, type ThunkDispatch, combineReducers } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import authReducer from '@/redux/auth';
import documentsReducer, { saveDoc } from '@/redux/documents';
import spreadsheetReducer, { spreadsheetActions } from '@/redux/spreadsheet';
import uiReducer, { uiActions } from '@/redux/ui';

const SAVE_DELAY = 500;
const SAVE_EVENTS = new Set([
  'spreadsheet/setValue',
  'spreadsheet/clearCells',
  'spreadsheet/setStyle',
  'spreadsheet/addStr',
  'spreadsheet/delStr',
  'spreadsheet/addStlb',
  'spreadsheet/delStlb',
  'spreadsheet/pasteBufer',
  'spreadsheet/setColWidth',
  'spreadsheet/setRowHeight',
  'spreadsheet/undo',
  'spreadsheet/redo',
]);

export const autosave: Middleware = (api) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const save = async (): Promise<void> => {
    timer = null;
    const s = api.getState();
    const docId = s.documents.active?.id;
    if (!docId || !s.spreadsheet.dirty) return;
    api.dispatch(uiActions.setSaveStatus('saving'));
    const saveDispatch = api.dispatch as unknown as (action: ReturnType<typeof saveDoc>) => Promise<unknown>;
    const res = await saveDispatch(saveDoc({ id: docId, data: s.spreadsheet.data }));
    if (saveDoc.fulfilled.match(res)) {
      api.dispatch(uiActions.setSaveStatus('saved'));
      api.dispatch(spreadsheetActions.setSaved());
    } else {
      api.dispatch(uiActions.setSaveError('Save error'));
    }
  };

  return (next) => (action) => {
    const a = action as AnyAction;
    const result = next(action);
    if (typeof a.type === 'string' && SAVE_EVENTS.has(a.type)) {
      if (timer) clearTimeout(timer);
      api.dispatch(uiActions.setSaveStatus('saving'));
      timer = setTimeout(() => {
        void save();
      }, SAVE_DELAY);
    }
    if (a.type === 'autosave/flushNow') {
      if (timer) clearTimeout(timer);
      void save();
    }
    if (a.type === 'autosave/cancelPending') {
      if (timer) clearTimeout(timer);
      timer = null;
      api.dispatch(uiActions.setSaveStatus('idle'));
    }
    return result;
  };
};

export const saveNow = () => ({ type: 'autosave/flushNow' as const });
export const cancelAutosave = () => ({ type: 'autosave/cancelPending' as const });

const rootReducer = combineReducers({
  auth: authReducer,
  documents: documentsReducer,
  spreadsheet: spreadsheetReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<RootState, undefined, AnyAction>;

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault().concat(autosave),
  });
}

export const store = makeStore();
export type AppStore = ReturnType<typeof makeStore>;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export interface HotkeyHandler {
  combo: string;
  handler: (e: KeyboardEvent) => void;
  preventDefault?: boolean;
  allowInInputs?: boolean;
}

function matchCombo(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const want = {
    ctrl: parts.includes('ctrl') || parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts.filter((p) => !['ctrl', 'mod', 'shift', 'alt'].includes(p))[0] ?? '',
  };
  const ctrlPressed = e.ctrlKey || e.metaKey;
  if (want.ctrl !== ctrlPressed) return false;
  if (want.shift !== e.shiftKey) return false;
  if (want.alt !== e.altKey) return false;
  const key = e.key.toLowerCase();
  const code = e.code.toLowerCase();
  const wantedCode = want.key.length === 1 ? `key${want.key}` : want.key;
  return key === want.key || code === wantedCode;
}

export function useKeys(handlers: HotkeyHandler[], enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      const isEditable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      for (const h of handlers) {
        if (matchCombo(e, h.combo)) {
          if (isEditable && !h.allowInInputs) continue;
          if (h.preventDefault !== false) e.preventDefault();
          h.handler(e);
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [handlers, enabled]);
}

export function useExitWarn(active: boolean): void {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent): void => {
      if (!active) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
