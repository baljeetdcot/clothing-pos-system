# Data Export/Import Guide

## 🔄 **Export/Import System Overview**

The POS system now includes comprehensive data export/import functionality that allows you to:
- **Export** all data from Windows PC to a backup file
- **Import** data into cloud deployment (Zeabur/Linux VPS)
- **Transfer** data between different systems
- **Backup** your data for safety

## 📁 **What Gets Exported/Imported**

### **Complete Data Export Includes:**
- ✅ **Inventory Items** - All products with stock quantities
- ✅ **Sales Records** - All transactions and payment details
- ✅ **Users** - Admin and cashier accounts
- ✅ **Settings** - Store configuration and preferences
- ✅ **Customer Offers** - All promotional offers and discounts
- ✅ **Stock Adjustments** - Inventory modification history
- ✅ **Audit Sessions** - Stock audit data
- ✅ **Final Bills** - Bill completion records

## 🚀 **How to Use Export/Import**

### **Step 1: Export Data from Windows PC**

1. **Open** your POS application on Windows
2. **Go to** Settings page
3. **Find** the "Export Data" card
4. **Click** "Export All Data (JSON)" button
5. **File downloads** automatically as `pos-backup-YYYY-MM-DD.json`

### **Step 2: Import Data to Cloud**

1. **Open** your cloud-deployed POS (Zeabur/Linux VPS)
2. **Go to** Settings page
3. **Find** the "Import Data" card
4. **Click** "Select Backup File" button
5. **Choose** the JSON file you exported
6. **Review** the import preview
7. **Configure** import options:
   - ✅ Overwrite existing records
   - ✅ Skip users (preserve current accounts)
   - ✅ Skip sales records
   - ✅ Skip settings (preserve current config)
8. **Click** "Import Data" button

## ⚙️ **Import Options Explained**

### **Overwrite Existing Records**
- **Checked**: Replaces existing data with imported data
- **Unchecked**: Only adds new records, skips duplicates

### **Skip Users**
- **Checked**: Preserves current user accounts
- **Unchecked**: Imports all users from backup

### **Skip Sales Records**
- **Checked**: Preserves current sales history
- **Unchecked**: Imports all sales from backup

### **Skip Settings**
- **Checked**: Preserves current store configuration
- **Unchecked**: Imports all settings from backup

## 📊 **Export Formats**

### **JSON Export (Recommended)**
- **Format**: Complete backup with all data types
- **File**: `pos-backup-YYYY-MM-DD.json`
- **Use**: Full system migration, complete backup
- **Compatibility**: Works with import system

### **CSV Export (Inventory Only)**
- **Format**: Inventory data only
- **File**: `pos-inventory-YYYY-MM-DD.csv`
- **Use**: Excel analysis, inventory management
- **Compatibility**: Excel, Google Sheets

## 🔧 **Technical Details**

### **Export Process**
1. **Collects** all data from database
2. **Creates** structured JSON with metadata
3. **Downloads** file to your device
4. **Includes** export date, version, platform info

### **Import Process**
1. **Validates** backup file format
2. **Shows** preview of data to be imported
3. **Processes** data based on selected options
4. **Reports** success/failure for each data type
5. **Handles** errors gracefully with detailed reporting

## 🛡️ **Safety Features**

### **Data Validation**
- ✅ Validates backup file format before import
- ✅ Checks for required data structure
- ✅ Prevents import of invalid files

### **Error Handling**
- ✅ Continues import even if some records fail
- ✅ Reports detailed error messages
- ✅ Shows success count for each data type

### **Backup Recommendations**
- ✅ Always create backup before importing
- ✅ Test import on development system first
- ✅ Keep multiple backup versions

## 🔄 **Migration Scenarios**

### **Windows PC → Cloud (Zeabur)**
1. Export from Windows PC
2. Import to Zeabur deployment
3. Skip users to preserve cloud accounts
4. Import all other data

### **Cloud → Windows PC**
1. Export from cloud deployment
2. Import to Windows PC
3. Skip users to preserve local accounts
4. Import all other data

### **Backup Before Major Changes**
1. Export current data
2. Make system changes
3. Import backup if needed

## 📋 **Troubleshooting**

### **Import Fails**
- **Check** file format (must be .json)
- **Verify** file is valid POS backup
- **Ensure** sufficient disk space
- **Check** network connection (cloud)

### **Some Records Fail**
- **Review** error messages in import results
- **Check** for duplicate records
- **Verify** data integrity in backup file

### **Performance Issues**
- **Large** datasets may take time to import
- **Progress** bar shows import status
- **Don't** close browser during import

## 🎯 **Best Practices**

### **Regular Backups**
- Export data weekly/monthly
- Keep multiple backup versions
- Store backups in safe location

### **Before Major Changes**
- Always backup before system updates
- Test changes on development system
- Keep rollback capability

### **Data Migration**
- Test import process first
- Use appropriate import options
- Verify data integrity after import

## 📞 **Support**

If you encounter issues with export/import:
1. **Check** error messages in the interface
2. **Verify** backup file is valid JSON
3. **Ensure** sufficient permissions
4. **Contact** support with error details

The export/import system provides a robust way to transfer data between systems and maintain backups of your POS data.
