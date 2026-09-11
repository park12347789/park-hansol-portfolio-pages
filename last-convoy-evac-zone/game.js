import * as THREE from 'three';
const files=['game.part1.js','game.part2a.js','game.part2b.js','game.part3a.js','game.part3b.js','game.part4a.js','game.part4b.js','game.part5a.js','game.part5b.js','game.part5c.js','game.part5d.js','game.part6a.js','game.part6b.js','game.part6c.js','game.part6d.js','game.part7a.js','game.part7b.js','game.part7c.js','game.part7d.js','game.part7e.js'];
const parts=await Promise.all(files.map(f=>fetch('./'+f).then(r=>{if(!r.ok) throw new Error(f+' '+r.status); return r.text();})));
new Function('THREE', parts.join('\n'))(THREE);
