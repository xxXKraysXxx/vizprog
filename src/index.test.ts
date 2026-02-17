import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
    createUser, 
    createBook, 
    calculateArea, 
    getStatusColor, 
    capitalizeFirst, 
    trimAndTransform, 
    getFirstElement, 
    findById,
    HasId,
    Status
} from './index';

describe('User and createUser', () => {
    it('should create a user with default isActive = true', () => {
        const user = createUser(1, 'Иван Петров');
        
        expect(user).toEqual({
            id: 1,
            name: 'Иван Петров',
            isActive: true
        });
        expect(user.email).toBeUndefined();
    });

    it('should create a user with email and custom isActive', () => {
        const user = createUser(2, 'Мария Сидорова', 'maria@mail.com', false);
        
        expect(user).toEqual({
            id: 2,
            name: 'Мария Сидорова',
            email: 'maria@mail.com',
            isActive: false
        });
    });

    it('should have correct types', () => {
        const user = createUser(3, 'Петр Иванов');
        
        expect(typeof user.id).toBe('number');
        expect(typeof user.name).toBe('string');
        expect(typeof user.isActive).toBe('boolean');
    });
});

describe('Book and createBook', () => {
    it('should create a book with all fields', () => {
        const book = createBook({
            title: 'Война и мир',
            author: 'Лев Толстой',
            year: 1869,
            genre: 'fiction'
        });
        
        expect(book).toEqual({
            title: 'Война и мир',
            author: 'Лев Толстой',
            year: 1869,
            genre: 'fiction'
        });
    });

    it('should create a book without year', () => {
        const book = createBook({
            title: 'Краткая история времени',
            author: 'Стивен Хокинг',
            genre: 'non-fiction'
        });
        
        expect(book).toEqual({
            title: 'Краткая история времени',
            author: 'Стивен Хокинг',
            genre: 'non-fiction'
        });
        expect(book.year).toBeUndefined();
    });

    it('should only accept valid genres', () => {
        const fictionBook = createBook({
            title: 'Тест',
            author: 'Автор',
            genre: 'fiction'
        });
        const nonFictionBook = createBook({
            title: 'Тест',
            author: 'Автор',
            genre: 'non-fiction'
        });
        
        expect(fictionBook.genre).toBe('fiction');
        expect(nonFictionBook.genre).toBe('non-fiction');
    
    });
});


describe('calculateArea', () => {
    it('should calculate circle area correctly', () => {
        const radius = 5;
        const expectedArea = Math.PI * radius * radius;
        
        expect(calculateArea('circle', radius)).toBeCloseTo(expectedArea, 5);
    });

    it('should calculate square area correctly', () => {
        const side = 4;
        const expectedArea = side * side;
        
        expect(calculateArea('square', side)).toBe(expectedArea);
    });

    it('should handle edge cases', () => {
        expect(calculateArea('circle', 0)).toBe(0);
        expect(calculateArea('square', 0)).toBe(0);
    });
});

describe('getStatusColor', () => {
    it('should return green for active status', () => {
        expect(getStatusColor('active')).toBe('green');
    });

    it('should return red for inactive status', () => {
        expect(getStatusColor('inactive')).toBe('red');
    });

    it('should return blue for new status', () => {
        expect(getStatusColor('new')).toBe('blue');
    });

    it('should handle all status types', () => {
        const statuses: Status[] = ['active', 'inactive', 'new'];
        const expectedColors = ['green', 'red', 'blue'];
        
        statuses.forEach((status, index) => {
            expect(getStatusColor(status)).toBe(expectedColors[index]);
        });
    });
});

describe('StringFormatter functions', () => {
    describe('capitalizeFirst', () => {
        it('should capitalize first letter', () => {
            expect(capitalizeFirst('hello')).toBe('Hello');
            expect(capitalizeFirst('world')).toBe('World');
        });

        it('should handle empty string', () => {
            expect(capitalizeFirst('')).toBe('');
        });

        it('should handle single character', () => {
            expect(capitalizeFirst('a')).toBe('A');
        });

        it('should ignore uppercase parameter', () => {
            expect(capitalizeFirst('hello', true)).toBe('Hello');
            expect(capitalizeFirst('hello', false)).toBe('Hello');
        });
    });

    describe('trimAndTransform', () => {
        it('should trim whitespace', () => {
            expect(trimAndTransform('  hello  ')).toBe('hello');
            expect(trimAndTransform('\nworld\t')).toBe('world');
        });

        it('should transform to uppercase when true', () => {
            expect(trimAndTransform('  hello  ', true)).toBe('HELLO');
            expect(trimAndTransform('world', true)).toBe('WORLD');
        });

        it('should not uppercase when false or default', () => {
            expect(trimAndTransform('  hello  ', false)).toBe('hello');
            expect(trimAndTransform('world')).toBe('world');
        });

        it('should handle empty string', () => {
            expect(trimAndTransform('')).toBe('');
            expect(trimAndTransform('', true)).toBe('');
        });
    });
});

describe('getFirstElement', () => {
    it('should return first element of number array', () => {
        const numbers = [1, 2, 3, 4, 5];
        expect(getFirstElement(numbers)).toBe(1);
    });

    it('should return first element of string array', () => {
        const strings = ['a', 'b', 'c'];
        expect(getFirstElement(strings)).toBe('a');
    });

    it('should return undefined for empty array', () => {
        const empty: number[] = [];
        expect(getFirstElement(empty)).toBeUndefined();
    });

    it('should work with arrays of different types', () => {
        const mixed = [true, false, true];
        const objects = [{ id: 1 }, { id: 2 }];
        
        expect(getFirstElement(mixed)).toBe(true);
        expect(getFirstElement(objects)).toEqual({ id: 1 });
    });
});

describe('findById', () => {
    interface TestItem extends HasId {
        name: string;
    }

    const testItems: TestItem[] = [
        { id: 1, name: 'Анна' },
        { id: 2, name: 'Борис' },
        { id: 3, name: 'Виктор' }
    ];

    it('should find item by existing id', () => {
        const result = findById(testItems, 2);
        expect(result).toEqual({ id: 2, name: 'Борис' });
    });

    it('should return undefined for non-existing id', () => {
        const result = findById(testItems, 5);
        expect(result).toBeUndefined();
    });

    it('should handle empty array', () => {
        const result = findById([], 1);
        expect(result).toBeUndefined();
    });

    it('should work with different types extending HasId', () => {
        interface Product extends HasId {
            title: string;
            price: number;
        }

        const products: Product[] = [
            { id: 10, title: 'Ноутбук', price: 1000 },
            { id: 20, title: 'Мышь', price: 25 }
        ];

        const result = findById(products, 20);
        expect(result).toEqual({ id: 20, title: 'Мышь', price: 25 });
    });

    it('should use proper type inference', () => {
        const result = findById(testItems, 1);
        
        if (result) {
            expect(result.name).toBe('Анна');
            expect(result.id).toBe(1);
        }
    });
});