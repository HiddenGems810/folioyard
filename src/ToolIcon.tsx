import type { ReactNode } from 'react';
import type { Tool } from './tool-catalog';

const drawings: Record<Tool, ReactNode> = {
  merge: <><path d="M5 4.5h8l3 3v3"/><path d="M8 19.5H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2"/><path d="M10 8h4M10 11h3"/><path d="M12 16h9M17.5 12.5 21 16l-3.5 3.5"/></>,
  split: <><path d="M6 4.5h5l3 3v2"/><path d="M6 19.5h5l3-3v-2"/><path d="M3 4.5h3v15H3"/><path d="M14 12h7M17.5 8.5 21 12l-3.5 3.5"/></>,
  extract: <><path d="M5 3.5h9l4 4v4"/><path d="M5 3.5v17h7"/><path d="M9 9h5M9 12h4"/><path d="M14 17h7M17.5 13.5 21 17l-3.5 3.5"/></>,
  reorder: <><path d="M4 6h11M4 12h7M4 18h11"/><path d="m17 9 3-3 3 3M20 6v6"/><path d="m17 15 3 3 3-3M20 18v-3"/></>,
  rotate: <><path d="M5 4h9l4 4v2"/><path d="M5 4v16h8"/><path d="M10 9h4"/><path d="M15 15a4.5 4.5 0 1 0 1.1-3"/><path d="M14 11h3v3"/></>,
  delete: <><path d="M5 3.5h9l4 4v3"/><path d="M5 3.5v17h7"/><path d="M9 9h5"/><path d="m15 14 6 6M21 14l-6 6"/></>,
  'images-to-pdf': <><rect x="3.5" y="5" width="13" height="14" rx="1"/><circle cx="8" cy="9" r="1.5"/><path d="m5 16 3.5-3 2.5 2 2-1.5 3.5 3.5"/><path d="M19 8h2v12H9v-1"/></>,
  'pdf-to-images': <><path d="M5 3.5h9l4 4v3"/><path d="M5 3.5v17h6"/><path d="M9 9h5"/><rect x="13" y="13" width="8" height="7" rx="1"/><circle cx="16" cy="15.5" r="1"/><path d="m14 19 2.5-2 1.5 1 1-.8 1.5 1.8"/></>,
  watermark: <><path d="M5 3.5h9l4 4v13H5z"/><path d="M9 9h5M9 12h3"/><path d="m7 17 10-7"/><path d="M8 19h9"/></>,
  'page-numbers': <><path d="M6 3.5h9l4 4v13H6z"/><path d="M10 9v7M14 9v7M8 11h8M8 14h8"/><path d="M10 18h4"/></>,
  annotate: <><path d="M5 4h14v12H11l-5 4v-4H5z"/><path d="M8 8h8M8 11h5"/><path d="m14 19 5-5 2 2-5 5-3 1z"/></>,
  signature: <><path d="M4 17c2-7 3-9 4-9 2 0-1 8 1 8 1 0 2-4 3-4s-1 5 1 5c2 0 3-3 5-3 1 0 2 1 3 1"/><path d="M4 21h17"/></>,
  compress: <><path d="M8 3H4v4M4 3l6 6"/><path d="M16 3h4v4m0-4-6 6"/><path d="M8 21H4v-4m0 4 6-6"/><path d="M16 21h4v-4m0 4-6-6"/></>,
  protect: <><path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6z"/><rect x="9" y="10.5" width="6" height="5" rx="1"/><path d="M10.5 10.5V9a1.5 1.5 0 0 1 3 0v1.5"/></>,
  unlock: <><path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6z"/><rect x="9" y="10.5" width="6" height="5" rx="1"/><path d="M10.5 10.5V9a1.5 1.5 0 0 1 2.8-.7"/></>,
};

export default function ToolIcon({ tool, className }: { tool: Tool; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{drawings[tool]}</svg>;
}
