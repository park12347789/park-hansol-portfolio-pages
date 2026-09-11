// V3: soldiers follow the actual route behind the tank; horde density is much higher.
function updateSoldiers(dt){
  const alive=[],garrison=game.activeFacility&&game.activeFacility.state==='defending'?game.activeFacility:null,trail=game.trail||[];
  for(let i=0;i<game.soldiers.length;i++){
    const s=game.soldiers[i];if(s.hp<=0){scene.remove(s.mesh);queueCasualty(s);continue;}const ws=weaponStats(s.weapon);
    if(garrison){
      s.garrisoned=true;const slots=[[-11,-9],[11,-9],[-11,9],[11,9]],sl=slots[i%4],layer=Math.floor(i/4);const target=garrison.group.position.clone().add(new THREE.Vector3(sl[0]*(1+layer*.07),0,sl[1]*(1+layer*.07)));target.y=i%4<2?8.7:11;s.mesh.position.lerp(target,1-Math.exp(-dt*6.5));
    }else{
      s.garrisoned=false;const row=Math.floor(i/2),side=i%2?1:-1,sample=trail[Math.min(trail.length-1,2+row*2)];let target;
      if(sample){const spread=game.formation==='wide'?7.2:3.7,lateral=spread+((row%3)*.55),right=new THREE.Vector3(Math.cos(sample.yaw),0,-Math.sin(sample.yaw));target=sample.pos.clone().addScaledVector(right,side*lateral);}
      else{const back=12+row*3.8,off=new THREE.Vector3(side*(game.formation==='wide'?7:4),0,back).applyAxisAngle(new THREE.Vector3(0,1,0),game.player.group.rotation.y);target=game.player.group.position.clone().add(off);}
      s.mesh.position.lerp(target,1-Math.exp(-dt*4.1));resolveCityCollision(s.mesh.position,.7);
    }
    s.fireCd-=dt;const range=ws.range*(s.garrisoned?1.3:1)*game.mods.formation,target=findNearestZombie(s.mesh.position,range);
    if(target){const dx=target.pos.x-s.mesh.position.x,dz=target.pos.z-s.mesh.position.z;s.mesh.rotation.y=lerpAngle(s.mesh.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*10));if(s.fireCd<=0){s.fireCd=ws.cd*(.88+Math.random()*.2);const mult=game.mods.squadDamage*(s.garrisoned?game.mods.garrisonDamage:1);if(ws.splash>0)splashDamageAt(target.pos,ws.damage*mult,ws.splash);else damageZombie(target,ws.damage*mult);tracer(s.mesh.position,target.pos,ws.color,.05);}}
    alive.push(s);
  }
  game.soldiers=alive;updateReinforcementHeli(dt);
}
function spawnZombies(dt){
  if(!game.hordeSeeded){game.hordeSeeded=true;game.hordeBurst=0;game.nextHordeSurge=48;game.surgeAngle=Math.random()*Math.PI*2;for(let i=0;i<85;i++)spawnZombie(game.player.group.position,false,true);toast('감염 밀집지역 진입','도시 전역에 <strong>대규모 감염체</strong>가 확인됩니다.');}
  if(game.time>=game.nextHordeSurge){game.nextHordeSurge=game.time+48+Math.random()*30;game.hordeBurst=110+Math.floor(game.threat*20);game.surgeAngle=Math.random()*Math.PI*2;const dirs=['북쪽','북동쪽','동쪽','남동쪽','남쪽','남서쪽','서쪽','북서쪽'];const idx=Math.round(((game.surgeAngle%(Math.PI*2))/(Math.PI*2))*8)%8;toast('대규모 감염파',`<strong>${dirs[idx]}</strong>에서 군집 이동 감지 · 접촉 임박`);}
  const cap=720;if(game.zombies.length>=cap)return;game.spawnAcc-=dt;if(game.spawnAcc>0)return;
  const defense=!!game.activeFacility,burst=game.hordeBurst>0;game.spawnAcc=defense?.115:burst?.09:.28;
  let count=defense?6+Math.floor(game.threat*1.8):burst?7:2+Math.floor(game.threat*.45);count=Math.min(count,cap-game.zombies.length);
  for(let i=0;i<count;i++)spawnZombie(defense?game.activeFacility.group.position:game.player.group.position,defense,burst);
  if(burst)game.hordeBurst=Math.max(0,game.hordeBurst-count);
}
function spawnZombie(target,defense,burst=false){
  let a;if(burst&&game.surgeAngle!==undefined)a=game.surgeAngle+(Math.random()-.5)*.55;else a=Math.random()*Math.PI*2;
  const dist=defense?95+Math.random()*70:burst?145+Math.random()*45:85+Math.random()*150,pos=target.clone().add(new THREE.Vector3(Math.cos(a)*dist,0,Math.sin(a)*dist));pos.x=THREE.MathUtils.clamp(pos.x,-410,410);pos.z=THREE.MathUtils.clamp(pos.z,-410,410);
  const g=createZombieMesh();g.position.copy(pos);scene.add(g);const hp=42+game.threat*7+(burst?Math.random()*10:0);game.zombies.push({mesh:g,pos:g.position,hp,alive:true,speed:5.7+Math.random()*2.6+game.threat*.4,attackCd:Math.random()*.5});
}
function createZombieMesh(){
  const g=new THREE.Group(),b=new THREE.Mesh(new THREE.CapsuleGeometry(.52,1.05,1,5),MAT.zombie);b.position.y=1.4;g.add(b);const h=new THREE.Mesh(new THREE.SphereGeometry(.4,5,4),MAT.zombieHead);h.position.y=2.58;g.add(h);return g;
}
