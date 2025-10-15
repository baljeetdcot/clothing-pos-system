# Quick Start Guide - Clothing Store POS

## 🚀 Getting Started in 5 Minutes

### 1. Prerequisites
- Windows 10/11
- Node.js (Download from https://nodejs.org/)

### 2. Installation
```bash
# Clone or download the project
# Navigate to project folder
cd clothing-pos

# Install dependencies
npm install

# Start development mode
npm run electron-dev
```

### 3. First Login
- **Username**: `admin`
- **Password**: `admin123`

### 4. Initial Setup (Admin Only)

#### Step 1: Configure Store Settings
1. Go to **Settings** → **Store Information**
2. Enter your store name
3. Add GSTIN number (optional)
4. Set tax rate (default: 18%)
5. Customize receipt footer
6. Click **Save Settings**

#### Step 2: Import Inventory
1. Go to **Settings** → **Download Template**
2. Fill the Excel template with your products
3. Go to **Inventory** → **Import Excel**
4. Select your filled template
5. Click **Import**

#### Step 5: Create Additional Users (Optional)
1. Go to **Settings** → **User Management**
2. Click **Add User**
3. Create cashier accounts as needed

### 5. Processing Your First Sale

#### For Cashiers:
1. Go to **Billing**
2. Scan barcode or enter item code manually
3. System automatically applies pricing rules
4. Add more items to cart
5. Review order summary
6. Click **Complete Sale**
7. Print receipt if needed

#### For Admins:
- All cashier features plus:
- Inventory management
- Sales reports
- User management
- System settings

## 📋 Key Features Overview

### Billing System
- **Barcode Scanning**: Scan product barcodes
- **Manual Entry**: Type item codes manually
- **Bundle Pricing**: Automatic 3-for-2 deals
- **Discount Tiers**: Progressive discounts
- **Price Override**: Manual price adjustments
- **Receipt Printing**: Print or save as PDF

### Inventory Management
- **Excel Import**: Bulk import from Excel
- **Real-time Stock**: Automatic stock updates
- **Low Stock Alerts**: Visual warnings
- **Category Organization**: T-shirts, Shirts, Jeans, etc.

### Pricing Rules (Built-in)
- **T-shirts**: 1 @ ₹499, 3 @ ₹1199
- **Shirts**: 1 @ ₹699, 3 @ ₹1699
- **Jeans**: 1 @ ₹999, 3 @ ₹2499
- **Trousers**: 1 @ ₹849, 3 @ ₹2199

### Discount Tiers
- Total > ₹3000 → ₹250 off
- Total > ₹5000 → ₹500 off
- Total > ₹7000 → ₹750 off

## 🔧 Troubleshooting

### Common Issues

**"Database error"**
- Restart the application
- Check if SQLite is properly initialized

**"Excel import fails"**
- Ensure file is .xlsx format
- Check column headers match template exactly
- Remove empty rows

**"Receipt won't print"**
- Check printer connection
- Try "Save as PDF" instead
- Verify printer drivers

**"App won't start"**
- Run `npm install` again
- Check Node.js version (16+ required)
- Run `npm run electron-dev` for development

### Getting Help
1. Check the main README.md for detailed documentation
2. Review error messages in the application
3. Contact support team with specific error details

## 📦 Building Installer

To create a Windows installer:

```bash
# Build the application
npm run build

# Create installer
npm run dist
```

The installer will be in the `dist/` folder.

## 🎯 Next Steps

1. **Customize**: Modify pricing rules in Settings
2. **Scale**: Add more product categories
3. **Integrate**: Set up Firebase for multi-store sync
4. **Extend**: Add more payment methods
5. **Optimize**: Configure for your specific workflow

---

**Need more help?** Check the full documentation in README.md
