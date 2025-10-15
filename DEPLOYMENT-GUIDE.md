# POS System - Deployment Guide

## For New PC Setup

### Method 1: Quick Setup (Recommended)
1. **Copy the entire project folder** to the new PC
2. **Double-click `setup-new-pc.bat`**
3. The script will handle everything automatically

### Method 2: Manual Setup
1. **Install Node.js** (https://nodejs.org/)
2. **Open terminal in project folder**
3. **Run:** `npm install`
4. **Run:** `npm run electron-dev`

## For Creating Installer/Executable

### Create Windows Installer
```bash
npm run dist
```
This creates a Windows installer in the `dist` folder.

### Create Portable App
```bash
npm run build
npm run electron-pack
```

## Files to Copy for New PC

### Essential Files:
- All source code files (`src/` folder)
- `package.json`
- `public/` folder
- `setup-new-pc.bat`
- `README-SETUP.md`

### Optional Files:
- `node_modules/` (if you want to skip npm install)
- Database files (if you want to preserve data)

## System Requirements

### Minimum:
- Windows 10/11, macOS 10.14+, or Linux
- Node.js 16+
- 4GB RAM
- 500MB storage

### Recommended:
- Windows 11 or macOS 12+
- Node.js 18+
- 8GB RAM
- 2GB storage

## Database Migration

The app uses SQLite database that's created automatically. To migrate existing data:

1. **Copy the database file** from the old PC:
   - Windows: `%APPDATA%/clothing-pos/database.sqlite`
   - macOS: `~/Library/Application Support/clothing-pos/database.sqlite`
   - Linux: `~/.config/clothing-pos/database.sqlite`

2. **Place it in the same location** on the new PC

## Troubleshooting

### Common Issues:

1. **"node is not recognized"**
   - Install Node.js from https://nodejs.org/
   - Restart computer after installation

2. **"npm is not recognized"**
   - Node.js installation incomplete
   - Reinstall Node.js

3. **"concurrently is not recognized"**
   - Run `npm install` to install dependencies

4. **Port 3000 already in use**
   - Close other applications using port 3000
   - Or change port in package.json

5. **Electron window doesn't open**
   - Run `npm start` first
   - Then run `npx electron .` in another terminal

### Performance Issues:
- Close unnecessary applications
- Ensure adequate RAM (8GB+ recommended)
- Use SSD storage for better performance

## Security Notes

- The app stores data locally in SQLite
- No internet connection required for basic functionality
- Database is not encrypted by default
- Consider backing up database regularly

## Updates

To update the app on a new PC:
1. Replace source code files
2. Run `npm install` to update dependencies
3. Restart the application

## Support

For technical support:
1. Check this guide first
2. Verify Node.js installation
3. Check console for error messages
4. Ensure all dependencies are installed
