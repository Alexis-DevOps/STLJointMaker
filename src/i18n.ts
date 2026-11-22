export type Lang = 'en' | 'fr';

type Dict = Record<string, string>;

const en: Dict = {
  'top.projects': 'Projects',
  'top.new': 'New',
  'top.open': 'Open…',
  'top.openTitle': 'Open a project file (.sjm.json)',
  'top.save': 'Save file',
  'top.saveTitle': 'Download the project as a file (Ctrl+S)',
  'top.undo': 'Undo (Ctrl+Z)',
  'top.redo': 'Redo (Ctrl+Y)',
  'top.help': 'Help & shortcuts',

  'panel.joint': 'Joint type',
  'panel.parts': 'Parts',
  'panel.props': 'Properties',
  'panel.bg': 'Background image',
  'panel.settings': 'Settings',

  'tool.select': 'Select / move',
  'tool.line': 'Line',
  'tool.polyline': 'Polyline',
  'tool.arc': 'Arc (3 points)',
  'tool.circle': 'Circle',
  'tool.rect': 'Rectangle',
  'tool.rrect': 'Rounded rectangle',
  'tool.spline': 'Spline curve',
  'tool.measure': 'Measure',
  'tool.calibrate': 'Calibrate',
  'tool.perspective': 'Perspective',
  'tool.bgmove': 'Move image',
  'tool.mirror': 'Mirror copy',
  'tool.rotate': 'Rotate',
  'tool.cpattern': 'Circular pattern',
  'tool.lpattern': 'Linear pattern',
  'tool.fit': 'Zoom to fit',

  'hint.select': 'Click to select · drag to move · drag empty space to box-select (right→left = crossing) · Space/middle-drag to pan',
  'hint.line0': 'Click the start point (type x,y for exact coordinates)',
  'hint.line1': 'Click the next point · Shift = 45° · Esc/right-click to stop',
  'hint.poly0': 'Click the first point',
  'hint.poly1': 'Click to add points · click the first point to close · Enter/double-click to finish open',
  'hint.arc0': 'Click the arc start point',
  'hint.arc1': 'Click the arc end point',
  'hint.arc2': 'Click a point on the arc',
  'hint.circle0': 'Click the center',
  'hint.circle1': 'Click a point on the circle, or type a radius (d12 = diameter 12)',
  'hint.rect0': 'Click the first corner',
  'hint.rect1': 'Click the opposite corner (or type @width,height)',
  'hint.measure0': 'Click the first point',
  'hint.measure1': 'Click the second point',
  'hint.calib0': 'Click the first end of a known distance on the image',
  'hint.calib1': 'Click the other end of the known distance',
  'hint.persp0': 'Click corner 1 (top-left) of a real rectangle on the image',
  'hint.persp1': 'Click corner 2 (top-right)',
  'hint.persp2': 'Click corner 3 (bottom-right)',
  'hint.persp3': 'Click corner 4 (bottom-left)',
  'hint.bgmove': 'Drag to move the background image',
  'hint.mirror0': 'Click the first point of the mirror axis',
  'hint.mirror1': 'Click the second point of the mirror axis',
  'hint.pickCenter': 'Click the center point',

  'jt.flat': 'Flat',
  'jt.flat.desc': 'Flat gasket: the outer contour minus holes, extruded to a thickness. Ideal for carburetor flanges and covers.',
  'jt.oring': 'O-ring',
  'jt.oring.desc': 'Round cord (toric) swept along each closed path you draw — circle or any shape.',
  'jt.square': 'Square',
  'jt.square.desc': 'Rectangular-section cord swept along each closed path.',
  'jt.custom': 'Custom',
  'jt.custom.desc': 'Your own cross-section (D-ring, lip seal, X-ring…) swept along each closed path.',
  'jt.bead': 'Bead',
  'jt.bead.desc': 'Flat gasket with a raised sealing bead around holes and/or along paths tagged "Bead path".',
  'jt.washer': 'Washer',
  'jt.washer.desc': 'Quick ring washer from inner/outer diameters; no drawing needed.',

  'p.thickness': 'Thickness',
  'p.cord': 'Cord Ø',
  'p.width': 'Width',
  'p.height': 'Height',
  'p.align': 'Drawn path is',
  'align.center': 'the centerline',
  'align.inside': 'the inner edge',
  'align.outside': 'the outer edge',
  'p.beadW': 'Bead width',
  'p.beadH': 'Bead height',
  'p.beadAroundHoles': 'Bead around every hole',
  'p.beadOffset': 'Bead distance from hole',
  'p.beadHint': 'Tip: set entities to the role “Bead path” to add beads anywhere.',
  'p.preset': 'Standard size',
  'p.presetChoose': 'Choose a size…',
  'p.metric': 'Metric (common)',
  'p.presetHint': 'Sets the cord and resizes the selected circle to the ring ID (or adds a new circle).',
  'p.editSection': 'Edit section…',
  'p.washerId': 'Inner Ø',
  'p.washerOd': 'Outer Ø',

  'info.tris': '{n} triangles',
  'info.loops': '{n} closed contours · {h} holes',
  'info.open': '{n} open contour(s) ignored — close them (red dots mark the gaps).',

  'err.thickness': 'Thickness must be greater than 0.',
  'err.noClosed': 'Draw at least one closed contour (role “Profile”).',
  'err.section': 'Invalid cross-section.',
  'err.washer': 'Outer Ø must be larger than inner Ø, and thickness > 0.',
  'err.noBead': 'No bead: enable “around every hole” or tag paths as “Bead path”.',

  'warn.thin': 'Thinner than the {v} mm recommended for this material.',
  'warn.section': 'Section smaller than the {v} mm recommended for this material.',
  'warn.beadTall': 'The bead is much taller than the gasket; it may not print well.',
  'warn.rigid': 'Rigid material: it will not seal. Use it for templates, jigs or test fits.',
  'warn.fuel': 'Fuel: TPU/TPE resistance to gasoline varies by brand; ethanol blends can make it swell. Check your filament datasheet, or use the print as a template to cut a fuel-rated gasket sheet.',

  'export.stl': 'Export STL',
  'export.svg': 'Export the 2D outline as SVG (1:1 mm)',
  'export.dxf': 'Export the 2D outline as DXF (mm)',

  'parts.add': 'Add',
  'parts.duplicate': 'Duplicate',
  'parts.delete': 'Delete',
  'parts.part': 'Part',
  'parts.name': 'Part name',
  'parts.confirmDelete': 'Delete “{name}” and its drawing?',

  'props.none': 'Nothing selected. Pick the Select tool (V) and click a shape.',
  'props.count': '{n} entities selected',
  'props.role': 'Role',
  'props.length': 'Length',
  'props.angle': 'Angle',
  'props.cx': 'Center X',
  'props.cy': 'Center Y',
  'props.start': 'Start',
  'props.sweep': 'Sweep',
  'props.radius': 'Corner radius',
  'props.points': '{n} points — drag the handles to edit',
  'props.closed': 'Closed',
  'role.profile': 'Profile',
  'role.construction': 'Construction (ignored)',
  'role.bead': 'Bead path',
  'ent.line': 'Line',
  'ent.polyline': 'Polyline',
  'ent.spline': 'Spline',
  'ent.arc': 'Arc',
  'ent.circle': 'Circle',
  'ent.rect': 'Rectangle',
  'op.duplicate': 'Duplicate',
  'op.delete': 'Delete',

  'bg.empty': 'Load a photo or scan (PNG/JPG) of the part or old gasket, then calibrate it to trace at real scale. You can also drop an image onto the canvas.',
  'bg.load': 'Load image…',
  'bg.replace': 'Replace',
  'bg.remove': 'Remove',
  'bg.confirmRemove': 'Remove the background image?',
  'bg.calibrated': 'Calibrated',
  'bg.notCalibrated': 'Not calibrated — scale is approximate',
  'bg.opacity': 'Opacity',
  'bg.visible': 'Visible',
  'bg.locked': 'Locked',
  'bg.rotation': 'Rotation',
  'bg.width': 'Image width',

  'set.material': 'Material',
  'set.tolerance': 'Curve precision',
  'set.rectRadius': 'Rounded rect radius',
  'set.snapGrid': 'Snap to grid',
  'set.snapPoints': 'Snap to points',
  'set.ghosts': 'Show other parts',
  'mat.tpu95': 'TPU 95A',
  'mat.tpu85': 'TPU 85A (soft)',
  'mat.tpe': 'TPE',
  'mat.petg': 'PETG / rigid (template)',

  'status.snapGrid': 'Grid',
  'status.snapPoints': 'Points',
  'status.coordPh': 'x,y or @dx,dy ⏎',
  'status.radiusPh': 'radius or d+diameter ⏎',
  'status.coordLabel': 'Coordinate input',
  'status.saving': 'Saving…',
  'status.saved': 'Saved in browser',
  'status.saveFailed': 'Not saved',

  'dlg.calibTitle': 'Calibrate image',
  'dlg.calibDist': 'Real distance between the two points (mm)',
  'dlg.perspTitle': 'Perspective correction',
  'dlg.perspW': 'Real width, corner 1 → 2 (mm)',
  'dlg.perspH': 'Real height, corner 1 → 4 (mm)',
  'dlg.rotateTitle': 'Rotate selection',
  'dlg.angle': 'Angle (°, counter-clockwise)',
  'dlg.keepOriginal': 'Keep the original (rotate a copy)',
  'dlg.cpatternTitle': 'Circular pattern',
  'dlg.lpatternTitle': 'Linear pattern',
  'dlg.count': 'Total count (including original)',
  'dlg.totalAngle': 'Total angle (°)',
  'dlg.dx': 'Spacing X (mm)',
  'dlg.dy': 'Spacing Y (mm)',

  'sec.title': 'Cross-section editor',
  'sec.help': 'Drag points · click an edge to add a point · right-click a point to delete it. Horizontal = across the path (positive = outward), vertical = height above the bed.',
  'sec.points': 'Points (x; y in mm, one per line)',
  'sec.invalid': 'Need at least 3 valid “x; y” lines.',
  'sec.bed': 'bed',
  'sec.outward': 'outward',
  'sec.dring': 'D-ring',
  'sec.lip': 'Lip seal',
  'sec.xring': 'X-ring',
  'sec.halfround': 'Half-round',
  'sec.trapezoid': 'Trapezoid',

  'proj.title': 'Projects saved in this browser',
  'proj.none': 'No saved projects yet.',
  'proj.parts': '{n} part(s)',
  'proj.untitled': 'Untitled',
  'proj.name': 'Project name',
  'proj.confirmDelete': 'Delete project “{name}”? This cannot be undone.',
  'proj.cantDeleteCurrent': 'Open another project before deleting this one.',
  'proj.storageNote': 'Projects are stored only in this browser. Use “Save file” to back up or move them to another computer.',

  'btn.ok': 'OK',
  'btn.cancel': 'Cancel',
  'btn.close': 'Close',

  'msg.selectFirst': 'Select one or more shapes first.',
  'msg.noImage': 'Load a background image first.',
  'msg.bgLocked': 'The image is locked. Unlock it in the Background panel.',
  'msg.calibrated': 'Image calibrated.',
  'msg.processing': 'Correcting perspective…',
  'msg.rectified': 'Perspective corrected and image calibrated.',
  'msg.rectifyFailed': 'Perspective correction failed: check the 4 corners.',
  'msg.imageLoaded': 'Image loaded. Next: calibrate it with a known distance.',
  'msg.imageType': 'Only PNG and JPG images are supported.',
  'msg.imageFailed': 'Could not read this image.',
  'msg.presetApplied': 'Ring {id} × {cs} mm applied.',
  'msg.lastPart': 'A project needs at least one part.',
  'msg.nothingToExport': 'Nothing to export yet for this part.',
  'msg.exported': 'Exported.',
  'msg.opened': 'Project opened.',
  'msg.badFile': 'This is not a valid STL Joint Maker project file.',
  'msg.saveFailed': 'Could not save in the browser (storage full?). Use “Save file”.',

  'help.title': 'How to use STL Joint Maker',
  'help.html': `<ol>
<li><b>Load a photo</b> of the part or old gasket (Background panel or drag &amp; drop). Shoot straight on, with a ruler in the frame if possible.</li>
<li><b>Calibrate</b> (K): click two points a known distance apart and type the real distance. If the photo is taken at an angle, use <b>Perspective</b> with a known rectangle.</li>
<li><b>Choose the joint type</b> in the top-right corner.</li>
<li><b>Trace</b> the contours with lines, arcs, circles, splines… The largest closed shape is the outside; shapes inside it become holes. Lines must connect end to end (snapping helps).</li>
<li>Check the 3D preview, then <b>Export STL</b> (one file per part) and slice it in Cura.</li>
</ol>
<h3>Shortcuts</h3>
<table>
<tr><td>V L P A C R O S M K</td><td>Select, Line, Polyline, Arc, Circle, Rectangle, Rounded rect, Spline, Measure, Calibrate</td></tr>
<tr><td>F</td><td>Zoom to fit</td></tr>
<tr><td>Wheel · middle-drag · Space+drag</td><td>Zoom · pan</td></tr>
<tr><td>Shift (drawing)</td><td>Constrain to 45°</td></tr>
<tr><td>Alt (drawing)</td><td>Disable snapping</td></tr>
<tr><td>Type numbers</td><td>Exact point: <code>x,y</code> absolute, <code>@dx,dy</code> relative, <code>12,5;3</code> with decimal comma; circle radius <code>6</code> or diameter <code>d12</code></td></tr>
<tr><td>Enter · Esc · right-click</td><td>Finish · cancel</td></tr>
<tr><td>Ctrl+Z / Ctrl+Y</td><td>Undo / redo</td></tr>
<tr><td>Ctrl+D · Del · Ctrl+A</td><td>Duplicate · delete · select all</td></tr>
<tr><td>Ctrl+S</td><td>Save project file</td></tr>
</table>
<h3>Printing tips (TPU)</h3>
<p>Print slowly (15–25 mm/s), disable or minimize retraction, 100 % infill, and a layer height that divides the thickness evenly. Everything stays in your browser; nothing is uploaded.</p>`,
};

