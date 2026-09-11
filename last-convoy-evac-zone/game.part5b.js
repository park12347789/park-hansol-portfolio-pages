// V2 convoy-follow squad, weapon roles, stronger armor, vehicle airdrops and casualty return.
function weaponStats(type){
  return ({
    rifle:{name:'RIFLE',range:56,damage:24,cd:.42,color:0xd9f2c8,splash:0},
    lmg:{name:'LMG',range:62,damage:16,cd:.12,color:0xffe5a0,splash:0},
    marksman:{name:'DMR',range:88,damage:58,cd:1.05,color:0xc5e7ff,splash:0},
    shotgun:{name:'SHOTGUN',range:34,damage:32,cd:.72,color:0xffc6a5,splash:2.8},
    grenadier:{name:'GRENADE',range:68,damage:72,cd:1.55,color:0xffb16f,splash:7},
    medic:{name:'MEDIC',range:48,damage:17,cd:.55,color:0xbef7d0,splash:0}
  })[type]||{name:'RIFLE',range:56,damage:24,cd:.42,color:0xd9f2c8,splash:0};
}
function createSoldier(type='rifle'){
  const g=new THREE.Group();
  const mat=type==='lmg'?MAT.apc:type==='marksman'?MAT.police:type==='grenadier'?MAT.civilian:MAT.soldier;
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.6,1.3,3,7),mat);body.position.y=1.65;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.52,8,6),MAT.soldierDark);head.position.y=3.05;head.castShadow=true;g.add(head);
  const gunLen=type==='marksman'?2.9:type==='lmg'?2.6:2.2;
  const gun=new THREE.Mesh(new THREE.BoxGeometry(.24,.24,gunLen),MAT.tankDark);gun.position.set(.55,2,-.7);gun.rotation.y=-.15;g.add(gun);
  if(type==='grenadier'){const tube=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,1.3,7),MAT.tankDark);tube.rotation.x=Math.PI/2;tube.position.set(.4,1.7,-.7);g.add(tube);}
  g.userData.weapon=type;return g;
}
function addSoldiers(g,count,type='rifle'){
  if(!g)return;
  for(let i=0;i<count;i++){
    const wt=Array.isArray(type)?type[i%type.length]:type;
    const mesh=createSoldier(wt);scene.add(mesh);mesh.position.copy(g.player.group.position);
    g.soldiers.push({mesh,hp:100,maxHp:100,fireCd:Math.random()*.35,index:g.squadMax,weapon:wt,garrisoned:false});
    g.squadMax++;
  }
  updateHUD();
}
function addStartingSquad(count,hasMedic){
  const types=[];for(let i=0;i<count;i++)types.push(i===1&&count>=5?'lmg':'rifle');if(hasMedic&&types.length)types[types.length-1]='medic';addSoldiers(game,count,types);
}
function addSpecialists(types){
  if(!game)return;for(const type of types)game.reinforceQueue.push({weapon:type,due:game.time+.2,upgrade:true});toast('전문 분대 배속',`<strong>${types.map(t=>weaponStats(t).name).join(' · ')}</strong> 투입 헬기 출발`);
}
function queueCasualty(s){
  const delay=game.mods.respawnTime*(.85+Math.random()*.3);game.reinforceQueue.push({weapon:s.weapon||'rifle',due:game.time+delay,upgrade:false});toast('분대원 전투불능',`약 <strong>${Math.round(delay)}초</strong> 후 항공 재투입`);
}
function updateSoldiers(dt){
  const alive=[],center=game.player.group.position;const garrison=game.activeFacility&&game.activeFacility.state==='defending'?game.activeFacility:null;
  for(let i=0;i<game.soldiers.length;i++){
    const s=game.soldiers[i];if(s.hp<=0){scene.remove(s.mesh);queueCasualty(s);continue;}const ws=weaponStats(s.weapon);
    if(garrison){s.garrisoned=true;const side=i%4,row=Math.floor(i/4),slots=[[-11,-10],[11,-10],[-11,10],[11,10]],sl=slots[side],off=new THREE.Vector3(sl[0]*(1+row*.08),0,sl[1]*(1+row*.08));const target=garrison.group.position.clone().add(off);target.y=side<2?8.8:11.2;s.mesh.position.lerp(target,1-Math.exp(-dt*6.5));}
    else{s.garrisoned=false;const row=Math.floor(i/2),side=i%2?1:-1,lateral=(game.formation==='wide'?8.5:4.8)+((row%2)*1.1),back=11+row*4.1;const off=new THREE.Vector3(side*lateral,0,back).applyAxisAngle(new THREE.Vector3(0,1,0),game.player.group.rotation.y),target=center.clone().add(off);s.mesh.position.lerp(target,1-Math.exp(-dt*4.4));resolveCityCollision(s.mesh.position,.7);}
    s.fireCd-=dt;const range=ws.range*(s.garrisoned?1.3:1)*game.mods.formation,target=findNearestZombie(s.mesh.position,range);
    if(target){const dx=target.pos.x-s.mesh.position.x,dz=target.pos.z-s.mesh.position.z;s.mesh.rotation.y=lerpAngle(s.mesh.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*10));if(s.fireCd<=0){s.fireCd=ws.cd*(.9+Math.random()*.18);const mult=game.mods.squadDamage*(s.garrisoned?game.mods.garrisonDamage:1);if(ws.splash>0)splashDamageAt(target.pos,ws.damage*mult,ws.splash);else damageZombie(target,ws.damage*mult);tracer(s.mesh.position,target.pos,ws.color,.055);}}
    alive.push(s);
  }
  game.soldiers=alive;updateReinforcementHeli(dt);
}
function updateReinforcementHeli(dt){
  if(!game.reinforceHeli){const ready=game.reinforceQueue.filter(x=>x.due<=game.time).slice(0,5);if(ready.length){game.reinforceQueue=game.reinforceQueue.filter(x=>!ready.includes(x));const h=createHelicopter();h.position.copy(game.player.group.position).add(new THREE.Vector3(65,38,45));scene.add(h);game.reinforceHeli={group:h,t:0,batch:ready,landed:false};toast('재투입 헬기 접근',`분대원 <strong>${ready.length}명</strong> 복귀 중`);}return;}
  const h=game.reinforceHeli;h.t+=dt;h.group.userData.rotor.rotation.y+=dt*30;const p=game.player.group.position;
  if(h.t<3){const t=smooth(h.t/3);h.group.position.x=THREE.MathUtils.lerp(p.x+65,p.x+16,t);h.group.position.z=THREE.MathUtils.lerp(p.z+45,p.z+18,t);h.group.position.y=THREE.MathUtils.lerp(38,8,t);}
  else if(!h.landed){h.landed=true;for(const r of h.batch)addSoldiers(game,1,r.weapon);toast('분대 재투입 완료',`<strong>${h.batch.length}명</strong> 전선 복귀`);}
  else{h.group.position.y+=dt*15;h.group.position.x+=dt*12;if(h.group.position.y>55){scene.remove(h.group);game.reinforceHeli=null;}}
}
function createJeep(){
  const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(5.4,1.5,7),MAT.apc);body.position.y=1.7;body.castShadow=true;g.add(body);const cab=new THREE.Mesh(new THREE.BoxGeometry(4.5,1.5,3.2),MAT.tank);cab.position.set(0,2.7,1);g.add(cab);
  for(const x of [-2.8,2.8])for(const z of [-2.3,2.3]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.55,9),MAT.tankDark);w.rotation.z=Math.PI/2;w.position.set(x,.9,z);g.add(w);}const t=new THREE.Group();t.position.y=3.7;g.add(t);g.userData.turret=t;const gun=new THREE.Mesh(new THREE.BoxGeometry(.28,.28,4.1),MAT.tankDark);gun.position.z=-2.1;t.add(gun);g.userData.kind='jeep';return g;
}
function addVehicle(g,type,airdrop=false){
  if(!g)return;const mesh=type==='tank'?createTank():type==='jeep'?createJeep():createAPC();scene.add(mesh);const idx=g.vehicles.length;mesh.position.copy(g.player.group.position);mesh.position.x+=10+(idx%2)*8;mesh.position.z+=12+Math.floor(idx/2)*10;
  if(airdrop){mesh.position.y=22;const chute=new THREE.Mesh(new THREE.SphereGeometry(4.8,12,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0xe3dfc7,transparent:true,opacity:.78,wireframe:true}));chute.position.y=6;mesh.add(chute);mesh.userData.chute=chute;}
  g.vehicles.push({type,group:mesh,slot:idx,mgCd:Math.random()*.35,cannonCd:.7+Math.random()*.5,dropping:airdrop});updateHUD();toast('기갑 보급',`${type.toUpperCase()} <strong>${airdrop?'공중 투하':'합류'}</strong>`);
}
function updateVehicles(dt){
  const base=game.player.group.position;
  for(let i=0;i<game.vehicles.length;i++){
    const v=game.vehicles[i];if(v.dropping){v.group.position.y=Math.max(0,v.group.position.y-dt*10);if(v.group.position.y<=0){v.dropping=false;if(v.group.userData.chute){v.group.remove(v.group.userData.chute);delete v.group.userData.chute;}hitFlash(v.group.position,0xe8d68b,.45);}continue;}
    const row=Math.floor(i/2)+1,side=i%2?1:-1,off=new THREE.Vector3(side*(9+row*2),0,16+row*11).applyAxisAngle(new THREE.Vector3(0,1,0),game.player.group.rotation.y),target=base.clone().add(off);v.group.position.lerp(target,1-Math.exp(-dt*2.7));resolveCityCollision(v.group.position,v.type==='tank'?4.8:3.8);v.group.rotation.y=lerpAngle(v.group.rotation.y,game.player.group.rotation.y,1-Math.exp(-dt*4));if(v.type==='tank')autoFireTank(v,dt,v.group,false);else if(v.type==='jeep')autoFireJeep(v,dt);else autoFireAPC(v,dt);
  }
}
function autoFireJeep(v,dt){v.mgCd-=dt;const target=findNearestZombie(v.group.position,68);if(!target)return;aimTurret(v.group,target.pos,dt);if(v.mgCd<=0){v.mgCd=.075;splashDamageAt(target.pos,10*game.mods.mgDamage,1.8);tracer(v.group.position,target.pos,0xffe2a1,.055);}}
function autoFireAPC(v,dt){v.mgCd-=dt;const target=findNearestZombie(v.group.position,82);if(!target)return;aimTurret(v.group,target.pos,dt);if(v.mgCd<=0){v.mgCd=.085;splashDamageAt(target.pos,15*game.mods.mgDamage,2.2);tracer(v.group.position,target.pos,0xffd787,.06);}}
function autoFireTank(owner,dt,mesh,isMain=false){owner.cannonCd-=dt;owner.mgCd-=dt;const target=findNearestZombie(mesh.position,isMain?125:112);if(!target)return;aimTurret(mesh,target.pos,dt);if(owner.mgCd<=0){owner.mgCd=isMain?.105:.125;splashDamageAt(target.pos,(isMain?25:20)*game.mods.mgDamage,isMain?2.7:2.3);tracer(mesh.position,target.pos,0xa6d9b8,.07);}if(owner.cannonCd<=0){owner.cannonCd=(isMain?1.05:1.35)/game.mods.cannonRate;cannonBlast(target.pos,(isMain?175:145)*game.mods.blast,(isMain?19:16)*game.mods.blast);muzzleFlash(mesh.position);}}
function splashDamageAt(pos,dmg,radius){for(const z of game.zombies){if(!z.alive)continue;const d=z.pos.distanceTo(pos);if(d<=radius)damageZombie(z,dmg*(1-d/radius*.35));}}
function toggleFormation(){game.formation=game.formation==='column'?'wide':'column';toast('호송 대형',game.formation==='column'?'<strong>종대</strong> — 전차 후방 추종':'<strong>확장</strong> — 보병 간격 확대');updateHUD();}
