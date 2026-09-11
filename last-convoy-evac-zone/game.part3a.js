  if(f.type==='HOSPITAL'){
    const v=new THREE.Mesh(new THREE.BoxGeometry(3,8,.4),MAT.red); v.position.set(0,7,-14.2); g.add(v); const h=new THREE.Mesh(new THREE.BoxGeometry(8,3,.4),MAT.red); h.position.set(0,7,-14.3); g.add(h);
  } else if(f.type==='POLICE'){
    const sign=new THREE.Mesh(new THREE.BoxGeometry(15,2,.5),new THREE.MeshStandardMaterial({color:0x95b5cb,emissive:0x1b3040,emissiveIntensity:.8})); sign.position.set(0,9,-14.2); g.add(sign);
  } else {
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.45,.65,28,8),MAT.tankDark); mast.position.y=28; g.add(mast);
    for(let y=19;y<40;y+=7){ const arm=new THREE.Mesh(new THREE.BoxGeometry(10,.25,.25),MAT.tankDark); arm.position.y=y; g.add(arm); }
  }
  // capture beacon + long-distance locator
  const beacon=new THREE.Mesh(new THREE.RingGeometry(19,20,48),new THREE.MeshBasicMaterial({color:0x7be3b6,transparent:true,opacity:.35,side:THREE.DoubleSide})); beacon.rotation.x=-Math.PI/2; beacon.position.y=.22; g.add(beacon); g.userData.beacon=beacon;
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.45,.85,62,10,1,true),new THREE.MeshBasicMaterial({color:0x83dbb6,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false})); beam.position.y=31; g.add(beam);
  const marker=new THREE.Mesh(new THREE.OctahedronGeometry(2.4),new THREE.MeshBasicMaterial({color:0xa8f0cd,transparent:true,opacity:.82})); marker.position.y=35; g.add(marker);
  return g;
}
function setupCivilians(){
  const spots=[[-75,-195,5],[85,-105,4],[175,55,6],[-155,-70,5],[-305,-55,6],[300,150,7],[-75,320,5],[150,300,4],[-315,270,8]];
  for(const [x,z,n] of spots) addCivilianCluster(x,z,n);
}
function addCivilianCluster(x,z,n){
  const cluster={pos:new THREE.Vector3(x,0,z),people:n,meshes:[],rescued:false};
  for(let i=0;i<Math.min(n,8);i++){
    const g=new THREE.Group(); const b=new THREE.Mesh(new THREE.CapsuleGeometry(.52,1.1,3,6),MAT.civilian); b.position.y=1.5; g.add(b); const h=new THREE.Mesh(new THREE.SphereGeometry(.45,7,5),MAT.soldierDark); h.position.y=2.75; g.add(h);
    g.position.set(x+(i%4-1.5)*2.1,0,z+(Math.floor(i/4)-.5)*2.2); scene.add(g); cluster.meshes.push(g);
  }
  game.civilians.push(cluster);
}

function animate(){
  if(!game?.running) return;
  const dt=Math.min(clock.getDelta(),.034);
  if(!game.paused){
    game.time+=dt; game.hudAcc+=dt;
    updatePlayer(dt); updateVehicles(dt); updateSoldiers(dt); updateCivilians(dt); updateFacilities(dt); updateZombies(dt); updateEffects(dt); spawnZombies(dt); updateRegen(dt);
    if(game.hudAcc>.12){ updateHUD(); game.hudAcc=0; }
  }
  updateCamera(dt);
  renderer.render(scene,camera);
  raf=requestAnimationFrame(animate);
}

function updatePlayer(dt){
  const p=game.player, dir=new THREE.Vector3();
  if(keys.has('KeyW')) dir.z-=1; if(keys.has('KeyS')) dir.z+=1; if(keys.has('KeyA')) dir.x-=1; if(keys.has('KeyD')) dir.x+=1;
  const moving=dir.lengthSq()>0; if(moving) dir.normalize();
  const formationSpeed=game.formation==='tight'?1.08*game.mods.formation:1;
  const boost=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?1.22:1;
  const speed=25*game.mods.speed*formationSpeed*boost;
  const targetVel=dir.multiplyScalar(speed); p.vel.lerp(targetVel,1-Math.exp(-dt*7));
  p.group.position.addScaledVector(p.vel,dt); p.group.position.x=THREE.MathUtils.clamp(p.group.position.x,-390,390); p.group.position.z=THREE.MathUtils.clamp(p.group.position.z,-390,390);
  if(moving){ const targetYaw=Math.atan2(p.vel.x,p.vel.z); p.yaw=lerpAngle(p.yaw,targetYaw,1-Math.exp(-dt*7)); p.group.rotation.y=p.yaw; }
  autoFireTank(p,dt,p.group,true);
}
function autoFireTank(owner,dt,mesh,isMain=false){
  owner.cannonCd-=dt; owner.mgCd-=dt;
  const target=findNearestZombie(mesh.position,100);
  if(!target) return;
  aimTurret(mesh,target.pos,dt);
  if(owner.mgCd<=0){ owner.mgCd=.16; damageZombie(target,15*game.mods.mgDamage); tracer(mesh.position,target.pos,0xa6d9b8,.09); }
  if(owner.cannonCd<=0){ owner.cannonCd=(isMain?1.35:1.7)/game.mods.cannonRate; cannonBlast(target.pos,115,15*game.mods.blast); muzzleFlash(mesh.position); }
}
function aimTurret(mesh,pos,dt){
  const t=mesh.userData.turret; if(!t) return;
  const local=mesh.worldToLocal(pos.clone()); const yaw=Math.atan2(local.x,local.z)+Math.PI; t.rotation.y=lerpAngle(t.rotation.y,yaw,1-Math.exp(-dt*9));
}
