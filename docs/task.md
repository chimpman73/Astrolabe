# Astrolabe Program Implementation Tasks

This file tracks the design, development, and integration tasks for the Astrolabe Crystal Sphere mapping tool. 

## Task Summary Table

| ID | Task Name | Priority | Status | Description |
| :--- | :--- | :---: | :---: | :--- |
| **AST-001** | Project Setup & Scaffolding | High | `Done` | Initialize React + TypeScript + CSS setup (optionally Electron wrapper). |
| **AST-002** | Install Rendering & State Libraries | High | `Done` | Install Zustand (state) and canvas drawing library (e.g. Konva.js/PixiJS). |
| **AST-003** | Core Data Model & JSON Parsing | High | `Done` | Create TS types/interfaces matching the `CrystalSphere.json` schema and save/load logic. |
| **AST-004** | Orbit Mathematics Engine | High | `Done` | Implement physics/math engine for Keplerian/linear orbital period and active 2D coordinate calculations. |
| **AST-005** | View A: Bookmark View Drawing | High | `Done` | Implement bottom-centered canvas rendering radial orbits within $2 \cdot d_{\text{max}}$ scale. |
| **AST-006** | View A: Control Toggles | Medium | `Done` | Implement Light/Dark mode backgrounds and Crystal Sphere shell toggle for Bookmark View. |
| **AST-007** | View B: Parchment Layout & Scroll Styling | Medium | `Done` | Style the dual-pane layout with parchment/vellum CSS aesthetics. |
| **AST-008** | View B: System Directory Pane | Medium | `Done` | Implement the left pane showing sorted lists of bodies with name, type, and descriptions. |
| **AST-009** | View B: Full Map Canvas | High | `Done` | Render full circular orbits, planets, and sub-orbiting moons in the right-hand panel. |
| **AST-010** | View B: Time Scrubbers & Animation | High | `Done` | Implement date time-step controls to update system date and animate orbits. |
| **AST-011** | File Save & Directory Manager | High | `Done` | Build JSON export/import and directory listing of system save files. |
| **AST-012** | Math Validation & Regression Tests | Medium | `Done` | Create unit tests to verify orbital position math against pre-calculated dates. |
| **AST-013** | Design Polish & Animation Tuning | Low | `Done` | Add transition animations, hover effects, tooltips, and premium theme styling. |
| **AST-014** | System Editor Scrollbar | High | `Done` | Add vertical scrollbar and scroll wrapper with wheel support for editor panel. |
| **AST-015** | Sub-orbiting Parent Filtering | High | `Done` | Exclude sub-orbiting planets from the central star scale scope in Bookmark and Nav views. |
| **AST-016** | Custom Font Declarations & Observers | Medium | `Done` | Configure Mephisto and ITC Eras-Bold via local @font-face rules and browser font ready handlers. |
| **AST-017** | Bookmark Label Enlargement | Medium | `Done` | Increase all Bookmark canvas text labels by 1.5x. |
| **AST-018** | Stationary & Retrograde Orbits | High | `Done` | Add `isStationary` flag and `orbitDirection` field; update math engine and both canvas views. |
| **AST-019** | Non-Standard World Shapes | High | `Done` | Add `worldShape` field; render disc, pyramid, cluster, and irregular shapes on both canvases. |
| **AST-020** | Elemental Affinity Icons | Medium | `Done` | Add `elementAffinity` field; render color-coded element badges on body sprites in both views. |
| **AST-021** | Nebula & Sargasso Cloud Objects | High | `Done` | Add `nebula`/`sargasso` types and `arcDegrees` field; render as arc-wedge smears in Nav Chart and horizontal cloud ellipses in Bookmark. |
| **AST-022** | Fantasy Extension Documentation | Low | `Done` | Update `astrolabe_documentation.md` schema and math sections; update `task.md`. |
| **AST-023** | Castle Station Shape | Medium | `Done` | Add `castle` to worldShape; implement custom rendering logic and editor UI. |
| **AST-024** | Skull Station Shape | Medium | `Done` | Add `skull` to worldShape; implement custom rendering logic with cutout eye sockets. |
| **AST-025** | PC/DM Visibility Toggle | High | `Done` | Add `isDMOnly` field and editor checkbox to hide specific objects from PC views. |
| **AST-026** | PC/DM Global View Toggle | High | `Done` | Add global UI toggle to switch between PC/DM modes; filter map views accordingly. |
| **AST-027** | Bookmark Dynamic Scaling | Medium | `Done` | Scale Bookmark view dynamically to outermost visible object when shell is hidden. |
| **AST-028** | Bookmark Titles | Low | `Done` | Display system name without 'SHELL' suffix when shell boundary is hidden. |

