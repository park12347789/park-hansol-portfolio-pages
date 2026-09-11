function updateVehicles(dt){
  const base=game.player.group.position;
  for(let i=0;i<game.vehicles.length;i++){
    const v=game.vehicles[i]; const row=Math.floor(i/2)+1, side=i%2?1:-1;
    const off=new THREE.Vector3(side*(9+row*2),0,11+row*10).applyAxisAngle(new THREE.Vector3(0,1,0),game.player.group.rotation.y);
    const target=base.clone().add(off); v.group.position.lerp(target,1-Math.exp(-dt*2.8)); v.group.rotation.y=lerpAngle(v.group.rotation.y,game.player.group.rotation.y,1-Math.exp(-dt*4));
    if(v.type==='tank') autoFireTank(v,dt,v.group,false); else autoFireAPC(v,dt);
  }
}
function autoFireAPC(v,dt){
  v.mgCd-=dt; const target=findNearestZombie(v.group.position,75); if(!target) return; aimTurret(v.group,target.pos,dt);
  if(v.mgCd<=0){ v.mgCd=.09; damageZombie(target,11*game.mods.mgDamage); tracer(v.group.position,target.pos,0xffd787,.065); }
}
function updateSoldiers(dt){
  const alive=[]; const center=game.player.group.position;
  for(let i=0;i<game.soldiers.length;i++){
    const s=game.soldiers[i]; if(s.hp<=0){ scene.remove(s.mesh); continue; }
    const n=game.soldiers.length; const angle=(i/n)*Math.PI*2+game.time*.04; const radius=(game.formation==='tight'?7:14)*Math.min(1.7, .85+n*.025)/game.mods.formation;
    const off=new THREE.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius+4).applyAxisAngle(new THREE.Vector3(0,1,0),game.player.group.rotation.y);
    s.mesh.position.lerp(center.clone().add(off),1-Math.exp(-dt*4.7));
    s.fireCd-=dt;
    const range=(game.formation==='spread'?48*game.mods.formation:34); const target=findNearestZombie(s.mesh.position,range);
    if(target){ const dx=target.pos.x-s.mesh.position.x,dz=target.pos.z-s.mesh.position.z; s.mesh.rotation.y=lerpAngle(s.mesh.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*10)); if(s.fireCd<=0){ s.fireCd=.5+Math.random()*.18; damageZombie(target,17*game.mods.squadDamage); tracer(s.mesh.position,target.pos,0xd9f2c8,.05); }}
    alive.push(s);
  }
  game.soldiers=alive;
}
function updateRegen(dt){ if(game.mods.regen<=0)return; for(const s of game.soldiers) s.hp=Math.min(s.maxHp,s.hp+game.mods.regen*dt); }
function toggleFormation(){ game.formation=game.formation==='spread'?'tight':'spread'; toast('대형 전환',game.formation==='spread'?'<strong>전개</strong> — 사격 범위 증가':'<strong>집결</strong> — 기동력 증가'); updateHUD(); }

function updateCivilians(){
  const p=game.player.group.position;
  for(const c of game.civilians){
    if(c.rescued) continue;
    if(c.pos.distanceToSquared(p)<18*18){
      c.rescued=true; game.carried+=c.people; game.rescued+=c.people;
      for(const m of c.meshes) scene.remove(m);
      const gain=Math.round((6+c.people*1.2)*game.mods.rescueBonus); addSupply(gain);
      toast(`${c.people}명 구조`, `민간인 확보 · <strong>SUPPLY +${gain}</strong>`);
    }
  }
}

function updateFacilities(dt){
  const p=game.player.group.position;
  for(const f of game.facilities){
    const dist=p.distanceTo(f.group.position);
    f.group.userData.beacon.material.opacity=f.state==='done'?.1:(.25+Math.sin(game.time*2)*.08);
    if(f.state==='idle' && dist<25 && !game.activeFacility){
      f.capture+=dt; els.objectiveTitle.textContent=`${f.type} 확보 중`; els.objectiveDesc.textContent=`점령 구역 유지 ${Math.min(100,Math.round(f.capture/2.5*100))}%`;
      if(f.capture>=2.5) beginDefense(f);
    } else if(f.state==='idle' && dist>=25) f.capture=Math.max(0,f.capture-dt*.65);
  }
  if(game.activeFacility){
    const f=game.activeFacility; game.defenseRemaining-=dt;
    const nearby=game.zombies.reduce((n,z)=>n+(z.alive&&z.pos.distanceToSquared(f.group.position)<12*12?1:0),0);
    if(nearby>0) game.facilityIntegrity=Math.max(0,game.facilityIntegrity-nearby*dt*.65);
    if(game.facilityIntegrity<=0){ failFacility(f); return; }
    if(game.defenseRemaining<=0) completeFacility(f);
  } else {
    const next=game.facilities.find(f=>f.state==='idle');
    if(next){ els.objectiveTitle.textContent=`${next.type} 확보`; els.objectiveDesc.textContent='시설 내부 점령 구역에 진입해 구조 신호를 송출하십시오.'; els.objectiveTimer.classList.add('hidden'); }
  }
}
