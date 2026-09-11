// V4: tactical city map, exploration, shelters and richer run state.
var v4MapCanvas=null,v4MiniCanvas=null,v4MapWrap=null;
addEventListener('keydown',function(e){
  if(e.code==='Tab'&&game&&game.running){e.preventDefault();game.mapOpen=!game.mapOpen;ensureMapUI();v4MapWrap.classList.toggle('visible',game.mapOpen);const c=document.querySelector('#crosshair');if(c)c.style.opacity=game.mapOpen?'0':'.82';if(game.mapOpen)drawTacticalMap(true);}
});
function ensureMapUI(){
  if(v4MapWrap)return;
  v4MapWrap=document.createElement('section');v4MapWrap.id='tacticalMap';
  v4MapWrap.innerHTML='<div class="map-shell"><div class="map-head"><div><span>TACTICAL CITY MAP</span><b>EVACUATION COMMAND NET</b></div><div class="map-hint">TAB 닫기 · 감염 밀도는 추정치</div></div><canvas id="cityMapCanvas" width="760" height="760"></canvas><div class="map-legend"><i class="lg-player"></i>호송대 <i class="lg-fac"></i>주요시설 <i class="lg-shelter"></i>쉘터 <i class="lg-event"></i>긴급신호 <i class="lg-evac"></i>대피차량 <span>감염: <em>LOW</em> <strong>HIGH</strong></span></div></div>';
  document.body.appendChild(v4MapWrap);v4MapCanvas=v4MapWrap.querySelector('#cityMapCanvas');
  v4MiniCanvas=document.createElement('canvas');v4MiniCanvas.id='miniMap';v4MiniCanvas.width=190;v4MiniCanvas.height=190;document.body.appendChild(v4MiniCanvas);
}
function startGame(){
  cancelAnimationFrame(raf);for(const o of [...scene.children])if(o.userData?.preview)scene.remove(o);els.startScreen.classList.remove('visible');[els.hudTop,els.hudLeft,els.objectivePanel].forEach(e=>e.classList.remove('hidden'));
  game={running:true,paused:false,mapOpen:false,time:0,kills:0,rescued:0,evacuated:0,lostCivilians:0,facilitiesDone:0,supply:selectedLoadout.supply||0,nextSupply:0,level:1,threat:1,carried:0,formation:'column',formationT:0,
    nextDropKills:30,dropStep:35,pendingSupplyDrop:false,supplyHeli:null,supplyCrate:null,reinforceQueue:[],reinforceHeli:null,pendingVehicleDrops:[],fortified:[],trail:[],
    shelters:[],evacConvoys:[],cityEvents:[],explored:new Set(),mapAcc:0,nextCityEvent:26,activeHoldout:null,
    mods:{speed:selectedLoadout.speed||1,squadDamage:1,mgDamage:1,cannonRate:1,blast:1,regen:selectedLoadout.medics?1.2:0,formation:1,defenseTime:1,rescueBonus:selectedLoadout.rescueBonus||1,respawnTime:12,garrisonDamage:1.8},
    player:createPlayer(),vehicles:[],soldiers:[],civilians:[],facilities:[],zombies:[],effects:[],activeFacility:null,defenseRemaining:0,defenseDuration:0,facilityIntegrity:100,helicopter:null,spawnAcc:0,hudAcc:0,upgradeCount:0,squadMax:0};
  scene.add(game.player.group);addStartingSquad(selectedLoadout.soldiers||5,!!selectedLoadout.medics);if(selectedLoadout.apc)addVehicle(game,'apc');setupFacilities();setupCivilians();setupShelters();ensureMapUI();v4MapWrap.classList.remove('visible');v4MiniCanvas.style.display='block';toast('작전 개시','<strong>TAB 작전지도</strong>로 구조신호·쉘터·감염 밀도를 확인하십시오.');clock.getDelta();animate();
}
function createShelterVisual(name){
  const g=new THREE.Group();const base=new THREE.Mesh(new THREE.BoxGeometry(30,9,24),new THREE.MeshStandardMaterial({color:0x4a554e,roughness:.95}));base.position.y=4.5;base.castShadow=true;g.add(base);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(32,2,26),MAT.tankDark);roof.position.y=10;g.add(roof);const door=new THREE.Mesh(new THREE.BoxGeometry(6,5,.5),MAT.apc);door.position.set(0,2.6,-12.25);g.add(door);
  for(const x of [-10,-5,0,5,10]){const b=new THREE.Mesh(new THREE.BoxGeometry(4,1.4,2),new THREE.MeshStandardMaterial({color:0x8a7758,roughness:1}));b.position.set(x,.8,-14);g.add(b);}
  const ring=new THREE.Mesh(new THREE.RingGeometry(18,19,40),new THREE.MeshBasicMaterial({color:0x79e4b0,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.25;g.add(ring);g.userData.ring=ring;
  return g;
}
function setupShelters(){
  const defs=[{name:'SHELTER ALPHA',pos:[120,-300],people:34,method:'truck',exit:[120,-405]},{name:'SHELTER BRAVO',pos:[-300,120],people:52,method:'bus',exit:[-405,120]}];
  for(const d of defs){const group=createShelterVisual(d.name);group.position.set(d.pos[0],0,d.pos[1]);scene.add(group);const s={...d,group,state:'hidden',capture:0,discovered:false,fortified:false,evacStarted:false,turretCd:0};game.shelters.push(s);scene.userData.obstacles.push({x:d.pos[0],z:d.pos[1],hx:15.5,hz:12.5,kind:'shelter'});}
}
function updateExploration(){
  if(!game)return;const p=game.player.group.position,cell=60,cx=Math.floor((p.x+420)/cell),cz=Math.floor((p.z+420)/cell);for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)game.explored.add(x+':'+z);
  for(const s of game.shelters){if(!s.discovered&&s.group.position.distanceToSquared(p)<135*135){s.discovered=true;s.state='idle';toast('쉘터 발견',`<strong>${s.name}</strong> · 생존자 약 ${s.people}명 · ${s.method==='bus'?'버스':'트럭'} 대피 가능`);}}
}
function worldToMap(pos,w,h){return{x:(pos.x+420)/840*w,y:(pos.z+420)/840*h};}
function drawTacticalMap(full){
  if(!game)return;const canvas=full?v4MapCanvas:v4MiniCanvas;if(!canvas)return;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle=full?'#0a1113':'rgba(7,13,15,.88)';ctx.fillRect(0,0,w,h);
  const cells=full?14:8,cellWorld=840/cells,counts=Array.from({length:cells*cells},()=>0);for(const z of game.zombies){if(!z.alive)continue;const x=Math.max(0,Math.min(cells-1,Math.floor((z.pos.x+420)/cellWorld))),y=Math.max(0,Math.min(cells-1,Math.floor((z.pos.z+420)/cellWorld)));counts[y*cells+x]++;}
  for(let y=0;y<cells;y++)for(let x=0;x<cells;x++){const c=counts[y*cells+x],seen=!full||game.explored.has(Math.floor(x*(14/cells))+':'+Math.floor(y*(14/cells)));const t=Math.min(1,c/(full?13:20));ctx.fillStyle=seen?`rgba(${Math.round(55+180*t)},${Math.round(82-45*t)},${Math.round(66-30*t)},${.12+.55*t})`:'rgba(3,7,8,.82)';ctx.fillRect(x*w/cells,y*h/cells,w/cells+.5,h/cells+.5);}
  ctx.strokeStyle='rgba(167,196,184,.15)';ctx.lineWidth=full?2:1;for(const r of [-360,-240,-120,0,120,240,360]){let p=worldToMap(new THREE.Vector3(r,0,-420),w,h);ctx.beginPath();ctx.moveTo(p.x,0);ctx.lineTo(p.x,h);ctx.stroke();p=worldToMap(new THREE.Vector3(-420,0,r),w,h);ctx.beginPath();ctx.moveTo(0,p.y);ctx.lineTo(w,p.y);ctx.stroke();}
  const mark=(pos,color,label,size)=>{const q=worldToMap(pos,w,h);ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,size,0,Math.PI*2);ctx.fill();if(full&&label){ctx.fillStyle='#dce8e3';ctx.font='11px sans-serif';ctx.fillText(label,q.x+8,q.y-8);}};
  for(const f of game.facilities)mark(f.group.position,f.state==='done'?'#72efb2':'#91c8ff',f.type,full?6:3);
  for(const s of game.shelters)if(s.discovered)mark(s.group.position,s.state==='secured'?'#76f0b2':'#ffc66e',s.name,full?7:4);
  for(const e of game.cityEvents||[])if(!e.done&&e.type!=='breach')mark(e.pos,'#ff765f',e.label,full?6:3);
  for(const c of game.evacConvoys||[])if(!c.done)mark(c.group.position,'#ffd657',c.type.toUpperCase()+' EVAC',full?6:3);
  mark(game.player.group.position,'#ffffff','CONVOY',full?8:4);
}
