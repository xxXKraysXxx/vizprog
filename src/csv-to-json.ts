import { readFile, writeFile } from 'node:fs/promises';


export function csvToJSON(input: string[], delimiter: string): object[] {
    if (!input || input.length === 0) {
        throw new Error('Input array is empty');
    }

    if (!delimiter || delimiter.length === 0) {
        throw new Error('Delimiter cannot be empty');
    }

    const headers = input[0]!.split(delimiter).map(header => header.trim());
    
    if (headers.length === 0 || headers[0] === '') {
        throw new Error('No headers found');
    }

    const result: object[] = [];

    for (let i = 1; i < input.length; i++) {
        const line = input[i]!.trim();
        
        if (line.length === 0) {
            continue;
        }

        const values = line.split(delimiter).map(value => value.trim());
        
        if (values.length !== headers.length) {
            throw new Error(`Invalid number of fields at line ${i + 1}. Expected ${headers.length}, got ${values.length}`);
        }

        const obj: { [key: string]: string } = {};
        
        headers.forEach((header, index) => {
            obj[header] = values[index]!;
        });

        result.push(obj);
    }

    return result;
}

export async function formatCSVFileToJSONFile(
    input: string, 
    output: string, 
    delimiter: string
): Promise<void> {
    try {
        const fileContent = await readFile(input, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
            throw new Error('Input file is empty');
        }

        const jsonData = csvToJSON(lines, delimiter);
        
        await writeFile(output, JSON.stringify(jsonData, null, 2), 'utf-8');
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to process file: ${error.message}`);
        }
        throw error;
    }
}