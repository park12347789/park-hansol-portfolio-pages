// V2 city, camera-friendly buildings, collisions, and extended run state.
function addGroundAndCity(){
  scene.userData.buildings=[];
  scene.userData.obstacles=[];
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(900,900),MAT.ground); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
  const roadW=28,spacing=120;
  for(let i=-3;i<=3;i++){
    const x=i*spacing;
    const r1=new THREE.Mesh(new THREE.PlaneGeometry(roadW,840),MAT.asphalt); r1.rotation.x=-Math.PI/2; r1.position.set(x,.012,0); r1.receiveShadow=true; scene.add(r1);
    const r2=new THREE.Mesh(new THREE.PlaneGeometry(840,roadW),MAT.asphalt); r2.rotation.x=-Math.PI/2; r2.position.set(0,.014,x); r2.receiveShadow=true; scene.add(r2);
    addRoadLines(x,0,false); addRoadLines(0,x,true);
  }
  const rand=mulberry32(91126);
  for(let gx=-3;gx<3;gx++) for(let gz=-3;gz<3;gz++){
    const cx=gx*spacing+spacing/2,cz=gz*spacing+spacing/2;
    const slots=rand()>.45?2:1;
    for(let k=0;k<slots;k++){
      const ox=(k%2?1:-1)*(24+rand()*10),oz=(k>0?1:-1)*(24+rand()*10);
      if(nearAnyFacility(cx+ox,cz+oz,58)) continue;
      addBuilding(cx+ox,cz+oz,30+rand()*20,30+rand()*20,18+rand()*42,rand());
    }
  }
  for(let i=0;i<24;i++){
    const x=(rand()-.5)*720,z=(rand()-.5)*720;
    const roads=[-360,-240,-120,0,120,240,360];
    if(Math.min(...roads.map(r=>Math.abs(x-r)))>11&&Math.min(...roads.map(r=>Math.abs(z-r)))>11) continue;
    addWreck(x,z,rand()*Math.PI*2,rand());
  }
}

function addBuilding(x,z,w,d,h,t){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const baseMat=(t>.5?MAT.building:MAT.buildingDark).clone(); baseMat.transparent=true;
  const roofMat=MAT.tankDark.clone(); roofMat.transparent=true;
  const base=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),baseMat); base.position.y=h/2; base.castShadow=true; base.receiveShadow=true; g.add(base);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w*.42,2.2,d*.36),roofMat); roof.position.y=h+1.1; g.add(roof);
  const fadeMats=[baseMat,roofMat];
  if(h>32){
    const rows=Math.min(4,Math.floor(h/11));
    for(let r=0;r<rows;r++) for(const side of [-1,1]){
      const wm=MAT.window.clone(); wm.transparent=true; fadeMats.push(wm);
      const win=new THREE.Mesh(new THREE.BoxGeometry(w*.5,.9,.18),wm); win.position.set(0,8+r*9,side*(d/2+.1)); g.add(win);
    }
  }
  g.userData.fadeMats=fadeMats; g.userData.radius=Math.max(w,d)*.55; g.userData.height=h;
  scene.userData.buildings.push(g);
  scene.userData.obstacles.push({x,z,hx:w*.5+.7,hz:d*.5+.7,kind:'building'});
  scene.add(g);
}

function resolveCityCollision(pos,radius=.8){
  const obs=scene.userData.obstacles||[];
  for(const o of obs){
    const dx=pos.x-o.x,dz=pos.z-o.z;
    const px=o.hx+radius-Math.abs(dx),pz=o.hz+radius-Math.abs(dz);
    if(px>0&&pz>0){
      if(px<pz) pos.x=o.x+(dx>=0?1:-1)*(o.hx+radius);
      else pos.z=o.z+(dz>=0?1:-1)*(o.hz+radius);
    }
  }
}

function setupFacilities(){
  const data=[
    {name:'ST. MARY HOSPITAL',type:'HOSPITAL',pos:[240,-120],color:0xd6e0dc,people:18,reward:'야전 의료 보급',fortifiable:true},
    {name:'CENTRAL POLICE',type:'POLICE',pos:[-240,120],color:0x6385a0,people:12,reward:'무장 인원 증원',fortifiable:true},
    {name:'CITY RADIO',type:'RADIO',pos:[0,240],color:0x9c8b73,people:22,reward:'항공 구조 정보',fortifiable:false}
  ];
  for(const f of data){
    const g=createFacility(f); g.position.set(f.pos[0],0,f.pos[1]); scene.add(g);
    const rec={...f,group:g,state:'idle',capture:0,integrity:100,fortified:false,turretCd:0};
    game.facilities.push(rec);
    scene.userData.obstacles.push({x:f.pos[0],z:f.pos[1],hx:17.5,hz:14.5,kind:'facility'});
  }
}

