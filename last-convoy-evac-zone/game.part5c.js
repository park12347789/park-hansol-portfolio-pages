// V2 garrisons, fortified strongpoints, kill-streak supply helicopters and expanded upgrade pool.
function updateFacilities(dt){
  const p=game.player.group.position;
  for(const f of game.facilities){
    const dist=p.distanceTo(f.group.position);
    f.group.userData.beacon.material.opacity=f.state==='done'?.08:(.24+Math.sin(game.time*2)*.08);
    if(f.state==='idle'&&dist<34&&!game.activeFacility){
      f.capture+=dt;els.objectiveTitle.textContent=`${f.type} 진입 / 확보`;els.objectiveDesc.textContent=`분대가 건물 내부로 진입합니다 · ${Math.min(100,Math.round(f.capture/2.2*100))}%`;if(f.capture>=2.2)beginDefense(f);
    }else if(f.state==='idle'&&dist>=34)f.capture=Math.max(0,f.capture-dt*.55);
    if(f.fortified)updateFortifiedFire(f,dt);
  }
  if(game.activeFacility){const f=game.activeFacility;game.defenseRemaining-=dt;if(game.defenseRemaining<=0)completeFacility(f);}
  else{const next=game.facilities.find(f=>f.state==='idle');if(next){els.objectiveTitle.textContent=`${next.type} 확보`;els.objectiveDesc.textContent='건물 외곽의 확보 구역까지 접근하면 분대가 내부에 주둔합니다.';els.objectiveTimer.classList.add('hidden');}else{els.objectiveTitle.textContent='도시 구조 작전 지속';els.objectiveDesc.textContent='모든 주요 거점을 확보했습니다. 구조와 보급 투하를 계속하십시오.';els.objectiveTimer.classList.add('hidden');}}
}
function beginDefense(f){
  game.activeFacility=f;f.state='defending';game.facilityIntegrity=100;game.defenseDuration=30*game.mods.defenseTime;game.defenseRemaining=game.defenseDuration;game.threat=Math.min(5,2+game.facilitiesDone);els.objectiveTimer.classList.remove('hidden');game.carried+=f.people;game.rescued+=f.people;toast(`${f.type} 주둔`,'분대가 <strong>건물 내부 사격 위치</strong>를 확보했습니다 · 주둔 중 피해 면역');helicopterApproach(f);
}
function completeFacility(f){
  f.state='done';game.facilitiesDone++;game.activeFacility=null;game.threat=Math.min(5,1+game.facilitiesDone);const ev=game.carried;game.evacuated+=ev;game.carried=0;addSupply(30+ev);helicopterDepart();if(f.type==='POLICE')addSpecialists(['lmg','rifle']);if(f.type==='HOSPITAL')game.mods.regen+=1.2;if(f.type==='RADIO')game.mods.respawnTime*=.82;if(f.fortifiable)fortifyFacility(f);toast(`${f.type} 확보 완료`,`<strong>${ev}명 철수</strong>${f.fortifiable?' · 거점 요새화 완료':''}`);
}
function fortifyFacility(f){
  f.fortified=true;game.fortified.push(f);const sandMat=new THREE.MeshStandardMaterial({color:0x8a7657,roughness:1});for(const x of [-13,-8,-3,3,8,13]){const b=new THREE.Mesh(new THREE.BoxGeometry(4,1.5,2.4),sandMat);b.position.set(x,1,-16);f.group.add(b);}for(const x of [-8,8]){const mount=new THREE.Group();mount.position.set(x,15,-5);f.group.add(mount);const base=new THREE.Mesh(new THREE.CylinderGeometry(.7,.9,.8,9),MAT.tankDark);mount.add(base);const gun=new THREE.Mesh(new THREE.BoxGeometry(.32,.32,5),MAT.tankDark);gun.position.z=-2.4;mount.add(gun);}const glow=new THREE.Mesh(new THREE.RingGeometry(21,22,48),new THREE.MeshBasicMaterial({color:0x7dffc0,transparent:true,opacity:.36,side:THREE.DoubleSide}));glow.rotation.x=-Math.PI/2;glow.position.y=.35;f.group.add(glow);
}
function updateFortifiedFire(f,dt){
  f.turretCd-=dt;const target=findNearestZombie(f.group.position,108);if(!target)return;if(f.turretCd<=0){f.turretCd=.11;splashDamageAt(target.pos,22*game.mods.squadDamage,1.7);const from=f.group.position.clone();from.y=15;from.x+=Math.sin(game.time*4)*8;tracer(from,target.pos,0x8dffbf,.055);}
}
function updateZombies(dt){
  const alive=[];
  for(const z of game.zombies){
    if(!z.alive){scene.remove(z.mesh);continue;}let target=game.activeFacility?game.activeFacility.group.position:game.player.group.position;let nearestFort=null,fortD=70*70;for(const f of game.fortified){const d=z.pos.distanceToSquared(f.group.position);if(d<fortD){fortD=d;nearestFort=f;}}if(nearestFort)target=nearestFort.group.position;let soldier=null,best=9*9;for(const s of game.soldiers){if(s.garrisoned)continue;const d=s.mesh.position.distanceToSquared(z.pos);if(d<best){best=d;soldier=s;}}if(soldier)target=soldier.mesh.position;const dx=target.x-z.pos.x,dz=target.z-z.pos.z,dist=Math.hypot(dx,dz)||1;if(dist>2.2){z.pos.x+=dx/dist*z.speed*dt;z.pos.z+=dz/dist*z.speed*dt;resolveCityCollision(z.pos,.7);z.mesh.rotation.y=lerpAngle(z.mesh.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*6));}z.attackCd-=dt;if(soldier&&dist<2.7&&z.attackCd<=0){z.attackCd=.75;soldier.hp-=10+game.threat*1.5;hitFlash(soldier.mesh.position,0xff746d);}alive.push(z);
  }
  game.zombies=alive;updateHelicopter(dt);updateSupplyHelicopter(dt);
}
function damageZombie(z,dmg){
  if(!z?.alive)return;z.hp-=dmg;if(z.hp<=0){z.alive=false;game.kills++;if(Math.random()<.14)addSupply(1,false);if(game.kills>=game.nextDropKills&&!game.pendingSupplyDrop){game.pendingSupplyDrop=true;game.nextDropKills+=game.dropStep+Math.floor(game.level*2.5);beginSupplyDrop();}}
}
function beginSupplyDrop(){
  if(game.supplyHeli)return;const h=createHelicopter(),p=game.player.group.position;h.position.copy(p).add(new THREE.Vector3(78,46,54));scene.add(h);game.supplyHeli={group:h,t:0,state:'approach',crate:null,opened:false};toast('보급 헬기 출격',`좀비 <strong>${game.kills}기 제거</strong> · 전술 보급 접근 중`);
}
function updateSupplyHelicopter(dt){
  const h=game.supplyHeli;if(!h)return;h.t+=dt;h.group.userData.rotor.rotation.y+=dt*30;const p=game.player.group.position;
  if(h.state==='approach'){
    const t=Math.min(1,h.t/3);h.group.position.x=THREE.MathUtils.lerp(p.x+78,p.x+12,smooth(t));h.group.position.z=THREE.MathUtils.lerp(p.z+54,p.z+12,smooth(t));h.group.position.y=THREE.MathUtils.lerp(46,18,smooth(t));if(t>=1){h.state='drop';h.t=0;const crate=new THREE.Group();const box=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new THREE.MeshStandardMaterial({color:0x997b42,roughness:.9}));box.castShadow=true;crate.add(box);const stripe=new THREE.Mesh(new THREE.BoxGeometry(4.1,.45,4.1),new THREE.MeshBasicMaterial({color:0xf0c85b}));stripe.position.y=.2;crate.add(stripe);crate.position.copy(h.group.position);crate.position.y-=4;scene.add(crate);h.crate=crate;game.supplyCrate=crate;}
  }else if(h.state==='drop'){
    if(h.crate){h.crate.position.y=Math.max(.8,h.crate.position.y-dt*13);h.crate.rotation.y+=dt*.8;if(h.crate.position.y<=.81&&!h.opened){h.opened=true;hitFlash(h.crate.position,0xffdf72,.5);toast('보급품 도착','3개 전술 보급 중 <strong>하나를 선택</strong>하십시오.');h.state='out';h.t=0;game.pendingSupplyDrop=false;triggerUpgrade();}}
  }else{h.group.position.y+=dt*16;h.group.position.x+=dt*13;if(h.group.position.y>70){scene.remove(h.group);if(h.crate)scene.remove(h.crate);game.supplyCrate=null;game.supplyHeli=null;}}
}
function addSupply(n,check=true){game.supply+=n;}
function triggerUpgrade(){
  if(game.paused)return;game.paused=true;game.upgradeCount++;game.level++;const picks=weightedPicks(UPGRADES,3);els.upgradeCards.innerHTML='';for(const u of picks){const card=document.createElement('div');card.className='upgrade-card';card.innerHTML=`<div class="tier">${u.tier}</div><div class="icon">${u.icon}</div><div class="card-title">${u.name}</div><div class="card-desc">${u.desc}</div><div class="effect">${u.effect}</div>`;card.onclick=()=>{u.apply(game);els.upgradeScreen.classList.remove('visible');game.paused=false;toast('보급 선택',`<strong>${u.name}</strong> 적용`);};els.upgradeCards.appendChild(card);}els.upgradeScreen.classList.add('visible');
}
function updateHUD(){if(!game)return;
  els.civilianStat.textContent=`${game.carried} / ${game.evacuated}`;els.squadStat.textContent=`${game.soldiers.length} / ${game.squadMax}`;els.armorStat.textContent=String(1+game.vehicles.length);els.supplyStat.textContent=`${game.supply} · DROP ${Math.max(0,game.nextDropKills-game.kills)}`;els.formationStat.textContent=game.formation==='column'?'COLUMN':'WIDE';els.formationStat.style.color=game.formation==='column'?'var(--mint)':'var(--ice)';const threat=game.activeFacility?Math.min(5,2+game.facilitiesDone):Math.min(5,1+Math.floor(game.time/75));game.threat=Math.max(game.threat,threat);els.threatLabel.textContent=String(game.threat);els.threatBar.style.width=`${game.threat*20}%`;if(game.activeFacility){const f=game.activeFacility,t=Math.max(0,game.defenseRemaining);els.missionText.textContent=`${f.type} GARRISON · SAFE`;els.objectiveTitle.textContent=`${f.name} 주둔 방어`;els.objectiveDesc.textContent='분대는 건물 내부에서 보호받으며 강화 사격 중입니다.';els.objectiveTimer.textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.ceil(t%60)).padStart(2,'0')}`;els.objectiveTimer.classList.remove('hidden');}else els.missionText.textContent=game.facilitiesDone?`요새 거점 ${game.fortified.length} · 구조 계속`:'도시 수색 중';
}
const _reinforce=UPGRADES.find(u=>u.id==='reinforce');if(_reinforce){_reinforce.desc='소총수 3명이 재투입 헬기로 합류합니다.';_reinforce.effect='+3 RIFLE';_reinforce.apply=()=>addSpecialists(['rifle','rifle','rifle']);}
const _apc=UPGRADES.find(u=>u.id==='apc');if(_apc){_apc.weight=1.05;_apc.desc='낮은 확률의 중량 보급. APC를 전장에 공중 투하합니다.';_apc.effect='APC AIRDROP';_apc.apply=g=>addVehicle(g,'apc',true);}
const _tank=UPGRADES.find(u=>u.id==='tank');if(_tank){_tank.weight=.42;_tank.desc='매우 희귀한 기갑 보급. 추가 MBT를 공중 투하합니다.';_tank.effect='MBT AIRDROP';_tank.apply=g=>addVehicle(g,'tank',true);}
UPGRADES.push(
  {id:'jeep',tier:'RARE',icon:'▱',name:'무장 지프 보급',desc:'기동성이 높은 기관총 지프를 공중 투하합니다.',effect:'JEEP AIRDROP',weight:1.35,apply:g=>addVehicle(g,'jeep',true)},
  {id:'lmgteam',tier:'COMMON',icon:'≣',name:'LMG 화력조',desc:'고연사 경기관총 사수 2명을 항공 투입합니다.',effect:'+2 LMG',weight:3.8,apply:()=>addSpecialists(['lmg','lmg'])},
  {id:'marksman',tier:'RARE',icon:'⌖',name:'지정사수',desc:'긴 사거리와 높은 단발 피해의 지정사수를 투입합니다.',effect:'+1 DMR',weight:2.4,apply:()=>addSpecialists(['marksman'])},
  {id:'grenadier',tier:'RARE',icon:'✷',name:'유탄수',desc:'군집을 폭발 피해로 정리하는 유탄수를 투입합니다.',effect:'+1 GRENADIER',weight:2.0,apply:()=>addSpecialists(['grenadier'])},
  {id:'shotgun',tier:'COMMON',icon:'⋙',name:'근접 돌격조',desc:'근거리 군집 제압에 강한 산탄총 사수 2명을 투입합니다.',effect:'+2 SHOTGUN',weight:3.0,apply:()=>addSpecialists(['shotgun','shotgun'])},
  {id:'quickreturn',tier:'RARE',icon:'↻',name:'신속 재투입',desc:'전투불능 분대원의 헬기 복귀 시간이 짧아집니다.',effect:'재투입 시간 -25%',weight:2.0,apply:g=>g.mods.respawnTime*=.75},
  {id:'garrison',tier:'RARE',icon:'▦',name:'주둔 화력 통제',desc:'거점 내부 분대의 안전 사격 효율을 높입니다.',effect:'주둔 피해 +35%',weight:2.2,apply:g=>g.mods.garrisonDamage*=1.35}
);
