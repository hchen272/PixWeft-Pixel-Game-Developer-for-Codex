/**
 * PixWeft medieval-knight showcase recipe.
 * Generated pixels are retained. Native Pixelorama performs sheet import,
 * alpha cleanup, pose isolation, origin stabilization, and the edge patches.
 * These source windows and motion anchors belong to this example only.
 */
import assert from 'node:assert/strict';
export const importSpec = { columns:4, rows:2, frame_width:192, frame_height:192,
  frame_rects:[[0,0,560,560],[424,0,560,560],[846,0,560,560],[1214,0,560,560],[0,327,560,560],[424,327,560,560],[846,327,560,560],[1214,327,560,560]] };
export const fps=8;
const anchors=[255,705,1120,1550,260,720,1120,1550];
const size=192;
function components(im) {
 const labels=new Int32Array(im.width*im.height),queue=new Int32Array(labels.length),parts=[];let label=0;
 for(let start=0;start<labels.length;start++){if(labels[start]||im.rgba[start*4+3]<128)continue;label++;let head=0,tail=0;queue[tail++]=start;labels[start]=label;let minX=im.width,minY=im.height,maxX=0,maxY=0;
  while(head<tail){const p=queue[head++],x=p%im.width,y=Math.floor(p/im.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const next of [x?p-1:-1,x+1<im.width?p+1:-1,y?p-im.width:-1,y+1<im.height?p+im.width:-1])if(next>=0&&!labels[next]&&im.rgba[next*4+3]>=128){labels[next]=label;queue[tail++]=next;}}
  parts.push({id:label,pixels:tail,bbox:[minX,minY,maxX+1,maxY+1]});
 }
 return {labels,parts:parts.filter(p=>p.pixels>20000)};
}
function hex(rgba,index){return '#'+[...rgba.subarray(index,index+4)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function bounds(rgba){let l=size,t=size,r=-1,b=-1;for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]){let x=(i/4)%size,y=Math.floor(i/4/size);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return [l,t,r+1,b+1];}
export function prepareNativePatches(raw, importedFrames) {
 const cc=components(raw);assert.equal(cc.parts.length,8);assert.equal(importedFrames.length,8);
 const ids=Array(8);for(const p of cc.parts){const [l,t,r,b]=p.bbox,col=Math.min(3,Math.floor((l+r)/2/(raw.width/4))),row=(t+b)/2>raw.height/2?1:0;ids[row*4+col]=p.id;}assert(ids.every(Boolean));
 function nearLabel(x,y,id){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){let sx=x+dx,sy=y+dy;if(sx>=0&&sy>=0&&sx<raw.width&&sy<raw.height&&cc.labels[sy*raw.width+sx]===id)return true;}return false;}
 return importedFrames.map((im,frame)=>{
  assert.equal(im.width,size);assert.equal(im.height,size);const rect=importSpec.frame_rects[frame],cleaned=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;if(im.rgba[i+3]<128)continue;const sx=rect[0]+Math.floor((x+.5)*560/size),sy=rect[1]+Math.floor((y+.5)*560/size);if(!nearLabel(sx,sy,ids[frame]))continue;cleaned[i]=im.rgba[i];cleaned[i+1]=im.rgba[i+1];cleaned[i+2]=im.rgba[i+2];cleaned[i+3]=255;}
  const oldBounds=bounds(cleaned),dx=80-Math.round((anchors[frame]-rect[0])*size/560),dy=174-(oldBounds[3]-1),aligned=Buffer.alloc(cleaned.length);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;if(!cleaned[i+3])continue;const nx=x+dx,ny=y+dy;assert(nx>0&&ny>0&&nx<size-1&&ny<size-1);cleaned.copy(aligned,(ny*size+nx)*4,i,i+4);}
  const base=[];for(let i=0;i<aligned.length;i+=4)base.push({x:(i/4)%size,y:Math.floor(i/4/size),color:hex(aligned,i)});
  const corrections=[];for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){const i=(y*size+x)*4;if(aligned[i+3])continue;const ns=[i-4,i+4,i-size*4,i+size*4];if(ns.every(n=>aligned[n+3]===255)){const colors=ns.map(n=>[...aligned.subarray(n,n+3)]),spread=[0,1,2].reduce((v,c)=>v+Math.max(...colors.map(col=>col[c]))-Math.min(...colors.map(col=>col[c])),0);if(spread<180)corrections.push({x,y,color:hex(aligned,ns[0])});}}
  return {frame,base_layer:0,base,correction_layer:1,corrections,alignment:{dx,dy},bbox:bounds(aligned)};
 });
}

