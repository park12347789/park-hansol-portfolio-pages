// V3: tank-native controls, mouse turret aim, stable road geometry and true convoy trailing.
var convoyMouse=new THREE.Vector2(0,0),convoyAim=new THREE.Vector3(0,0,-40),convoyFire=false;
var convoyAimPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
addEventListener('pointermove',function(e){
  convoyMouse.x=e.clientX/innerWidth*2-1;convoyMouse.y=-(e.clientY/innerHeight)*2+1;
  if(els.crosshair){}var c=document.querySelector('#crosshair');if(c){c.style.left=e.clientX+'px';c.style.top=e.clientY+'px';c.style.opacity='.82';}
});
addEventListener('pointerdown',function(e){if(e.button===0)convoyFire=true;});
addEventListener('pointerup',function(e){if(e.button===0)convoyFire=false;});
addEventListener('blur',function(){convoyFire=false;});
addEventListener('contextmenu',function(e){if(game&&game.running)e.preventDefault();});

function addGroundAndCity(){
  scene.userData.buildings=[];scene.userData.obstacles=[];
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(900,900),MAT.ground);ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);
  const roadW=28,roads=[-360,-240,-120,0,120,240,360],edge=420;
  for(const x of roads){const r=new THREE.Mesh(new THREE.PlaneGeometry(roadW,840),MAT.asphalt);r.rotation.x=-Math.PI/2;r.position.set(x,.015,0);r.receiveShadow=true;scene.add(r);}
  for(const z of roads){
    const cuts=[-edge,...roads.map(x=>x-roadW/2),...roads.map(x=>x+roadW/2),edge].sort((a,b)=>a-b);
    for(let i=0;i<cuts.length-1;i++){const a=cuts[i],b=cuts[i+1],mid=(a+b)/2,w=b-a;if(w<3)continue;const insideRoad=roads.some(x=>mid>x-roadW/2&&mid<x+roadW/2);if(insideRoad)continue;const r=new THREE.Mesh(new THREE.PlaneGeometry(w,roadW),MAT.asphalt);r.rotation.x=-Math.PI/2;r.position.set(mid,.016,z);r.receiveShadow=true;scene.add(r);}
  }
  for(const x of roads)addRoadLines(x,0,false);for(const z of roads)addRoadLines(0,z,true);
  const rand=mulberry32(91126);
  for(let gx=-3;gx<3;gx++)for(let gz=-3;gz<3;gz++){
    const cx=gx*120+60,cz=gz*120+60,slots=rand()>.58?2:1;
    for(let k=0;k<slots;k++){const ox=(k%2?1:-1)*(27+rand()*8),oz=(k>0?1:-1)*(26+rand()*9);if(nearAnyFacility(cx+ox,cz+oz,60))continue;addBuilding(cx+ox,cz+oz,27+rand()*18,27+rand()*18,16+rand()*38,rand());}
  }
  for(let i=0;i<32;i++){const choose=roads[Math.floor(rand()*roads.length)],horizontal=rand()>.5,x=horizontal?(rand()-.5)*760:choose+(rand()-.5)*7,z=horizontal?choose+(rand()-.5)*7:(rand()-.5)*760;addWreck(x,z,rand()*Math.PI*2,rand());}
  addCrisisScenery();
}
function addRoadLines(x,z,horizontal){
  const geo=horizontal?new THREE.PlaneGeometry(820,.55):new THREE.PlaneGeometry(.55,820),m=new THREE.MeshBasicMaterial({color:0x8a825e,transparent:true,opacity:.42,depthWrite:false});
  const line=new THREE.Mesh(geo,m);line.rotation.x=-Math.PI/2;line.position.set(x,.045,z);scene.add(line);
}
function updateAimPoint(){
  ray.setFromCamera(convoyMouse,camera);const hit=ray.ray.intersectPlane(convoyAimPlane,convoyAim);if(!hit&&game)convoyAim.copy(game.player.group.position).add(new THREE.Vector3(0,0,-70));
}
function updatePlayer(dt){
  const p=game.player;updateAimPoint();if(p.speed===undefined)p.speed=0;
  const throttle=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),boost=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?1.22:1,maxF=29*game.mods.speed*boost,maxR=13*game.mods.speed;
  const wanted=throttle>0?maxF:throttle<0?-maxR:0,accel=throttle?18:25;p.speed=THREE.MathUtils.lerp(p.speed,wanted,1-Math.exp(-dt*accel/Math.max(8,Math.abs(wanted-p.speed)+8)));
  if(Math.abs(p.speed)<.08&&!throttle)p.speed=0;
  const steer=(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0),turnScale=.48+.52*Math.min(1,Math.abs(p.speed)/12);p.yaw+=steer*1.72*turnScale*dt;
  p.group.rotation.y=p.yaw;const forward=new THREE.Vector3(-Math.sin(p.yaw),0,-Math.cos(p.yaw));p.vel.copy(forward).multiplyScalar(p.speed);
  const old=p.group.position.clone();p.group.position.addScaledVector(p.vel,dt);resolveCityCollision(p.group.position,5.0);if(old.distanceToSquared(p.group.position)<Math.max(.0005,p.speed*p.speed*dt*dt*.05))p.speed*=.35;
  p.group.position.x=THREE.MathUtils.clamp(p.group.position.x,-390,390);p.group.position.z=THREE.MathUtils.clamp(p.group.position.z,-390,390);
  game.trail=game.trail||[];const head=game.trail[0];if(!head||head.pos.distanceToSquared(p.group.position)>5.5){game.trail.unshift({pos:p.group.position.clone(),yaw:p.yaw});if(game.trail.length>90)game.trail.length=90;}
  autoFireTank(p,dt,p.group,true);
}
function findZombieNearAim(origin,aim,maxRange,width){
  const d=aim.clone().sub(origin);d.y=0;if(d.lengthSq()<1)return null;d.normalize();let best=null,bestT=maxRange+1;
  for(const z of game.zombies){if(!z.alive)continue;const q=z.pos.clone().sub(origin);q.y=0;const t=q.dot(d);if(t<2||t>maxRange)continue;const side=q.addScaledVector(d,-t).length();if(side<width&&t<bestT){best=z;bestT=t;}}
  return best;
}
function autoFireTank(owner,dt,mesh,isMain=false){
  owner.cannonCd-=dt;owner.mgCd-=dt;
  if(isMain){
    aimTurret(mesh,convoyAim,dt);const origin=mesh.position.clone(),dir=convoyAim.clone().sub(origin);dir.y=0;const dist=Math.min(132,Math.max(4,dir.length()));if(dir.lengthSq()<1)return;dir.normalize();const shot=origin.clone().addScaledVector(dir,dist);
    const mgTarget=findZombieNearAim(origin,shot,116,4.3);if(mgTarget&&owner.mgCd<=0){owner.mgCd=.085;splashDamageAt(mgTarget.pos,27*game.mods.mgDamage,2.8);tracer(mesh.position,mgTarget.pos,0xb9efc9,.055);}
    if(convoyFire&&owner.cannonCd<=0){owner.cannonCd=.92/game.mods.cannonRate;tracer(mesh.position,shot,0xffdca0,.08);cannonBlast(shot,185*game.mods.blast,20*game.mods.blast);muzzleFlash(mesh.position);}
    return;
  }
  const target=findNearestZombie(mesh.position,118);if(!target)return;aimTurret(mesh,target.pos,dt);if(owner.mgCd<=0){owner.mgCd=.12;splashDamageAt(target.pos,21*game.mods.mgDamage,2.4);tracer(mesh.position,target.pos,0xa6d9b8,.065);}if(owner.cannonCd<=0){owner.cannonCd=1.28/game.mods.cannonRate;cannonBlast(target.pos,150*game.mods.blast,17*game.mods.blast);muzzleFlash(mesh.position);}
}
