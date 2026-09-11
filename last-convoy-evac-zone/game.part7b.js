// V4: shelters, loading phases, truck/bus escape routes and escort stakes.
function updateShelters(dt){
  const p=game.player.group.position;
  for(const s of game.shelters){
    if(!s.discovered)continue;if(s.group.userData.ring)s.group.userData.ring.material.opacity=s.state==='secured'?.12:(.25+Math.sin(game.time*2.4)*.09);
    if(s.state==='idle'){
      const d=p.distanceTo(s.group.position);if(d<30){s.capture+=dt;if(s.capture>=3.2)secureShelter(s);}else s.capture=Math.max(0,s.capture-dt*.5);
    }
    if(s.fortified)updateShelterFire(s,dt);
  }
}
function secureShelter(s){
  s.state='secured';s.fortified=true;game.carried+=s.people;game.rescued+=s.people;toast(`${s.name} 확보`,`생존자 <strong>${s.people}명</strong> 확인 · ${s.method==='bus'?'대형 버스':'수송 트럭'} 대피 준비`);
  for(const x of [-10,-5,0,5,10]){const m=new THREE.Mesh(new THREE.BoxGeometry(3.8,1.4,2),new THREE.MeshStandardMaterial({color:0x867657,roughness:1}));m.position.set(x,1,-15.5);s.group.add(m);}s.evacAt=game.time+5.5;
}
function updateShelterFire(s,dt){s.turretCd-=dt;const z=findNearestZombie(s.group.position,88);if(z&&s.turretCd<=0){s.turretCd=.18;splashDamageAt(z.pos,18*game.mods.squadDamage,1.5);const from=s.group.position.clone();from.y=9;tracer(from,z.pos,0x8effbd,.05);}}
function createEvacVehicle(type){
  const g=new THREE.Group(),bus=type==='bus',body=new THREE.Mesh(new THREE.BoxGeometry(bus?7.2:6.2,bus?4.6:3.4,bus?15:11),new THREE.MeshStandardMaterial({color:bus?0xb48a4a:0x718064,roughness:.88}));body.position.y=bus?3:2.5;body.castShadow=true;g.add(body);
  const cab=new THREE.Mesh(new THREE.BoxGeometry(bus?6.5:5.6,2.2,bus?4:3.8),MAT.buildingDark);cab.position.set(0,bus?4.7:3.8,-(bus?5.2:3.8));g.add(cab);
  for(const x of [-(bus?3.8:3.3),(bus?3.8:3.3)])for(const z of [-(bus?5:3.8),(bus?5:3.8)]){const w=new THREE.Mesh(new THREE.CylinderGeometry(bus?1.15:.95,bus?1.15:.95,.7,10),MAT.tankDark);w.rotation.z=Math.PI/2;w.position.set(x,1,z);g.add(w);}return g;
}
function beginShelterEvac(s){
  if(s.evacStarted)return;s.evacStarted=true;const g=createEvacVehicle(s.method);g.position.copy(s.group.position).add(new THREE.Vector3(0,0,-24));scene.add(g);
  const path=s.method==='truck'?[g.position.clone(),new THREE.Vector3(s.pos[0],0,-360),new THREE.Vector3(s.exit[0],0,s.exit[1])]:[g.position.clone(),new THREE.Vector3(-360,0,s.pos[1]),new THREE.Vector3(s.exit[0],0,s.exit[1])];
  const c={type:s.method,group:g,hp:s.method==='bus'?520:330,maxHp:s.method==='bus'?520:330,passengers:s.people,state:'loading',load:8,path,index:0,speed:s.method==='bus'?12:15,done:false,shelter:s,attackFlash:0};game.evacConvoys.push(c);toast('민간 대피 개시',`<strong>${s.people}명</strong> 탑승 중 · 차량이 외곽까지 도달하도록 호위하십시오.`);game.hordeBurst=(game.hordeBurst||0)+80;
}
function updateEvacConvoys(dt){
  for(const s of game.shelters)if(s.state==='secured'&&!s.evacStarted&&game.time>=s.evacAt)beginShelterEvac(s);
  for(const c of game.evacConvoys){if(c.done)continue;c.attackFlash=Math.max(0,c.attackFlash-dt);if(game.mods.convoyRepair)c.hp=Math.min(c.maxHp,c.hp+game.mods.convoyRepair*dt);
    if(c.state==='loading'){c.load-=dt;if(c.load<=0){c.state='moving';toast('대피차량 출발',`${c.type==='bus'?'버스':'트럭'}가 <strong>도시 외곽</strong>으로 이동합니다.`);}continue;}
    if(c.state!=='moving')continue;const target=c.path[Math.min(c.index+1,c.path.length-1)],dx=target.x-c.group.position.x,dz=target.z-c.group.position.z,dist=Math.hypot(dx,dz)||1;
    if(dist<5){c.index++;if(c.index>=c.path.length-1){completeEvacConvoy(c);continue;}}
    else{c.group.position.x+=dx/dist*c.speed*dt;c.group.position.z+=dz/dist*c.speed*dt;c.group.rotation.y=lerpAngle(c.group.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*4));}
    if(c.hp<=0)failEvacConvoy(c);
  }
}
function completeEvacConvoy(c){c.done=true;c.state='escaped';game.evacuated+=c.passengers;game.carried=Math.max(0,game.carried-c.passengers);toast('육상 대피 성공',`<strong>${c.passengers}명</strong>이 도시 봉쇄선을 통과했습니다.`);setTimeout(()=>{if(c.group.parent)scene.remove(c.group);},1200);if(c.shelter)c.shelter.state='evacuated';}
function failEvacConvoy(c){if(c.done)return;c.done=true;c.state='destroyed';game.lostCivilians+=c.passengers;game.carried=Math.max(0,game.carried-c.passengers);toast('대피차량 파괴',`탑승 생존자 <strong>${c.passengers}명</strong>을 잃었습니다.`);const pos=c.group.position.clone();hitFlash(pos,0xff4f37,.7);for(let i=0;i<2;i++){const fire=new THREE.Mesh(new THREE.ConeGeometry(1.4,5,6),new THREE.MeshBasicMaterial({color:i?0xffb243:0xff592f,transparent:true,opacity:.85}));fire.position.copy(pos);fire.position.y=2.5;fire.position.x+=(i-.5)*2;scene.add(fire);game.effects.push({mesh:fire,t:0,d:12,type:'fade'});}game.hordeBurst=(game.hordeBurst||0)+70;}
function nearestEvacTarget(pos,maxDist=75){let best=null,bd=maxDist*maxDist;for(const c of game.evacConvoys){if(c.done||c.state==='loading')continue;const d=pos.distanceToSquared(c.group.position);if(d<bd){bd=d;best=c;}}return best;}
function updateZombies(dt){
  const alive=[];for(const z of game.zombies){if(!z.alive){scene.remove(z.mesh);continue;}let target=game.activeFacility?game.activeFacility.group.position:game.player.group.position,targetConvoy=nearestEvacTarget(z.pos,80);let nearestFort=null,fortD=70*70;for(const f of game.fortified){const d=z.pos.distanceToSquared(f.group.position);if(d<fortD){fortD=d;nearestFort=f;}}if(nearestFort)target=nearestFort.group.position;if(targetConvoy)target=targetConvoy.group.position;
    let soldier=null,best=9*9;if(!targetConvoy)for(const s of game.soldiers){if(s.garrisoned)continue;const d=s.mesh.position.distanceToSquared(z.pos);if(d<best){best=d;soldier=s;}}if(soldier)target=soldier.mesh.position;
    const dx=target.x-z.pos.x,dz=target.z-z.pos.z,dist=Math.hypot(dx,dz)||1;if(dist>2.2){z.pos.x+=dx/dist*z.speed*dt;z.pos.z+=dz/dist*z.speed*dt;resolveCityCollision(z.pos,.7);z.mesh.rotation.y=lerpAngle(z.mesh.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*6));}z.attackCd-=dt;
    if(targetConvoy&&dist<5.4&&z.attackCd<=0){z.attackCd=.65;targetConvoy.hp-=8+game.threat*1.4;targetConvoy.attackFlash=.12;hitFlash(targetConvoy.group.position,0xff5c50,.12);}else if(soldier&&dist<2.7&&z.attackCd<=0){z.attackCd=.75;soldier.hp-=10+game.threat*1.5;hitFlash(soldier.mesh.position,0xff746d);}alive.push(z);}
  game.zombies=alive;updateHelicopter(dt);updateSupplyHelicopter(dt);
}
