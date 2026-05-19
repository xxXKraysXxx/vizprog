import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Notification, SaveStatus } from '@/types';
import { uid } from '@/utils';

export type ThemeMode = 'light' | 'dark';

export type ModalKind =
  | { kind: 'createDocument' }
  | { kind: 'confirmDelete'; documentId: string; title: string }
  | { kind: 'importCsv' }
  | { kind: 'changePassword' };

export interface UiState {
  modal: ModalKind | null;
  theme: ThemeMode;
  saveStatus: SaveStatus;
  saveError: string | null;
  notifications: Notification[];
  contextMenu: {
    x: number;
    y: number;
    target: { kind: 'cell'; row: number; col: number } | { kind: 'colHeader'; col: number } | { kind: 'rowHeader'; row: number };
  } | null;
}

function getTem(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const initialState: UiState = {
  modal: null,
  theme: getTem(),
  saveStatus: 'idle',
  saveError: null,
  notifications: [],
  contextMenu: null,
};

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openModal(state, action: PayloadAction<ModalKind>) {
      state.modal = action.payload;
    },
    closeModal(state) {
      state.modal = null;
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    setSaveStatus(state, action: PayloadAction<SaveStatus>) {
      state.saveStatus = action.payload;
      if (action.payload !== 'error') state.saveError = null;
    },
    setSaveError(state, action: PayloadAction<string>) {
      state.saveStatus = 'error';
      state.saveError = action.payload;
    },
    addNotification(state, action: PayloadAction<{ type: Notification['type']; message: string }>) {
      state.notifications.push({ id: uid('n_'), ...action.payload });
    },
    dismissNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    openContextMenu(state, action: PayloadAction<NonNullable<UiState['contextMenu']>>) {
      state.contextMenu = action.payload;
    },
    closeContextMenu(state) {
      state.contextMenu = null;
    },
  },
});

export const uiActions = slice.actions;
export default slice.reducer;
