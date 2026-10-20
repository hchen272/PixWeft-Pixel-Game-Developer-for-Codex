/**
 * Showcase-only native refinement plan for the supplied Mediterranean bookshop.
 * Input is the already imported, alpha-cleaned 256x256 Pixelorama raster.
 * This preserves the raster geometry; it is not an alternative redraw or a plugin default.
 * Apply basePixels and frame layers via native document.patch_pixels.
 */
const WIDTH=256,HEIGHT=256;
const lamps=[
 {name:'Storefront pendant',rect:[115,173,9,9],deltas:[0,3,6,2,-3,-5,-1,4]},
 {name:'Doorway pendant',rect:[169,168,8,9],deltas:[0,-2,3,6,2,-3,-5,2]},
 {name:'Wall lantern',rect:[203,163,9,12],deltas:[0,2,5,1,-2,-4,2,6]}
];
export function createRefinementPlan(input){
 if(input.length!==WIDTH*HEIGHT*4)throw new Error('Expected a 256x256 RGBA native export.');
 const base=Uint8Array.from(input);
 const candidates=[];
 for(let y=7;y<24;y++)for(let x=167;x<183;x++){const i=(y*WIDTH+x)*4,[r,g,b,a]=base.subarray(i,i+4);if(a===255&&g>r*1.35&&g>b*1.15&&g>25)candidates.push({x,y,color:[r,g,b,a]});}
 candidates.sort((a,b)=>a.y-b.y||a.x-b.x);
 if(!candidates.length)throw new Error('Expected the original rooftop cypress needle.');
 const minY=candidates[0].y,top=candidates.filter(p=>p.y===minY),tip=top[Math.floor(top.length/2)];
 base.fill(0,(tip.y*WIDTH+tip.x)*4,(tip.y*WIDTH+tip.x)*4+4);
 const lampPixels=lamps.map(lamp=>{const out=[];for(let y=lamp.rect[1];y<lamp.rect[1]+lamp.rect[3];y++)for(let x=lamp.rect[0];x<lamp.rect[0]+lamp.rect[2];x++){const i=(y*WIDTH+x)*4,[r,g,b,a]=base.subarray(i,i+4);if(a===255&&r>185&&g>100&&b<170&&r>g*.9)out.push({x,y,r,g,b});}return out;});
 const phase=[0,0,1,1,0,0,-1,-1];
 const frames=Array.from({length:8},(_,frame)=>{
  const light=[];
  for(let lamp=0;lamp<lamps.length;lamp++)for(const p of lampPixels[lamp]){const d=lamps[lamp].deltas[frame];light.push({x:p.x,y:p.y,color:hex([clamp(p.r+d),clamp(p.g+d),clamp(p.b+Math.round(d*.6)),255])});}
  const leaf=[{x:tip.x+phase[frame],y:tip.y,color:hex(tip.color)}];
  return {frame,light,leaf};
 });
 return {width:WIDTH,height:HEIGHT,fps:8,tip,lamps:lamps.map((x,i)=>({...x,selected_pixels:lampPixels[i].length})),basePixels:toPixels(base),frames};
}
function clamp(n){return Math.max(0,Math.min(255,n));}
function hex(rgba){return '#'+rgba.map(n=>n.toString(16).padStart(2,'0')).join('');}
function toPixels(rgba){const out=[];for(let i=0;i<WIDTH*HEIGHT;i++)out.push({x:i%WIDTH,y:Math.floor(i/WIDTH),color:hex([...rgba.subarray(i*4,i*4+4)])});return out;}