---

## Detailed Task Breakdown

### Phase 1: Environment & Architecture
- [x] **AST-001: Project Setup & Scaffolding**
  * Initialize project in current directory
  * Set up React, TypeScript, and asset bundling configurations
- [x] **AST-002: Install Rendering & State Libraries**
  * Configure Zustand for modular state management
  * Setup canvas drawing packages

### Phase 2: Schema & Mathematical Models
- [x] **AST-003: Core Data Model & JSON Parsing**
  * Define TypeScript Interfaces matching the JSON schema
  * Implement parsing/validation layer with fallback options
- [x] **AST-004: Orbit Mathematics Engine**
  * Write calculation logic for angular velocity $\omega$ and current angle $\theta(t)$
  * Implement parent-relative coordinate transforms: $\mathbf{x}_{\text{global}} = \mathbf{x}_{\text{parent}} + \mathbf{x}_{\text{rel}}$
- [x] **AST-012: Math Validation & Regression Tests**
  * Setup test suites for the coordinates engine at various epoch steps

### Phase 3: Visual Elements (View A - Bookmark)
- [x] **AST-005: View A: Bookmark View Drawing**
  * Build Bookmark component with canvas rendering
  * Calculate scale mappings to center the star at bottom, and highest orbit $2 \cdot d_{\text{max}}$ at top boundary
- [x] **AST-006: View A: Control Toggles**
  * Add background color switch (black/white) and invert stroke colors
  * Add toggle to draw or hide the boundary shell curve

### Phase 4: Navigational Chart (View B - Nav Chart)
- [x] **AST-007: View B: Parchment Layout & Scroll Styling**
  * Implement dual-pane grid layout
  * Create custom CSS variables for scroll textures, sepia/vellum color palettes
- [x] **AST-008: View B: System Directory Pane**
  * Sort lists of items based on distance from the center outward
  * Display list with custom icons corresponding to celestial types
- [x] **AST-009: View B: Full Map Canvas**
  * Implement coordinate plotting for main stars, orbiting planets, and secondary moons
  * Draw full circular paths for orbits
- [x] **AST-010: View B: Time Scrubbers & Animation**
  * Implement slider controls mapping to `currentSystemDate`
  * Add Play/Pause loop behavior to advance dates automatically

### Phase 5: File Operations & Integration
- [x] **AST-011: File Save & Directory Manager**
  * Create component to list files in save directory
  * Implement Save / Save As / Load functionality for JSON configs
- [x] **AST-013: Design Polish & Animation Tuning**
  * Implement premium visual effects, hover micro-animations, and tooltips

### Phase 6: Post-Release Refinements & Font Customization
- [x] **AST-014: System Editor Scrollbar**
  * Added vertical scroll wrapper with standard overflow containment
  * Allowed mouse wheel events to scroll the sidebar panel natively
- [x] **AST-015: Sub-orbiting Parent Filtering**
  * Fixed filtering checks to check parent objects (Sol/null) instead of type === 'planet'
  * Corrected zoom calculations and directory lists to prevent sub-orbiters from behaving as primary planets
- [x] **AST-016: Custom Font Declarations & Observers**
  * Configured `@font-face` bindings in `index.css` for local `.otf` and `.ttf` assets
  * Integrated React font load ready listener (`document.fonts.ready`) to auto-redraw canvas viewports
