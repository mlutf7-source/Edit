
import type {Point,CanvasView} from '../../../../core/types';
import {COLORS,GRID_EXTENT,GRID_SPACING} from '../colors';
export function drawGrid(ctx:CanvasRenderingContext2D,toScreen:(p:Point)=>Point,view:CanvasView,scale:number,dark=false):void{
const tl=toScreen({x:-GRID_EXTENT,y:-GRID_EXTENT});
const br=toScreen({x:GRID_EXTENT,y:GRID_EXTENT});
ctx.save();
ctx.strokeStyle=dark?'#24506a':COLORS.gridBorder;
ctx.lineWidth=2*scale;
ctx.strokeRect(tl.x,tl.y,br.x-tl.x,br.y-tl.y);
ctx.strokeStyle=dark?'#173449':COLORS.grid;
ctx.lineWidth=.5*scale;
for(let x=-GRID_EXTENT;x<=GRID_EXTENT;x+=GRID_SPACING){
const a=toScreen({x,y:-GRID_EXTENT}),b=toScreen({x,y:GRID_EXTENT});
ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}
for(let y=-GRID_EXTENT;y<=GRID_EXTENT;y+=GRID_SPACING){
const a=toScreen({x:-GRID_EXTENT,y}),b=toScreen({x:GRID_EXTENT,y});
ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}
ctx.restore();
}
