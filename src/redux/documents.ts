import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { SpreadsheetData, SpreadsheetDocument } from '@/types';
import { documentService } from '@/services';
import { refresh, type AuthState } from '@/redux/auth';

export interface DocumentsState {
  list: SpreadsheetDocument[];
  active: SpreadsheetDocument | null;
  listStatus: 'idle' | 'loading' | 'ready' | 'error';
  activeStatus: 'idle' | 'loading' | 'ready' | 'error' | 'forbidden' | 'notFound';
  error: string | null;
}

const initialState: DocumentsState = {
  list: [],
  active: null,
  listStatus: 'idle',
  activeStatus: 'idle',
  error: null,
};

function getToken(state: { auth: AuthState }): string {
  if (!state.auth.tokens) throw new Error('Не авторизован');
  return state.auth.tokens.accessToken;
}

function isNoAuth(e: unknown): boolean {
  const err = e as Error & { status?: number };
  return err.status === 401 || err.message === 'Не авторизован';
}

export const getDocs = createAsyncThunk(
  'documents/list',
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const token = getToken(getState() as { auth: AuthState });
      return await documentService.list(token);
    } catch (e) {
      if (isNoAuth(e)) {
        const refreshed = await dispatch(refresh());
        if (refresh.fulfilled.match(refreshed)) {
          return await documentService.list(refreshed.payload.tokens.accessToken);
        }
      }
      return rejectWithValue((e as Error).message);
    }
  },
);

export const getDoc = createAsyncThunk(
  'documents/get',
  async (id: string, { dispatch, getState, rejectWithValue }) => {
    try {
      const token = getToken(getState() as { auth: AuthState });
      return await documentService.get(token, id);
    } catch (e) {
      if (isNoAuth(e)) {
        const refreshed = await dispatch(refresh());
        if (refresh.fulfilled.match(refreshed)) {
          return await documentService.get(refreshed.payload.tokens.accessToken, id);
        }
      }
      const err = e as Error & { status?: number };
      if (err.status === 403 || err.message.includes('Нет доступа')) return rejectWithValue('forbidden');
      if (err.status === 404 || err.message.includes('не найден')) return rejectWithValue('notFound');
      return rejectWithValue((e as Error).message);
    }
  },
);

export const createDoc = createAsyncThunk(
  'documents/create',
  async (payload: { title: string; rows: number; cols: number }, { dispatch, getState, rejectWithValue }) => {
    try {
      const token = getToken(getState() as { auth: AuthState });
      return await documentService.create(token, payload);
    } catch (e) {
      if (isNoAuth(e)) {
        const refreshed = await dispatch(refresh());
        if (refresh.fulfilled.match(refreshed)) {
          return await documentService.create(refreshed.payload.tokens.accessToken, payload);
        }
      }
      return rejectWithValue((e as Error).message);
    }
  },
);

export const renameDoc = createAsyncThunk(
  'documents/updateTitle',
  async (payload: { id: string; title: string }, { dispatch, getState, rejectWithValue }) => {
    try {
      const token = getToken(getState() as { auth: AuthState });
      return await documentService.update(token, payload.id, { title: payload.title });
    } catch (e) {
      if (isNoAuth(e)) {
        const refreshed = await dispatch(refresh());
        if (refresh.fulfilled.match(refreshed)) {
          return await documentService.update(refreshed.payload.tokens.accessToken, payload.id, { title: payload.title });
        }
      }
      return rejectWithValue((e as Error).message);
    }
  },
);

export const saveDoc = createAsyncThunk(
  'documents/saveData',
  async (payload: { id: string; data: SpreadsheetData }, { dispatch, getState, rejectWithValue }) => {
    try {
      const token = getToken(getState() as { auth: AuthState });
      return await documentService.update(token, payload.id, { data: payload.data });
    } catch (e) {
      if (isNoAuth(e)) {
        const refreshed = await dispatch(refresh());
        if (refresh.fulfilled.match(refreshed)) {
          return await documentService.update(refreshed.payload.tokens.accessToken, payload.id, { data: payload.data });
        }
      }
      return rejectWithValue((e as Error).message);
    }
  },
);

export const delDoc = createAsyncThunk(
  'documents/delete',
  async (id: string, { dispatch, getState, rejectWithValue }) => {
    try {
      const token = getToken(getState() as { auth: AuthState });
      await documentService.delete(token, id);
      return id;
    } catch (e) {
      if (isNoAuth(e)) {
        const refreshed = await dispatch(refresh());
        if (refresh.fulfilled.match(refreshed)) {
          await documentService.delete(refreshed.payload.tokens.accessToken, id);
          return id;
        }
      }
      return rejectWithValue((e as Error).message);
    }
  },
);

export const copyDoc = createAsyncThunk(
  'documents/duplicate',
  async (id: string, { dispatch, getState, rejectWithValue }) => {
    try {
      const token = getToken(getState() as { auth: AuthState });
      return await documentService.duplicate(token, id);
    } catch (e) {
      if (isNoAuth(e)) {
        const refreshed = await dispatch(refresh());
        if (refresh.fulfilled.match(refreshed)) {
          return await documentService.duplicate(refreshed.payload.tokens.accessToken, id);
        }
      }
      return rejectWithValue((e as Error).message);
    }
  },
);

const slice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    clearActive(state) {
      state.active = null;
      state.activeStatus = 'idle';
    },
    setActiveData(state, action: PayloadAction<SpreadsheetData>) {
      if (state.active) {
        state.active.data = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getDocs.pending, (state) => {
        state.listStatus = 'loading';
        state.error = null;
      })
      .addCase(getDocs.fulfilled, (state, action) => {
        state.list = action.payload;
        state.listStatus = 'ready';
      })
      .addCase(getDocs.rejected, (state, action) => {
        state.listStatus = 'error';
        state.error = (action.payload as string) ?? 'Ошибка загрузки';
      })
      .addCase(getDoc.pending, (state) => {
        state.active = null;
        state.activeStatus = 'loading';
        state.error = null;
      })
      .addCase(getDoc.fulfilled, (state, action) => {
        state.active = action.payload;
        state.activeStatus = 'ready';
      })
      .addCase(getDoc.rejected, (state, action) => {
        const code = action.payload as string;
        if (code === 'forbidden') state.activeStatus = 'forbidden';
        else if (code === 'notFound') state.activeStatus = 'notFound';
        else state.activeStatus = 'error';
        state.error = code ?? 'Ошибка';
      })
      .addCase(createDoc.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(renameDoc.fulfilled, (state, action) => {
        const idx = state.list.findIndex((d) => d.id === action.payload.id);
        if (idx >= 0) state.list[idx] = action.payload;
        if (state.active?.id === action.payload.id) state.active = action.payload;
      })
      .addCase(saveDoc.fulfilled, (state, action) => {
        const idx = state.list.findIndex((d) => d.id === action.payload.id);
        if (idx >= 0) state.list[idx] = action.payload;
        if (state.active?.id === action.payload.id) {
          state.active = action.payload;
        }
      })
      .addCase(delDoc.fulfilled, (state, action) => {
        state.list = state.list.filter((d) => d.id !== action.payload);
        if (state.active?.id === action.payload) state.active = null;
      })
      .addCase(copyDoc.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export const { clearActive, setActiveData } = slice.actions;
export default slice.reducer;
