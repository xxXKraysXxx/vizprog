export type CellAlign = 'left' | 'center' | 'right';

export type CellNumberFormat = 'plain' | 'percent' | 'currency' | 'date';

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  bgColor?: string;
  textColor?: string;
  align?: CellAlign;
  numberFormat?: CellNumberFormat;
}

export interface Cell {
  raw: string;
  style?: CellStyle;
}

export type CellsMap = Record<string, Cell>;

export interface SpreadsheetData {
  rows: number;
  cols: number;
  cells: CellsMap;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  columnLabels?: Record<number, string>;
}

export interface DocumentMeta {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpreadsheetDocument extends DocumentMeta {
  data: SpreadsheetData;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CellAddress {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellAddress;
  end: CellAddress;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}
