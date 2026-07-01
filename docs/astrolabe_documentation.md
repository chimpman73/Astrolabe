# Astrolabe Program Specification & Technical Design

This document details the specifications, file formats, mathematical foundations, and UI requirements for the **Astrolabe Program**—a mapping tool designed for D&D Spelljammer campaign settings. It compiles and structures the rules required for an LLM or developer to build the application.

---

## 1. System Overview
The Astrolabe Program is a system-mapping tool that visualizes planetary systems ("Crystal Spheres") within the Spelljammer campaign setting. Systems are defined dynamically using structured JSON configuration files. The program renders these configurations into a unified workspace showcasing three vertical side-by-side panels arranged horizontally:
1. **System Editor**: Raw text configuration editor with dynamic schema validation.
2. **Bookmark**: A narrow vertical strip map focused on the relative radial scale of orbits.
3. **Navigation Chart**: A landscape interactive map displaying full orbital paths, sub-orbits (moons), and time-progression controls.

---

## 2. Data Schema (`CrystalSphere.json`)
The application saves and loads system states via JSON configuration files stored in a user-configurable save directory.

### 2.1 JSON Schema Definition
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CrystalSphere",
  "type": "object",
  "required": [
    "sphereName",
    "currentCampaignDate",
    "currentSystemDate",
    "objects"
  ],
  "properties": {
    "sphereName": {
      "type": "string",
      "description": "The name of the Crystal Sphere system."
    },
    "currentCampaignDate": {
      "type": "string",
      "description": "The current campaign calendar date (e.g. YYYY-MM-DD or custom calendar format)."
    },
    "currentSystemDate": {
      "type": "integer",
      "minimum": 0,
      "description": "The system epoch date in elapsed days. Used to calculate active orbital angles."
    },
    "objects": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/CelestialObject"
      }
    }
  },
  "definitions": {
    "CelestialObject": {
      "type": "object",
      "required": [
        "name",
        "type",
        "size",
        "description",
        "distanceOrbited",
        "initialAngle"
      ],
      "properties": {
        "name": {
          "type": "string"
        },
        "type": {
          "type": "string",
          "enum": ["star", "planet", "moon", "asteroid", "station", "custom"],
          "description": "Category of the celestial body."
        },
        "size": {
          "type": "number",
          "description": "Relative physical size/diameter of the object."
        },
        "description": {
          "type": "string",
          "description": "A brief narrative description of the body."
        },
        "orbitedObjectName": {
          "type": ["string", "null"],
          "default": null,
          "description": "Name of the parent body this object orbits. If null or omitted, it orbits the central object (coordinate 0,0)."
        },
        "distanceOrbited": {
          "type": "number",
          "minimum": 0,
          "description": "Orbital radius/distance from the parent body (in Astronomical Units or custom system units)."
        },
        "initialAngle": {
          "type": "number",
          "minimum": 0,
          "maximum": 360,
          "description": "Starting orbital angle in degrees at currentCampaignDate (t = 0)."
        },
        "orbitalPeriodDays": {
          "type": "number",
          "minimum": 0.1,
          "description": "Optional override for orbital period in days. If omitted, it is calculated automatically from orbital distance."
        }
      }
    }
  }
}
```

---

## 3. Mathematical Foundations & Motion Engine

### 3.1 Time-Step Progression
The system tracks time using the `currentSystemDate` ($t$ in days). When the user advances time:
$$t_{\text{new}} = t_{\text{current}} + \Delta t$$

### 3.2 Orbital Period Calculation
If `orbitalPeriodDays` ($P$) is not explicitly provided in the JSON, it must be derived based on the orbital distance ($d$):
* **Keplerian Approximation (Standard Option)**:
  $$P = k \cdot d^{1.5}$$
  *(where $k$ is a scaling constant mapping a standard distance unit to days).*
* **Custom Linear Scale (Alternative Option)**:
  $$P = k \cdot d$$

### 3.3 Position Calculations
Positions are evaluated in 2D polar space relative to the orbited parent object.
1. **Angular Velocity ($\omega$)**:
   $$\omega = \frac{360}{P} \text{ degrees/day}$$
2. **Current Angle ($\theta$)**:
   $$\theta(t) = \theta_0 + (\omega \cdot t) \pmod{360}$$
   *(where $\theta_0$ is `initialAngle` and $t$ is `currentSystemDate`)*
3. **Cartesian Coordinates ($x, y$)**:
   $$\begin{aligned}
   x_{\text{rel}}(t) &= d \cdot \cos\left(\theta(t) \cdot \frac{\pi}{180}\right) \\
   y_{\text{rel}}(t) &= d \cdot \sin\left(\theta(t) \cdot \frac{\pi}{180}\right)
   \end{aligned}$$
4. **Global Offset Transformation**:
   For any body orbiting a parent:
   $$\mathbf{x}_{\text{global}} = \mathbf{x}_{\text{parent\_global}} + \mathbf{x}_{\text{rel}}$$
   *The primary/central star (where `orbitedObjectName` is null) sits at $\mathbf{x}_{\text{central}} = (0, 0)$.*

---

## 4. UI Layout & View Specifications

The application uses an explicit **three-column side-by-side vertical layout** where each panel stretches from the top header to the bottom of the viewport, separated by thick double-line brass borders.

```
+-------------------------------------------------------------------------------+
| ASTROLABE                       [Open System]  [New]  [Save]                  |
+-------------------+----------------------------+------------------------------+
|                   |                            |                              |
|                   |                            |                              |
|   System Editor   |          Bookmark          |       Navigation Chart       |
|   (JSON Code)     |           (Portrait        |         (Landscape           |
|                   |            radial          |          responsive          |
|                   |            orbits)         |          orbits)             |
|                   |                            |                              |
|                   |                            |                              |
+-------------------+----------------------------+------------------------------+
```

### 4.1 Layout Architecture & Flexing
The layout uses a flex row `.main-workspace { display: flex; flex-direction: row; height: 100%; }` to align panels side-by-side. 
* **Expand & Collapse States**:
  * Each panel can be collapsed into a narrow **45px vertical strip** by clicking the collapse chevron inside its header.
  * The collapsed strip displays the panel title vertically (`writing-mode: vertical-rl`) with an expand arrow, and expands back to normal width when clicked.
  * The other panels flex horizontally in real time to accommodate the width differences.

### 4.2 Top Header Menu Actions
Three quick-access buttons are directly available in the top navbar:
1. **Open System**: Triggers a modal picker listing all files in the save directory.
2. **New**: Prompts for a sphere name and creates a template config.
3. **Save**: Writes the active configuration directly to the save file.

### 4.3 Vertical Layout Panels

#### Panel 1: System Editor (Left Pane)
A vertical panel of width 360px.
* **Inline Code Editor**: Text area that loads and displays the active system JSON configuration.
* **On-the-fly Validation**: Parses input dynamically. Shows details of JSON syntax errors or schema validation warnings in a red alert banner.
* **Apply & Save**: Commits edits directly to the local save folder.

#### Panel 2: Bookmark (Center Pane)
A vertical strip (fixed width 280px) displaying a radial hierarchy.
* **Default Theme**: Defaults to **Dark Mode** for enhanced starlight contrast.
* **Scale-to-Fit Canvas**: The canvas itself is styled with standard CSS containment (`max-width: 100%`, `max-height: 100%`, `width: auto`, `height: auto`, and `aspect-ratio: 1 / 3`), which forces it to scale down to fit whichever dimension is smaller (width or height). 
* **Dynamic Scaling & Boundaries**:
  * If the Crystal Shell outline is **ON**, the drawing boundary `shellDistance` defaults to `2 * maxDistance`, centering the furthest planet on screen and allocating the top half of the canvas to the shell and navigation metadata.
  * If the Crystal Shell outline is toggled **OFF**, the drawing boundary `shellDistance` recalibrates to `maxDistance`, scaling the furthest planet directly to the top of the canvas and distributing all planets proportionally across the full screen height (with proportional margins to prevent clipping).
* **Scope**: Displays only objects directly orbiting the central star (ignoring moons).
* **Compact Controls**: Small overlays to switch background mode (Light/Dark), toggle the shell boundary outline, toggle distance labels (DIST: ON/OFF), and export a high-res portrait PNG (300 DPI).

#### Panel 3: Navigation Chart (Right Pane)
A responsive map canvas occupying all remaining screen width (`flex: 1`).
* **Dynamic Sizing**: Uses `ResizeObserver` to read container width and height. Resizes the canvas drawing buffer on window adjustments to prevent stretching or clipping.
* **Scale-to-Fit**: Automatically updates zoom and centering offsets on load or window resize to ensure the entire Crystal Sphere shell remains visible within the viewport.
* **Simulation controls**: Scrubber controls and play/pause options to progress `currentSystemDate` and animate orbital vectors.
* **Chart Export**: Combines map views to export a high-res landscape PNG (300 DPI).

---

## 5. Technology Stack Recommendations
* **Frontend**: React (TypeScript) + custom CSS custom properties (cinzel/outfit parchment theme).
* **State Management**: Zustand to coordinate dates, configurations, and file loading states.
* **Native Wrappers**: Electron prebuilt binary exposing filesystem methods securely via IPC and preload contexts.