const fr: Dict = {
  'top.projects': 'Projets',
  'top.new': 'Nouveau',
  'top.open': 'Ouvrir…',
  'top.openTitle': 'Ouvrir un fichier projet (.sjm.json)',
  'top.save': 'Enregistrer',
  'top.saveTitle': 'Télécharger le projet dans un fichier (Ctrl+S)',
  'top.undo': 'Annuler (Ctrl+Z)',
  'top.redo': 'Rétablir (Ctrl+Y)',
  'top.help': 'Aide et raccourcis',

  'panel.joint': 'Type de joint',
  'panel.parts': 'Pièces',
  'panel.props': 'Propriétés',
  'panel.bg': 'Image de fond',
  'panel.settings': 'Réglages',

  'tool.select': 'Sélectionner / déplacer',
  'tool.line': 'Ligne',
  'tool.polyline': 'Polyligne',
  'tool.arc': 'Arc (3 points)',
  'tool.circle': 'Cercle',
  'tool.rect': 'Rectangle',
  'tool.rrect': 'Rectangle arrondi',
  'tool.spline': 'Courbe spline',
  'tool.measure': 'Mesurer',
  'tool.calibrate': 'Calibrer',
  'tool.perspective': 'Perspective',
  'tool.bgmove': 'Déplacer l’image',
  'tool.mirror': 'Copie miroir',
  'tool.rotate': 'Rotation',
  'tool.cpattern': 'Répétition circulaire',
  'tool.lpattern': 'Répétition linéaire',
  'tool.fit': 'Tout afficher',

  'hint.select': 'Clic pour sélectionner · glisser pour déplacer · glisser dans le vide pour une sélection rectangle (droite→gauche = par intersection) · Espace/clic molette pour se déplacer',
  'hint.line0': 'Cliquez le point de départ (tapez x,y pour des coordonnées exactes)',
  'hint.line1': 'Cliquez le point suivant · Maj = 45° · Échap/clic droit pour arrêter',
  'hint.poly0': 'Cliquez le premier point',
  'hint.poly1': 'Cliquez pour ajouter des points · cliquez le premier point pour fermer · Entrée/double-clic pour terminer ouvert',
  'hint.arc0': 'Cliquez le début de l’arc',
  'hint.arc1': 'Cliquez la fin de l’arc',
  'hint.arc2': 'Cliquez un point sur l’arc',
  'hint.circle0': 'Cliquez le centre',
  'hint.circle1': 'Cliquez un point du cercle, ou tapez un rayon (d12 = diamètre 12)',
  'hint.rect0': 'Cliquez le premier coin',
  'hint.rect1': 'Cliquez le coin opposé (ou tapez @largeur,hauteur)',
  'hint.measure0': 'Cliquez le premier point',
  'hint.measure1': 'Cliquez le second point',
  'hint.calib0': 'Cliquez une extrémité d’une distance connue sur l’image',
  'hint.calib1': 'Cliquez l’autre extrémité de la distance connue',
  'hint.persp0': 'Cliquez le coin 1 (haut-gauche) d’un vrai rectangle sur l’image',
  'hint.persp1': 'Cliquez le coin 2 (haut-droite)',
  'hint.persp2': 'Cliquez le coin 3 (bas-droite)',
  'hint.persp3': 'Cliquez le coin 4 (bas-gauche)',
  'hint.bgmove': 'Glissez pour déplacer l’image de fond',
  'hint.mirror0': 'Cliquez le premier point de l’axe de symétrie',
  'hint.mirror1': 'Cliquez le second point de l’axe de symétrie',
  'hint.pickCenter': 'Cliquez le point central',

  'jt.flat': 'Plat',
  'jt.flat.desc': 'Joint plat : le contour extérieur moins les trous, extrudé à une épaisseur. Idéal pour brides et couvercles de carburateur.',
  'jt.oring': 'Torique',
  'jt.oring.desc': 'Cordon rond (joint torique) suivant chaque chemin fermé dessiné — cercle ou forme quelconque.',
  'jt.square': 'Carré',
  'jt.square.desc': 'Cordon à section rectangulaire suivant chaque chemin fermé.',
  'jt.custom': 'Perso',
  'jt.custom.desc': 'Votre propre section (D, lèvre, X…) suivant chaque chemin fermé.',
  'jt.bead': 'Bourrelet',
  'jt.bead.desc': 'Joint plat avec un bourrelet d’étanchéité autour des trous et/ou le long des chemins « Bourrelet ».',
  'jt.washer': 'Rondelle',
  'jt.washer.desc': 'Rondelle rapide à partir des diamètres intérieur/extérieur ; aucun dessin nécessaire.',

  'p.thickness': 'Épaisseur',
  'p.cord': 'Ø du cordon',
  'p.width': 'Largeur',
  'p.height': 'Hauteur',
  'p.align': 'Le tracé est',
  'align.center': 'l’axe du joint',
  'align.inside': 'le bord intérieur',
  'align.outside': 'le bord extérieur',
  'p.beadW': 'Largeur bourrelet',
  'p.beadH': 'Hauteur bourrelet',
  'p.beadAroundHoles': 'Bourrelet autour de chaque trou',
  'p.beadOffset': 'Distance au trou',
  'p.beadHint': 'Astuce : donnez le rôle « Bourrelet » à des tracés pour ajouter des bourrelets n’importe où.',
  'p.preset': 'Taille standard',
  'p.presetChoose': 'Choisir une taille…',
  'p.metric': 'Métrique (courant)',
  'p.presetHint': 'Règle le cordon et redimensionne le cercle sélectionné au Ø intérieur (ou ajoute un cercle).',
  'p.editSection': 'Modifier la section…',
  'p.washerId': 'Ø intérieur',
  'p.washerOd': 'Ø extérieur',

  'info.tris': '{n} triangles',
  'info.loops': '{n} contours fermés · {h} trous',
  'info.open': '{n} contour(s) ouvert(s) ignoré(s) — fermez-les (les points rouges marquent les trous).',

  'err.thickness': 'L’épaisseur doit être supérieure à 0.',
  'err.noClosed': 'Dessinez au moins un contour fermé (rôle « Profil »).',
  'err.section': 'Section invalide.',
  'err.washer': 'Le Ø extérieur doit dépasser le Ø intérieur, et l’épaisseur être > 0.',
  'err.noBead': 'Aucun bourrelet : activez « autour de chaque trou » ou donnez le rôle « Bourrelet » à des tracés.',

  'warn.thin': 'Plus fin que les {v} mm recommandés pour ce matériau.',
  'warn.section': 'Section inférieure aux {v} mm recommandés pour ce matériau.',
  'warn.beadTall': 'Le bourrelet est bien plus haut que le joint ; l’impression risque d’être difficile.',
  'warn.rigid': 'Matériau rigide : il n’assurera pas l’étanchéité. À utiliser comme gabarit ou pour tester l’ajustement.',
  'warn.fuel': 'Carburant : la résistance du TPU/TPE à l’essence dépend de la marque ; l’éthanol (E10) peut le faire gonfler. Vérifiez la fiche technique, ou servez-vous de l’impression comme gabarit pour découper une feuille à joint résistante aux carburants.',

  'export.stl': 'Exporter STL',
  'export.svg': 'Exporter le contour 2D en SVG (1:1 mm)',
  'export.dxf': 'Exporter le contour 2D en DXF (mm)',

  'parts.add': 'Ajouter',
  'parts.duplicate': 'Dupliquer',
  'parts.delete': 'Supprimer',
  'parts.part': 'Pièce',
  'parts.name': 'Nom de la pièce',
  'parts.confirmDelete': 'Supprimer « {name} » et son dessin ?',

  'props.none': 'Rien de sélectionné. Prenez l’outil Sélection (V) et cliquez une forme.',
  'props.count': '{n} éléments sélectionnés',
  'props.role': 'Rôle',
  'props.length': 'Longueur',
  'props.angle': 'Angle',
  'props.cx': 'Centre X',
  'props.cy': 'Centre Y',
  'props.start': 'Début',
  'props.sweep': 'Ouverture',
  'props.radius': 'Rayon des coins',
  'props.points': '{n} points — glissez les poignées pour modifier',
  'props.closed': 'Fermé',
  'role.profile': 'Profil',
  'role.construction': 'Construction (ignoré)',
  'role.bead': 'Bourrelet',
  'ent.line': 'Ligne',
  'ent.polyline': 'Polyligne',
  'ent.spline': 'Spline',
  'ent.arc': 'Arc',
  'ent.circle': 'Cercle',
  'ent.rect': 'Rectangle',
  'op.duplicate': 'Dupliquer',
  'op.delete': 'Supprimer',

  'bg.empty': 'Chargez une photo ou un scan (PNG/JPG) de la pièce ou de l’ancien joint, puis calibrez-la pour tracer à l’échelle réelle. Vous pouvez aussi déposer une image sur la zone de dessin.',
  'bg.load': 'Charger une image…',
  'bg.replace': 'Remplacer',
  'bg.remove': 'Retirer',
  'bg.confirmRemove': 'Retirer l’image de fond ?',
  'bg.calibrated': 'Calibrée',
  'bg.notCalibrated': 'Non calibrée — échelle approximative',
  'bg.opacity': 'Opacité',
  'bg.visible': 'Visible',
  'bg.locked': 'Verrouillée',
  'bg.rotation': 'Rotation',
  'bg.width': 'Largeur image',

  'set.material': 'Matériau',
  'set.tolerance': 'Précision des courbes',
  'set.rectRadius': 'Rayon rect. arrondi',
  'set.snapGrid': 'Aimanter à la grille',
  'set.snapPoints': 'Aimanter aux points',
  'set.ghosts': 'Afficher les autres pièces',
  'mat.tpu95': 'TPU 95A',
  'mat.tpu85': 'TPU 85A (souple)',
  'mat.tpe': 'TPE',
  'mat.petg': 'PETG / rigide (gabarit)',

  'status.snapGrid': 'Grille',
  'status.snapPoints': 'Points',
  'status.coordPh': 'x,y ou @dx,dy ⏎',
  'status.radiusPh': 'rayon ou d+diamètre ⏎',
  'status.coordLabel': 'Saisie de coordonnées',
  'status.saving': 'Enregistrement…',
  'status.saved': 'Enregistré dans le navigateur',
  'status.saveFailed': 'Non enregistré',

  'dlg.calibTitle': 'Calibrer l’image',
  'dlg.calibDist': 'Distance réelle entre les deux points (mm)',
  'dlg.perspTitle': 'Correction de perspective',
  'dlg.perspW': 'Largeur réelle, coin 1 → 2 (mm)',
  'dlg.perspH': 'Hauteur réelle, coin 1 → 4 (mm)',
  'dlg.rotateTitle': 'Rotation de la sélection',
  'dlg.angle': 'Angle (°, sens anti-horaire)',
  'dlg.keepOriginal': 'Garder l’original (pivoter une copie)',
  'dlg.cpatternTitle': 'Répétition circulaire',
  'dlg.lpatternTitle': 'Répétition linéaire',
  'dlg.count': 'Nombre total (original compris)',
  'dlg.totalAngle': 'Angle total (°)',
  'dlg.dx': 'Pas en X (mm)',
  'dlg.dy': 'Pas en Y (mm)',

  'sec.title': 'Éditeur de section',
  'sec.help': 'Glissez les points · cliquez une arête pour ajouter un point · clic droit sur un point pour le supprimer. Horizontal = en travers du tracé (positif = vers l’extérieur), vertical = hauteur au-dessus du plateau.',
  'sec.points': 'Points (x; y en mm, un par ligne)',
  'sec.invalid': 'Il faut au moins 3 lignes « x; y » valides.',
  'sec.bed': 'plateau',
  'sec.outward': 'extérieur',
  'sec.dring': 'Joint en D',
  'sec.lip': 'Joint à lèvre',
  'sec.xring': 'Joint X',
  'sec.halfround': 'Demi-rond',
  'sec.trapezoid': 'Trapèze',

  'proj.title': 'Projets enregistrés dans ce navigateur',
  'proj.none': 'Aucun projet enregistré pour l’instant.',
  'proj.parts': '{n} pièce(s)',
  'proj.untitled': 'Sans titre',
  'proj.name': 'Nom du projet',
  'proj.confirmDelete': 'Supprimer le projet « {name} » ? Action irréversible.',
  'proj.cantDeleteCurrent': 'Ouvrez un autre projet avant de supprimer celui-ci.',
  'proj.storageNote': 'Les projets sont stockés uniquement dans ce navigateur. Utilisez « Enregistrer » pour les sauvegarder ou les transférer sur un autre ordinateur.',

  'btn.ok': 'OK',
  'btn.cancel': 'Annuler',
  'btn.close': 'Fermer',

  'msg.selectFirst': 'Sélectionnez d’abord une ou plusieurs formes.',
  'msg.noImage': 'Chargez d’abord une image de fond.',
  'msg.bgLocked': 'L’image est verrouillée. Déverrouillez-la dans le panneau Image de fond.',
  'msg.calibrated': 'Image calibrée.',
  'msg.processing': 'Correction de la perspective…',
  'msg.rectified': 'Perspective corrigée et image calibrée.',
  'msg.rectifyFailed': 'Échec de la correction : vérifiez les 4 coins.',
  'msg.imageLoaded': 'Image chargée. Étape suivante : calibrez-la avec une distance connue.',
  'msg.imageType': 'Seules les images PNG et JPG sont acceptées.',
  'msg.imageFailed': 'Impossible de lire cette image.',
  'msg.presetApplied': 'Joint {id} × {cs} mm appliqué.',
  'msg.lastPart': 'Un projet doit contenir au moins une pièce.',
  'msg.nothingToExport': 'Rien à exporter pour cette pièce.',
  'msg.exported': 'Exporté.',
  'msg.opened': 'Projet ouvert.',
  'msg.badFile': 'Ce n’est pas un fichier projet STL Joint Maker valide.',
  'msg.saveFailed': 'Enregistrement impossible dans le navigateur (stockage plein ?). Utilisez « Enregistrer ».',

  'help.title': 'Utiliser STL Joint Maker',
  'help.html': `<ol>
<li><b>Chargez une photo</b> de la pièce ou de l’ancien joint (panneau Image de fond ou glisser-déposer). Photographiez bien de face, avec une règle dans le cadre si possible.</li>
<li><b>Calibrez</b> (K) : cliquez deux points d’écart connu et saisissez la distance réelle. Si la photo est prise en biais, utilisez <b>Perspective</b> avec un rectangle connu.</li>
<li><b>Choisissez le type de joint</b> dans le coin en haut à droite.</li>
<li><b>Tracez</b> les contours avec lignes, arcs, cercles, splines… La plus grande forme fermée est l’extérieur ; les formes à l’intérieur deviennent des trous. Les lignes doivent se rejoindre bout à bout (l’aimantation aide).</li>
<li>Vérifiez l’aperçu 3D puis <b>Exportez le STL</b> (un fichier par pièce) et tranchez-le dans Cura.</li>
</ol>
<h3>Raccourcis</h3>
<table>
<tr><td>V L P A C R O S M K</td><td>Sélection, Ligne, Polyligne, Arc, Cercle, Rectangle, Rect. arrondi, Spline, Mesure, Calibrer</td></tr>
<tr><td>F</td><td>Tout afficher</td></tr>
<tr><td>Molette · clic molette · Espace+glisser</td><td>Zoom · déplacement</td></tr>
<tr><td>Maj (en dessin)</td><td>Contraindre à 45°</td></tr>
<tr><td>Alt (en dessin)</td><td>Désactiver l’aimantation</td></tr>
<tr><td>Taper des nombres</td><td>Point exact : <code>x,y</code> absolu, <code>@dx,dy</code> relatif, <code>12,5;3</code> avec virgule décimale ; rayon <code>6</code> ou diamètre <code>d12</code></td></tr>
<tr><td>Entrée · Échap · clic droit</td><td>Terminer · annuler</td></tr>
<tr><td>Ctrl+Z / Ctrl+Y</td><td>Annuler / rétablir</td></tr>
<tr><td>Ctrl+D · Suppr · Ctrl+A</td><td>Dupliquer · supprimer · tout sélectionner</td></tr>
<tr><td>Ctrl+S</td><td>Enregistrer le fichier projet</td></tr>
</table>
<h3>Conseils d’impression (TPU)</h3>
<p>Imprimez lentement (15–25 mm/s), rétraction désactivée ou minimale, remplissage 100 %, et une hauteur de couche qui divise exactement l’épaisseur. Tout reste dans votre navigateur ; rien n’est envoyé.</p>`,
};

const dicts: Record<Lang, Dict> = { en, fr };
let lang: Lang = 'en';

export function setLang(l: Lang): void {
  lang = l;
  document.documentElement.lang = l;
}

export function getLang(): Lang {
  return lang;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? dicts.en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Translate static markup: data-i18n (text), data-i18n-title, data-i18n-aria. */
export function applyI18n(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((e) => (e.textContent = t(e.dataset.i18n!)));
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((e) => {
    e.title = t(e.dataset.i18nTitle!);
    e.setAttribute('aria-label', e.title);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((e) => e.setAttribute('aria-label', t(e.dataset.i18nAria!)));
}

/** Keys present in one language but missing in the other (used by tests). */
export function missingKeys(): { en: string[]; fr: string[] } {
  return {
    en: Object.keys(fr).filter((k) => !(k in en)),
    fr: Object.keys(en).filter((k) => !(k in fr)),
  };
}
