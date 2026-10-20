/** Generated draft -> Pixelorama alpha correction, isolated radar articulation and lights. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes,randomUUID,createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { isFixedNeck, pitchPivot, jointRetouchPixels, jointReviewRegion } from './lunar-outpost-joint-retouch.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const flags=Object.fromEntries(process.argv.slice(2).reduce((p,v,i,a)=>v.startsWith('--')?[...p,[v.slice(2),a[i+1]]]:p,[]));
if(!flags.godot||!flags['pixelorama-dir']||!flags.ffmpeg)throw new Error('Supply --godot PATH --pixelorama-dir DIRECTORY --ffmpeg PATH [--source PNG].');
const source=path.resolve(flags.source??path.join(root,'examples/showcase/sources/buildings/lunar-outpost-generated.png'));
const work=path.join(root,'.local','showcase','outpost-refine',randomUUID());
const native=path.join(work,'application'),user=path.join(work,'roaming','pixelorama'),workspace=path.join(work,'workspace');
const staging=flags.stage==='true';
const output=staging?path.join(work,'exports'):path.join(root,'assets/showcase/buildings');
const sources=staging?path.join(work,'sources'):path.join(root,'examples/showcase/sources/buildings');
for(const directory of [native,path.join(user,'extensions'),workspace,output,sources])await fs.mkdir(directory,{recursive:true});
await Promise.all(['Pixelorama.exe','Pixelorama.pck'].map(n=>fs.copyFile(path.join(flags['pixelorama-dir'],n),path.join(native,n))));
await fs.copyFile(source,path.join(workspace,'draft.png'));
await fs.copyFile(source,path.join(sources,'lunar-outpost-generated.png'));
const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
const token=randomBytes(32).toString('hex'),config=path.join(user,'pixel-game-bridge.json');
await fs.writeFile(config,JSON.stringify({port,token,allowed_roots:[workspace]}));
await fs.writeFile(path.join(user,'config.ini'),'[extensions]\nPixelGameBridge=true\n[preferences]\nlocale="en_US"\nquit_confirmation=false\nopen_last_project=false\n');
const env={...process.env,APPDATA:path.join(work,'roaming'),LOCALAPPDATA:path.join(work,'local'),XDG_DATA_HOME:path.join(work,'roaming'),PIXEL_GAME_PIXELORAMA_CONFIG:config};
async function run(binary,args,options={}){const p=spawn(binary,args,{env,windowsHide:true,...options});let log='';p.stdout.on('data',b=>log+=b);p.stderr.on('data',b=>log+=b);assert.equal((await once(p,'exit'))[0],0,log);return log;}
const bridge=path.join(root,'bridges/pixelorama');
await run(flags.godot,['--headless','--log-file',path.join(work,'pack.log'),'--script',path.join(bridge,'pack.gd'),'--',bridge,path.join(user,'extensions/PixelGameBridge.pck')]);
const app=spawn(path.join(native,'Pixelorama.exe'),['--headless','--audio-driver','Dummy','--log-file',path.join(work,'native.log')],{cwd:native,env,windowsHide:true});
let logs='';app.stdout.on('data',b=>logs+=b);app.stderr.on('data',b=>logs+=b);
const url=`http://127.0.0.1:${port}`,headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
let document;const commands=[];
async function command(operation,args={}){const response=await fetch(url+'/command',{method:'POST',headers,body:JSON.stringify({request_id:randomUUID(),project_root:workspace,operation,args,...(document?{document_id:document.id,expected_revision:document.revision}:{})}),signal:AbortSignal.timeout(30000)});const result=await response.json();commands.push({operation,ok:result.ok});assert(result.ok,JSON.stringify(result.error)+'\n'+logs);if(result.data?.document)document=result.data.document;return result.data;}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function decode(bytes){
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);assert.equal(bytes[24],8);assert.equal(bytes[25],6);
  let at=8;const chunks=[];while(at<bytes.length){const n=bytes.readUInt32BE(at);if(bytes.toString('ascii',at+4,at+8)==='IDAT')chunks.push(bytes.subarray(at+8,at+8+n));at+=n+12;}
  const raw=inflateSync(Buffer.concat(chunks)),stride=w*4,data=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<stride;x++){const where=y*stride+x,left=x>=4?data[where-4]:0,up=y?data[where-stride]:0,diag=y&&x>=4?data[where-stride-4]:0;const p=left+up-diag,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-diag);const predictor=[0,left,up,Math.floor((left+up)/2),a<=b&&a<=c?left:b<=c?up:diag][raw[y*(stride+1)]];assert.notEqual(predictor,undefined);data[where]=(raw[y*(stride+1)+1+x]+predictor)&255;}
  return {w,h,data};
}
try{
  let health;for(let i=0;i<120;i++){try{health=await(await fetch(url+'/health',{headers,signal:AbortSignal.timeout(1000)})).json();if(health.ok)break;}catch{}if(app.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,200));}assert(health?.ok,logs);
  await command('document.import_sheet',{path:'draft.png',columns:1,rows:1,frame_width:384,frame_height:256,name:'Lunar outpost'});
  const imported=decode(Buffer.from((await command('document.preview',{layer:0})).base64,'base64'));
  const originalDetail=await command('document.preview',{region:[238,60,48,40],scale:12});
  await fs.writeFile(path.join(work,'original-joint-12x.png'),Buffer.from(originalDetail.base64,'base64'));
  if(flags['inspect-only']==='true') {console.log(JSON.stringify({work,detail:'original-joint-12x.png'}));}
  else {
  const changes=[],base=[],lightMask=[],radar=new Map();let hidden=0,partial=0;
  const cleanOriginal=Buffer.alloc(384*256*4);
  for(let y=0;y<256;y++)for(let x=0;x<384;x++){
    const at=(y*384+x)*4,rgba=[...imported.data.subarray(at,at+4)];
    if(rgba[3]>0&&rgba[3]<255)partial++;
    if(!rgba[3]&&rgba.slice(0,3).some(v=>v))hidden++;
    const visible=rgba[3]>=128,radarPart=visible&&x>=227&&x<=309&&y<=83&&!isFixedNeck(x,y);
    const originalColor=visible?'#'+Buffer.from([...rgba.slice(0,3),255]).toString('hex'):'#00000000';
    if(visible)Buffer.from([...rgba.slice(0,3),255]).copy(cleanOriginal,at);
    if(radarPart)radar.set(y*384+x,originalColor);
    const color=radarPart?'#00000000':originalColor;
    if(color!=='#'+Buffer.from(rgba).toString('hex'))changes.push({x,y,color});
    if(visible&&!radarPart){base.push({x,y,color});
      const [r,g,b]=rgba;
      const windowRegion=(x>=136&&x<=173&&y>=126&&y<=167)||(x>=309&&x<=338&&y>=142&&y<=168)||(x>=253&&x<=279&&y>=127&&y<=137);
      if(windowRegion&&g>90&&b>100&&g-r>25&&b-r>25)lightMask.push({x,y,r,g,b});
    }
  }
  for(let i=0;i<changes.length;i+=16000)await command('document.patch_pixels',{frame:0,layer:0,pixels:changes.slice(i,i+16000)});
  await command('document.add_layer',{name:'Pitch socket - per-pose native pixel retouch'});
  await command('document.add_layer',{name:'Radar bowl - pose draft refined at the joint'});
  await command('document.add_layer',{name:'Window light pulse - native pixel corrections'});
  for(let f=1;f<8;f++)await command('document.add_frame',{after_frame:f-1});
  await command('document.set_animation_fps',{fps:4});
  const angles=[0,-2,-4,-2,0,2,4,2],pivot=pitchPivot;
  const expected=[];
  for(let f=0;f<8;f++){
    if(f)for(let i=0;i<base.length;i+=16000)await command('document.patch_pixels',{frame:f,layer:0,pixels:base.slice(i,i+16000)});
    const pulse=[0,3,6,3,0,-3,-6,-3][f],pixels=lightMask.map(({x,y,r,g,b})=>({x,y,color:'#'+Buffer.from([Math.max(0,Math.min(255,r+pulse)),Math.max(0,Math.min(255,g+pulse)),Math.max(0,Math.min(255,b+pulse)),255]).toString('hex')}));
    assert(pixels.length>20,'No interior light pixels selected.');
    await command('document.patch_pixels',{frame:f,layer:1,pixels});
    // Integer inverse mapping matches a hard-edged nearest-neighbor selection
    // rotation; no antialiasing, painted replacement dish, or whole-building motion.
    const angle=angles[f]*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),dish=[];
    for(let y=0;y<=95;y++)for(let x=218;x<=319;x++){
      const dx=x-pivot[0],dy=y-pivot[1],sx=Math.round(pivot[0]+dx*cos+dy*sin),sy=Math.round(pivot[1]-dx*sin+dy*cos);
      const color=radar.get(sy*384+sx);if(color)dish.push({x,y,color});
    }
    await command('document.patch_pixels',{frame:f,layer:2,pixels:dish});
    const retouch=jointRetouchPixels(angles[f]);
    if(retouch.length)await command('document.patch_pixels',{frame:f,layer:3,pixels:retouch});
    const preview=await command('document.preview',{frame:f}),rgba=decode(Buffer.from(preview.base64,'base64')).data;
    if(f===0) {
      const [left,top,width,height]=jointReviewRegion;
      for(let y=0;y<256;y++)for(let x=0;x<384;x++) {
        if(x>=left&&x<left+width&&y>=top&&y<top+height)continue;
        const at=(y*384+x)*4;
        assert(rgba.subarray(at,at+4).equals(cleanOriginal.subarray(at,at+4)),'Neutral-pose retouch must preserve artwork outside the joint region.');
      }
    }
    expected.push(hash(rgba));
    await command('document.export_png',{frame:f,path:`frame-${String(f).padStart(2,'0')}.png`});
    const detail=await command('document.preview',{frame:f,region:jointReviewRegion,scale:12});
    await fs.writeFile(path.join(work,`joint-frame-${f}-12x.png`),Buffer.from(detail.base64,'base64'));
  }
  await command('document.export_sheet',{columns:4,path:'sheet.png'});
  await command('document.export_sheet',{columns:4,scale:2,path:'sheet-2x.png'});
  await command('document.save',{path:'outpost.pxo'});
  await command('document.open_project',{path:'outpost.pxo'});await command('document.info');
  assert.equal(document.frames,8);assert.equal(document.fps,4);
  for(let f=0;f<8;f++)assert.equal(hash(decode(Buffer.from((await command('document.preview',{frame:f})).base64,'base64')).data),expected[f]);
  const gif=path.join(output,'lunar-outpost.gif');
  await run(flags.ffmpeg,['-hide_banner','-loglevel','error','-y','-framerate','4','-i',path.join(workspace,'frame-%02d.png'),'-filter_complex','[0:v]scale=iw*2:ih*2:flags=neighbor,split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=full[p];[b][p]paletteuse=dither=none:alpha_threshold=128','-loop','0','-final_delay','25',gif]);
  for(const [from,to] of [['sheet.png','lunar-outpost-sheet.png'],['frame-00.png','lunar-outpost.png']])await fs.copyFile(path.join(workspace,from),path.join(output,to));
  await fs.copyFile(path.join(workspace,'outpost.pxo'),path.join(sources,'lunar-outpost.pxo'));
  const manifest={id:'lunar-outpost',creation_route:'generated-draft-refine',input:'lunar-outpost-generated.png',input_dimensions:[1536,1024],logical_canvas:[384,256],frames:8,fps:4,layers:['Generated raster base with fixed complete mast and collar','Window light pulse - native pixel corrections','Radar bowl - pose draft refined at the joint','Pitch socket - per-pose native pixel retouch'],method:'Imported the selected building at uniform 1/4 nearest-neighbor scale and corrected alpha. The complete tapered mast and elliptical collar stay fixed; every bowl pose is finished with native socket contour and material retouch. The neutral pose preserves the alpha-cleaned input outside joint_review_region; the joint region is also corrected in that pose. No architectural redraw.',native_alpha_and_dish_extraction_pixel_edits:changes.length,imported_partial_alpha_pixels:partial,imported_hidden_rgb_pixels:hidden,animated_light_pixels:lightMask.length,radar:{source_pixels:radar.size,pivot,angles_degrees:angles,pose_draft:'nearest-neighbor bowl pose, followed by native joint contour and material retouch',joint_retouch_pixels:angles.map(a=>jointRetouchPixels(a).length),joint_review_region:jointReviewRegion,fixed_parts:['complete tapered mast','elliptical collar','mount base','roof','hull','supports']},preserved_parts:['dish','antennae','solar panel','airlock','stairs','supports','pipes','windows'],palette_policy:'No artistic color-count cap; GIF global palette is a format encoding constraint.',native_frame_rgba_sha256:expected,source_sha256:hash(await fs.readFile(path.join(sources,'lunar-outpost.pxo'))),sheet_sha256:hash(await fs.readFile(path.join(output,'lunar-outpost-sheet.png'))),gif_sha256:hash(await fs.readFile(gif)),source_roundtrip_rgba_equal:true,visual_review:'Pending all-pose enlarged joint contour/material inspection and complete loop review. Alpha connectivity is not visual approval.'};
  await fs.writeFile(path.join(sources,'lunar-outpost-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await fs.writeFile(path.join(work,'verification.json'),JSON.stringify({ok:true,health:health.data,commands,manifest},null,2));
  console.log(JSON.stringify({ok:true,work,commands:commands.length,alpha_edits:changes.length,light_pixels:lightMask.length}));
  }
}finally{app.kill();await fs.writeFile(path.join(work,'process-output.log'),logs);}