function startGame(){
  cancelAnimationFrame(raf);
  for(const o of [...scene.children]) if(o.userData?.preview) scene.remove(o);
  els.startScreen.classList.remove('visible');
  [els.hudTop,els.hudLeft,els.objectivePanel].forEach(e=>e.classList.remove('hidden'));
  game={
    running:true,paused:false,time:0,kills:0,rescued:0,evacuated:0,facilitiesDone:0,supply:selectedLoadout.supply||0,
    nextSupply:0,level:1,threat:1,carried:0,formation:'column',formationT:0,
    nextDropKills:30,dropStep:35,pendingSupplyDrop:false,supplyHeli:null,supplyCrate:null,
    reinforceQueue:[],reinforceHeli:null,pendingVehicleDrops:[],fortified:[],
    mods:{speed:selectedLoadout.speed||1,squadDamage:1,mgDamage:1,cannonRate:1,blast:1,regen:selectedLoadout.medics?1.2:0,formation:1,defenseTime:1,rescueBonus:selectedLoadout.rescueBonus||1,respawnTime:12,garrisonDamage:1.8},
    player:createPlayer(),vehicles:[],soldiers:[],civilians:[],facilities:[],zombies:[],effects:[],
    activeFacility:null,defenseRemaining:0,defenseDuration:0,facilityIntegrity:100,helicopter:null,
    spawnAcc:0,hudAcc:0,upgradeCount:0,squadMax:0
  };
  scene.add(game.player.group);
  addStartingSquad(selectedLoadout.soldiers||5,!!selectedLoadout.medics);
  if(selectedLoadout.apc) addVehicle(game,'apc');
  setupFacilities(); setupCivilians();
  toast('작전 개시','호송대를 유지하며 <strong>생존자와 거점</strong>을 확보하십시오.');
  clock.getDelta(); animate();
}

function updatePlayer(dt){
  const p=game.player,dir=new THREE.Vector3();
  if(keys.has('KeyW'))dir.z-=1;if(keys.has('KeyS'))dir.z+=1;if(keys.has('KeyA'))dir.x-=1;if(keys.has('KeyD'))dir.x+=1;
  const moving=dir.lengthSq()>0;if(moving)dir.normalize();
  const formationSpeed=game.formation==='column'?1.04:1;
  const boost=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?1.22:1;
  const speed=25*game.mods.speed*formationSpeed*boost;
  const targetVel=dir.multiplyScalar(speed);p.vel.lerp(targetVel,1-Math.exp(-dt*7));
  const old=p.group.position.clone(); p.group.position.addScaledVector(p.vel,dt);
  resolveCityCollision(p.group.position,5.0);
  if(old.distanceToSquared(p.group.position)<.001&&moving)p.vel.multiplyScalar(.25);
  p.group.position.x=THREE.MathUtils.clamp(p.group.position.x,-390,390);p.group.position.z=THREE.MathUtils.clamp(p.group.position.z,-390,390);
  if(moving){const targetYaw=Math.atan2(p.vel.x,p.vel.z);p.yaw=lerpAngle(p.yaw,targetYaw,1-Math.exp(-dt*7));p.group.rotation.y=p.yaw;}
  autoFireTank(p,dt,p.group,true);
}

function updateCamera(dt){
  const target=game?game.player.group.position:new THREE.Vector3();
  const desired=target.clone().add(new THREE.Vector3(54,66,58));camera.position.lerp(desired,1-Math.exp(-dt*3.2));camera.lookAt(target.x,target.y+1,target.z);
  const builds=scene.userData.buildings||[];
  const a=camera.position,b=target,ab=b.clone().sub(a),len2=Math.max(.001,ab.lengthSq());
  for(const g of builds){
    const p=g.position.clone().add(new THREE.Vector3(0,(g.userData.height||20)*.45,0));
    const t=THREE.MathUtils.clamp(p.clone().sub(a).dot(ab)/len2,0,1),q=a.clone().addScaledVector(ab,t);
    const occluding=t>.08&&t<.96&&p.distanceTo(q)<(g.userData.radius||18)*.68;
    const op=occluding?.18:1;
    for(const m of g.userData.fadeMats||[]){m.opacity=THREE.MathUtils.lerp(m.opacity??1,op,.18);m.depthWrite=m.opacity>.45;}
  }
  sun.position.set(target.x-85,140,target.z-45);sun.target.position.copy(target);if(!sun.target.parent)scene.add(sun.target);
}
