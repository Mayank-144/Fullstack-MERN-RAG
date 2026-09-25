import path from 'path';
import { createRequire } from 'module';
import * as XLSX from 'xlsx';

// Use createRequire for pdf-parse to ensure full ES module compatibility
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Parse PDF files and extract raw text
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
export const parsePDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);

    // Text clean-up: Normalize carriage returns and excessive whitespace
    const cleanedText = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      text: cleanedText,
      pageCount: data.numpages || 1,
      info: data.info || {}
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

/**
 * Parse Excel files (.xlsx, .xls) and convert sheets to structured text
 * @param {Buffer} buffer - File memory buffer
 * @returns {Promise<{ text: string, sheetCount: number, sheetNames: string[], totalRows: number }>}
 */
export const parseExcel = async (buffer) => {
  try {
    // 1. Read workbook from in-memory buffer
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    let fullText = '';
    let totalRows = 0;

    sheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      // 2. Extract structured JSON records (Header -> Value pairs)
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (jsonData.length > 0) {
        totalRows += jsonData.length;
        fullText += `[Sheet: ${sheetName}]\n`;

        // 3. Format each row clearly with its column headers for LLM semantic understanding
        jsonData.forEach((row, index) => {
          const rowEntries = Object.entries(row)
            .filter(([_, val]) => val !== '')
            .map(([col, val]) => `${col}: ${val}`)
            .join(' | ');

          if (rowEntries) {
            fullText += `Row ${index + 1}: ${rowEntries}\n`;
          }
        });

        fullText += '\n';
      } else {
        // Fallback to CSV format if sheet has raw values without standard headers
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        if (csvData && csvData.trim()) {
          fullText += `[Sheet: ${sheetName}]\n${csvData.trim()}\n\n`;
        }
      }
    });

    return {
      text: fullText.trim(),
      sheetCount: sheetNames.length,
      sheetNames,
      totalRows
    };
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Route document to appropriate parser based on file type / extension
 * @param {Buffer} buffer - File buffer from Multer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File mimetype
 * @returns {Promise<{ text: string, fileType: string, metadata: object }>}
 */
export const parseDocument = async (buffer, originalName, mimeType) => {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.pdf' || mimeType === 'application/pdf') {
    const result = await parsePDF(buffer);
    return {
      fileType: 'pdf',
      text: result.text,
      metadata: {
        pageCount: result.pageCount,
        info: result.info
      }
    };
  }

  if (
    ['.xlsx', '.xls'].includes(ext) ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    const result = await parseExcel(buffer);
    return {
      fileType: 'excel',
      text: result.text,
      metadata: {
        sheetCount: result.sheetCount,
        sheetNames: result.sheetNames,
        totalRows: result.totalRows
      }
    };
  }

  throw new Error(`Unsupported file type: ${ext || mimeType}`);
};
