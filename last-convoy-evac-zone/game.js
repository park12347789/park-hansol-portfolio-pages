import * as THREE from 'three';
const files=['game.part1.js','game.part2.js','game.part3.js','game.part4.js'];
const parts=await Promise.all(files.map(f=>fetch('./'+f).then(r=>{if(!r.ok) throw new Error(f+' '+r.status); return r.text();})));
new Function('THREE', parts.join('\n'))(THREE);
