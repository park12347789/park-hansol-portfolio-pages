import * as THREE from 'three';
const files=['game.part1.js','game.part2a.js','game.part2b.js','game.part3a.js','game.part3b.js','game.part4a.js','game.part4b.js','game.part5a.js','game.part5b.js','game.part5c.js'];
const parts=await Promise.all(files.map(f=>fetch('./'+f).then(r=>{if(!r.ok) throw new Error(f+' '+r.status); return r.text();})));
new Function('THREE', parts.join('\n'))(THREE);
