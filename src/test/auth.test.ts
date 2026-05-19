import { describe, expect, it, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { login, register, logout } from '../redux/auth';
import { api } from '@/services';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

function hashPw(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `h_${Math.abs(h).toString(36)}_${s.length}`;
}

describe('auth', () => {
  beforeEach(() => {
    api.reset();
  });

  it('register creates session', async () => {
    const store = makeStore();
    const r = await store.dispatch(register({ name: 'Ivan', email: 'a@b.ru', password: 'password1' }));
    expect(register.fulfilled.match(r)).toBe(true);
    expect(store.getState().auth.user?.email).toBe('a@b.ru');
    expect(store.getState().auth.tokens?.accessToken).toBeTruthy();
  });

  it('login rejects bad password', async () => {
    const store = makeStore();
    await store.dispatch(register({ name: 'A', email: 'x@y.ru', password: 'password1' }));
    await store.dispatch(logout());
    const r = await store.dispatch(login({ email: 'x@y.ru', password: 'wrong' }));
    expect(login.rejected.match(r)).toBe(true);
    expect(store.getState().auth.error).toBeTruthy();
  });

  it('login returns tokens with correct password', async () => {
    const store = makeStore();
    await store.dispatch(register({ name: 'A', email: 'q@w.ru', password: 'password1' }));
    await store.dispatch(logout());
    const r = await store.dispatch(login({ email: 'q@w.ru', password: 'password1' }));
    expect(login.fulfilled.match(r)).toBe(true);
  });

  it('normalizes email spaces and case on register/login', async () => {
    const store = makeStore();
    await store.dispatch(register({ name: 'A', email: '  USER@Mail.RU  ', password: 'password1' }));
    await store.dispatch(logout());
    const r = await store.dispatch(login({ email: ' user@mail.ru ', password: 'password1' }));
    expect(login.fulfilled.match(r)).toBe(true);
    expect(store.getState().auth.user?.email).toBe('user@mail.ru');
  });

  it('can login when old storage contains duplicate email rows', async () => {
    localStorage.setItem('spreadsheet_app_users', JSON.stringify([
      { id: 'old', name: 'Old', email: 'dupe@mail.ru', createdAt: new Date().toISOString() },
      { id: 'new', name: 'New', email: 'dupe@mail.ru', createdAt: new Date().toISOString() },
    ]));
    localStorage.setItem('spreadsheet_app_passwords', JSON.stringify([
      { userId: 'old', hash: hashPw('oldpass1') },
      { userId: 'new', hash: hashPw('password1') },
    ]));
    const store = makeStore();
    const r = await store.dispatch(login({ email: 'dupe@mail.ru', password: 'password1' }));
    expect(login.fulfilled.match(r)).toBe(true);
    expect(store.getState().auth.user?.id).toBe('new');
  });
});
