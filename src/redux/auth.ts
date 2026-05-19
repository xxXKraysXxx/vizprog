import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthTokens, User } from '@/types';
import { authService } from '@/services';

const TOKEN_KEY = 'spreadsheet_app_session';

interface PersistedSession {
  refreshToken: string;
  user: User;
}

function loadLogin(): PersistedSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

function saveLogin(s: PersistedSession | null): void {
  if (typeof localStorage === 'undefined') return;
  if (s === null) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, JSON.stringify(s));
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  error: string | null;
}

const persisted = loadLogin();

const initialState: AuthState = {
  user: persisted?.user ?? null,
  tokens: persisted ? { accessToken: '', refreshToken: persisted.refreshToken } : null,
  status: persisted ? 'authenticated' : 'idle',
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authService.login(payload.email.trim(), payload.password);
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (payload: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authService.register(payload.name.trim(), payload.email.trim(), payload.password);
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const state = getState() as { auth: AuthState };
  const token = state.auth.tokens?.accessToken || state.auth.tokens?.refreshToken;
  if (token) {
    await authService.logout(token).catch(() => undefined);
  }
});

export const refresh = createAsyncThunk(
  'auth/refresh',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    if (!state.auth.tokens?.refreshToken) return rejectWithValue('Нет refresh-токена');
    try {
      return await authService.refresh(state.auth.tokens.refreshToken);
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (patch: { name?: string }, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    if (!state.auth.tokens) return rejectWithValue('Не авторизован');
    try {
      let accessToken = state.auth.tokens.accessToken;
      if (!accessToken) {
        const refreshed = await dispatch(refresh());
        if (!refresh.fulfilled.match(refreshed)) return rejectWithValue((refreshed.payload as string) ?? 'Не авторизован');
        accessToken = refreshed.payload.tokens.accessToken;
      }
      return await authService.updateProfile(accessToken, patch);
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (payload: { oldPassword: string; newPassword: string }, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    if (!state.auth.tokens) return rejectWithValue('Не авторизован');
    try {
      let accessToken = state.auth.tokens.accessToken;
      if (!accessToken) {
        const refreshed = await dispatch(refresh());
        if (!refresh.fulfilled.match(refreshed)) return rejectWithValue((refreshed.payload as string) ?? 'Не авторизован');
        accessToken = refreshed.payload.tokens.accessToken;
      }
      await authService.changePassword(accessToken, payload.oldPassword, payload.newPassword);
      return true;
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  },
);

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.status = 'authenticated';
      state.error = null;
      saveLogin({
        user: action.payload.user,
        refreshToken: action.payload.tokens.refreshToken,
      });
    },
    clearSession(state) {
      state.user = null;
      state.tokens = null;
      state.status = 'idle';
      state.error = null;
      saveLogin(null);
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.status = 'authenticated';
        saveLogin({
          user: action.payload.user,
          refreshToken: action.payload.tokens.refreshToken,
        });
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? action.error.message ?? 'Ошибка входа';
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.status = 'authenticated';
        saveLogin({
          user: action.payload.user,
          refreshToken: action.payload.tokens.refreshToken,
        });
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Ошибка регистрации';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.tokens = null;
        state.status = 'idle';
        saveLogin(null);
      })
      .addCase(refresh.fulfilled, (state, action) => {
        state.tokens = action.payload.tokens;
        if (state.user) {
          saveLogin({
            user: state.user,
            refreshToken: action.payload.tokens.refreshToken,
          });
        }
      })
      .addCase(refresh.rejected, (state) => {
        state.user = null;
        state.tokens = null;
        state.status = 'idle';
        saveLogin(null);
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        if (state.tokens) {
          saveLogin({
            user: action.payload,
            refreshToken: state.tokens.refreshToken,
          });
        }
      });
  },
});

export const { setSession, clearSession, clearAuthError } = slice.actions;
export default slice.reducer;
