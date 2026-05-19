import type { AuthTokens, SpreadsheetData, SpreadsheetDocument, User } from './types';
import { uid } from './utils';

const PREFIX = 'spreadsheet_app_';
const KEYS = {
  users: `${PREFIX}users`,
  passwords: `${PREFIX}passwords`,
  documents: `${PREFIX}documents`,
  tokens: `${PREFIX}tokens`,
};

interface StoredToken {
  userId: string;
  expiresAt: number;
}

interface PasswordRow {
  userId: string;
  hash: string;
}

function read<T>(key: string, def: T): T {
  if (typeof localStorage === 'undefined') return def;
  const raw = localStorage.getItem(key);
  if (!raw) return def;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return def;
  }
}

function write<T>(key: string, val: T): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(val));
}

function hashPw(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `h_${Math.abs(h).toString(36)}_${s.length}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emptyTable(rows: number, cols: number): SpreadsheetData {
  return { rows, cols, cells: {}, columnWidths: {}, rowHeights: {} };
}

function getUsers(): User[] {
  return read<User[]>(KEYS.users, []);
}
function setUsers(v: User[]): void {
  write(KEYS.users, v);
}
function getPasswords(): PasswordRow[] {
  return read<PasswordRow[]>(KEYS.passwords, []);
}
function setPasswords(v: PasswordRow[]): void {
  write(KEYS.passwords, v);
}
function getDocs(): SpreadsheetDocument[] {
  return read<SpreadsheetDocument[]>(KEYS.documents, []);
}
function setDocs(v: SpreadsheetDocument[]): void {
  write(KEYS.documents, v);
}
function getTokens(): Record<string, StoredToken> {
  return read<Record<string, StoredToken>>(KEYS.tokens, {});
}
function setTokens(v: Record<string, StoredToken>): void {
  write(KEYS.tokens, v);
}

function b64(s: string): string {
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function makeToken(userId: string, ttlSec: number, kind: 'access' | 'refresh'): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify({ sub: userId, type: kind, exp }));
  const sign = b64(uid('sig_'));
  const t = `${head}.${body}.${sign}`;
  const all = getTokens();
  all[t] = { userId, expiresAt: Date.now() + ttlSec * 1000 };
  setTokens(all);
  return t;
}

function userIdFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const all = getTokens();
  const t = all[token];
  if (!t) return null;
  if (t.expiresAt < Date.now()) return null;
  return t.userId;
}

function delay(ms = 80): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function requireUser(token: string): string {
  const id = userIdFromToken(token);
  if (!id) throw new HttpError(401, 'No auth');
  return id;
}

export const api = {
  reset(): void {
    if (typeof localStorage === 'undefined') return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },

  async register(name: string, email: string, password: string) {
    await delay();
    const cleanEmail = normalizeEmail(email);
    const users = getUsers();
    if (users.some((u) => normalizeEmail(u.email) === cleanEmail)) throw new HttpError(409, 'Email already exists');
    const u: User = { id: uid('u_'), name: name.trim(), email: cleanEmail, createdAt: new Date().toISOString() };
    users.push(u);
    setUsers(users);
    const pwds = getPasswords();
    pwds.push({ userId: u.id, hash: hashPw(password) });
    setPasswords(pwds);
    const tokens: AuthTokens = {
      accessToken: makeToken(u.id, 60 * 15, 'access'),
      refreshToken: makeToken(u.id, 60 * 60 * 24 * 7, 'refresh'),
    };
    return { user: u, tokens };
  },

  async login(email: string, password: string) {
    await delay();
    const cleanEmail = normalizeEmail(email);
    const candidates = getUsers().filter((x) => normalizeEmail(x.email) === cleanEmail);
    const passwords = getPasswords();
    const u = candidates.find((candidate) => passwords.some((p) => p.userId === candidate.id && p.hash === hashPw(password)));
    if (!u) throw new HttpError(401, 'Bad email or password');
    const tokens: AuthTokens = {
      accessToken: makeToken(u.id, 60 * 15, 'access'),
      refreshToken: makeToken(u.id, 60 * 60 * 24 * 7, 'refresh'),
    };
    return { user: u, tokens };
  },

  async refresh(refreshToken: string) {
    await delay();
    const id = userIdFromToken(refreshToken);
    if (!id) throw new HttpError(401, 'Refresh token expired');
    return { tokens: { accessToken: makeToken(id, 60 * 15, 'access'), refreshToken: makeToken(id, 60 * 60 * 24 * 7, 'refresh') } };
  },

  async me(token: string): Promise<User> {
    await delay();
    const id = requireUser(token);
    const u = getUsers().find((x) => x.id === id);
    if (!u) throw new HttpError(404, 'User not found');
    return u;
  },

  async updateProfile(token: string, patch: { name?: string }): Promise<User> {
    await delay();
    const id = requireUser(token);
    const users = getUsers();
    const i = users.findIndex((x) => x.id === id);
    if (i < 0) throw new HttpError(404, 'User not found');
    users[i] = { ...users[i], ...patch };
    setUsers(users);
    return users[i];
  },

  async changePassword(token: string, oldPw: string, newPw: string): Promise<void> {
    await delay();
    const id = requireUser(token);
    const pwds = getPasswords();
    const row = pwds.find((p) => p.userId === id);
    if (!row || row.hash !== hashPw(oldPw)) throw new HttpError(400, 'Bad old password');
    row.hash = hashPw(newPw);
    setPasswords(pwds);
  },

  async logout(token: string): Promise<void> {
    await delay();
    const all = getTokens();
    delete all[token];
    setTokens(all);
  },

  async listDocuments(token: string): Promise<SpreadsheetDocument[]> {
    await delay();
    const id = requireUser(token);
    return getDocs().filter((d) => d.ownerId === id);
  },

  async getDocument(token: string, docId: string): Promise<SpreadsheetDocument> {
    await delay();
    const id = requireUser(token);
    const d = getDocs().find((x) => x.id === docId);
    if (!d) throw new HttpError(404, 'Document not found');
    if (d.ownerId !== id) throw new HttpError(403, 'No access');
    return d;
  },

  async createDocument(token: string, p: { title: string; rows: number; cols: number }): Promise<SpreadsheetDocument> {
    await delay();
    const id = requireUser(token);
    const now = new Date().toISOString();
    const d: SpreadsheetDocument = {
      id: uid('d_'),
      title: p.title,
      ownerId: id,
      createdAt: now,
      updatedAt: now,
      data: emptyTable(p.rows, p.cols),
    };
    const all = getDocs();
    all.push(d);
    setDocs(all);
    return d;
  },

  async updateDocument(token: string, docId: string, patch: Partial<Pick<SpreadsheetDocument, 'title' | 'data'>>): Promise<SpreadsheetDocument> {
    await delay();
    const id = requireUser(token);
    const all = getDocs();
    const i = all.findIndex((x) => x.id === docId);
    if (i < 0) throw new HttpError(404, 'Document not found');
    if (all[i].ownerId !== id) throw new HttpError(403, 'No access');
    all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
    setDocs(all);
    return all[i];
  },

  async deleteDocument(token: string, docId: string): Promise<void> {
    await delay();
    const id = requireUser(token);
    const all = getDocs();
    const i = all.findIndex((x) => x.id === docId);
    if (i < 0) throw new HttpError(404, 'Document not found');
    if (all[i].ownerId !== id) throw new HttpError(403, 'No access');
    all.splice(i, 1);
    setDocs(all);
  },

  async duplicateDocument(token: string, docId: string): Promise<SpreadsheetDocument> {
    await delay();
    const id = requireUser(token);
    const all = getDocs();
    const src = all.find((x) => x.id === docId);
    if (!src) throw new HttpError(404, 'Document not found');
    if (src.ownerId !== id) throw new HttpError(403, 'No access');
    const now = new Date().toISOString();
    const copy: SpreadsheetDocument = {
      ...src,
      id: uid('d_'),
      title: `${src.title} (copy)`,
      createdAt: now,
      updatedAt: now,
      data: JSON.parse(JSON.stringify(src.data)) as SpreadsheetData,
    };
    all.push(copy);
    setDocs(all);
    return copy;
  },
};

export const authService = {
  register(name: string, email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    return api.register(name, email, password);
  },
  login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    return api.login(email, password);
  },
  refresh(refreshToken: string): Promise<{ tokens: AuthTokens }> {
    return api.refresh(refreshToken);
  },
  me(accessToken: string): Promise<User> {
    return api.me(accessToken);
  },
  logout(accessToken: string): Promise<void> {
    return api.logout(accessToken);
  },
  updateProfile(accessToken: string, patch: { name?: string }): Promise<User> {
    return api.updateProfile(accessToken, patch);
  },
  changePassword(accessToken: string, oldPassword: string, newPassword: string): Promise<void> {
    return api.changePassword(accessToken, oldPassword, newPassword);
  },
};

export const documentService = {
  list(accessToken: string): Promise<SpreadsheetDocument[]> {
    return api.listDocuments(accessToken);
  },
  get(accessToken: string, id: string): Promise<SpreadsheetDocument> {
    return api.getDocument(accessToken, id);
  },
  create(accessToken: string, payload: { title: string; rows: number; cols: number }): Promise<SpreadsheetDocument> {
    return api.createDocument(accessToken, payload);
  },
  update(accessToken: string, id: string, patch: Partial<Pick<SpreadsheetDocument, 'title' | 'data'>>): Promise<SpreadsheetDocument> {
    return api.updateDocument(accessToken, id, patch);
  },
  delete(accessToken: string, id: string): Promise<void> {
    return api.deleteDocument(accessToken, id);
  },
  duplicate(accessToken: string, id: string): Promise<SpreadsheetDocument> {
    return api.duplicateDocument(accessToken, id);
  },
};
