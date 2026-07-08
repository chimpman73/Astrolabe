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
    "shellBoundaryType": {
      "type": "string",
      "enum": ["double", "relativeMargin", "custom"],
      "description": "Configures how far the crystal shell is placed relative to the furthest orbit. Defaults to double."
    },
    "shellCustomScale": {
      "type": "number",
      "minimum": 1.0,
      "description": "The exact multiplier used for the Crystal Shell distance when shellBoundaryType is set to 'custom' or 'relativeMargin'. Defaults to 1.2."
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
        "sizeClass",
        "physicalSize",
        "sizeUnit",
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
          "enum": ["star", "planet", "moon", "asteroid", "station", "custom", "cloud", "living_world"],
          "description": "Category of the celestial body."
        },
        "worldShape": {
          "type": "string",
          "enum": ["sphere", "disc", "pyramid", "cluster", "irregular", "elliptical", "ring", "cylinder", "ship", "rectangular", "castle", "skull"],
          "description": "The visual shape to render. (Ring, cylinder, ship, castle, and skull are intended for stations)."
        },
        "isHidden": {
          "type": "boolean",
          "description": "If true, the object is completely hidden from map canvases (but still affects boundary calculations)."
        },
        "affectsShellBoundary": {
          "type": "boolean",
          "description": "If false, the object is ignored when calculating the system's Crystal Sphere shell bounds. Defaults to true."
        },
        "isDMOnly": {
          "type": "boolean",
          "description": "If true, the object is considered a DM-only object and hidden from PC views. Defaults to false (PC object)."
        },
        "sizeClass": {
          "type": "string",
          "enum": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
          "description": "Categorical scale bracket (A through J) that defines the physical magnitude of the object."
        },
        "physicalSize": {
          "type": "number",
          "description": "Specific diameter of the object. Must fall within the boundaries of the selected sizeClass."
        },
        "sizeUnit": {
          "type": "string",
          "enum": ["miles", "AU"],
          "description": "The unit of measurement for physicalSize (miles for A-I, AU for J)."
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
        },
        "arcDegrees": {
          "type": "number",
          "minimum": 1,
          "maximum": 360,
          "description": "For cloud types: angular arc width in degrees along the orbital path."
        },
        "cloudTransparency": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "For cloud types: alpha transparency of the cloud."
        },
        "cloudiness": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "For cloud types: bumpiness of the cloud edges (0.0 is smooth, 1.0 is max cloudy)."
        },
        "cloudObjectShape": {
          "type": "string",
          "enum": ["sphere", "disc", "pyramid", "cluster", "irregular", "elliptical"],
          "description": "For cloud types: shape of objects drawn inside the cloud."
        },
        "cloudObjectSize": {
          "type": "number",
          "minimum": 0,
          "description": "For cloud types: size of objects drawn inside the cloud."
        },
        "cloudObjectDensity": {
          "type": "number",
          "minimum": 0,
          "description": "For cloud types: density (or count) of objects drawn inside the cloud."
        },
        "branchLevels": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5,
          "description": "Depth/tiers of branching for a living_world."
        },
        "branchDensity": {
          "type": "number",
          "minimum": 1,
          "maximum": 10,
          "description": "Branching factor/density for a living_world."
        },
        "hasLeaves": {
          "type": "boolean",
          "description": "Whether to draw leaves at the branch tips for a living_world."
        },
        "branchBend": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 2.0,
          "description": "How much the branches bend at nodes for a living_world."
        }
      }
    }
  }
}
```

### 2.2 Planetary Scale Classes
The `sizeClass` defines the bounded magnitude of the body. When parsing physical scale, the application respects the following boundaries:
* **Size A**: Less than 10 miles
* **Size B**: 10 - 100 miles
* **Size C**: 100 - 1,000 miles
* **Size D**: 1,000 - 4,000 miles
* **Size E**: 4,000 - 10,000 miles
* **Size F**: 10,000 - 40,000 miles
* **Size G**: 40,000 - 100,000 miles
* **Size H**: 100,000 - 1,000,000 miles
* **Size I**: 1,000,000 - 10,000,000 miles
* **Size J**: Measured exclusively in AU (where 1 AU = 92,955,807 miles). Used for supersized objects (e.g. gigantic clouds or mega-structures).

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
   *Primary objects (where `orbitedObjectName` is null) orbit the invisible coordinate origin $\mathbf{x}_{\text{central}} = (0, 0)$. Stars are treated as standard celestial bodies.*

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
* **Inline Form/Card Editor**: Form fields that load and display active celestial config parameters. Uses a scroll wrapper (`overflow-y: auto`) that provides scrollbar visibility and native mouse-wheel scrolling.
* **Drag-and-Drop Reordering**: Users can drag and drop celestial object cards to reorder the internal array, which directly dictates the Z-index rendering order on the canvases (objects lower in the list are drawn on top).
* **Visibility Toggles**: A hide/show button on each card controls the `isHidden` property to exclude objects from canvas views (while retaining them in system scale boundaries).
* **Boundary Toggles**: A secondary toggle allows users to define whether an object `affectsShellBoundary`, controlling if it is included when calculating the Crystal Sphere's outer radius.
* **Shape Customization**: Users can select the `worldShape` (e.g. Sphere, Cluster, Elliptical). If the object is a "Station", the dropdown conditionally updates to show station-exclusive shapes (Ring, Cylinder, Ship).
* **On-the-fly Validation**: Parses input dynamically. Shows details of JSON syntax errors or schema validation warnings in a red alert banner.
* **Apply & Save**: Commits edits directly to the local save folder.

#### Panel 2: Bookmark (Center Pane)
A vertical strip (fixed width 280px) displaying a radial hierarchy.
* **Default Theme**: Defaults to **Dark Mode** for enhanced starlight contrast.
* **Scale-to-Fit Canvas**: The canvas itself is styled with standard CSS containment (`max-width: 100%`, `max-height: 100%`, `width: auto`, `height: auto`, and `aspect-ratio: 1 / 3`), which forces it to scale down to fit whichever dimension is smaller (width or height). 
* **Dynamic Gap Compression**: The Bookmark does not use a strict linear scale. To prevent overlapping inner planets and excessive empty outer space, it mathematically compresses large orbital gaps using a fractional power curve and enforces a minimum pixel padding between distinct orbits (exempting `Size J` mega-objects). 
* **Shared Orbit Grouping**: If multiple bodies share the exact same orbital distance, they are fanned out horizontally along the top arc of their shared dashed orbit path to prevent overlapping icons. Name labels automatically alternate sides (pointing outward) and a single distance label is drawn for the group. Exception: If the bodies share both distance AND initial angle, they are permitted to draw directly on top of each other.
* **Dynamic Scaling & Boundaries**:
  * If the Crystal Shell outline is **ON**, the drawing boundary `shellDistance` defaults to `2 * maxDistance` (Double) or `1.2 * maxDistance` (Relative Margin) depending on `shellBoundaryType`, centering the furthest planet on screen and allocating the top portion of the canvas to the shell and navigation metadata.
  * If the Crystal Shell outline is toggled **OFF**, the drawing boundary `shellDistance` recalibrates to `maxDistance`, scaling the furthest planet directly to the top of the canvas and distributing all planets proportionally across the full screen height (with proportional margins to prevent clipping).
* **Scope**: Displays only objects directly orbiting the central star (ignoring moons, satellites, and sub-orbiting planets).
* **Typography**: Celestial object labels (names and distances) are drawn with **ITC Eras-Bold** at a 1.5x scale multiplier for improved legibility. Shell boundary headers are rendered using the gothic fantasy font **Mephisto**.
* **Compact Controls**: Small overlays to switch background mode (Light/Dark), toggle the shell boundary outline, toggle distance labels (DIST: ON/OFF), and export a high-res portrait PNG (300 DPI).

#### Panel 3: Navigation Chart (Right Pane)
A responsive map canvas occupying all remaining screen width (`flex: 1`).
* **Dynamic Sizing**: Uses `ResizeObserver` to read container width and height. Resizes the canvas drawing buffer on window adjustments to prevent stretching or clipping.
* **Viewport Panning and Zooming**: A single unified `viewport` state strictly ties together panning and zooming to prevent tracking drift. The zoom respects hard `MIN_ZOOM` and `MAX_ZOOM` constraints, while tracking accurate CSS scaling matrices to maintain dead-center mouse wheel zoom targeting.
* **Hybrid Scaling Strategy**: The system applies a hybrid zoom scale. At macro zoom levels, planets adhere to miniature symbolic baseline sizes (e.g. Size A = 1px, Size J = 12px) preventing objects from becoming invisible. At micro zoom levels, it seamlessly inflates objects directly to their literal pixel dimensions.
* **Sub-orbiter Culling**: To declutter dense inner solar systems, sub-orbiters (moons) and their orbital lines are dynamically culled from rendering if their orbital radius in pixels is smaller than their parent planet's visual footprint (plus padding). They pop into view automatically when the user zooms in closer.
* **Dynamic Scale Bar**: An overlay draws a static 50px line in the bottom right corner, dynamically calculating the physical distance it represents. It intelligently shifts units from Astronomical Units (AU) down to miles if the distance drops below 0.1 AU.
* **Scale-to-Fit**: Automatically updates zoom and centering offsets on load or window resize to ensure the entire Crystal Sphere shell remains visible within the viewport. Autofit dimensions are calculated exclusively using primary celestial bodies that orbit the invisible coordinate origin directly (excluding sub-orbiting planets). The zoom boundary respects the active `shellBoundaryType`.
* **Simulation controls**: Scrubber controls and play/pause options to progress `currentSystemDate` and animate orbital vectors.
* **Chart Export**: Combines map views to export a high-res landscape PNG (300 DPI), featuring a left-pane System Directory list where sub-orbiting planets are correctly nested under their parent bodies instead of duplicate primary lists.

---

## 5. Technology Stack Recommendations
* **Frontend**: React (TypeScript) + custom CSS custom properties. Uses local `@font-face` loads for **Mephisto** (general application layers) and **ITC Eras-Bold** (canvas object labels).
* **Font Loading Hook**: Uses `document.fonts.ready` observer in React component hooks to trigger automatic canvas redraws once font files have loaded asynchronously.
* **State Management**: Zustand to coordinate dates, configurations, and file loading states.
* **Native Wrappers**: Electron prebuilt binary exposing filesystem methods securely via IPC and preload contexts.
