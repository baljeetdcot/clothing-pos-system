import * as XLSX from 'xlsx';
import { ExcelImportData, InventoryItem } from '../types';

export class ExcelImportService {
  static async parseExcelFile(file: File): Promise<ExcelImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('Failed to read file'));
            return;
          }

          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            reject(new Error('Excel file must have at least a header row and one data row'));
            return;
          }

          // Get headers (first row)
          const headers = jsonData[0] as string[];
          
          // Define required headers with multiple possible variations
          const requiredHeaders = [
            { key: 'Sub Section Name', variations: ['sub section name', 'subsection name', 'sub_section_name', 'subsection', 'section'] },
            { key: 'Style_Name', variations: ['style_name', 'style name', 'style', 'product name', 'item name'] },
            { key: 'Color Name', variations: ['color name', 'color_name', 'color', 'colour', 'colour name'] },
            { key: 'Size', variations: ['size', 'sizes'] },
            { key: 'Item Code', variations: ['item code', 'item_code', 'code', 'sku', 'product code'] },
            { key: 'Style', variations: ['style', 'type', 'product type'] },
            { key: 'Category', variations: ['category', 'categories', 'product category'] },
            { key: 'Design', variations: ['design', 'pattern', 'style design'] },
            { key: 'Barcode', variations: ['barcode', 'bar code', 'ean', 'upc', 'product barcode'] }
          ];

          // Map headers to indices with flexible matching
          const headerMap: { [key: string]: number } = {};
          const foundHeaders: string[] = [];
          
          headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().trim().replace(/[_\s-]/g, '');
            
            requiredHeaders.forEach(reqHeader => {
              const isMatch = reqHeader.variations.some(variation => 
                normalizedHeader === variation.toLowerCase().trim().replace(/[_\s-]/g, '')
              );
              
              if (isMatch && !headerMap[reqHeader.key]) {
                headerMap[reqHeader.key] = index;
                foundHeaders.push(reqHeader.key);
              }
            });
          });

          // Check for missing headers
          const missingHeaders = requiredHeaders.filter(reqHeader => !foundHeaders.includes(reqHeader.key));
          
          if (missingHeaders.length > 0) {
            const missingNames = missingHeaders.map(h => h.key).join(', ');
            const availableHeaders = headers.join(', ');
            reject(new Error(`Missing required columns: ${missingNames}\n\nAvailable columns in your file: ${availableHeaders}\n\nPlease ensure your Excel file has columns with names similar to: Sub Section Name, Style Name, Color Name, Size, Item Code, Style, Category, Design, Barcode`));
            return;
          }

          // Parse data rows
          const parsedData: ExcelImportData[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row.every(cell => cell === undefined || cell === null || cell === '')) {
              continue; // Skip empty rows
            }

            const item: ExcelImportData = {
              sub_section_name: this.getCellValue(row, headerMap['Sub Section Name']),
              style_name: this.getCellValue(row, headerMap['Style_Name']),
              color_name: this.getCellValue(row, headerMap['Color Name']),
              size: this.getCellValue(row, headerMap['Size']),
              item_code: this.getCellValue(row, headerMap['Item Code']),
              style: this.getCellValue(row, headerMap['Style']),
              category: this.getCellValue(row, headerMap['Category']),
              design: this.getCellValue(row, headerMap['Design']),
              barcode: this.getCellValue(row, headerMap['Barcode'])
            };

            // Validate required fields
            if (!item.item_code || !item.category) {
              console.warn(`Skipping row ${i + 1}: Missing required fields (Item Code or Category)`);
              continue;
            }

            parsedData.push(item);
          }

          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsBinaryString(file);
    });
  }

  static convertToInventoryItems(excelData: ExcelImportData[]): Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>[] {
    return excelData.map(item => {
      // If there's a barcode, it means there's 1 stock of that item
      const hasBarcode = item.barcode && item.barcode.trim() !== '';
      const stockQuantity = hasBarcode ? 1 : 0;
      
      return {
        sub_section_name: item.sub_section_name,
        style_name: item.style_name,
        color_name: item.color_name,
        size: item.size,
        item_code: item.item_code,
        style: item.style,
        category: item.category,
        design: item.design,
        barcode: item.barcode || this.generateBarcode(item.item_code),
        stock_quantity: stockQuantity
      };
    });
  }

  private static getCellValue(row: any[], index: number): string {
    const value = row[index];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).trim();
  }

  private static generateBarcode(itemCode: string): string {
    // Generate a simple barcode by padding item code with zeros
    // In a real implementation, you might want to use a proper barcode library
    return itemCode.padStart(12, '0');
  }

  static async downloadTemplate(): Promise<void> {
    const templateData = [
      ['Sub Section Name', 'Style Name', 'Color Name', 'Size', 'Item Code', 'Style', 'Category', 'Design', 'Barcode'],
      ['T-shirt', 'Basic Tee', 'Red', 'M', '1234567890', 'Casual', 'Casual', 'Plain', '1234567890'],
      ['Denim', 'Classic Jeans', 'Blue', 'L', '1234567891', 'Casual', 'Casual', 'Straight Fit', '1234567891'],
      ['Shirt', 'Formal Shirt', 'White', 'M', '1234567892', 'Formal', 'Formal', 'Button Down', '1234567892'],
      ['Trouser', 'Chino Pants', 'Black', 'M', '1234567893', 'Casual', 'Casual', 'Chino', '1234567893'],
      ['Trouser', 'Formal Pants', 'Navy', 'L', '1234567894', 'Formal', 'Formal', 'Suit Pants', '1234567894']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');
    
    XLSX.writeFile(wb, 'inventory_template.xlsx');
  }
}
