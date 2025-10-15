import jsPDF from 'jspdf';
import { CartItem, Sale, Settings } from '../types';
import { PricingService } from './pricing';

// Helper function to format date to IST with 12-hour format (dd/mm/yyyy hh:mm AM/PM)
function formatDateToIST12Hour(date: Date): string {
  // Convert to IST (UTC + 5:30)
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  
  const day = istDate.getDate().toString().padStart(2, '0');
  const month = (istDate.getMonth() + 1).toString().padStart(2, '0');
  const year = istDate.getFullYear();
  
  let hours = istDate.getHours();
  const minutes = istDate.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const hoursStr = hours.toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
}

export class ReceiptService {
  static generateReceipt(
    sale: Sale,
    cartItems: CartItem[],
    settings: Settings,
    cashierName?: string,
    customerName?: string,
    customerMobile?: string,
    customerOffers?: any[],
    bundleOfferEnabled?: boolean,
    oneTimeDiscount?: number
  ): jsPDF {
    // A4 page size (210mm x 297mm) but content positioned in top center
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4' // A4 size
    });
    
    // Keep A4 dimensions but position content in top center
    doc.internal.pageSize.width = 210; // A4 width
    doc.internal.pageSize.height = 297; // A4 height
    
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm (A4 width)
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm (A4 height)
    
    // Position content in top center of A4 page
    const receiptWidth = 140; // 14cm receipt width
    const maxReceiptHeight = 150; // 15cm max receipt height per page
    const leftMargin = (pageWidth - receiptWidth) / 2; // Center horizontally
    const rightMargin = leftMargin; // Symmetric margins
    const topMargin = 5; // Reduced top margin to minimize empty space
    const contentWidth = receiptWidth; // Use full receipt width
    let yPosition = topMargin;
    let currentPage = 1;

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const maxWidth = contentWidth;
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y, options);
      return y + (lines.length * 4) + 2;
    };

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredHeight: number = 10) => {
      const currentPageHeight = yPosition - topMargin;
      if (currentPageHeight + requiredHeight > maxReceiptHeight) {
        // Add new page
        doc.addPage();
        currentPage++;
        yPosition = topMargin;
        
        // Add page header for continuation
        doc.setFontSize(6);
        doc.setFont('helvetica', 'italic');
        doc.text(`Receipt #: ${sale.sale_id} - Page ${currentPage}`, leftMargin, yPosition);
        yPosition += 4;
        
        // Add continuation line
        doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
        yPosition += 3;
        
        return true; // Page break occurred
      }
      return false; // No page break needed
    };

    // Store header - aligned to right side of the page
    const rightAlignStart = pageWidth - rightMargin; // Right-aligned with margin
    const rightSectionWidth = contentWidth * 0.5; // Width of right section
    
    doc.setFontSize(11); // Restored original size
    doc.setFont('helvetica', 'bold');
    const storeTextWidth = doc.getTextWidth(settings.store_name);
    const storeTextX = rightAlignStart - storeTextWidth;
    doc.text(settings.store_name, storeTextX, yPosition);
    yPosition += 4; // Reduced from 6

    // Customer information will be placed later below GSTIN

    // Store address - right-aligned
    if (settings.store_address) {
      doc.setFontSize(6); // Restored original size
      doc.setFont('helvetica', 'normal');
      const addressLines = doc.splitTextToSize(settings.store_address, rightSectionWidth);
      // Right-align each line of address
      addressLines.forEach((line: string) => {
        doc.text(line, rightAlignStart, yPosition, { align: 'right' });
        yPosition += 2.5;
      });
      yPosition += 1; // Reduced spacing
    }

    // Contact number - larger and bold, right-aligned
    if (settings.contact_number) {
      doc.setFontSize(8); // Restored original size
      doc.setFont('helvetica', 'bold'); // Made bold
      doc.text(`Contact: ${settings.contact_number}`, rightAlignStart, yPosition, { align: 'right' });
      yPosition += 2; // Increased spacing
    }

    // GSTIN - bold, right-aligned
    if (settings.gstin) {
      doc.setFontSize(6); // Restored original size
      doc.setFont('helvetica', 'bold'); // Made bold
      doc.text(`GSTIN: ${settings.gstin}`, rightAlignStart, yPosition, { align: 'right' });
      yPosition += 1; // Increased spacing
    }
    
    // Reset yPosition for receipt details (left side) - optimized for small paper
    yPosition = topMargin + 13; // Moved further down for better spacing

    // Line separator between store details and receipt number
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
    yPosition += 2.5; // Space after line

    // Receipt details - moved down to leave top left blank
    doc.setFontSize(8); // Restored original size
    doc.text(`Receipt #: ${sale.sale_id}`, leftMargin, yPosition);
    
    // Customer information - positioned on the right side, in line with receipt #
    // Use customer info from parameters first, then fallback to sale object
    const finalCustomerName = customerName || sale.customer_name;
    const finalCustomerMobile = customerMobile || sale.customer_mobile;
    
    console.log('Receipt Service - Customer Info:', { customerName, customerMobile });
    console.log('Receipt Service - Sale customer info:', { sale_customer_name: sale.customer_name, sale_customer_mobile: sale.customer_mobile });
    console.log('Receipt Service - Final customer info:', { finalCustomerName, finalCustomerMobile });
    console.log('Receipt Service - rightAlignStart:', rightAlignStart, 'yPosition:', yPosition);
    
    // Force display customer info for debugging
    doc.setFontSize(7); // Restored original size
    doc.setFont('helvetica', 'bold');
    
    if (finalCustomerName && finalCustomerName.trim()) {
      const customerText = `Customer: ${finalCustomerName.trim()}`;
      const customerTextWidth = doc.getTextWidth(customerText);
      const customerTextX = rightAlignStart - customerTextWidth;
      doc.text(customerText, customerTextX, yPosition);
      console.log('Drawing customer text:', customerText, 'at position:', customerTextX, yPosition);
    } else {
      console.log('Customer name is empty or undefined');
      doc.text('Customer: [EMPTY]', rightAlignStart - 50, yPosition);
    }
    
    if (finalCustomerMobile && finalCustomerMobile.trim()) {
      const mobileText = `Mobile: ${finalCustomerMobile.trim()}`;
      const mobileTextWidth = doc.getTextWidth(mobileText);
      const mobileTextX = rightAlignStart - mobileTextWidth;
      doc.text(mobileText, mobileTextX, yPosition + 3);
      console.log('Drawing mobile text:', mobileText, 'at position:', mobileTextX, yPosition + 3);
    } else {
      console.log('Customer mobile is empty or undefined');
      doc.text('Mobile: [EMPTY]', rightAlignStart - 50, yPosition + 3);
    }
    
    yPosition += 3; // Reduced from 4
    
    doc.setFontSize(6); // Restored original size
    // Handle date formatting with IST timezone and 12-hour format
    let dateString = 'Invalid Date';
    try {
      if (sale.created_at) {
        console.log('Receipt Service - Processing created_at:', sale.created_at);
        const saleDate = new Date(sale.created_at);
        console.log('Receipt Service - Parsed date:', saleDate);
        console.log('Receipt Service - Is valid:', !isNaN(saleDate.getTime()));
        
        if (!isNaN(saleDate.getTime())) {
          // Format as IST with 12-hour format (IST conversion is done inside the helper function)
          dateString = formatDateToIST12Hour(saleDate);
          console.log('Receipt Service - Formatted date:', dateString);
        } else {
          console.log('Receipt Service - Invalid date, using fallback');
          // Fallback to current date if created_at is invalid
          const now = new Date();
          dateString = formatDateToIST12Hour(now);
        }
      } else {
        console.log('Receipt Service - No created_at, using fallback');
        // Fallback to current date if created_at is missing
        const now = new Date();
        dateString = formatDateToIST12Hour(now);
      }
    } catch (error) {
      console.log('Receipt Service - Error in date formatting:', error);
      // Fallback to current date if any error occurs
      const now = new Date();
      dateString = formatDateToIST12Hour(now);
    }
    
    console.log('Receipt Service - Date formatting debug:', {
      created_at: sale.created_at,
      created_at_type: typeof sale.created_at,
      formatted_date: dateString,
      sale_object: sale
    });
    
    doc.text(`Date: ${dateString}`, leftMargin, yPosition);
    yPosition += 2; // Further reduced from 3
    
    if (cashierName) {
      doc.text(`Cashier: ${cashierName}`, leftMargin, yPosition);
      yPosition += 1; // Further reduced from 3
    }
    yPosition += .1; // Reduced spacing before line

    // Line separator
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
    yPosition += 3; // Spacing after line for Items text

    // Items header
    checkPageBreak(15); // Check if we have space for items header and table
    doc.setFontSize(10); // Restored original size
    doc.setFont('helvetica', 'bold');
    doc.text('Items', leftMargin, yPosition);
    yPosition += 4; // Reduced from 6

    // Items table - optimized layout with only outer border and header
    const tableHeaders = ['Barcode', 'Item', 'Qty', 'Price'];
    const colWidths = [22, 65, 11, 36]; // Adjusted widths - removed Total column, increased Price width
    const colPositions = [
      leftMargin, 
      leftMargin + colWidths[0], 
      leftMargin + colWidths[0] + colWidths[1], 
      leftMargin + colWidths[0] + colWidths[1] + colWidths[2]
    ];
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    const tableHeight = 3; // Further reduced height for more items (was 4mm)
    
    // Ensure table doesn't exceed receipt width (centered on A4)
    const maxTableWidth = contentWidth;
    console.log(`A4 Page: ${pageWidth}x${pageHeight}mm, Receipt: ${receiptWidth}x${maxReceiptHeight}mm, Table: ${tableWidth}mm`);
    
    if (tableWidth > maxTableWidth) {
      // Scale down column widths proportionally
      const scaleFactor = maxTableWidth / tableWidth;
      colWidths.forEach((width, index) => {
        colWidths[index] = width * scaleFactor;
      });
      // Recalculate positions
      colPositions[1] = leftMargin + colWidths[0];
      colPositions[2] = leftMargin + colWidths[0] + colWidths[1];
      colPositions[3] = leftMargin + colWidths[0] + colWidths[1] + colWidths[2];
      
      console.log(`Scaled table width: ${colWidths.reduce((sum, width) => sum + width, 0)}mm`);
    }

    // Draw only outer table border and header row
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    
    // Header row with background
    doc.setFillColor(240, 240, 240);
    doc.rect(leftMargin, yPosition - 1, tableWidth, tableHeight, 'F');
    
    // Header text
    tableHeaders.forEach((header, index) => {
      doc.setFontSize(7); // Restored original size
      doc.setFont('helvetica', 'bold');
      const textX = colPositions[index] + 1;
      const textY = yPosition + 1.5; // Adjusted to avoid overlap with divider line
      doc.text(header, textX, textY);
    });
    
    yPosition += tableHeight;

    // Items rows - proper table format
    // For display, compute unit price using PricingService base logic (pre-discount)
    console.log('Receipt Service - Price Calculation Debug:', {
      cartItemsLength: cartItems.length,
      cartItems: cartItems.map(item => ({
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.total_price
      }))
    });
    
    // Calculate total quantity for the order
    const totalOrderQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    cartItems.forEach((item, index) => {
      // Compute per-item base price (pre any bill discounts), consistent with subtotal
      const baseItemTotal = PricingService.calculateItemPrice(item, cartItems, [], false, 0, 0);
      const adjustedUnitPrice = baseItemTotal / (item.quantity || 1);
      
      // Debug logging
      console.log(`Item ${index + 1}:`, {
        originalUnitPrice: item.unit_price,
        quantity: item.quantity,
        adjustedUnitPrice: adjustedUnitPrice
      });
      
      // Show sub-section name for shirts/t-shirts/denim, category + sub-section for trousers
      let itemType = '';
      
      // Debug: Check what data we have
      console.log('Item data:', {
        category: item.item.category,
        sub_section_name: item.item.sub_section_name,
        style_name: item.item.style_name
      });
      
      // Check if it's a trouser by looking at sub_section_name as well
      const isTrouser = (item.item.category && (item.item.category.toLowerCase().includes('trouser') || item.item.category.toLowerCase().includes('pant'))) ||
                       (item.item.sub_section_name && (item.item.sub_section_name.toLowerCase().includes('trouser') || item.item.sub_section_name.toLowerCase().includes('pant')));
      
      if (isTrouser) {
        // For trousers: show category + sub-section, with fallback logic
        const category = item.item.category || 'Trouser'; // Fallback if category is missing
        const subSection = item.item.sub_section_name || '';
        itemType = `${category} ${subSection}`.trim();
      } else {
        // For shirts, t-shirts, denim: show sub-section name
        itemType = item.item.sub_section_name || item.item.category || '';
      }
      
      // Item name without barcode (barcode will be in separate column)
      const itemName = `${itemType} ${item.item.color_name} ${item.item.size}`.trim();
      const itemText = item.manual_override ? `${itemName} *` : itemName;
      
      // Check if we need a new page for this item
      checkPageBreak(tableHeight + 8); // Increased buffer to prevent last item from getting cut

      // Item details (optimized layout without individual borders)
      doc.setFontSize(6); // Reduced from 8
      doc.setFont('helvetica', 'normal');
      const textY = yPosition + 1.5; // Adjusted for smaller row height
      
      // Barcode (first column)
      if (item.item.barcode) {
        const barcodeText = item.item.barcode.length > 15 ? item.item.barcode.substring(0, 15) + '...' : item.item.barcode;
        doc.text(barcodeText, colPositions[0] + 1, textY);
      }
      
      // Item name (second column, truncated if too long)
      const maxItemWidth = colWidths[1] - 2; // Reduced margin
      const truncatedItemName = doc.splitTextToSize(itemText, maxItemWidth)[0];
      doc.text(truncatedItemName, colPositions[1] + 1, textY);
      
      // Quantity (third column, centered)
      const qtyText = item.quantity.toString();
      const qtyX = colPositions[2] + (colWidths[2] - doc.getTextWidth(qtyText)) / 2;
      doc.text(qtyText, qtyX, textY);
      
      // Unit price (fourth column, right aligned, with 2 decimal places)
      const priceText = adjustedUnitPrice.toFixed(2); // Use adjusted unit price with 2 decimal places
      console.log(`Price text for item ${index + 1}:`, priceText);
      const priceX = colPositions[3] + colWidths[3] - doc.getTextWidth(priceText) - 1;
      doc.text(priceText, priceX, textY);
      
      yPosition += tableHeight;

      // Manual override note (if needed)
      if (item.manual_override) {
        doc.setFontSize(5);
        doc.setFont('helvetica', 'italic');
        doc.text('* Manual Price Adjustment', colPositions[0] + 1, yPosition);
        yPosition += 2;
      }
    });

    // Add blank rows to make bills look uniform
    // Calculate how much space we have left before bill summary
    const currentPageHeight = yPosition - topMargin;
    const subtotalRowHeight = tableHeight; // Height needed for subtotal row
    const estimatedBillSummaryHeight = 30; // Approximate height needed for bill summary
    const estimatedFooterHeight = 10; // Approximate height needed for footer
    const totalRequiredHeight = subtotalRowHeight + estimatedBillSummaryHeight + estimatedFooterHeight;
    const availableHeightForBlankRows = maxReceiptHeight - currentPageHeight - totalRequiredHeight;
    
    // Calculate how many blank rows we can safely add
    const maxBlankRows = Math.floor(availableHeightForBlankRows / tableHeight);
    const desiredMinRows = settings.min_receipt_rows || 16;
    const blankRowsNeeded = Math.min(
      Math.max(0, desiredMinRows - cartItems.length),
      maxBlankRows
    );
    
    console.log(`Receipt Space Analysis (Optimized Layout):`, {
      currentPageHeight: `${currentPageHeight}mm`,
      subtotalRowHeight: `${subtotalRowHeight}mm`,
      billSummaryHeight: `${estimatedBillSummaryHeight}mm`,
      footerHeight: `${estimatedFooterHeight}mm`,
      totalRequiredHeight: `${totalRequiredHeight}mm`,
      availableHeightForBlankRows: `${availableHeightForBlankRows}mm`,
      tableHeight: `${tableHeight}mm (reduced from 5mm for more items)`,
      maxBlankRows: maxBlankRows,
      actualItems: cartItems.length,
      desiredMinRows: desiredMinRows,
      blankRowsNeeded: blankRowsNeeded,
      maxPossibleItems: `${Math.floor(availableHeightForBlankRows / tableHeight)} items`
    });
    
    // Add blank rows if we have space
    for (let i = 0; i < blankRowsNeeded; i++) {
      // Just add space for blank row (no individual borders)
      yPosition += tableHeight;
    }

    // Calculate totals using PricingService to ensure consistency
    const totals = PricingService.calculateCartTotal(
      cartItems,
      customerOffers || [],
      false,
      oneTimeDiscount || 0
    );

    // Prefer persisted sale values when available (e.g., printing from Sales History)
    const displaySubtotal = typeof sale.total_amount === 'number' && !isNaN(sale.total_amount)
      ? sale.total_amount
      : totals.subtotal;
    const displayDiscount = typeof sale.discount_amount === 'number' && !isNaN(sale.discount_amount)
      ? sale.discount_amount
      : totals.discount;
    const displayTotal = typeof sale.final_amount === 'number' && !isNaN(sale.final_amount)
      ? sale.final_amount
      : totals.total;
    const displayDiscountBreakdown = (totals.discountBreakdown && totals.discountBreakdown.length > 0)
      ? totals.discountBreakdown
      : (displayDiscount > 0 ? [{ tier: 'Discount', amount: displayDiscount }] as { tier: string; amount: number }[] : []);
    const subtotal = totals.subtotal;
    
    console.log(`Subtotal Calculation:`, {
      itemsCount: cartItems.length,
      subtotal: subtotal.toFixed(2),
      items: cartItems.map(item => ({
        computed_line_total: PricingService.calculateItemPrice(item, cartItems, [], false, 0, 0).toFixed(2),
        quantity: item.quantity
      }))
    });
    
    // Draw subtotal row with background
    doc.setFillColor(245, 245, 245); // Light gray background for subtotal
    doc.rect(leftMargin, yPosition - 1, tableWidth, tableHeight, 'F');
    
    // Subtotal text (in first column)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal:', colPositions[0] + 1, yPosition + 1.5);
    
    // Total quantity (in quantity column, centered)
    const totalQtyText = totalOrderQuantity.toString();
    const totalQtyX = colPositions[2] + (colWidths[2] - doc.getTextWidth(totalQtyText)) / 2;
    doc.text(totalQtyText, totalQtyX, yPosition + 1.5);
    
    // Subtotal amount (right aligned in price column)
    const itemsSubtotalText = `Rs ${subtotal.toFixed(2)}`;
    const itemsSubtotalX = colPositions[3] + colWidths[3] - doc.getTextWidth(itemsSubtotalText) - 1;
    doc.text(itemsSubtotalText, itemsSubtotalX, yPosition + 1.5);
    
    yPosition += tableHeight;

    // Add some spacing after the subtotal row
    yPosition += 2; // Reduced from 5

    // Bill Summary Section - Proper layout with subtotal, discount, tax, and total
    
    // Check if we have space for bill summary (split layout needs more height)
    const billSummaryHeight = 30; // Approximate height needed for split layout bill summary
    checkPageBreak(billSummaryHeight);
    
    // Bill Summary Header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL SUMMARY', leftMargin, yPosition);
    yPosition += 3; // Reduced from 4
    
    // Create split layout: table on left half, tax breakdown on right half
    const summaryTableWidth = tableWidth; // Use the same width as items table
    const halfWidth = summaryTableWidth / 2;
    const summaryRowHeight = 4;
    // Left table rows: Subtotal + each discount type (if any) + Total
    const discountRows = (displayDiscountBreakdown && displayDiscountBreakdown.length > 0) ? displayDiscountBreakdown.length : 0;
    const leftTableRows = 2 + discountRows; // Subtotal + discount types + Total
    const bundleOfferRows = bundleOfferEnabled ? 1 : 0; // Additional row for bundle offer
    const totalLeftTableRows = leftTableRows + bundleOfferRows;
    const rightTableRows = 5; // Amount before GST, CGST, SGST, Round off, Net Amount
    const maxRows = Math.max(totalLeftTableRows, rightTableRows); // Use the larger number for both tables
    
    // Calculate table dimensions
    const leftTableWidth = halfWidth - 2; // Small margin between halves
    const rightTableWidth = halfWidth - 2;
    const leftTableX = leftMargin;
    const rightTableX = leftMargin + halfWidth + 2;
    const summaryTableHeight = summaryRowHeight * maxRows;
    
    // Draw both table borders with same height
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(leftTableX, yPosition - 2, leftTableWidth, summaryTableHeight);
    doc.rect(rightTableX, yPosition - 2, rightTableWidth, summaryTableHeight);
    
    // Left half: Summary table
    let leftY = yPosition;
    
    // Subtotal row
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', leftTableX + 2, leftY + 1);
    const subtotalText = `Rs${displaySubtotal.toFixed(2)}`;
    const subtotalX = leftTableX + leftTableWidth - doc.getTextWidth(subtotalText) - 2;
    doc.text(subtotalText, subtotalX, leftY + 1);
    leftY += summaryRowHeight;
    
    // Draw horizontal line after subtotal
    doc.line(leftTableX, leftY - 2, leftTableX + leftTableWidth, leftY - 2);
    
    // Discount rows by type (if applicable)
    if (discountRows > 0) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 150, 0); // Green color for discounts
      displayDiscountBreakdown.forEach(breakdown => {
        // Replace rupee symbol if any to avoid font rendering issues
        const safeTier = (breakdown.tier || '').replace(/₹/g, 'Rs');
        const label = `${safeTier}:`;
        doc.text(label, leftTableX + 2, leftY + 1);
        const amountText = `-Rs${breakdown.amount.toFixed(2)}`;
        const amountX = leftTableX + leftTableWidth - doc.getTextWidth(amountText) - 2;
        doc.text(amountText, amountX, leftY + 1);
        leftY += summaryRowHeight;
        // Divider after each discount row
        doc.line(leftTableX, leftY - 2, leftTableX + leftTableWidth, leftY - 2);
      });
      // Reset text color
      doc.setTextColor(0, 0, 0);
    }
    
    // Total row - highlighted
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL:', leftTableX + 2, leftY + 1);
    const totalText = `Rs${displayTotal.toFixed(2)}`;
    const totalX = leftTableX + leftTableWidth - doc.getTextWidth(totalText) - 2;
    doc.text(totalText, totalX, leftY + 1);
    leftY += summaryRowHeight;
    
    // Bundle Offer Message row (if enabled) - inside the left table
    if (bundleOfferEnabled) {
      // Draw horizontal line before bundle message
      doc.line(leftTableX, leftY - 2, leftTableX + leftTableWidth, leftY - 2);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 100, 0); // Green color for offer message
      
      // Calculate valid until date (7 days from today) in IST
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);
      const istValidUntil = new Date(validUntil.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
      const validUntilStr = formatDateToIST12Hour(istValidUntil).split(' ')[0]; // Get only date part (dd/mm/yyyy)
      
      const bundleMessage = `Bundle offer valid before ${validUntilStr}`;
      doc.text(bundleMessage, leftTableX + 2, leftY + 1);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      leftY += summaryRowHeight;
    }
    
    // Right half: Tax breakdown
    let rightY = yPosition;
    
    // Calculate tax components
    const amountBeforeGST = displayTotal / 1.05; // Remove 5% GST
    const cgst = amountBeforeGST * 0.025; // 2.5% CGST
    const sgst = amountBeforeGST * 0.025; // 2.5% SGST
    const totalTax = cgst + sgst;
    const roundOff = Math.round(displayTotal) - displayTotal;
    const netAmount = Math.round(displayTotal);
    
    // Amount before GST
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Amount before GST:', rightTableX + 2, rightY + 1);
    const beforeGSTText = `Rs${amountBeforeGST.toFixed(2)}`;
    const beforeGSTX = rightTableX + rightTableWidth - doc.getTextWidth(beforeGSTText) - 2;
    doc.text(beforeGSTText, beforeGSTX, rightY + 1);
    rightY += summaryRowHeight;
    
    // Draw horizontal line
    doc.line(rightTableX, rightY - 2, rightTableX + rightTableWidth, rightY - 2);
    
    // CGST
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CGST (2.5%):', rightTableX + 2, rightY + 1);
    const cgstText = `Rs${cgst.toFixed(2)}`;
    const cgstX = rightTableX + rightTableWidth - doc.getTextWidth(cgstText) - 2;
    doc.text(cgstText, cgstX, rightY + 1);
    rightY += summaryRowHeight;
    
    // Draw horizontal line
    doc.line(rightTableX, rightY - 2, rightTableX + rightTableWidth, rightY - 2);
    
    // SGST
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SGST (2.5%):', rightTableX + 2, rightY + 1);
    const sgstText = `Rs${sgst.toFixed(2)}`;
    const sgstX = rightTableX + rightTableWidth - doc.getTextWidth(sgstText) - 2;
    doc.text(sgstText, sgstX, rightY + 1);
    rightY += summaryRowHeight;
    
    // Draw horizontal line
    doc.line(rightTableX, rightY - 2, rightTableX + rightTableWidth, rightY - 2);
    
    // Round off
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Round off:', rightTableX + 2, rightY + 1);
    const roundOffText = roundOff >= 0 ? `+Rs${roundOff.toFixed(2)}` : `Rs${roundOff.toFixed(2)}`;
    const roundOffX = rightTableX + rightTableWidth - doc.getTextWidth(roundOffText) - 2;
    doc.text(roundOffText, roundOffX, rightY + 1);
    rightY += summaryRowHeight;
    
    // Draw horizontal line
    doc.line(rightTableX, rightY - 2, rightTableX + rightTableWidth, rightY - 2);
    
    // Net amount
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Net Amount:', rightTableX + 2, rightY + 1);
    const netAmountText = `Rs${netAmount.toFixed(0)}`;
    const netAmountX = rightTableX + rightTableWidth - doc.getTextWidth(netAmountText) - 2;
    doc.text(netAmountText, netAmountX, rightY + 1);
    
    // Update yPosition to continue from the bottom of the tables
    yPosition = yPosition + summaryTableHeight + 2;
    
    // Removed separate discount breakdown below the summary; now shown inside the left table


    // Payment method and footer - check for page break
    checkPageBreak(15); // Increased space for payment details
    
    // Payment method and details
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    
    // Show simple payment method for all payment types
    doc.text(`Payment: ${sale.payment_method.toUpperCase()}`, leftMargin, yPosition);
    yPosition += 5;

    // Footer
    if (settings.receipt_footer) {
      doc.setFontSize(6); // Restored original size
      doc.text(settings.receipt_footer, leftMargin, yPosition);
    }

    return doc;
  }

  static async printReceipt(
    sale: Sale,
    cartItems: CartItem[],
    settings: Settings,
    cashierName?: string,
    customerName?: string,
    customerMobile?: string,
    customerOffers?: any[],
    bundleOfferEnabled?: boolean,
    oneTimeDiscount?: number
  ): Promise<void> {
    const doc = this.generateReceipt(
      sale,
      cartItems,
      settings,
      cashierName,
      customerName,
      customerMobile,
      customerOffers,
      bundleOfferEnabled,
      oneTimeDiscount
    );
    
    // In a real implementation, you would use the system's print dialog
    // For now, we'll open the PDF in a new window for printing
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  static async saveReceiptAsPDF(
    sale: Sale,
    cartItems: CartItem[],
    settings: Settings,
    cashierName?: string
  ): Promise<void> {
    const doc = this.generateReceipt(sale, cartItems, settings, cashierName);
    const fileName = `receipt_${sale.sale_id}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (window.electronAPI) {
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: fileName,
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        doc.save(result.filePath);
      }
    } else {
      doc.save(fileName);
    }
  }
}