- [x] **AST-017: Bookmark Label Enlargement**
  * Increased label dimensions (star, objects, shell) by 1.5x on canvas
  * Adjusted label text offsets to prevent overlap with celestial bodies

### Phase 7: Fantasy World Extensions
- [x] **AST-018: Stationary & Retrograde Orbits**
  * Added `isStationary` boolean field — stationary objects stay fixed at `initialAngle`, unaffected by time
  * Added `orbitDirection` (`prograde` | `retrograde`) — retrograde negates angular velocity for clockwise motion
  * Updated `calculateAngle()` in `orbitMath.ts` with new optional parameters
  * System Editor: tri-state motion control button group (▶ PRO / ◆ FIXED / ◄ RETRO)
  * Bookmark View: appends ` ◆` or ` ↺` suffix to stationary/retrograde body labels
  * Nav Chart: diamond ring indicator drawn around stationary bodies; ↺ label suffix for retrograde

- [x] **AST-019: Non-Standard World Shapes**
  * Added `worldShape` field: `sphere` (default), `disc`, `pyramid`, `cluster`, `irregular`
  * Both canvas views switch on `worldShape` to draw ellipses, triangles, multi-circle clusters, or jagged polygons
  * System Editor: dropdown selector hidden for nebula/sargasso types

- [x] **AST-020: Elemental Affinity Icons**
  * Added `elementAffinity` field: `fire` (red), `water` (blue), `earth` (brown), `air` (grey), or `null`
  * Both canvas views render a small color-coded filled circle badge in the upper-right quadrant of the body sprite
  * System Editor: dropdown selector for all non-star objects

- [x] **AST-021: Nebula & Sargasso Cloud Objects**
  * Added `nebula` and `sargasso` to `CelestialObjectType` enum
  * Added `arcDegrees` field (angular arc width in degrees) — controls cloud extent along the orbital path
  * Nav Chart: renders a filled arc-wedge smear (`radialDepth × arcDegrees`) behind all solid bodies
  * Bookmark View: renders as a semi-transparent horizontal ellipse cloud, scaled to `arcDegrees` fraction of canvas width
  * System Editor: `arcDegrees` input field visible only for cloud-type objects

- [x] **AST-022: Fantasy Extension Documentation**
  * Updated `astrolabe_documentation.md` schema section (5 new JSON fields)
  * Updated `task.md` with new tasks AST-018 through AST-022

- [x] **AST-023: Castle Station Shape**
  * Added `castle` enum value to `WorldShape` type.
  * Implemented path drawing logic in `BaseRenderer` for a castle silhouette.
  * Updated System Editor dropdown to include Castle for station objects.
  * Updated JSON schema documentation.

- [x] **AST-024: Skull Station Shape**
  * Added `skull` enum value to `WorldShape` type.
  * Implemented path drawing logic in `BaseRenderer` for a skull with counter-clockwise cutouts for eyes and nose.
  * Updated System Editor dropdown to include Skull for station objects.
  * Updated JSON schema documentation.

- [x] **AST-025: PC/DM Visibility Toggle**
  * Added `isDMOnly` boolean field to `CelestialObject` interface.
  * Added "👁️ DM Only" toggle checkbox next to the boundary checkbox in the System Editor UI.
  * Updated JSON schema documentation.

- [x] **AST-026: PC/DM Global View Toggle**
  * Added `viewMode` state ('PC' | 'DM') to Zustand store.
  * Added global toggle buttons to the main application header.
  * Filtered objects in NavChart and Bookmark views based on `isDMOnly` and `viewMode`, without affecting system scale.

- [x] **AST-027: Bookmark Dynamic Scaling**
  * Modified Bookmark view to calculate `visibleMaxDistance` from filtered `planetaryObjects`.
  * Used `visibleMaxDistance` to scale canvas when the shell outline is hidden.

- [x] **AST-028: Bookmark Titles**
  * Display the system name without 'SHELL' suffix when the shell boundary is hidden.
  * Adjusted vertical position of the label to y=12 for a cleaner layout above the top object.
