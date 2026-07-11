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
| **AST-029** | Bookmark Dynamic Gap Compression | High | `Done` | Replace linear vertical scaling with a fractional power curve to compress empty space while enforcing minimum padding. |
| **AST-030** | Bookmark Shared Orbit Grouping | High | `Done` | Group bodies on the same orbit to fan out horizontally along the arc, preventing overlap. Includes smart label alignment. |
| **AST-031** | Disc Shape 3D Lip | Low | `Done` | Render disc shapes with a 3D lip to visually distinguish them from elliptical shapes. |
| **AST-032** | Dynamic Vellum Desk Layout | Medium | `Done` | Implement contiguous scroll background, alpha-composited burn holes showing wood desk beneath, and absolute toolbar overlay layout. |
| **AST-033** | Refactor Living World Scaling | Medium | `Planned` | Remove `branchExtent`, use `sizeClass` for branch length, and remove central planet sphere. |
| **AST-034** | Vellum Directory Symbology | Low | `Done` | Add SVG icons to vellum directory to replace text prefixes. |
| **AST-035** | System Editor Enhancements | Medium | `Done` | Expandable Accordion cards, `planetBaseSizeOffset` and `orbitalDrawStrength`. |
| **AST-036** | System Editor Object Groups | High | `Done` | Structural grouping and cascading visiblity (isHidden, isDMOnly). |
| **AST-037** | Directory Filtering Fixes | Low | `Done` | Exclude background constellations from the directory. |
| **AST-038** | Map Notes | High | `Done` | Basic visual text labels with wrapping, rotation, fonts. |
| **AST-039** | Map Note Interactive Polygons | High | `Done` | Interactive map-canvas dragging for note position, rotation, and custom 4-node clipping polygon boxes. |
| **AST-040** | Title Strike Outline | Medium | `Done` | Add navTitleStrike system setting and render proportionally scaled outlines around map titles. |
| **AST-041** | Decorative Google Fonts | Low | `Done` | Imported 15 script/fantasy Google Fonts for Map Notes usage. |
| **AST-042** | Export & Rendering Bug Fixes | Low | `Done` | Fixed high-res export element scaling, title alignment overlaps, and group expansion state. |
| **AST-043** | Coding Standards Compliance | High | `Done` | Refactored frontend classes to use `#` for encapsulation and strictly enforce one class per file. |

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

### Phase 8: Advanced Bookmark Layouts
- [x] **AST-029: Bookmark Dynamic Gap Compression**
  * Removed linear scale calculation mapping from Bookmark view.
  * Applied non-linear square-root curve algorithm to visually compress large distance gaps without altering mathematical distances.
  * Applied minimum pixel padding rule to separate objects, exempting objects >1 AU in size.
  * Dynamically calculated bottom canvas margins to perfectly accommodate the central primary object.

- [x] **AST-030: Bookmark Shared Orbit Grouping**
  * Implemented grouping strategy to aggregate bodies on identically overlapping orbits.
  * Calculated arc segments to uniformly spread objects horizontally along the top orbital curve.
  * Sub-grouped by `initialAngle` so identical physical bodies (e.g. cloud + planet) correctly stack exactly on top of one another.
  * Implemented Smart Label Alignment, alternating label sides to point outward.
  * Consolidated to a single distance label on the left edge for the entire shared orbit group.

### Phase 9: Rendering Refinements
- [x] **AST-031: Disc Shape 3D Lip**
  * Updated `BaseRenderer.ts` shape path drawing for `disc`.
  * Transitioned from a flat 2D ellipse to a 3D "coin" cylinder shape.
  * Included a projected lip thickness to visually distinguish `disc` worlds from standard `elliptical` worlds.

- [x] **AST-032: Dynamic Vellum Desk Layout**
  * Migrated from a static background image to a dynamic, scalable model-relative parchment scroll canvas graphic.
  * Added `wood_desk.png` layered behind the parchment scroll on the canvas.
  * Rebuilt burn mark decoration rendering to punch true `destination-out` alpha holes through the parchment layer.
  * Adjusted viewport panning constraints and auto-fit logic to account for overlay toolbar occlusion.

- [ ] **AST-033: Refactor Living World Scaling**
  * Removed `branchExtent` property from schema and UI.
  * Tied branch maximum extent directly to standard `sizeClass` and `physicalSize` calculations.
  * Removed central solid planet sphere from `LivingWorldRenderer`.

