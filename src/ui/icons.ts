const svg = (body: string, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<string, string> = {
  select: svg('<path d="M5 3l14 8-6 1.5L10 19z"/>'),
  line: svg('<path d="M4 20L20 4"/><circle cx="4" cy="20" r="1.6"/><circle cx="20" cy="4" r="1.6"/>'),
  polyline: svg('<path d="M3 18l5-11 6 8 7-11"/>'),
  arc: svg('<path d="M4 18a9 9 0 0 1 16 0"/>'),
  circle: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1"/>'),
  rect: svg('<rect x="4" y="6" width="16" height="12"/>'),
  rrect: svg('<rect x="4" y="6" width="16" height="12" rx="4"/>'),
  spline: svg('<path d="M3 17c4-12 8 6 11-3s5-6 7-7"/>'),
  measure: svg('<path d="M3 16L16 3l5 5L8 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>'),
  mirror: svg('<path d="M12 3v18" stroke-dasharray="2 2"/><path d="M9 6L3 18h6zM15 6l6 12h-6z"/>'),
  rotate: svg('<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>'),
  cpattern: svg('<circle cx="12" cy="12" r="7" stroke-dasharray="2 2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="5" cy="12" r="2"/>'),
  lpattern: svg('<rect x="3" y="9" width="4" height="6"/><rect x="10" y="9" width="4" height="6"/><rect x="17" y="9" width="4" height="6"/>'),
  duplicate: svg('<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>'),
  delete: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  calibrate: svg('<path d="M3 12h18M3 8v8M21 8v8"/><path d="M8 12v-2M12 12v-3M16 12v-2"/>'),
  perspective: svg('<path d="M6 5h12l3 14H3z"/><circle cx="6" cy="5" r="1.4"/><circle cx="18" cy="5" r="1.4"/><circle cx="21" cy="19" r="1.4"/><circle cx="3" cy="19" r="1.4"/>'),
  bgmove: svg('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>'),
  fit: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  image: svg('<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/>'),
  folder: svg('<path d="M3 7h6l2 2h10v10H3z"/>'),
  save: svg('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h8V3M8 21v-7h8v7"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7M12 17h.01"/>'),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>'),
};

/** Icons for the joint types (larger, filled cross-section hints). */
export const JOINT_ICONS: Record<string, string> = {
  flat: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><circle cx="5.5" cy="12" r="1"/><circle cx="18.5" cy="12" r="1"/>'),
  oring: svg('<ellipse cx="12" cy="12" rx="9" ry="6"/><ellipse cx="12" cy="12" rx="5" ry="2.8"/>'),
  square: svg('<rect x="3" y="6" width="18" height="12" rx="1"/><rect x="7" y="9" width="10" height="6"/>'),
  custom: svg('<path d="M5 19V11a7 7 0 0 1 14 0v8z"/>'),
  bead: svg('<rect x="2" y="12" width="20" height="6" rx="1"/><path d="M5 12a2 2 0 0 1 4 0M15 12a2 2 0 0 1 4 0"/>'),
  washer: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'),
};
