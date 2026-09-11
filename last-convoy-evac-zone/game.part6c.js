// V3: city crisis events and a harsher battlefield atmosphere.
function addCrisisScenery(){
  scene.userData.moodFires=[];const rand=mulberry32(260912),roads=[-360,-240,-120,0,120,240,360];
  for(let i=0;i<11;i++){
    const horizontal=rand()>.5,x=horizontal?(rand()-.5)*700:roads[Math.floor(rand()*roads.length)]+(rand()-.5)*15,z=horizontal?roads[Math.floor(rand()*roads.length)]+(rand()-.5)*15:(rand()-.5)*700,g=new THREE.Group();g.position.set(x,0,z);
    const flameMat=new THREE.MeshBasicMaterial({color:i%2?0xff7b35:0xffb347,transparent:true,opacity:.8,depthWrite:false}),flame=new THREE.Mesh(new THREE.ConeGeometry(1.4,4.8,6),flameMat);flame.position.y=2.3;g.add(flame);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(2.2,7,5),new THREE.MeshBasicMaterial({color:0xff5d23,transparent:true,opacity:.2,depthWrite:false}));glow.position.y=1.8;g.add(glow);
    for(let s=0;s<3;s++){const smoke=new THREE.Mesh(new THREE.SphereGeometry(1.1+s*.55,6,5),new THREE.MeshBasicMaterial({color:0x202326,transparent:true,opacity:.22-s*.035,depthWrite:false}));smoke.position.set((rand()-.5)*1.5,5+s*2.2,(rand()-.5)*1.5);g.add(smoke);}
    if(i<4){const l=new THREE.PointLight(0xff6a2e,2.2,35,2);l.position.y=4;g.add(l);g.userData.light=l;}scene.add(g);scene.userData.moodFires.push(g);
  }
}
function updateCityMood(dt){
  const fires=scene.userData.moodFires||[];for(let i=0;i<fires.length;i++){const g=fires[i],f=g.children[0];if(f){const q=.88+Math.sin(game.time*13+i*1.7)*.11+Math.sin(game.time*7.2+i)*.07;f.scale.set(1,q,1);f.rotation.y+=dt*.9;}if(g.userData.light)g.userData.light.intensity=1.7+Math.sin(game.time*11+i)*.5;}
}
function cityEventMarker(pos,color){
  const g=new THREE.Group();g.position.copy(pos);const ring=new THREE.Mesh(new THREE.RingGeometry(7.5,8.4,28),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.35;g.add(ring);const beam=new THREE.Mesh(new THREE.CylinderGeometry(.22,.7,34,8,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=17;g.add(beam);const mark=new THREE.Mesh(new THREE.OctahedronGeometry(1.7),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));mark.position.y=12;g.add(mark);scene.add(g);return g;
}
function pickEventPos(){
  const roads=[-300,-240,-180,-120,-60,0,60,120,180,240,300],p=game.player.group.position;for(let tries=0;tries<18;tries++){const horizontal=Math.random()>.5,x=horizontal?roads[Math.floor(Math.random()*roads.length)]:[-240,-120,0,120,240][Math.floor(Math.random()*5)],z=horizontal?[-240,-120,0,120,240][Math.floor(Math.random()*5)]:roads[Math.floor(Math.random()*roads.length)],v=new THREE.Vector3(x,0,z);if(v.distanceToSquared(p)>100*100)return v;}return new THREE.Vector3(240,0,-240);
}
function spawnCityEvent(){
  game.cityEvents=game.cityEvents||[];const types=['distress','armory','holdout','medical','breach'],type=types[Math.floor(Math.random()*types.length)],pos=pickEventPos();
  if(type==='breach'){const a=Math.atan2(pos.z-game.player.group.position.z,pos.x-game.player.group.position.x);game.surgeAngle=a;game.hordeBurst=(game.hordeBurst||0)+145;toast('방어선 붕괴','도시 외곽의 차단선이 무너졌습니다. <strong>대규모 감염파</strong>가 유입됩니다.');game.cityEvents.push({type,pos,group:cityEventMarker(pos,0xff5f58),expires:game.time+12});return;}
  const colors={distress:0xffc968,armory:0x73d8ff,holdout:0xff805f,medical:0x8dffc0},labels={distress:'민간인 구조신호',armory:'경찰 무기고',holdout:'고립 분대',medical:'응급 의료차량'};
  const e={type,pos,group:cityEventMarker(pos,colors[type]),expires:game.time+(type==='distress'?42:50),label:labels[type]};game.cityEvents.push(e);toast('도시 긴급신호',`<strong>${labels[type]}</strong> 발견 · 신호가 사라지기 전에 접근하십시오.`);
}
function resolveCityEvent(e){
  if(e.type==='distress'){const n=7+Math.floor(Math.random()*8);game.carried+=n;game.rescued+=n;addSpecialists(['rifle','rifle']);toast('구조신호 확보',`민간인 <strong>${n}명</strong>과 호위 인원을 확보했습니다.`);}
  else if(e.type==='armory'){const pool=['lmg','marksman','grenadier','shotgun'],a=pool[Math.floor(Math.random()*pool.length)],b=pool[Math.floor(Math.random()*pool.length)];addSpecialists([a,b]);game.mods.squadDamage*=1.08;toast('무기고 확보','전문 화기와 탄약을 확보했습니다. <strong>분대 화력 +8%</strong>');}
  else if(e.type==='holdout'){addSpecialists(['lmg','rifle','grenadier']);game.hordeBurst=(game.hordeBurst||0)+65;toast('고립 분대 접촉','생존 병력이 합류했습니다. 추격 중인 감염체가 <strong>대량 접근</strong>합니다.');}
  else if(e.type==='medical'){for(const s of game.soldiers)s.hp=s.maxHp;game.mods.regen+=.35;const n=4+Math.floor(Math.random()*5);game.carried+=n;game.rescued+=n;toast('응급 의료차량 확보',`분대 전원 치료 · 부상 민간인 <strong>${n}명</strong> 구조`);}
  if(e.group)scene.remove(e.group);e.done=true;
}
function failCityEvent(e){
  if(e.group)scene.remove(e.group);e.done=true;if(e.type==='distress'||e.type==='holdout'){game.lostCivilians=(game.lostCivilians||0)+(e.type==='distress'?10:4);game.surgeAngle=Math.atan2(e.pos.z-game.player.group.position.z,e.pos.x-game.player.group.position.x);game.hordeBurst=(game.hordeBurst||0)+55;toast('구조신호 소실','현장 응답이 끊겼습니다. <strong>생존자 확보 실패</strong>');}
}
function updateCityEvents(dt){
  game.cityEvents=game.cityEvents||[];if(game.nextCityEvent===undefined)game.nextCityEvent=28;
  if(game.time>=game.nextCityEvent&&game.cityEvents.filter(e=>!e.done).length<2){spawnCityEvent();game.nextCityEvent=game.time+38+Math.random()*30;}
  const p=game.player.group.position;for(const e of game.cityEvents){if(e.done)continue;if(e.group){e.group.rotation.y+=dt*.45;const m=e.group.children[2];if(m)m.position.y=12+Math.sin(game.time*3)*1.4;}if(e.type!=='breach'&&p.distanceToSquared(e.pos)<19*19)resolveCityEvent(e);else if(game.time>=e.expires)failCityEvent(e);}
  game.cityEvents=game.cityEvents.filter(e=>!e.done);
}
function animate(){
  if(!game?.running)return;const dt=Math.min(clock.getDelta(),.034);if(!game.paused){game.time+=dt;game.hudAcc+=dt;updatePlayer(dt);updateVehicles(dt);updateSoldiers(dt);updateCivilians(dt);updateFacilities(dt);updateZombies(dt);updateEffects(dt);spawnZombies(dt);updateRegen(dt);updateCityEvents(dt);updateCityMood(dt);if(game.hudAcc>.12){updateHUD();game.hudAcc=0;}}
  updateCamera(dt);renderer.render(scene,camera);raf=requestAnimationFrame(animate);
}