- [x] **AST-034: Vellum Directory Symbology & Export Polish**
  * Swapped the 'Mephisto' font for 'Elan' in the Vellum Navigation Chart directory.
  * Created 8 new hollow-ink SVG geometric symbols for Celestial Object Types (star, planet, moon, asteroid, station, cloud, living_world, custom).
  * Removed textual object-type prefixes from the directory list, appending the Object Type SVG icon instead.
  * Fixed image export bug to strictly bound exports to the vellum canvas (`exportWidth = paperWidthPx`), stripping out the wood desk background.

### Phase 10: Editor & UI Improvements
- [x] **AST-035: System Editor Enhancements**
  * Converted the System Configuration pane into an expandable accordion card (default expanded for new systems).
  * Added a `planetBaseSizeOffset` slider to independently adjust rendering sizes of planets strictly on the Nav Chart.
  * Added an `orbitalDrawStrength` alpha-opacity slider to configure the visual prominence of dashed orbital lines.
  
- [x] **AST-036: System Editor Object Groups**
  * Added structural `group` type to schema to allow nesting of celestial objects inside foldable "Folders".
  * Refactored `SaveManager.tsx` UI to decouple group expansion state (`expandedGroups`) from object expansion state (`expandedIndex`).
  * Implemented drag-and-drop system to assign objects to groups by dropping onto the Group card, or pull them out via a designated root-level dropzone.
  * Cascaded `isHidden` and `isDMOnly` attributes from groups down to all nested objects, auto-filtering them from Nav Chart and Bookmark Canvas.
  
- [x] **AST-037: Directory Filtering Fixes**
  * Filtered out `constellation` object types from the Vellum Directory left-hand list, as they belong strictly in the background space.

- [x] **AST-038: Map Notes**
  * Added `note` celestial object type for purely visual text labels.
  * Added configuration UI for absolute positioning (AU & Angle), text rotation, font styling, and bounding box limits (`noteMaxWidth`).
  * Implemented a custom word-wrapping rendering pass supporting both explicit line breaks (`\n`) and automatic max-width boundaries.
  * Explicitly excluded from directory lists and auto-fit zoom calculations.

- [x] **AST-039: Map Note Interactive Polygons**
  * Added `noteCorners` to schema for custom 4-node polygons (trapezoids, parallelograms, irregular quadrilaterals).
  * Promoted `expandedIndex` to `useSystemStore` as `selectedObjectIndex` to bind React UI layer to the Canvas rendering engine.
  * Added bounding box outlines and 6 interactive nodes to selected Map Notes on the Canvas.
  * Implemented mathematical pointer drag handlers on the Canvas to translate, rotate, and skew the note independently.
  * Rewrote canvas text-rendering engine to dynamically calculate available horizontal width line-by-line using linear interpolation between left/right boundaries.
  * Added `ctx.clip()` paths to strict crop overflowing text inside the custom polygon.

- [x] **AST-040: Title Strike Outline**
  * Added `Title Strike Outline` system variable to the Celestial Bodies configuration sidebar.
  * Implemented rendering logic in both `VellumNavigationChartRenderer.ts` and `SpaceNavigationChartRenderer.ts` to draw a scaled `strokeText` outline underneath celestial object names.
  * Styled with the exact mathematical average color of the parchment background (`#e0caa6`) for Vellum mode and the pitch-black void color (`#0a0b10`) for Space mode.

- [x] **AST-041: Decorative Google Fonts**
  * Loaded 15 new highly-decorative cursive and fantasy fonts from Google Fonts into `index.html`.
  * Updated `SaveManager.tsx` font dropdowns to remove standard web safe fonts (Arial, Times New Roman, Courier New) and provide the expanded list for Map Notes.

- [x] **AST-042: Export & Rendering Bug Fixes**
  * Added dynamic `exportScale` multiplier (2.5x) to `ExportDirectoryRenderer` to ensure orbital rings, dashes, and text strokes scale proportionately in high-res exports.
  * Extracted orbital cull logic out of `NavChartCanvas` and applied it to `ExportDirectoryRenderer` to properly cull invisible moons on zoom out.
  * Increased application-wide base celestial label fonts (`10/12px` to `14/16px`).
  * Repaired legacy title positioning algorithm that overlapped names with planet centers when sizes were `< 10px`.
  * Patched UI logic to force Celestial Object Group Cards into a closed accordion state by default.

### Phase 11: Codebase Maintenance
- [x] **AST-043: Coding Standards Compliance**
  * Refactored frontend renderer and utility classes to use native JavaScript `#` private fields instead of TypeScript `private` keyword.
  * Split `VisualScaleStrategy.ts` into multiple distinct strategy files to enforce One Class Per File.
  * Extracted inline `PRNG` and `UnionFind` helper classes into centralized utility files.
  * Verified 100% compliance with `coding_standards.md` across both frontend and backend (`src/renderer` and `src/main`).
