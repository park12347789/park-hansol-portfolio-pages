// Small V2 follow-up: returning casualties do not inflate acquired squad capacity.
function addSoldiers(g,count,type='rifle',countTowardMax=true){
  if(!g)return;
  for(let i=0;i<count;i++){
    const wt=Array.isArray(type)?type[i%type.length]:type;
    const mesh=createSoldier(wt);scene.add(mesh);mesh.position.copy(g.player.group.position);
    g.soldiers.push({mesh,hp:100,maxHp:100,fireCd:Math.random()*.35,index:g.squadMax,weapon:wt,garrisoned:false});
    if(countTowardMax)g.squadMax++;
  }
  updateHUD();
}
function updateReinforcementHeli(dt){
  if(!game.reinforceHeli){
    const ready=game.reinforceQueue.filter(x=>x.due<=game.time).slice(0,5);
    if(ready.length){
      game.reinforceQueue=game.reinforceQueue.filter(x=>!ready.includes(x));
      const h=createHelicopter();h.position.copy(game.player.group.position).add(new THREE.Vector3(65,38,45));scene.add(h);
      game.reinforceHeli={group:h,t:0,batch:ready,landed:false};
      toast('재투입 헬기 접근',`분대원 <strong>${ready.length}명</strong> 복귀 중`);
    }
    return;
  }
  const h=game.reinforceHeli;h.t+=dt;h.group.userData.rotor.rotation.y+=dt*30;const p=game.player.group.position;
  if(h.t<3){
    const t=smooth(h.t/3);h.group.position.x=THREE.MathUtils.lerp(p.x+65,p.x+16,t);h.group.position.z=THREE.MathUtils.lerp(p.z+45,p.z+18,t);h.group.position.y=THREE.MathUtils.lerp(38,8,t);
  }else if(!h.landed){
    h.landed=true;
    for(const r of h.batch)addSoldiers(game,1,r.weapon,!!r.upgrade);
    toast('분대 재투입 완료',`<strong>${h.batch.length}명</strong> 전선 복귀`);
  }else{
    h.group.position.y+=dt*15;h.group.position.x+=dt*12;
    if(h.group.position.y>55){scene.remove(h.group);game.reinforceHeli=null;}
  }
}
