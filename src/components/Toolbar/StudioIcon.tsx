
import React from 'react';
export type StudioIconName='settings'|'cube'|'redo'|'undo'|'save'|'folder'|'file'|'pencil'|'layers'|'eye'|'wrench'|'grid'|'ruler'|'home'|'palette'|'wall'|'door'|'window'|'column'|'stairs'|'copy'|'move'|'trash'|'lock'|'sun'|'moon'|'chevron'|'plus'|'minus'|'check'|'type'|'compass'|'circle'|'square'|'arc'|'menu'|'deselect';
interface Props{name:StudioIconName;size?:number;strokeWidth?:number;className?:string;}
const paths:Record<StudioIconName,React.ReactNode>={
settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l-1.86 1.86A1.7 1.7 0 0 0 16 18.4l-1.1.45-.5 2.15h-4.8l-.5-2.15L8 18.4a1.7 1.7 0 0 0-1.88.34l-1.86-1.86A1.7 1.7 0 0 0 4.6 15l-.45-1.1L2 13.4v-2.8l2.15-.5L4.6 9a1.7 1.7 0 0 0-.34-1.88l1.86-1.86A1.7 1.7 0 0 0 8 5.6l1.1-.45L9.6 3h4.8l.5 2.15L16 5.6a1.7 1.7 0 0 0 1.88-.34l1.86 1.86A1.7 1.7 0 0 0 19.4 9l.45 1.1 2.15.5v2.8l-2.15.5z"/></>,
cube:<><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/></>,
redo:<><path d="M21 7v6h-6"/><path d="M20 13a8 8 0 1 0-2.3 5.7"/></>,
undo:<><path d="M3 7v6h6"/><path d="M4 13a8 8 0 1 1 2.3 5.7"/></>,
save:<><path d="M4 3h14l3 3v15H3V3zM7 3v7h10V3M7 21v-8h10v8"/></>,
folder:<path d="M3 6h7l2 2h9v12H3z"/>,
file:<><path d="M6 2h9l5 5v15H6zM15 2v5h5M9 12h8M9 16h8"/></>,
pencil:<><path d="m4 20 5-.9L20 8a2.5 2.5 0 0 0-4-4L5 15zM14 6l4 4"/></>,
layers:<><path d="m12 2 10 6-10 6L2 8zM2 12l10 6 10-6M2 16l10 6 10-6"/></>,
eye:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
wrench:<path d="M21 7a6 6 0 0 1-8 5L5 20a2 2 0 0 1-3-3l8-8a6 6 0 0 1 7-8l-4 4 4 4z"/>,
grid:<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></>,
ruler:<><path d="m3 16 13-13 5 5L8 21zM9 10l3 3M12 7l3 3M6 13l3 3"/></>,
home:<><path d="m2 11 10-9 10 9M5 10v12h14V10M10 22v-8h4v8"/></>,
palette:<><path d="M12 2a10 10 0 1 0 0 20h2a2 2 0 0 0 2-3 2 2 0 0 1 2-3h1a4 4 0 0 0 4-4A10 10 0 0 0 12 2z"/><circle cx="7" cy="10" r="1"/><circle cx="11" cy="6" r="1"/><circle cx="17" cy="8" r="1"/><circle cx="7" cy="15" r="1"/></>,
wall:<><rect x="2" y="4" width="20" height="16" rx="1"/><path d="M2 10h20M2 16h20M8 4v6M16 10v6M8 16v4"/></>,
door:<><path d="M5 22V2h14v20M9 22V5h7v17M14 14h1"/></>,
window:<><rect x="3" y="3" width="18" height="18"/><path d="M12 3v18M3 12h18"/></>,
column:<><rect x="4" y="4" width="16" height="16"/><path d="M7 7h10v10H7z"/></>,
stairs:<path d="M2 21h5v-5h5v-5h5V6h5M2 17h5M7 12h5M12 7h5"/>,
copy:<><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/></>,
move:<><path d="M12 2v20M2 12h20m-13-7 3-3 3 3m-6 14 3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/></>,
trash:<><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></>,
lock:<><rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1"/></>,
sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/></>,
moon:<path d="M20 16A9 9 0 0 1 8 4 9 9 0 1 0 20 16z"/>,
chevron:<path d="m6 9 6 6 6-6"/>,
plus:<path d="M12 4v16M4 12h16"/>,
minus:<path d="M4 12h16"/>,
check:<path d="m4 12 5 5L20 6"/>,
type:<path d="M4 6V4h16v2M12 4v16M8 20h8"/>,
compass:<><circle cx="12" cy="12" r="9"/><path d="m15 9-2 6-4 2 2-6z"/></>,
circle:<circle cx="12" cy="12" r="9"/>,
square:<rect x="4" y="4" width="16" height="16" rx="1"/>,
arc:<path d="M3 19a9 9 0 0 1 18 0"/>,

menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
deselect:<><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="m9 9 6 6m0-6-6 6"/></>
  
};
export const StudioIcon:React.FC<Props>=({name,size=20,strokeWidth=1.8,className})=><svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0}}>{paths[name]}</svg>;
