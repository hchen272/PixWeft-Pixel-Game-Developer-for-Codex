/** Opt-in stdio MCP review of the actual sheets in an isolated Godot project. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const godot=process.argv[process.argv.indexOf('--godot')+1];
if(!process.argv.includes('--godot') || !godot) throw new Error('Supply --godot PATH.');
const work=path.join(root,'.local','showcase','godot-preview',randomUUID());
for(const dir of ['assets','captures']) await fs.mkdir(path.join(work,dir),{recursive:true});
const index=JSON.parse(await fs.readFile(path.join(root,'examples','showcase','manifest.json'),'utf8'));
const groups={characters:[['medieval-knight','Knight / sword attack'],['futuristic-runner','Future girl / run'],['salaryman-idle','Office worker / idle']],animals:[['spoon-billed-sandpiper','Sandpiper / walk'],['red-whiskered-bulbul','Bulbul / hop'],['ginger-kitten','Kitten / walk'],['corgi-puppy','Corgi / trot']],buildings:[['woodland-cottage','Woodland cottage'],['mediterranean-bookshop','Mediterranean bookshop'],['lunar-outpost','Lunar outpost']]};
const assets=[];
let rowTop=60;
for(const [category,entries] of Object.entries(groups)) {
 const row=[];
 for(let i=0;i<entries.length;i++) {
  const [id,title]=entries[i],metadata=index.assets.find(asset=>asset.id===id);
  assert(metadata,'Missing showcase metadata for '+id);
  assert.equal(metadata.source_frames,8,'This example expects a four-column, two-row sheet.');
  const bytes=await fs.readFile(path.join(root,metadata.sheet));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=bytes.readUInt32BE(16)/4,height=bytes.readUInt32BE(20)/2;
  assert(Number.isInteger(width)&&Number.isInteger(height));
  await fs.writeFile(path.join(work,'assets',id+'.png'),bytes);
  assert.deepEqual([width,height],metadata.logical_canvas,'Sheet canvas disagrees with the asset index.');
  const sheet_sha256=createHash('sha256').update(bytes).digest('hex');
  assert.equal(sheet_sha256,metadata.hashes.sheet,'Update current asset metadata before playback.');
  const scale=category==='buildings'?1:2;
  row.push({id,title,category,width,height,fps:metadata.fps,frames:metadata.source_frames,sheet_sha256,scale,index:i});
 }
 const rowHeight=Math.max(...row.map(entry=>entry.height*entry.scale));
 for(const entry of row) {
  entry.position=[1280*(entry.index+0.5)/entries.length,rowTop+rowHeight/2];
  entry.caption_y=rowTop+rowHeight+8;
  delete entry.index;
  assets.push(entry);
 }
 rowTop+=rowHeight+80;
}
const viewportHeight=Math.ceil(rowTop);
await fs.writeFile(path.join(work,'assets.json'),JSON.stringify(assets));
await fs.writeFile(path.join(work,'project.godot'),`config_version=5\n[application]\nconfig/name="PixWeft showcase verification"\nrun/main_scene="res://main.tscn"\n[display]\nwindow/size/viewport_width=1280\nwindow/size/viewport_height=${viewportHeight}\n[rendering]\nrenderer/rendering_method="gl_compatibility"\ntextures/canvas_textures/default_texture_filter=0\nenvironment/defaults/default_clear_color=Color(0.075,0.09,0.125,1)\n`);
await fs.writeFile(path.join(work,'main.tscn'),'[gd_scene load_steps=2 format=3]\n[ext_resource type="Script" path="res://main.gd" id="1"]\n[node name="Showcase" type="Node2D"]\ntexture_filter=1\nscript=ExtResource("1")\n');
await fs.writeFile(path.join(work,'main.gd'),`extends Node2D
var observed_frame_masks: Dictionary = {}
var animation_count: int = 0
var samples: Array[AnimatedSprite2D] = []
func _ready() -> void:
  var data: Array = JSON.parse_string(FileAccess.get_file_as_string("res://assets.json"))
  var heading := Label.new()
  heading.text = "PixWeft / native export playback"
  heading.position = Vector2(24, 8)
  heading.add_theme_font_size_override("font_size", 23)
  add_child(heading)
  for entry in data:
    var sprite := AnimatedSprite2D.new()
    sprite.name = str(entry.id)
    sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
    sprite.position = Vector2(entry.position[0], entry.position[1])
    sprite.scale = Vector2(entry.scale, entry.scale)
    var frames := SpriteFrames.new()
    frames.clear("default")
    frames.set_animation_speed("default", entry.fps)
    frames.set_animation_loop("default", true)
    var texture: Texture2D = load("res://assets/" + str(entry.id) + ".png")
    for index in int(entry.frames):
      var region := AtlasTexture.new()
      region.atlas = texture
      region.region = Rect2((index % 4) * entry.width, (index / 4) * entry.height, entry.width, entry.height)
      frames.add_frame("default", region)
    sprite.sprite_frames = frames
    add_child(sprite)
    sprite.play()
    samples.append(sprite)
    observed_frame_masks[entry.id] = 0
    var caption := Label.new()
    caption.text = str(entry.title)
    caption.position = Vector2(entry.position[0] - 125, entry.caption_y)
    caption.add_theme_font_size_override("font_size", 18)
    add_child(caption)
  animation_count = samples.size()
func _process(_delta: float) -> void:
  for sprite in samples:
    var key := str(sprite.name)
    observed_frame_masks[key] = int(observed_frame_masks[key]) | (1 << sprite.frame)
`);
const imported=spawn(godot,['--headless','--editor','--import','--quit','--path',work,'--log-file',path.join(work,'import.log')],{windowsHide:true});let log='';imported.stdout.on('data',v=>log+=v);imported.stderr.on('data',v=>log+=v);
assert.equal((await once(imported,'exit'))[0],0,log);assert(!/SCRIPT ERROR|Parse Error/.test(log),log);
const client=new Client({name:'pixweft-showcase-review',version:'1.0.0'});
const transport=new StdioClientTransport({command:process.execPath,args:[path.join(root,'mcp','server.mjs')],cwd:root,stderr:'pipe'});
async function tool(name,args) {const r=await client.callTool({name,arguments:args});assert(!r.isError,JSON.stringify(r));return JSON.parse(r.content[0].text);}
try {
  await client.connect(transport);await tool('project_init',{project_root:work,tools:{godot_path:godot}});
  const measurements=[];
  for(const entry of assets) {
    const result=await tool('godot_operation',{project_root:work,operation:'image_inspect',args:{resource_path:'res://assets/'+entry.id+'.png',constraints:{width:entry.width*4,height:entry.height*2,max_partial_alpha_pixels:0}}});
    assert(result.ok);assert(result.data.checks.every(c=>c.passed));measurements.push({id:entry.id,data:result.data});
  }
  const loopCoverageFrames=Math.ceil((Math.max(...assets.map(entry=>entry.frames/entry.fps))+0.6)*60);
  const result=await tool('godot_runtime',{project_root:work,args:{frames_before:2,steps:[{type:'wait',frames:loopCoverageFrames},{type:'inspect',properties:['animation_count','observed_frame_masks']},{type:'capture',output_path:'res://captures/phase-a.png'},{type:'wait',frames:21},{type:'capture',output_path:'res://captures/phase-b.png'},{type:'wait',frames:21},{type:'capture',output_path:'res://captures/phase-c.png'}]}});
  assert(result.ok,JSON.stringify(result));
  const observed=result.data.steps.find(s=>s.data?.properties?.animation_count!==undefined);
  assert(observed,JSON.stringify(result));assert.equal(observed.data.properties.animation_count,assets.length);
  for(const mask of Object.values(observed.data.properties.observed_frame_masks))assert.equal(mask,255,'Godot must display every source frame.');
  await fs.writeFile(path.join(work,'verification.json'),JSON.stringify({ok:true,engine:result.engine_version,asset_count:assets.length,all_source_frames_observed:true,assets,measurements,runtime:result},null,2));
  console.log(JSON.stringify({ok:true,work,assets:assets.length,captures:['phase-a.png','phase-b.png','phase-c.png']}));
}finally{await client.close();}
