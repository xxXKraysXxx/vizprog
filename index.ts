interface User {
    id: number;
    name: string;
    email?: string;
    isActive: boolean;
}

function createUser(id: number, name: string, email?: string, isActive: boolean = true): User {
    return {
        id,
        name,
        email,
        isActive
    };
}

const user1 = createUser(1, "Иван Петров");
const user2 = createUser(2, "Мария Сидорова", "maria@mail.com", false);
console.log(user1, user2);


interface Book {
    title: string;
    author: string;
    year?: number;
    genre: 'fiction' | 'non-fiction';
}

function createBook(book: Book): Book {
    return book;
}

const book1 = createBook({
    title: "Война и мир",
    author: "Лев Толстой",
    year: 1869,
    genre: 'fiction'
});

const book2 = createBook({
    title: "Краткая история времени",
    author: "Стивен Хокинг",
    genre: 'non-fiction'
});

console.log(book1, book2);

function calculateArea(shape: 'circle', radius: number): number;
function calculateArea(shape: 'square', side: number): number;
function calculateArea(shape: 'circle' | 'square', param: number): number {
    if (shape === 'circle') {
        return Math.PI * param * param;
    } else {
        return param * param;
    }
}

console.log(calculateArea('circle', 2)); 
console.log(calculateArea('square', 4)); 

type Status = 'active' | 'inactive' | 'new';

function getStatusColor(status: Status): string {
    switch(status) {
        case 'active':
            return 'green';
        case 'inactive':
            return 'red';
        case 'new':
            return 'blue';
    }
}

console.log(getStatusColor('active'));   
console.log(getStatusColor('inactive')); 
console.log(getStatusColor('new'));      

type StringFormatter = (str: string, uppercase?: boolean) => string;

const capitalizeFirst: StringFormatter = (str: string, uppercase: boolean = false) => {
    if (str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const trimAndTransform: StringFormatter = (str: string, uppercase: boolean = false) => {
    const trimmed = str.trim();
    return uppercase ? trimmed.toUpperCase() : trimmed;
};

console.log(capitalizeFirst("hello world"));        
console.log(trimAndTransform("  hello  "));   
console.log(trimAndTransform("  world  ", true));

function getFirstElement<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[0] : undefined;
}

const numbers = [1, 2, 3, 4, 5];
console.log(getFirstElement(numbers)); 

const strings = ["a", "b", "c"];
console.log(getFirstElement(strings));

const empty: number[] = [];
console.log(getFirstElement(empty)); 

interface HasId {
    id: number;
}

function findById<T extends HasId>(items: T[], id: number): T | undefined {
    for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            return items[i];
        }
    }
    return undefined;
}

interface Person extends HasId {
    name: string;
}

const people: Person[] = [
    { id: 1, name: "Анна" },
    { id: 2, name: "Борис" },
    { id: 3, name: "Виктор" }
];

console.log(findById(people, 2)); 
console.log(findById(people, 5)); 