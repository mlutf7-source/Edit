import * as THREE from 'three';

const TEXTURE_WORLD_SIZE = 2;

// ✅ رخام — صفوف 25 سم بدون خطوط سوداء
export function createMarbleTexture(): THREE.Texture {
  const SIZE = 1024;
    const canvas = document.createElement('canvas');
      canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;

          // خلفية بيضاء عاجية
            ctx.fillStyle = '#F5F0E8';
              ctx.fillRect(0, 0, SIZE, SIZE);

                // ضوضاء دقيقة
                  for (let i = 0; i < 2200; i++) {
                      const x = Math.random() * SIZE;
                          const y = Math.random() * SIZE;
                              ctx.fillStyle = `rgba(215, 210, 200, ${0.02 + Math.random() * 0.05})`;
                                  ctx.fillRect(x, y, 2, 2);
                                    }

                                      // 8 صفوف × 25 سم
                                        const ROWS = 8;
                                          const rowPx = SIZE / ROWS;
                                            const groovePx = Math.round(rowPx * (1 / 25));

                                              for (let r = 0; r < ROWS; r++) {
                                                  const y = r * rowPx;
                                                      const shade = 248 - Math.floor(Math.random() * 4);
                                                          ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade - 6})`;
                                                              ctx.fillRect(0, y, SIZE, rowPx - groovePx);

                                                                  // ✅ خط الفاصل — رمادي فاتح بدل الأسود
                                                                      ctx.fillStyle = 'rgba(180, 175, 165, 0.6)';
                                                                          ctx.fillRect(0, y + rowPx - groovePx, SIZE, groovePx);

                                                                              // لمعة
                                                                                  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                                                                                      ctx.fillRect(0, y + rowPx - groovePx - 1.5, SIZE, 1.5);
                                                                                        }

                                                                                          const tex = new THREE.CanvasTexture(canvas);
                                                                                            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                                                                                              tex.colorSpace = THREE.SRGBColorSpace;
                                                                                                tex.anisotropy = 8;
                                                                                                  return tex;
                                                                                                  }

                                                                                                  // ✅ بلوك — 40×20 سم مع مونة رمادية فاتحة
                                                                                                  export function createBlockTexture(): THREE.Texture {
                                                                                                    const SIZE = 1024;
                                                                                                      const canvas = document.createElement('canvas');
                                                                                                        canvas.width = SIZE; canvas.height = SIZE;
                                                                                                          const ctx = canvas.getContext('2d')!;

                                                                                                            ctx.fillStyle = '#8A8580';
                                                                                                              ctx.fillRect(0, 0, SIZE, SIZE);

                                                                                                                const cols = 5;
                                                                                                                  const rows = 10;
                                                                                                                    const bw = SIZE / cols;
                                                                                                                      const bh = SIZE / rows;
                                                                                                                        const mortar = 5;

                                                                                                                          for (let r = 0; r < rows; r++) {
                                                                                                                              const offset = (r % 2) * (bw / 2);
                                                                                                                                  for (let c = -1; c <= cols; c++) {
                                                                                                                                        const x = c * bw + offset;
                                                                                                                                              const y = r * bh;
                                                                                                                                                    const shade = 172 + Math.floor(Math.random() * 18);
                                                                                                                                                          ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade - 6})`;
                                                                                                                                                                ctx.fillRect(x + mortar / 2, y + mortar / 2, bw - mortar, bh - mortar);

                                                                                                                                                                      for (let i = 0; i < 45; i++) {
                                                                                                                                                                              const px = x + mortar + Math.random() * (bw - mortar * 2);
                                                                                                                                                                                      const py = y + mortar + Math.random() * (bh - mortar * 2);
                                                                                                                                                                                              const s = 1 + Math.random() * 1.5;
                                                                                                                                                                                                      ctx.fillStyle = `rgba(120, 118, 114, ${0.04 + Math.random() * 0.09})`;
                                                                                                                                                                                                              ctx.fillRect(px, py, s, s);
                                                                                                                                                                                                                    }

                                                                                                                                                                                                                          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                                                                                                                                                                                                                                ctx.fillRect(x + mortar / 2, y + bh - mortar - 2.5, bw - mortar, 2.5);
                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                        const tex = new THREE.CanvasTexture(canvas);
                                                                                                                                                                                                                                          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                                                                                                                                                                                                                                            tex.colorSpace = THREE.SRGBColorSpace;
                                                                                                                                                                                                                                              tex.anisotropy = 8;
                                                                                                                                                                                                                                                return tex;
                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                // ✅ حجر طبيعي
                                                                                                                                                                                                                                                export function createStoneTexture(): THREE.Texture {
                                                                                                                                                                                                                                                  const SIZE = 1024;
                                                                                                                                                                                                                                                    const canvas = document.createElement('canvas');
                                                                                                                                                                                                                                                      canvas.width = SIZE; canvas.height = SIZE;
                                                                                                                                                                                                                                                        const ctx = canvas.getContext('2d')!;

                                                                                                                                                                                                                                                          ctx.fillStyle = '#5a5045';
                                                                                                                                                                                                                                                            ctx.fillRect(0, 0, SIZE, SIZE);

                                                                                                                                                                                                                                                              for (let i = 0; i < 160; i++) {
                                                                                                                                                                                                                                                                  const x = Math.random() * SIZE;
                                                                                                                                                                                                                                                                      const y = Math.random() * SIZE;
                                                                                                                                                                                                                                                                          const w = 60 + Math.random() * 110;
                                                                                                                                                                                                                                                                              const h = 40 + Math.random() * 70;
                                                                                                                                                                                                                                                                                  const shade = 45 + Math.floor(Math.random() * 35);
                                                                                                                                                                                                                                                                                      ctx.fillStyle = `hsl(32, 12%, ${shade}%)`;
                                                                                                                                                                                                                                                                                          ctx.beginPath();
                                                                                                                                                                                                                                                                                              const n = 6;
                                                                                                                                                                                                                                                                                                  for (let j = 0; j < n; j++) {
                                                                                                                                                                                                                                                                                                        const angle = (j / n) * Math.PI * 2 + Math.random() * 0.3;
                                                                                                                                                                                                                                                                                                              const rx = (w / 2) * (0.7 + Math.random() * 0.5);
                                                                                                                                                                                                                                                                                                                    const ry = (h / 2) * (0.7 + Math.random() * 0.5);
                                                                                                                                                                                                                                                                                                                          const px = x + Math.cos(angle) * rx;
                                                                                                                                                                                                                                                                                                                                const py = y + Math.sin(angle) * ry;
                                                                                                                                                                                                                                                                                                                                      if (j === 0) ctx.moveTo(px, py);
                                                                                                                                                                                                                                                                                                                                            else ctx.lineTo(px, py);
                                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                                    ctx.closePath();
                                                                                                                                                                                                                                                                                                                                                        ctx.fill();
                                                                                                                                                                                                                                                                                                                                                            ctx.strokeStyle = '#3a3227';
                                                                                                                                                                                                                                                                                                                                                                ctx.lineWidth = 2;
                                                                                                                                                                                                                                                                                                                                                                    ctx.stroke();
                                                                                                                                                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                                                                                                                                                        const tex = new THREE.CanvasTexture(canvas);
                                                                                                                                                                                                                                                                                                                                                                          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                                                                                                                                                                                                                                                                                                                                                                            tex.colorSpace = THREE.SRGBColorSpace;
                                                                                                                                                                                                                                                                                                                                                                              tex.anisotropy = 8;
                                                                                                                                                                                                                                                                                                                                                                                return tex;
                                                                                                                                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                                                                                                                                export function getWallTexture(type: string): THREE.Texture | null {
                                                                                                                                                                                                                                                                                                                                                                                  switch (type) {
                                                                                                                                                                                                                                                                                                                                                                                      case 'marble': return createMarbleTexture();
                                                                                                                                                                                                                                                                                                                                                                                          case 'block': return createBlockTexture();
                                                                                                                                                                                                                                                                                                                                                                                              case 'stone': return createStoneTexture();
case 'granite': return createFinishTexture('granite');
case 'brick': return createFinishTexture('brick');
case 'concrete': return createFinishTexture('concrete');
case 'wood': return createFinishTexture('wood');
case 'porcelain': return createFinishTexture('porcelain');
case 'cladding': return createFinishTexture('cladding');
case 'glass': return createFinishTexture('glass');
                                                                                                                                                                                                                                                                                                                                                                                                  default: return null;
                                                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                                                                                                                                                                    export function getTextureRepeatScale(): number {
                                                                                                                                                                                                                                                                                                                                                                                                      return 1 / TEXTURE_WORLD_SIZE;
                                                                                                                                                                                                                                                                                                                                                                                                      }

// Local procedural finishes; all use the existing two-metre UV repeat.
function createFinishTexture(type: string): THREE.Texture {
  const size=512, canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d')!;
  let seed=173;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const base:Record<string,string>={granite:'#aaa7a3',brick:'#a95e48',concrete:'#b4b2ad',wood:'#b28a5e',porcelain:'#e6e3dd',cladding:'#aeb6bf',glass:'#729eac'};
  ctx.fillStyle=base[type];ctx.fillRect(0,0,size,size);
  if(type==='brick'||type==='porcelain'||type==='cladding'||type==='glass') {
    const cols=type==='brick'?8:type==='porcelain'?4:2;
    const rows=type==='brick'?20:type==='porcelain'?4:type==='cladding'?4:2;
    const w=size/cols,h=size/rows,gap=type==='brick'?3:2;
    ctx.fillStyle=type==='brick'?'#c3b8a9':'#777f83';ctx.fillRect(0,0,size,size);
    for(let r=0;r<rows;r++)for(let c=-1;c<=cols;c++){
      const x=c*w+(type==='brick'&&r%2?w/2:0),y=r*h;
      ctx.fillStyle=base[type];ctx.fillRect(x+gap/2,y+gap/2,w-gap,h-gap);
      ctx.fillStyle=`rgba(255,255,255,${0.02+rand()*0.12})`;ctx.fillRect(x+gap/2,y+gap/2,w-gap,h-gap);
    }
  }
  if(type==='wood') {
    for(let x=0;x<size;x++){
      ctx.fillStyle=`rgba(75,42,18,${0.04+rand()*0.18})`;
      ctx.fillRect(x,0,1,size);
    }
    ctx.fillStyle='#795638';for(let x=0;x<size;x+=64)ctx.fillRect(x,0,2,size);
  }
  if(type==='granite'||type==='concrete'||type==='brick') {
    for(let i=0;i<(type==='granite'?18000:7000);i++){
      ctx.fillStyle=rand()<0.5?'rgba(40,35,30,0.16)':'rgba(255,255,255,0.22)';
      const d=1+rand()*2;ctx.fillRect(rand()*size,rand()*size,d,d);
    }
  }
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  return tex;
}
