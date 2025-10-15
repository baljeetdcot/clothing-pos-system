# Clothing POS System

A comprehensive Point of Sale (POS) system built with React, TypeScript, and Electron for clothing retail management.

## 🚀 Features

### Core Functionality
- **Inventory Management**: Add, edit, and manage clothing items with barcode support
- **Billing & Checkout**: Complete sales transactions with customer information
- **Customer Management**: Track customer details and offers
- **Receipt Generation**: Print professional receipts with proper formatting
- **Sales Reports**: View sales history and analytics
- **Stock Management**: Real-time inventory tracking
- **Pricing System**: Flexible pricing with discount tiers and customer offers

### Advanced Features
- **Barcode Scanning**: Support for barcode input and scanning
- **Customer Offers**: Create and manage customer-specific discounts
- **Bundle Pricing**: Automatic bundle pricing for multiple items
- **Tax Calculation**: Built-in GST calculation (5%)
- **Print Confirmation**: Optional receipt printing after sale completion
- **Data Export**: Excel import/export functionality
- **Network Support**: Multi-device synchronization

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd posss
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
The application uses SQLite database which will be created automatically on first run.

## 🚀 Running the Application

### Complete Application Startup
To run the full application, you need to start both the frontend and backend:

**Terminal 1 - Frontend (React App):**
```bash
npm start
```

**Terminal 2 - Backend (Node.js Server):**
```bash
node server.js
```

### Alternative Commands
```bash
# Production Build
npm run build

# Electron Desktop App
npm run electron
```

### Important Notes
- Both commands must be running simultaneously
- Frontend runs on: http://localhost:3000
- Backend server runs on a different port (check server.js for port)
- Keep both terminals open while using the application

## 📱 Application Structure

### Main Components
- **Dashboard**: Overview of sales, inventory, and key metrics
- **Inventory**: Manage clothing items, stock levels, and pricing
- **Billing**: Process sales transactions and checkout
- **Customers**: Manage customer information and offers
- **Reports**: View sales analytics and reports
- **Settings**: Configure store information and preferences

### Key Files
```
src/
├── components/
│   ├── Billing.tsx          # Main billing and checkout interface
│   ├── Inventory.tsx        # Inventory management
│   ├── Customers.tsx        # Customer management
│   ├── Dashboard.tsx        # Main dashboard
│   └── Reports.tsx          # Sales reports
├── services/
│   ├── receiptService.ts    # Receipt generation and printing
│   ├── database.ts          # Database operations
│   ├── pricing.ts           # Pricing calculations
│   └── excelImport.ts       # Excel import/export
└── types/
    └── index.ts             # TypeScript type definitions
```

## 💰 Pricing System

### Discount Tiers
- **₹0-999**: No discount
- **₹1000-1999**: ₹50 off
- **₹2000-2999**: ₹100 off
- **₹3000-4999**: ₹200 off
- **₹5000+**: ₹500 off

### Customer Offers
- **Percentage Discounts**: Custom percentage off
- **Fixed Amount Discounts**: Fixed rupee amount off
- **Bundle Pricing**: Special pricing for multiple items
- **Validity Period**: Offers can be set for specific time periods

## 🧾 Receipt Features

### Receipt Layout
- **Store Information**: Name, address, contact, GSTIN
- **Customer Details**: Name and mobile number
- **Itemized List**: Barcode, item description, quantity, price
- **Pricing Breakdown**: Subtotal, discounts, tax, total
- **Payment Method**: Cash, online, or pending
- **Professional Formatting**: 140mm width, centered on A4

### Receipt Specifications
- **Width**: 140mm (14cm)
- **Paper**: A4 size with centered content
- **Font**: Courier for reliable printing
- **Currency**: Rs (rupee symbol) for compatibility
- **Total Row**: Merged cells with right-aligned amount

## 🔧 Configuration

### Store Settings
Configure your store information in the Settings section:
- Store name
- Store address
- Contact number
- GSTIN number
- Receipt footer message

### Database
The application uses SQLite with the following main tables:
- `inventory_items`: Product catalog
- `sales`: Sales transactions
- `sale_items`: Individual items in each sale
- `customers`: Customer information
- `customer_offers`: Customer-specific offers
- `settings`: Store configuration

## 📊 Usage Guide

### 1. Adding Inventory
1. Go to **Inventory** section
2. Click **Add Item**
3. Fill in item details (name, category, price, barcode)
4. Set initial stock quantity
5. Save the item

### 2. Processing a Sale
1. Go to **Billing** section
2. Scan or manually enter item barcodes
3. Enter customer information
4. Apply any customer offers
5. Review order summary
6. Click **Complete Sale**
7. Choose whether to print receipt

### 3. Managing Customers
1. Go to **Customers** section
2. Add new customers or search existing ones
3. Create customer-specific offers
4. View customer purchase history

### 4. Viewing Reports
1. Go to **Reports** section
2. Select date range
3. View sales analytics
4. Export data if needed

## 🖨️ Printing Setup

### Receipt Printer
- **Width**: 140mm thermal printer recommended
- **Paper**: 80mm or 140mm thermal paper
- **Connection**: USB or network printer

### Print Settings
- The receipt is formatted for 140mm width
- Centered on A4 paper for standard printers
- Uses standard fonts for compatibility

## 🔒 Security Features

- **User Authentication**: Login system for cashiers
- **Data Validation**: Input validation and error handling
- **Backup**: Automatic database backups
- **Audit Trail**: Complete transaction logging

## 🚨 Troubleshooting

### Common Issues

1. **App won't start**
   - Check Node.js version: `node --version`
   - Reinstall dependencies: `npm install`
   - Clear cache: `npm cache clean --force`

2. **Database errors**
   - Check file permissions
   - Ensure database file isn't locked
   - Restart the application

3. **Printing issues**
   - Check printer connection
   - Verify printer drivers
   - Test with different paper sizes

4. **Barcode scanning not working**
   - Check barcode scanner settings
   - Ensure barcodes are properly formatted
   - Try manual entry as alternative

### Getting Help
- Check the console for error messages
- Review the application logs
- Ensure all dependencies are installed

## 📈 Performance Tips

- **Regular Cleanup**: Archive old sales data periodically
- **Database Maintenance**: Optimize database regularly
- **Memory Management**: Restart application if it becomes slow
- **Backup Strategy**: Regular database backups

## 🔄 Updates and Maintenance

### Updating the Application
1. Stop the application
2. Pull latest changes: `git pull`
3. Install new dependencies: `npm install`
4. Restart the application: `npm start`

### Data Backup
- Database file: `pos_database.db`
- Settings: Stored in database
- Regular backups recommended

## 📞 Support

For technical support or feature requests:
- Check the documentation
- Review error logs
- Contact system administrator

## 📄 License

This project is proprietary software. All rights reserved.

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Compatibility**: Windows 10+, Node.js 14+