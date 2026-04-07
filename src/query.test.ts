import { describe, it, expect, expectTypeOf } from 'vitest';
import { query, where, sort, groupBy, having, type Group, DeepReadonly, PickedByType, EventHandlers } from './query';

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
    { id: 4, name: "Mike", surname: "Doe", age: 35, city: "LA" }
];

describe('query: where + sort', () => {
    it('filters by name and surname and sorts by age', () => {
        const search = query(
            where<User>()("name", "John"),
            where<User>()("surname", "Doe"),
            sort<User>()("age")
        );

        const result = search(users);

        expect(result).toEqual([
            { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
            { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
            { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" }
        ]);
    });
});

describe('query: groupBy + having', () => {
    it('groups by city and keeps only groups with more than 1 item', () => {
        const groupAndFilter = query(
            groupBy<User>()("city"),
            having<User, 'city'>()(group => group.items.length > 1)
        );

        const result = groupAndFilter(users);

        expect(result).toHaveLength(2);
        const cities = result.map(g => g.key);
        expect(cities).toContain("NY");
        expect(cities).toContain("LA");
    });
});

describe('query: combined pipeline', () => {
    it('filters by surname, groups by city and keeps groups with age > 34', () => {
        const pipeline = query(
            where<User>()("surname", "Doe"),
            groupBy<User>()("city"),
            having<User, 'city'>()(group => group.items.some(u => u.age > 34))
        );

        const result = pipeline(users);

        expect(result).toHaveLength(1);
        const first = result[0];
        expect(first!.key).toBe("LA");
        expect(first!.items.some(u => u.age > 34)).toBe(true);
    });
});

describe('sort stability', () => {
    it('keeps equal elements stable when values are equal', () => {
        const data = [
            { n: 5, id: 1 },
            { n: 5, id: 2 },
            { n: 5, id: 3 }
        ];

        const sorted = query(
            sort<typeof data[0]>()("n")
        )(data);

        expect(sorted).toEqual([
            { n: 5, id: 1 },
            { n: 5, id: 2 },
            { n: 5, id: 3 }
        ]);
    });
});




type Obj = {
  a: number;
  b: { c: string; d: { e: boolean } };
  f: Array<{ g: number }>;
};

type R = DeepReadonly<Obj>;

expectTypeOf<R['a']>().toEqualTypeOf<number>();
expectTypeOf<R['b']>().toEqualTypeOf<{
  readonly c: string;
  readonly d: { readonly e: boolean };
}>();
expectTypeOf<R['f']>().toEqualTypeOf<
  readonly { readonly g: number }[]
>();


type User2 = {
  id: number;
  name: string;
  active: boolean;
  age: number;
};

type OnlyNumbers = PickedByType<User2, number>;

expectTypeOf<OnlyNumbers>().toEqualTypeOf<{
  id: number;
  age: number;
}>();

type OnlyBooleans = PickedByType<User2, boolean>;

expectTypeOf<OnlyBooleans>().toEqualTypeOf<{
  active: boolean;
}>();


type Events = {
  click: MouseEvent;
  change: InputEvent;
  submit: SubmitEvent;
};

type Handlers = EventHandlers<Events>;

expectTypeOf<Handlers['onClick']>().toEqualTypeOf<(e: MouseEvent) => void>();
expectTypeOf<Handlers['onChange']>().toEqualTypeOf<(e: InputEvent) => void>();
expectTypeOf<Handlers['onSubmit']>().toEqualTypeOf<(e: SubmitEvent) => void>();

describe("runtime example in query.ts", () => {
  it("executes example handlers", async () => {
    const mod = await import('./query.js');
    expect(mod).toBeDefined();
  });
});



