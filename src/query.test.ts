import { describe, it, expect } from 'vitest';
import { query, where, sort, groupBy, having, type Group } from './query';

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

describe('query: where + sort', () => {
    it('filters by name and surname and sorts by age', () => {
        const search = query<User>(
            where("name", "John"),
            where("surname", "Doe"),
            sort("age"),
        );

        const result = search(users);

        expect(result).toEqual([
            { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
            { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
            { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
        ]);
    });
});

describe('query: groupBy + having', () => {
    it('groups by city and keeps only groups with more than 1 item', () => {
        const groupAndFilter = query<User, Group<User, 'city'>>(
            groupBy("city"),
            having<User, 'city'>((group) => group.items.length > 1),
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
        const pipeline = query<User, Group<User, 'city'>>(
            where("surname", "Doe"),
            groupBy("city"),
            having<User, 'city'>((group) => group.items.some((u) => u.age > 34)),
        );

        const result = pipeline(users);
        expect(result).toHaveLength(1);

        const first = result[0];
        expect(first).toBeDefined();
        expect(first!.key).toBe("LA");
        expect(first!.items.some(u => u.age > 34)).toBe(true);

    });
});

describe('sort stability', () => {
    it('keeps equal elements stable when values are equal', () => {
        const data = [
            { n: 5, id: 1 },
            { n: 5, id: 2 },
            { n: 5, id: 3 },
        ];

        const sorted = query(
            sort("n")
        )(data);

        expect(sorted).toEqual([
            { n: 5, id: 1 },
            { n: 5, id: 2 },
            { n: 5, id: 3 },
        ]);
    });
});

