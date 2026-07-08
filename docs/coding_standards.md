# Astrolabe Coding Standards & Mandates (LLM Optimized)

This document provides explicit, high-signal instructions for AI models working on the Astrolabe project. Adherence to these mandates is non-negotiable.

## 1. Core Architectural Mandates (Electron + React)
*   **Root Directory Cleanliness:** The project root is reserved for entry points, configuration (e.g., `package.json`, `main.js`), and build scripts. 
*   **Dedicated Layout:**
    *   `src/main/`: Electron main process code (Node.js).
    *   `src/renderer/`: React/TypeScript frontend code for the UI and canvas rendering.
    *   `src/types/`: Centralized TypeScript interfaces shared across the application.
    *   `docs/`: Documentation and specifications.
*   **Inter-Process Communication (IPC):** Use Electron IPC for communication between the React renderer and the Electron main process. **MANDATORY:** All IPC handlers must return responses conforming to the `IpcResponse<T>` schema (`{ success: boolean, data?: T, error?: string, code?: string }`). Unhandled promise rejections must be caught and gracefully surfaced to the UI via the global toast notification system (`useSystemStore().getState().setToastMessage({ type: 'error', text: ... })`).
*   **Relative Paths:** **MANDATORY.** Never use absolute paths.

## 2. Object-Oriented Programming (OOP) & S.O.L.I.D.
*   **One Class/Component Per File:** Every logical unit must be its own file.
*   **Single Responsibility Principle:** One class/component = One specific purpose. Is it Modular? (e.g. `BookmarkCanvas` should delegate actual drawing logic to a renderer style like `SimpleVertBookmarkRenderer`; similarly, complex logic should be separated from React lifecycles).
*   **Encapsulation:** 
    *   **JS/TS (Backend):** Use `#` for private fields in Node.js classes (e.g. `AppManager`, `FileService`, `IpcController`) to enforce strict encapsulation.
    *   **JS/TS (Frontend):** Use standard React conventions (hooks, local state) or `#` for helper classes.
*   **Dependency Injection:** Pass dependencies as arguments or React props.

## 3. Main Process (Node.js) Standards
*   **Purpose:** The Electron main process acts as the local backend for system access (file reading/writing, native dialogs, and high-res canvas exports).
*   **Error Handling:** Use specific exception types. Main process endpoints must return standardized dictionary objects conforming to the `IpcResponse` schema (e.g. `{ success: false, error: "msg", code: "ERR_CODE" }`). Never allow raw stack traces to silently crash the process without returning a structured error response.

## 4. Frontend (React/TypeScript) Standards
*   **Centralized Types:** Import shared TS interfaces (like `CelestialObject`, `RenderContext`, `MapStyleContext`) from the central `src/types/` directory to ensure parity across rendering classes.
*   **Naming:** 
    *   `camelCase` for variables, functions, and methods.
    *   `PascalCase` for Classes, React Components, and TS Types.
    *   `SCREAMING_SNAKE_CASE` for global constants.
    *   `PascalCase` for React component filenames.
*   **State Management:** Keep local state in components where possible; use a lightweight global store (`zustand` via `useSystemStore.ts`) for global app state (active sphere, view modes, toast messages).
*   **Graphics/Canvas:** Encapsulate all Canvas rendering logic into dedicated stateless rendering components (e.g. `BaseRenderer`, `SimpleVertBookmarkRenderer`, `VellumNavigationChartRenderer`) to separate them from standard UI layout controls. React canvas components should act as "View Areas" that instantiate a "Renderer Style" and call `.render()`.

## 5. File Export & Serialization
*   **Data Serialization:** When passing system data to the main process for saving, ensure it matches the `CrystalSphere` JSON schema.
*   **Stateless Processing:** Canvas rendering functions should be stateless, taking input context and returning or drawing the processed result without relying on hidden global state.

## 6. Implementation Checklist
1.  **Is it Modular?** Is the UI separated from graphics rendering and file system processing?
2.  **Are Types Centralized?** Are interfaces imported from `src/types/` rather than declared locally?
3.  **Are Paths Relative?** Does it avoid hardcoded machine-specific paths?
4.  **Error Handling?** Does it gracefully handle file system crashes or export failures in the UI?
5.  **Encapsulation?** Do Node.js classes use `#` for private fields?
