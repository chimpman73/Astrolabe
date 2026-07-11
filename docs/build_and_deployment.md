# Astrolabe Build & Deployment Strategy

This document details the architectural decisions and required steps for packaging and deploying the Astrolabe desktop application for end-users (Dungeon Masters and players).

## Deployment Architecture

The application is built using an **Electron + React** stack. It is intended to be distributed as a standalone desktop application (`.exe` for Windows, `.dmg` for macOS).

### Why a Desktop App?
- **Seamless Local Files:** Full, native access to the user's hard drive. It can instantly read and list all `CrystalSphere.json` files in a dedicated save folder.
- **Offline Capable:** Ideal for tabletop D&D sessions where internet access might be unreliable.
- **High-Res Exports:** Bypasses browser memory limits, making it reliable for generating and saving 300 DPI high-resolution PNG map exports.

*Note: While web-hosted versions (SaaS or PWA) were considered, they introduce significant friction for local file management and offline usage, which are core requirements for this tool.*

## Packaging and Distribution

### 1. Build Tools
We will use **Electron Forge** (or alternatively Electron Builder) to package the application.
- **Why:** End-users should not need to install Node.js, run the terminal, or run `npm run dev`. Providing a pre-compiled installer is the industry standard.
- **How it works:** The tool takes the source code, bundles it with a pre-compiled Chromium browser and Node.js environment, and generates an installer file.

### 2. Build Scripts
Build configurations will be checked into source control (GitHub).
- The `package.json` will contain a dedicated script for building (e.g., `"make": "electron-forge make"`).
- Configurations (app icon, executable name, author metadata) will reside in a configuration file like `forge.config.js`.

### 3. File Sizes
Because Electron bundles Chromium and Node.js:
- **Installer Download Size:** ~60 MB to 100 MB (compressed).
- **Installed Size on Disk:** ~150 MB to 250 MB.

### 4. Distribution
Compiled installers will be uploaded to the **"Releases"** section of the GitHub repository for public download.

## Important Considerations for Production

### Code Signing and Security Warnings
- **Windows (SmartScreen):** Unsigned `.exe` files will be flagged as suspicious. Users will have to click "More Info -> Run Anyway" to bypass the warning unless we purchase a Code Signing Certificate.
- **macOS (Gatekeeper):** Unsigned `.dmg` files will be blocked. To prevent this, an Apple Developer License is required to sign and notarize the app.

### Cross-Platform Building
- Windows executables are best built on Windows, and Mac images on Macs.
- **Solution:** We will use **GitHub Actions** (CI/CD). On code push or release tag, GitHub will spin up cloud runners (Windows, Mac, Linux) to compile all installers simultaneously and attach them to the Release automatically.

### Application Assets
- Proper application icons must be created:
  - `.ico` for Windows.
  - `.icns` for macOS.

### Auto-Updates
- In the future, we should configure Electron's `autoUpdater` module. This will allow the application to check GitHub for new releases, download them in the background, and prompt the user to install the update on their next restart.
