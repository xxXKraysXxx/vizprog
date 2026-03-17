
export type Transform<T, R = T> = (data: T[]) => R[];

export type Where<T> = <K extends keyof T>(key: K, value: T[K]) => Transform<T>;

export type Sort<T> = <K extends keyof T>(key: K) => Transform<T>;

export type Group<T, K extends keyof T> = {
    key: T[K];
    items: T[];
};

export type GroupBy<T> = <K extends keyof T>(key: K) => Transform<T, Group<T, K>>;

export type GroupTransform<T, K extends keyof T> = Transform<Group<T, K>, Group<T, K>>;

export type Having = {
    <T, K extends keyof T>(predicate: (group: Group<T, K>) => boolean): GroupTransform<T, K>;
};

export function query<T, R = T>(...steps: Array<Transform<any, any>>): Transform<T, R> {
    return (data: T[]): R[] => {
        let result: any = data;
        
        for (const step of steps) {
            result = step(result);
        }
        
        return result as R[];
    };
}

export const where: Where<any> = <T, K extends keyof T>(key: K, value: T[K]): Transform<T> => {
    return (data: T[]): T[] => {
        return data.filter(item => item[key] === value);
    };
};

export const sort: Sort<any> = <T, K extends keyof T>(key: K): Transform<T> => {
    return (data: T[]): T[] => {
        return [...data].sort((a, b) => {
            const av = a[key];
            const bv = b[key];
            
            if (av < bv) return -1;
            if (av > bv) return 1;
            return 0;
        });
    };
};

export const groupBy: GroupBy<any> =
  <T, K extends keyof T>(key: K): Transform<T, Group<T, K>> => {
    return (data: T[]): Group<T, K>[] => {
        const groups = new Map<string, Group<T, K>>();
        for (const item of data) {
            const mapKey = String(item[key]); 
            let group = groups.get(mapKey);
            if (!group) {
                group = {
                    key: item[key], 
                    items: []
                };
                groups.set(mapKey, group);
            }
            group.items.push(item);
        }
        return Array.from(groups.values());
    };
};

export const having: Having = <T, K extends keyof T>(
    predicate: (group: Group<T, K>) => boolean
): GroupTransform<T, K> => {
    return (groups: Group<T, K>[]): Group<T, K>[] => {
        return groups.filter(predicate);
    };
};

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

const search = query<User>(
    where("name", "John"),
    where("surname", "Doe"),
    sort("age")
);

const result1 = search(users);
console.log("Фильтрация и сортировка:", result1);

const groupAndFilter = query<User, Group<User, 'city'>>(
    groupBy("city"),
    having<User, 'city'>((group) => group.items.length > 1) 
);
const result2 = groupAndFilter(users);
console.log("Группировка и фильтр по группам:");
console.dir(result2, { depth: null });

const pipeline = query<User, Group<User, 'city'>>(
    where("surname", "Doe"),
    groupBy("city"),
    having<User, 'city'>((group) => group.items.some((u) => u.age > 34)) 
);
const result3 = pipeline(users);
console.log("Комбинированный конвейер:");
console.dir(result3, { depth: null });
