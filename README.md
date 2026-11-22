# STL Joint Maker

Draw gaskets, O-rings and seals over a photo of the part, and export printable **STL** files (plus SVG/DXF outlines).
Built for jobs like re-making a **carburetor gasket**: photograph the flange, calibrate the scale, trace, print in TPU.

**Live app:** https://alexis-devops.github.io/STLJointMaker/

Everything runs in the browser: no server and no CDN. Nothing is uploaded. After the first visit it also works offline.

## Features

- **Background image** (PNG/JPG): opacity, rotation, move, lock
  - **2-point calibration**: click a known distance, type it in mm
  - **4-point perspective correction**: click a known rectangle; the photo is rectified and calibrated in one go
- **2D drawing**: line, polyline, 3-point arc, circle, rectangle, rounded rectangle, spline
  - snapping to grid, endpoints, midpoints, centers and quadrants; Shift for 45° lines
  - exact numeric input (`x,y`, `@dx,dy`, radius / `d`iameter) and an editable properties panel
  - mirror copy, rotate, circular pattern, linear pattern, duplicate, undo/redo
  - entity roles: **Profile**, **Construction** (ignored), **Bead path**
- **Joint types** (corner panel with live 3D preview):
  | Type | What it makes |
  |---|---|
  | Flat | Outer contour minus holes, extruded (holes are detected automatically by nesting) |
  | O-ring | Round cord swept along any closed path, with AS568 and metric presets |
  | Square | Rectangular cord swept along any closed path |
  | Custom | Your own cross-section (D-ring, lip, X-ring…) swept along any closed path |
  | Bead | Flat gasket plus a raised sealing bead around holes and/or along tagged paths |
  | Washer | Quick ID/OD/thickness ring |
- The drawn path can be the seal's **centerline, inner edge or outer edge**, so you can trace the groove directly from the photo
- **Export**: binary STL in mm (Cura, PrusaSlicer, Bambu Studio…), one file per part; 1:1 SVG and DXF of the outline
- **Projects**: several parts per project; autosaved in the browser (IndexedDB); save/open `.sjm.json` files
- **English / Français**
- Material hints for TPU 95A/85A, TPE and rigid templates, including a fuel-compatibility warning

## Typical workflow (carburetor gasket)

1. Photograph the flange **straight on** with a ruler, or put the old gasket on a scanner.
2. *Background image → Load image*, then **Calibrate** (K) on the ruler. Use **Perspective** if the photo is at an angle.
3. Pick **Flat** in the top-right panel and set the thickness.
4. Trace the outer edge, the bore and the bolt holes. Closed shapes inside the outer contour become holes.
5. Check the 3D preview, then **Export STL** and slice. For TPU: print slowly, use little or no retraction, and 100 % infill.

> ⚠️ Fuel resistance of TPU/TPE depends on the brand, and ethanol blends can make it swell. Check the filament
> datasheet, or use the print as a cutting template for a fuel-rated gasket sheet.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # geometry (watertight meshes, volumes), i18n coverage
npm run build      # type-check + production build in dist/
```

Stack: TypeScript, Vite, Canvas 2D editor, [three.js](https://threejs.org) preview, [earcut](https://github.com/mapbox/earcut) triangulation.
Every push to `main` is tested and deployed to GitHub Pages by `.github/workflows/deploy.yml`.

```
src/
  geom/        pure geometry: entities, loop chaining & nesting, extrusion/sweep meshing, STL/SVG/DXF, homography
  editor/      2D canvas editor (view, snapping, tools)
  ui/          panels, dialogs, section editor, icons
  background.ts  image loading, calibration, perspective rectification
  store.ts     state, undo/redo, events      persist.ts  IndexedDB storage
  i18n.ts      EN/FR strings                 preview3d.ts three.js viewer
```

## License

MIT
