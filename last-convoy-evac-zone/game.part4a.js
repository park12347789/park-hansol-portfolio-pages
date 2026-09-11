function beginDefense(f){
  game.activeFacility=f; f.state='defending'; game.facilityIntegrity=100;
  game.defenseDuration=32*game.mods.defenseTime; game.defenseRemaining=game.defenseDuration;
  game.threat=Math.min(5,2+game.facilitiesDone);
  els.objectiveTimer.classList.remove('hidden');
  toast(`${f.type} 확보`, '<strong>구조 신호 송출</strong> — 대규모 감염체 접근');
  // facility occupants join the evac queue immediately
  game.carried+=f.people; game.rescued+=f.people;
  helicopterApproach(f);
}
function failFacility(f){
  toast('시설 방어 실패','구조 신호가 끊겼습니다. 구역을 다시 확보하십시오.');
  f.state='idle'; f.capture=0; game.activeFacility=null; game.defenseRemaining=0; game.threat=Math.max(1,game.threat-1); removeHelicopter();
}
function completeFacility(f){
  f.state='done'; game.facilitiesDone++; game.activeFacility=null; game.threat=Math.min(5,1+game.facilitiesDone);
  const ev=game.carried; game.evacuated+=ev; game.carried=0;
  addSupply(30+ev); toast(`${f.type} 구조 완료`, `<strong>${ev}명 철수</strong> · 보급품 확보`); helicopterDepart();
  if(f.type==='POLICE') addSoldiers(game,3);
  if(f.type==='HOSPITAL') game.mods.regen+=1.2;
  if(f.type==='RADIO') game.mods.defenseTime*=.9;
  if(game.facilitiesDone>=game.facilities.length) setTimeout(finishGame,2200);
}
function helicopterApproach(f){
  removeHelicopter(); const h=createHelicopter(); h.position.copy(f.group.position).add(new THREE.Vector3(0,45,-27)); h.scale.setScalar(.01); scene.add(h); game.helicopter={group:h,state:'in',t:0,facility:f};
}
function createHelicopter(){
  const g=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(5,2.4,9),new THREE.MeshStandardMaterial({color:0x35463d,roughness:.8})); body.castShadow=true; g.add(body);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(2.2,10,7),MAT.tank); nose.scale.set(1,.65,1.2); nose.position.z=-4.3; g.add(nose);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.9,.9,8),MAT.tank); tail.position.z=7; g.add(tail);
  const rotor=new THREE.Mesh(new THREE.BoxGeometry(18,.1,.35),MAT.tankDark); rotor.position.y=2.2; g.add(rotor); g.userData.rotor=rotor;
  return g;
}
function helicopterDepart(){ if(game.helicopter){ game.helicopter.state='out'; game.helicopter.t=0; } }
function removeHelicopter(){ if(game?.helicopter){ scene.remove(game.helicopter.group); game.helicopter=null; } }

function spawnZombies(dt){
  game.spawnAcc-=dt; if(game.spawnAcc>0||game.zombies.length>300) return;
  const defense=!!game.activeFacility; const baseRate=defense?.10:.34; game.spawnAcc=baseRate/(1+(game.time/180)*.75);
  const count=defense?(2+Math.floor(game.threat*.75)):1;
  for(let i=0;i<count;i++) spawnZombie(defense?game.activeFacility.group.position:game.player.group.position,defense);
}
function spawnZombie(target,defense){
  const a=Math.random()*Math.PI*2, dist=defense?110+Math.random()*55:90+Math.random()*80;
  const pos=target.clone().add(new THREE.Vector3(Math.cos(a)*dist,0,Math.sin(a)*dist)); pos.x=THREE.MathUtils.clamp(pos.x,-410,410); pos.z=THREE.MathUtils.clamp(pos.z,-410,410);
  const g=createZombieMesh(); g.position.copy(pos); scene.add(g);
  game.zombies.push({mesh:g,pos:g.position,hp:48+game.threat*8,alive:true,speed:5.5+Math.random()*2.4+game.threat*.35,attackCd:Math.random()*.5});
}
function createZombieMesh(){
  const g=new THREE.Group(); const b=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.15,2,6),MAT.zombie); b.position.y=1.45; g.add(b); const h=new THREE.Mesh(new THREE.SphereGeometry(.44,7,5),MAT.zombieHead); h.position.y=2.7; g.add(h); return g;
}
function updateZombies(dt){
  const alive=[];
  for(const z of game.zombies){
    if(!z.alive){ scene.remove(z.mesh); continue; }
    let target=game.activeFacility?game.activeFacility.group.position:game.player.group.position;
    // if a soldier is close, peel off and attack them
    let soldier=null, best=8*8;
    for(const s of game.soldiers){ const d=s.mesh.position.distanceToSquared(z.pos); if(d<best){best=d;soldier=s;} }
    if(soldier) target=soldier.mesh.position;
    const dx=target.x-z.pos.x,dz=target.z-z.pos.z,dist=Math.hypot(dx,dz)||1;
    if(dist>2.1){ z.pos.x+=dx/dist*z.speed*dt; z.pos.z+=dz/dist*z.speed*dt; z.mesh.rotation.y=lerpAngle(z.mesh.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*6)); }
    z.attackCd-=dt;
    if(soldier&&dist<2.7&&z.attackCd<=0){ z.attackCd=.75; soldier.hp-=10+game.threat*1.5; hitFlash(soldier.mesh.position,0xff746d); }
