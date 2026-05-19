import { describe, expect, it, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { register } from '@/redux/auth';
import documentsReducer, {
  createDoc,
  getDoc,
  getDocs,
  delDoc,
  copyDoc,
} from '../redux/documents';
import { api } from '@/services';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, documents: documentsReducer } });
}

describe('documents', () => {
  beforeEach(() => {
    api.reset();
  });

  it('creates and lists documents', async () => {
    const store = makeStore();
    await store.dispatch(register({ name: 'A', email: 'doc@x.ru', password: 'password1' }));
    await store.dispatch(createDoc({ title: 'Doc 1', rows: 10, cols: 5 }));
    await store.dispatch(getDocs());
    expect(store.getState().documents.list.length).toBe(1);
    expect(store.getState().documents.list[0].title).toBe('Doc 1');
  });

  it('user sees only own documents', async () => {
    const storeA = makeStore();
    await storeA.dispatch(register({ name: 'A', email: 'a@x.ru', password: 'password1' }));
    await storeA.dispatch(createDoc({ title: 'A doc', rows: 10, cols: 5 }));

    const storeB = makeStore();
    await storeB.dispatch(register({ name: 'B', email: 'b@x.ru', password: 'password1' }));
    await storeB.dispatch(getDocs());
    expect(storeB.getState().documents.list.length).toBe(0);
  });

  it('forbids access to another user document', async () => {
    const storeA = makeStore();
    await storeA.dispatch(register({ name: 'A', email: 'aa@x.ru', password: 'password1' }));
    const created = await storeA.dispatch(createDoc({ title: 'private', rows: 5, cols: 5 }));
    const id = (created.payload as { id: string }).id;

    const storeB = makeStore();
    await storeB.dispatch(register({ name: 'B', email: 'bb@x.ru', password: 'password1' }));
    await storeB.dispatch(getDoc(id));
    expect(storeB.getState().documents.activeStatus).toBe('forbidden');
  });

  it('deletes and duplicates documents', async () => {
    const store = makeStore();
    await store.dispatch(register({ name: 'A', email: 'cd@x.ru', password: 'password1' }));
    const c = await store.dispatch(createDoc({ title: 'Doc', rows: 5, cols: 5 }));
    const id = (c.payload as { id: string }).id;
    await store.dispatch(copyDoc(id));
    expect(store.getState().documents.list.length).toBe(2);
    await store.dispatch(delDoc(id));
    expect(store.getState().documents.list.length).toBe(1);
  });
});
