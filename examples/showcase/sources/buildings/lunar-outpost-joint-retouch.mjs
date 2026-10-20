/**
 * Native-canvas retouch plan for the radar's physical pitch connection.
 * The old rectangular selection cut the mast at y=83. Keep its complete
 * tapered highlight, side wall, and elliptical collar stationary instead.
 * Transforming the bowl supplies a pose draft; these authored pixel clusters
 * finish the socket at every pose before native export.
 */
const fixedNeck = [[245,70],[250,73],[253,76],[261,77],[267,77],[267,84],[260,88],[242,87],[242,75]];
function inside(x,y,points) {
  let hit=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [ax,ay]=points[i],[bx,by]=points[j];
    if(((ay>y)!==(by>y))&&x<(bx-ax)*(y-ay)/(by-ay)+ax)hit=!hit;
  }
  return hit;
}
export function isFixedNeck(x,y) {return y>=84 || inside(x+.5,y+.5,fixedNeck);}
export const pitchPivot=[256,76];
const colors={d:'#111822',s:'#222c39',m:'#364351',l:'#586877',h:'#74818d'};
// Each row is an intentionally drawn metal contour, not a rotated mast.
// Space leaves the underlying preserved surface untouched.
const bearing={x:253,y:74,rows:['  ddd   ',' dsmmsd ','dsmllmsd','dsmmmmsd',' dssssd ','  dddd  ']};
const profiles={
  '-4':{x:251,y:71,rows:['    dddd ','  ddsssd ',' dssmssd ','  dsssd  ']},
  '-2':{x:252,y:72,rows:['   dddd ',' ddsssd ',' dsmssd ']},
  '0':{x:252,y:73,rows:['  ddddd ',' dsmssd ']},
  '2':{x:252,y:72,rows:[' dddd   ','dsssd   ',' dsmssd ']},
  '4':{x:252,y:71,rows:[' dddd   ','dsssd   ',' dsssd  ','  dsmssd']},
};
export function jointRetouchPixels(angle) {
  const p=profiles[String(angle)];if(!p)throw new Error('No reviewed joint pose for this pitch angle.');
  const pixels=new Map();
  for(const part of [p,bearing])for(let y=0;y<part.rows.length;y++)for(let x=0;x<part.rows[y].length;x++) {
    const color=colors[part.rows[y][x]];
    if(color)pixels.set(`${part.x+x},${part.y+y}`,{x:part.x+x,y:part.y+y,color});
  }
  return [...pixels.values()];
}
export const jointReviewRegion=[238,64,48,34];
