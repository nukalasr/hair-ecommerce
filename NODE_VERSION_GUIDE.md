# Node.js Version Requirements

## Current Requirement
This project requires **Node.js LTS version 20.x or 22.x** for production stability.

**Current status:** You are running Node.js v25.2.0 (unstable development version)

## Why LTS Matters
- **Odd-numbered versions** (v25, v23, v21, etc.) are development releases
- **Even-numbered versions** (v20, v22, v24, etc.) receive Long-Term Support (LTS)
- LTS versions get security updates and bug fixes for 30+ months
- Production deployments should ALWAYS use LTS versions

## How to Switch to LTS

### Option 1: Using Homebrew (macOS) - RECOMMENDED
```bash
# Install Node v20 LTS
brew install node@20

# Link it
brew link node@20 --force --overwrite

# Verify
node --version  # Should show v20.x.x
```

### Option 2: Using NVM (Node Version Manager) - BEST FOR MULTIPLE PROJECTS
```bash
# Install NVM (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
```

### Option 3: Using Official Installer
1. Download Node.js v20 LTS from: https://nodejs.org/
2. Run the installer
3. Restart terminal
4. Verify: `node --version`

## Project Configuration

This project includes:
- **`.nvmrc`** - Specifies Node v20.18.1 (automatic with NVM)
- **`package.json` engines** - Enforces Node 20.x or 22.x
- **Backend `package.json` engines** - Same requirement

## After Switching Node Version

```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
cd ..

# Verify everything works
npm run build:prod
npm test
```

## Checking Your Current Version

```bash
node --version   # Should show v20.x.x or v22.x.x
npm --version    # Should show >=9.0.0
```

## CI/CD Configuration

When deploying, ensure your platform uses LTS:

**Railway:**
```
# Railway automatically uses latest LTS
```

**Render:**
```
# In render.yaml or dashboard
node: 20
```

**Vercel:**
```json
// vercel.json
{
  "functions": {
    "node": "20.x"
  }
}
```

**Docker:**
```dockerfile
FROM node:20-alpine
# ... rest of Dockerfile
```

## Current Project Status

✅ `.nvmrc` created (v20.18.1)
✅ `package.json` engines configured
✅ `backend/package.json` engines configured
⚠️  **Action Required:** Switch your local Node version to v20 or v22

## Need Help?

If you encounter issues after switching Node versions:
1. Clear all `node_modules` and reinstall
2. Check for any globally installed packages that need reinstalling
3. Verify npm version is >=9.0.0
4. Run `npm doctor` to diagnose issues
