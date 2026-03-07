
import * as XLSX from 'xlsx';

/**
 * EXCEL HELPER - ENTERPRISE EDITION
 * Handles import/export with robust validation, error reporting, and type safety.
 */

export interface ImportResult<T> {
    success: T[];
    errors: any[];
}

export type ValidatorFn<T> = (row: any, rowIndex: number) => { isValid: boolean; error?: string; transformed?: T };

export const ExcelHelper = {

    /**
     * Export JSON data to an Excel file and trigger download.
     */
    exportToExcel: (data: any[], fileName: string, sheetName: string = 'Data') => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    },

    /**
     * Basic Import: Reads raw data (Legacy support)
     */
    importFromExcel: async <T>(file: File): Promise<T[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as T[];
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * SMART IMPORT: Validates row by row.
     * Returns successful records AND a list of failed rows with reasons.
     */
    validateAndParse: async <T>(file: File, validator: ValidatorFn<T>): Promise<ImportResult<T>> => {
        const rawData = await ExcelHelper.importFromExcel<any>(file);

        const result: ImportResult<T> = {
            success: [],
            errors: []
        };

        rawData.forEach((row, index) => {
            if (Object.keys(row).length === 0) return;

            const validation = validator(row, index);

            if (validation.isValid && validation.transformed) {
                result.success.push(validation.transformed);
            } else {
                result.errors.push({
                    ...row,
                    _RowIndex: index + 2,
                    _ErrorReason: validation.error || 'Unknown Validation Error'
                });
            }
        });

        return result;
    },

    /**
     * Generates an Excel file specifically for failed rows.
     */
    generateErrorReport: (errors: any[], originalFileName: string) => {
        if (errors.length === 0) return;
        const errorFileName = `ERRORS_${originalFileName}`;
        ExcelHelper.exportToExcel(errors, errorFileName, 'Failed_Rows');
        console.log('Error report generated:', errorFileName);
    }
};
