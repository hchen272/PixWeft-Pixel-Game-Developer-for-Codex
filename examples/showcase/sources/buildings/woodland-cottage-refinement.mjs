/**
 * Preserve the user-selected generated cottage; do not replace its geometry.
 * Call Pixelorama document.import_sheet with the spec below, read the native
 * layer preview, and send cleanImportedBase()/effect() results as patch_pixels.
 * The original raster remains fixed across all eight frames.
 */
export const importSpec={columns:1,rows:1,frame_width:256,frame_height:256};
export const animationSpec={frames:8,fps:8,previewScale:2};
const size=256;
const windows=[[87,94,109,119],[177,98,191,118],[123,156,138,171],[172,162,187,187],[202,169,213,181]];
const gains=[1,1.035,1.065,1.03,.98,.96,.985,1];
export function cleanImportedBase(rgba) {
 const base=Buffer.alloc(rgba.length);for(let i=0;i<base.length;i+=4){if(rgba[i+3]<128)continue;base[i]=rgba[i];base[i+1]=rgba[i+1];base[i+2]=rgba[i+2];base[i+3]=255;}return base;
}
export function nativePixels(rgba) {
 const pixels=[];for(let i=0;i<rgba.length;i+=4)pixels.push({x:(i/4)%size,y:Math.floor(i/4/size),color:'#'+[...rgba.subarray(i,i+4)].map(v=>v.toString(16).padStart(2,'0')).join('')});return pixels;
}
export function effect(frame,base){
 const layer=Buffer.alloc(base.length),notes={window_pixels:0,smoke_pixels:0};
 const put=(x,y,color)=>{if(x<0||y<0||x>=size||y>=size)return;const i=(y*size+x)*4;Buffer.from(color).copy(layer,i);};
 for(const [l,t,r,b]of windows)for(let y=t;y<b;y++)for(let x=l;x<r;x++){const i=(y*size+x)*4,red=base[i],green=base[i+1],blue=base[i+2];if(base[i+3]===255&&red>150&&green>80&&blue<180&&red>green+15){put(x,y,[Math.min(255,Math.round(red*gains[frame])),Math.min(255,Math.round(green*gains[frame])),Math.min(255,Math.round(blue*gains[frame])),255]);notes.window_pixels++;}}
 for(let puff=0;puff<3;puff++){const p=((frame+puff*3)%8)/8,cy=Math.round(22-p*18),cx=172+Math.round(Math.sin((frame+puff*2)*Math.PI/4)*2),radius=1+Math.floor(p*3),color=p>.6?[205,215,205,255]:p>.3?[172,187,177,255]:[141,161,153,255];
  for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++)if(x*x/(radius*radius)+y*y/(radius*radius)<=1)put(cx+x,cy+y,color);
  if(radius>1)put(cx-1,cy-1,[225,231,217,255]);
 }
 for(let i=3;i<layer.length;i+=4)if(layer[i])notes.smoke_pixels++;
 notes.smoke_pixels-=notes.window_pixels;
 return {rgba:layer,notes};
}


