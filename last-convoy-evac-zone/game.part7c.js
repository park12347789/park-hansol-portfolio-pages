// V4: barricaded survivors, rooftop extraction, spontaneous bus evacuation, engineers and crisis escalation.
function eventProp(type,pos){
  const g=new THREE.Group();g.position.copy(pos);
  if(type==='barricade'||type==='rooftop'){
    const b=new THREE.Mesh(new THREE.BoxGeometry(22,type==='rooftop'?20:11,18),new THREE.MeshStandardMaterial({color:type==='rooftop'?0x555b5d:0x62594e,roughness:.95}));b.position.y=type==='rooftop'?10:5.5;b.castShadow=true;g.add(b);
    for(const x of [-8,-3,3,8]){const s=new THREE.Mesh(new THREE.BoxGeometry(3,1.3,2),new THREE.MeshStandardMaterial({color:0x8a7657,roughness:1}));s.position.set(x,1,-10);g.add(s);}
  }else if(type==='mechanics'){
    const wreck=createJeep();wreck.rotation.y=.35;g.add(wreck);const lamp=new THREE.PointLight(0xffd07a,1.5,24);lamp.position.set(0,5,0);g.add(lamp);
  }
  scene.add(g);return g;
}
function spawnCityEvent(){
  game.cityEvents=game.cityEvents||[];const types=['barricade','rooftop','buscall','armory','medical','mechanics','breach'],type=types[Math.floor(Math.random()*types.length)],pos=pickEventPos();
  if(type==='breach'){game.surgeAngle=Math.atan2(pos.z-game.player.group.position.z,pos.x-game.player.group.position.x);game.hordeBurst=(game.hordeBurst||0)+180;const e={type,pos,group:cityEventMarker(pos,0xff4d45),expires:game.time+14,label:'도시 방어선 붕괴',done:false};game.cityEvents.push(e);toast('도시 방어선 붕괴','외곽 차단선이 무너졌습니다. <strong>대규모 감염파</strong>가 유입됩니다.');return;}
  const cfg={
    barricade:{label:'건물 농성 생존자',color:0xff9d63,time:58},rooftop:{label:'옥상 구조 요청',color:0xffd66f,time:60},buscall:{label:'민간 버스 집결지',color:0x72d7ff,time:50},
    armory:{label:'경찰 무기고',color:0x73d8ff,time:52},medical:{label:'응급 의료차량',color:0x8dffc0,time:48},mechanics:{label:'정비반 고립',color:0xc8b7ff,time:55}
  }[type];
  const e={type,pos,label:cfg.label,group:cityEventMarker(pos,cfg.color),prop:eventProp(type,pos),expires:game.time+cfg.time,phase:'waiting',timer:0,done:false};game.cityEvents.push(e);toast('도시 긴급신호',`<strong>${cfg.label}</strong> · 작전지도에 위치가 표시되었습니다.`);
}
function startCityEvent(e){
  if(e.phase!=='waiting')return;
  if(e.type==='barricade'){e.phase='defend';e.timer=12;game.hordeBurst=(game.hordeBurst||0)+105;game.surgeAngle=Math.atan2(e.pos.z-game.player.group.position.z,e.pos.x-game.player.group.position.x);toast('농성지 접촉','출입구 확보 중 · <strong>12초간 생존자 이탈을 엄호</strong>하십시오.');}
  else if(e.type==='rooftop'){e.phase='defend';e.timer=10;game.hordeBurst=(game.hordeBurst||0)+75;const h=createHelicopter();h.position.copy(e.pos).add(new THREE.Vector3(35,35,22));scene.add(h);e.eventHeli=h;toast('옥상 구조 개시','구조 헬기가 접근합니다. <strong>착륙 구역을 유지</strong>하십시오.');}
  else if(e.type==='buscall'){const n=24+Math.floor(Math.random()*15);game.rescued+=n;spawnEventEvac(e,'bus',n);e.done=true;toast('민간 버스 출발',`생존자 <strong>${n}명</strong> 탑승 · 외곽까지 호위하십시오.`);cleanupEvent(e);}
  else resolveInstantEvent(e);
}
function resolveInstantEvent(e){
  if(e.type==='armory'){const pool=['lmg','marksman','grenadier','shotgun'],types=[pool[Math.floor(Math.random()*pool.length)],pool[Math.floor(Math.random()*pool.length)]];addSpecialists(types);game.mods.squadDamage*=1.08;toast('무기고 확보','전문 화기 확보 · <strong>분대 화력 +8%</strong>');}
  else if(e.type==='medical'){for(const s of game.soldiers)s.hp=s.maxHp;game.mods.regen+=.4;const n=5+Math.floor(Math.random()*6);game.carried+=n;game.rescued+=n;toast('의료차량 구조',`부상자 <strong>${n}명</strong> 확보 · 분대 치료 능력 향상`);}
  else if(e.type==='mechanics'){game.mods.speed*=1.05;game.mods.convoyRepair=(game.mods.convoyRepair||0)+1.4;addVehicle(game,'jeep');toast('정비반 구조','무장 지프 복구 · 대피차량에 <strong>응급 정비</strong>가 적용됩니다.');}
  e.done=true;cleanupEvent(e);
}
function spawnEventEvac(e,type,n){
  const g=createEvacVehicle(type);g.position.copy(e.pos);scene.add(g);const path=exitPath(e.pos),c={type,group:g,hp:type==='bus'?500:320,maxHp:type==='bus'?500:320,passengers:n,state:'loading',load:5.5,path,index:0,speed:type==='bus'?12:15,done:false,shelter:null,attackFlash:0};game.evacConvoys.push(c);game.hordeBurst=(game.hordeBurst||0)+90;
}
function exitPath(pos){
  const p=pos.clone();if(Math.abs(p.x)>=Math.abs(p.z)){const ex=p.x>=0?405:-405;return[p.clone(),new THREE.Vector3(ex,0,p.z)];}const ez=p.z>=0?405:-405;return[p.clone(),new THREE.Vector3(p.x,0,ez)];
}
function completeTimedEvent(e){
  if(e.type==='barricade'){const n=13+Math.floor(Math.random()*12);game.carried+=n;game.rescued+=n;addSpecialists(['rifle','lmg']);toast('농성 생존자 확보',`민간인 <strong>${n}명</strong>이 호송대에 합류했습니다.`);}
  else if(e.type==='rooftop'){const n=9+Math.floor(Math.random()*9);game.rescued+=n;game.evacuated+=n;toast('옥상 항공구조 성공',`생존자 <strong>${n}명</strong> 즉시 항공 철수`);if(e.eventHeli){scene.remove(e.eventHeli);e.eventHeli=null;}}
  e.done=true;cleanupEvent(e);
}
function cleanupEvent(e){if(e.group){scene.remove(e.group);e.group=null;}if(e.prop){scene.remove(e.prop);e.prop=null;}}
function failCityEvent(e){
  if(e.done)return;e.done=true;cleanupEvent(e);if(e.eventHeli){scene.remove(e.eventHeli);e.eventHeli=null;}const loss=e.type==='barricade'?18:e.type==='rooftop'?12:e.type==='buscall'?25:0;if(loss){game.lostCivilians+=loss;game.hordeBurst=(game.hordeBurst||0)+70;toast('구조신호 소실',`현장 응답이 끊겼습니다. 추정 <strong>${loss}명</strong> 구조 실패`);}
}
function updateCityEvents(dt){
  game.cityEvents=game.cityEvents||[];if(game.time>=game.nextCityEvent&&game.cityEvents.filter(e=>!e.done).length<3){spawnCityEvent();game.nextCityEvent=game.time+32+Math.random()*26;}
  const p=game.player.group.position;for(const e of game.cityEvents){if(e.done)continue;if(e.group){e.group.rotation.y+=dt*.35;const m=e.group.children[2];if(m)m.position.y=12+Math.sin(game.time*3)*1.2;}
    if(e.type==='breach'){if(game.time>=e.expires){cleanupEvent(e);e.done=true;}continue;}
    if(e.phase==='waiting'&&p.distanceToSquared(e.pos)<22*22)startCityEvent(e);
    if(e.phase==='defend'){e.timer-=dt;if(e.eventHeli){e.eventHeli.userData.rotor.rotation.y+=dt*30;e.eventHeli.position.lerp(e.pos.clone().add(new THREE.Vector3(0,10,0)),1-Math.exp(-dt*.7));}if(e.timer<=0)completeTimedEvent(e);}
    else if(e.phase==='waiting'&&game.time>=e.expires)failCityEvent(e);
  }game.cityEvents=game.cityEvents.filter(e=>!e.done);
}
