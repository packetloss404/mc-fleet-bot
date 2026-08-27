import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-cobalt-wl-headhouse-source-20260825T084034Z';
const reader = new AnvilReader(path.resolve(SNAPSHOT, 'region'));
const blockName = (s)=>s.split('[',1)[0];
const isAir = (s)=>['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(blockName(s));
const st = async(x,y,z)=>stateToCommandString(await reader.blockState(x,y,z));
const FLUID = new Set(['minecraft:water','minecraft:lava','minecraft:bubble_column']);
const isFluid = (s)=>FLUID.has(blockName(s))||s.includes('waterlogged=true');
console.log('=== PLATFORM DECK CEILING band (y24..29) over deck z=-444..-441 x=-254..-236 ===');
for(let y=29;y>=24;y--){
  let row=[];
  for(let x=-254;x<=-236;x++){
    let counts={};
    for(let z=-444;z<=-441;z++){
      const s=await st(x,y,z); const b=blockName(s).split(':')[1];
      if(isAir(s)) counts['air']=(counts['air']??0)+1;
      else if(isFluid(s)) counts['water']=(counts['water']??0)+1;
      else counts[b]=(counts[b]??0)+1;
    }
    row.push(`${x}:${Object.entries(counts).map(([k,v])=>`${v}${k}`).join(',')}`);
  }
  console.log(`y=${y}  ${row.join('  ')}`);
}
console.log('\n=== COLUMNS y16..70 along z=-444 (deck band) x=-254..-236 ===');
for(let x=-254;x<=-236;x++){
  const w=[],spec=[];
  for(let y=16;y<=70;y++){
    const s=await st(x,y,-444); const b=blockName(s).split(':')[1];
    if(isFluid(s)) w.push(y);
    if(['polished_deepslate','polished_andesite','gravel','sand','chest','barrel','spawner','sea_lantern','lantern'].includes(b)) spec.push(`${y}:${b}`);
  }
  console.log(`x=${x}: water@[${w.join(',')}]${spec.length?' special@['+spec.join(' ')+']':''}`);
}
console.log('\n=== CORRIDOR WEST CAP x=-255 (y16..66) z=-462..-457 ===');
for(let z=-462;z<=-457;z++){
  const w=[],spec=[];
  for(let y=16;y<=66;y++){
    const s=await st(-255,y,z); const b=blockName(s).split(':')[1];
    if(isFluid(s)) w.push(y);
    if(['polished_deepslate','polished_andesite','gravel','sand','chest','barrel','spawner','sea_lantern','lantern'].includes(b)) spec.push(`${y}:${b}`);
  }
  console.log(`z=${z}: water@[${w.join(',')}]${spec.length?' special@['+spec.join(' ')+']':''}`);
}
console.log('\nDONE');
