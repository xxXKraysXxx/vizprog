export type Transform<T, R = T[]> = (data: T[]) => R;

export interface QueryStage { readonly stage: string }
export interface WhereStage extends QueryStage { readonly stage: 'where' }
export interface GroupByStage extends QueryStage { readonly stage: 'groupBy' }
export interface HavingStage extends QueryStage { readonly stage: 'having' }
export interface SortStage extends QueryStage { readonly stage: 'sort' }

export type Where<T> = <K extends keyof T>(key: K, value: T[K]) => Transform<T> & WhereStage;
export type Sort<T> = <K extends keyof T>(key: K) => Transform<T> & SortStage;

export type Group<T, K extends keyof T> = { key: T[K]; items: T[] };
export type GroupBy<T> = <K extends keyof T>(key: K) => Transform<T, Group<T, K>[]> & GroupByStage;
export type Having<T, K extends keyof T = any> =
  (predicate: (group: Group<T, K>) => boolean) =>
    Transform<Group<T, K>, Group<T, K>[]> & HavingStage;

export type ValidateOrder<T extends any[]> =
  T extends [] ? { valid: true } :
  T extends [infer F, ...infer R] ?
    F extends WhereStage ? ValidateWhere<R> :
    F extends GroupByStage ? ValidateGroupBy<R> :
    F extends HavingStage ? { valid: false } :
    F extends SortStage ? ValidateSort<R> :
    { valid: false } :
  { valid: true };

export type ValidateWhere<R extends any[]> =
  R extends [] ? { valid: true } :
  R extends [infer N, ...infer T] ?
    N extends WhereStage ? ValidateWhere<T> :
    N extends GroupByStage ? ValidateGroupBy<T> :
    N extends HavingStage ? { valid: false } :
    N extends SortStage ? ValidateSort<T> :
    { valid: false } :
  { valid: true };

export type ValidateGroupBy<R extends any[]> =
  R extends [] ? { valid: true } :
  R extends [infer N, ...infer T] ?
    N extends GroupByStage ? ValidateGroupBy<T> :
    N extends HavingStage ? ValidateHaving<T> :
    N extends SortStage ? ValidateSort<T> :
    { valid: false } :
  { valid: true };

export type ValidateHaving<R extends any[]> =
  R extends [] ? { valid: true } :
  R extends [infer N, ...infer T] ?
    N extends HavingStage ? ValidateHaving<T> :
    N extends SortStage ? ValidateSort<T> :
    { valid: false } :
  { valid: true };

export type ValidateSort<R extends any[]> =
  R extends [] ? { valid: true } :
  R extends [infer N, ...infer T] ?
    N extends SortStage ? ValidateSort<T> :
    { valid: false } :
  { valid: true };

type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

export function query<
  Steps extends Array<((data: any) => any) & QueryStage>
>(
  ...steps: Steps
): ValidateOrder<Steps> extends { valid: true }
  ? (data: Parameters<Steps[0]>[0]) => ReturnType<Last<Steps>>
  : never {

  return ((data: any[]) => {
    let r: any = data;
    for (const s of steps) r = s(r);
    return r;
  }) as any;
}

export function where<T>(): Where<T> {
  return <K extends keyof T>(key: K, value: T[K]) =>
    Object.assign((d: T[]) => d.filter(x => x[key] === value), { stage: 'where' as const });
}

export function sort<T>(): Sort<T> {
  return <K extends keyof T>(key: K) =>
    Object.assign((d: T[]) => [...d].sort((a, b) =>
      a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
    ), { stage: 'sort' as const });
}

export function groupBy<T>(): GroupBy<T> {
  return <K extends keyof T>(key: K) =>
    Object.assign((d: T[]) => {
      const m = new Map<T[K], Group<T, K>>();
      for (const x of d) {
        if (!m.has(x[key])) m.set(x[key], { key: x[key], items: [] });
        m.get(x[key])!.items.push(x);
      }
      return [...m.values()];
    }, { stage: 'groupBy' as const });
}

export function having<T, K extends keyof T>(): Having<T, K> {
  return pred =>
    Object.assign((g: Group<T, K>[]) => g.filter(pred), { stage: 'having' as const });
}

type User = {
  id: number;
  name: string;
  surname: string;
  age: number;
  city: string;
};

const users: User[] = [
  { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
  { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
  { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
  { id: 4, name: "Mike", surname: "Doe", age: 35, city: "LA" },
];

const search = query(
  where<User>()("name", "John"),
  where<User>()("surname", "Doe"),
  sort<User>()("age")
);

console.log("Фильтрация и сортировка:", search(users));

const groupAndFilter = query(
  groupBy<User>()("city"),
  having<User, 'city'>()(g => g.items.length > 1),
);

console.log("Группировка и фильтр:", groupAndFilter(users));

const pipeline = query(
  where<User>()("surname", "Doe"),
  groupBy<User>()("city"),
  having<User, 'city'>()(g => g.items.some(u => u.age > 34))
);

console.log("Комбинированный конвейер:", pipeline(users));


export type DeepReadonly<T> =
  T extends (...args: any[]) => any
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

type Example = {
  a: number;
  b: { c: string; d: { e: boolean } };
  f: Array<{ g: number }>;
};

const deepReadonlyValue: DeepReadonly<Example> = {
  a: 1,
  b: { c: "bruh", d: { e: true } },
  f: [{ g: 10 }]
};

console.log("DeepReadonly:", deepReadonlyValue);


export type PickedByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};


type OnlyNumbers = PickedByType<User, number>;

const onlyNumbersValue: OnlyNumbers = {
  id: 1,
  age: 30
};

console.log("PickedByType<number>:", onlyNumbersValue);


export type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}`]:
    (event: T[K]) => void;
};

type Events = {
  click: MouseEvent;
  change: InputEvent;
};

const handlers: EventHandlers<Events> = {
  onClick: e => console.log("click event:", e),
  onChange: e => console.log("change event:", e)
};

console.log("EventHandlers keys:", Object.keys(handlers));