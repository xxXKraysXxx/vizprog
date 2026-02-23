import { describe, it, expect, vi, beforeEach } from 'vitest';
import { csvToJSON, formatCSVFileToJSONFile } from './csv-to-json';
import { readFile, writeFile } from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
    readFile: vi.fn(),
    writeFile: vi.fn()
}));

describe('csvToJSON', () => {
    it('should convert valid CSV data to JSON array', () => {
        const input = [
            'p1;p2;p3;p4',
            '1;A;b;c',
            '2;B;v;d'
        ];
        const delimiter = ';';
        
        const result = csvToJSON(input, delimiter);
        
        expect(result).toEqual([
            { p1: '1', p2: 'A', p3: 'b', p4: 'c' },
            { p1: '2', p2: 'B', p3: 'v', p4: 'd' }
        ]);
        
        expect(Object.keys(result[0]!)).toEqual(['p1', 'p2', 'p3', 'p4']);
    });

    it('should handle different delimiters', () => {
        const input = [
            'name,age,city',
            'John,25,New York',
            'Jane,30,Boston'
        ];
        const delimiter = ',';
        
        const result = csvToJSON(input, delimiter);
        
        expect(result).toEqual([
            { name: 'John', age: '25', city: 'New York' },
            { name: 'Jane', age: '30', city: 'Boston' }
        ]);
    });

    it('should trim whitespace from headers and values', () => {
        const input = [
            '  name  ;  age  ;  city  ',
            '  John  ;  25  ;  New York  ',
            '  Jane  ;  30  ;  Boston  '
        ];
        const delimiter = ';';
        
        const result = csvToJSON(input, delimiter);
        
        expect(result).toEqual([
            { name: 'John', age: '25', city: 'New York' },
            { name: 'Jane', age: '30', city: 'Boston' }
        ]);
    });

    it('should skip empty lines', () => {
        const input = [
            'name;age;city',
            '',
            'John;25;New York',
            '',
            'Jane;30;Boston'
        ];
        const delimiter = ';';
        
        const result = csvToJSON(input, delimiter);
        
        expect(result).toEqual([
            { name: 'John', age: '25', city: 'New York' },
            { name: 'Jane', age: '30', city: 'Boston' }
        ]);
    });

    it('should throw error for empty input array', () => {
        expect(() => csvToJSON([], ';')).toThrow('Input array is empty');
    });

    it('should throw error for empty delimiter', () => {
        const input = ['header1;header2', 'value1;value2'];
        expect(() => csvToJSON(input, '')).toThrow('Delimiter cannot be empty');
    });

    it('should throw error for missing headers', () => {
        const input = [''];
        expect(() => csvToJSON(input, ';')).toThrow('No headers found');
    });

    it('should throw error for inconsistent number of fields', () => {
        const input = [
            'p1;p2;p3',
            '1;A',
            '2;B;C'
        ];
        expect(() => csvToJSON(input, ';')).toThrow('Invalid number of fields at line 2');
    });

    it('should handle single row of data', () => {
        const input = [
            'name;age',
            'John;25'
        ];
        const delimiter = ';';
        
        const result = csvToJSON(input, delimiter);
        
        expect(result).toEqual([{ name: 'John', age: '25' }]);
    });

    it('should handle non-Error objects being thrown', async () => {
    vi.mocked(readFile).mockRejectedValue('Something went wrong');
    
    await expect(formatCSVFileToJSONFile('input.csv', 'output.json', ';'))
        .rejects.toBe('Something went wrong');
    
    expect(writeFile).not.toHaveBeenCalled();
});

});

describe('formatCSVFileToJSONFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully convert CSV file to JSON file', async () => {
        const mockCSVContent = 'name;age;city\nJohn;25;New York\nJane;30;Boston';
        vi.mocked(readFile).mockResolvedValue(mockCSVContent);
        await formatCSVFileToJSONFile('input.csv', 'output.json', ';');
        expect(readFile).toHaveBeenCalledWith('input.csv', 'utf-8');
        const expectedJSON = JSON.stringify([
            { name: 'John', age: '25', city: 'New York' },
            { name: 'Jane', age: '30', city: 'Boston' }
        ], null, 2);
        
        expect(writeFile).toHaveBeenCalledWith('output.json', expectedJSON, 'utf-8');
    });

    it('should handle empty lines in CSV file', async () => {
        const mockCSVContent = 'name;age;city\n\nJohn;25;New York\n\nJane;30;Boston\n';
        vi.mocked(readFile).mockResolvedValue(mockCSVContent);
        await formatCSVFileToJSONFile('input.csv', 'output.json', ';');
        const expectedJSON = JSON.stringify([
            { name: 'John', age: '25', city: 'New York' },
            { name: 'Jane', age: '30', city: 'Boston' }
        ], null, 2);
        expect(writeFile).toHaveBeenCalledWith('output.json', expectedJSON, 'utf-8');
    });

    it('should throw error for empty file', async () => {
        vi.mocked(readFile).mockResolvedValue('');
        await expect(formatCSVFileToJSONFile('input.csv', 'output.json', ';'))
            .rejects.toThrow('Input file is empty');
        
        expect(writeFile).not.toHaveBeenCalled();
    });

    it('should throw error when readFile fails', async () => {
        const error = new Error('File not found');
        vi.mocked(readFile).mockRejectedValue(error);
        await expect(formatCSVFileToJSONFile('nonexistent.csv', 'output.json', ';'))
            .rejects.toThrow('Failed to process file: File not found');
        
        expect(writeFile).not.toHaveBeenCalled();
    });

    it('should throw error when CSV data is invalid', async () => {
        const mockCSVContent = 'name;age\nJohn;25;Extra';
        vi.mocked(readFile).mockResolvedValue(mockCSVContent);
        await expect(formatCSVFileToJSONFile('input.csv', 'output.json', ';'))
            .rejects.toThrow('Failed to process file: Invalid number of fields at line 2');
        
        expect(writeFile).not.toHaveBeenCalled();
    });

    it('should handle different delimiters', async () => {
        const mockCSVContent = 'name,age,city\nJohn,25,New York\nJane,30,Boston';
        vi.mocked(readFile).mockResolvedValue(mockCSVContent);
        await formatCSVFileToJSONFile('input.csv', 'output.json', ',');
        const expectedJSON = JSON.stringify([
            { name: 'John', age: '25', city: 'New York' },
            { name: 'Jane', age: '30', city: 'Boston' }
        ], null, 2);
        
        expect(writeFile).toHaveBeenCalledWith('output.json', expectedJSON, 'utf-8');
    });

    it('should throw error when writeFile fails', async () => {
        const mockCSVContent = 'name;age\nJohn;25';
        vi.mocked(readFile).mockResolvedValue(mockCSVContent);
        const writeError = new Error('Permission denied');
        vi.mocked(writeFile).mockRejectedValue(writeError);
        await expect(formatCSVFileToJSONFile('input.csv', 'output.json', ';'))
            .rejects.toThrow('Failed to process file: Permission denied');
    });
});