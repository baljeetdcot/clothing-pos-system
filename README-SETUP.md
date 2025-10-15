# POS System - New PC Setup Guide

## Quick Setup (Recommended)

1. **Install Node.js**
   - Download from: https://nodejs.org/
   - Choose the LTS version (18.x or higher)
   - Run the installer with default settings

2. **Run Setup Script**
   - Double-click `setup-new-pc.bat`
   - The script will automatically install dependencies and start the app

## Manual Setup

If the automatic setup doesn't work, follow these steps:

1. **Open Command Prompt/PowerShell** in the project folder

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm run electron-dev
   ```

## Troubleshooting

### If you get "node is not recognized" error:
- Node.js is not installed or not in PATH
- Reinstall Node.js and restart your computer

### If you get "npm is not recognized" error:
- Node.js installation is incomplete
- Reinstall Node.js from the official website

### If you get "concurrently is not recognized" error:
- Dependencies are not installed properly
- Run `npm install` again

### If the app doesn't start:
- Make sure no other application is using port 3000
- Try running `npm start` first, then `npx electron .` in a separate terminal

## System Requirements

- **Operating System:** Windows 10/11, macOS, or Linux
- **Node.js:** Version 16 or higher
- **RAM:** Minimum 4GB (8GB recommended)
- **Storage:** At least 500MB free space
- **Screen Resolution:** 1024x768 or higher

## Features

- Point of Sale system for clothing retail
- Inventory management
- Customer management with birthday tracking
- Sales history and reporting
- Stock audit functionality
- Customer offers and discounts
- Barcode scanning support
- Receipt generation

## Support

If you encounter any issues:
1. Check that Node.js is properly installed
2. Ensure all dependencies are installed (`npm install`)
3. Try running the setup script again
4. Check the console for error messages

## Database

The app uses SQLite database which is created automatically on first run. No additional database setup is required.
