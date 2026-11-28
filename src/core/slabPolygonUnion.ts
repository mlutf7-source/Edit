import type { Point } from './types';
const EPS = 1e-7;
const sub = (a: Point,b: Point): Point => ({x:a.x-b.x,y:a.y-b.y});
const cross = (a: Point,b: Point) => a.x*b.y-a.y*b.x;
const dot = (a: Point,b: Point) => a.x*b.x+a.y*b.y;
const at = (a: Point,d: Point,t:number): Point => ({x:a.x+d.x*t,y:a.y+d.y*t});
export const ringArea = (p: Point[]) => p.reduce((s,a,i)=>s+cross(a,p[(i+1)%p.length]),0)/2;
export function insideRing(p:Point, ring:Point[]):boolean {
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++) {const a=ring[i],b=ring[j]; if ((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;}
 return inside;
}
// Split edges at crossings and coincident endpoints, then retain only the union boundary.
export function unionRings(rings:Point[][]):Point[][] {
 const edges=rings.flatMap(r=>r.map((a,i)=>({a,d:sub(r[(i+1)%r.length],a)}))).filter(e=>dot(e.d,e.d)>EPS*EPS);
 const inside=(p:Point)=>rings.some(r=>insideRing(p,r));
 const key=(p:Point)=>`${Math.round(p.x/EPS)},${Math.round(p.y/EPS)}`;
 const segments=new Map<string,{a:Point,b:Point}>();
 for(const e of edges){
  const ts=[0,1]; const len2=dot(e.d,e.d);
  for(const f of edges){const q=sub(f.a,e.a), den=cross(e.d,f.d);
   if(Math.abs(den)>EPS*EPS){const t=cross(q,f.d)/den,u=cross(q,e.d)/den;if(t>0&&t<1&&u>=-EPS&&u<=1+EPS)ts.push(t);}
   else if(Math.abs(cross(q,e.d))<=EPS*Math.sqrt(len2)){for(const p of [f.a,at(f.a,f.d,1)]){const t=dot(sub(p,e.a),e.d)/len2;if(t>0&&t<1)ts.push(t);}}
  }
  ts.sort((a,b)=>a-b); const len=Math.sqrt(len2);
  for(let i=1;i<ts.length;i++){if((ts[i]-ts[i-1])*len<EPS)continue;let a=at(e.a,e.d,ts[i-1]),b=at(e.a,e.d,ts[i]);const m=at(e.a,e.d,(ts[i]+ts[i-1])/2);const n={x:-e.d.y/len,y:e.d.x/len};const delta=Math.min(1e-6,(ts[i]-ts[i-1])*len/10);const l=inside(at(m,n,delta)),r=inside(at(m,n,-delta));if(l===r)continue;if(!l)[a,b]=[b,a];segments.set(`${key(a)}>${key(b)}`,{a,b});}
 }
 const result:Point[][]=[];
 while(segments.size){const first=segments.entries().next().value!;segments.delete(first[0]);const ring=[first[1].a];let end=first[1].b;let direction=sub(end,ring[0]);while(key(end)!==key(ring[0])){ring.push(end);const options=[...segments.entries()].filter(([,s])=>key(s.a)===key(end));if(!options.length)throw new Error('Open slab union boundary');options.sort(([,a],[,b])=>Math.atan2(cross(direction,sub(b.b,b.a)),dot(direction,sub(b.b,b.a)))-Math.atan2(cross(direction,sub(a.b,a.a)),dot(direction,sub(a.b,a.a))));const [id,s]=options[0];segments.delete(id);direction=sub(s.b,s.a);end=s.b;}if(ring.length>=3&&Math.abs(ringArea(ring))>EPS)result.push(ring);}
 return result;
}
