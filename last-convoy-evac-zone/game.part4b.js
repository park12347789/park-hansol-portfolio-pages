    alive.push(z);
  }
  game.zombies=alive;
  updateHelicopter(dt);
}
function updateHelicopter(dt){
  const h=game.helicopter;if(!h)return; h.t+=dt; h.group.userData.rotor.rotation.y+=dt*28;
  if(h.state==='in'){
    const f=h.facility.group.position, t=Math.min(1,h.t/4); h.group.scale.setScalar(THREE.MathUtils.lerp(.01,1,smooth(t))); h.group.position.y=THREE.MathUtils.lerp(46,8,smooth(t)); h.group.position.x=THREE.MathUtils.lerp(f.x+55,f.x,t); h.group.position.z=THREE.MathUtils.lerp(f.z-45,f.z-27,t);
  } else {
    h.group.position.y+=dt*13; h.group.position.x+=dt*8; if(h.group.position.y>70) removeHelicopter();
  }
}
function findNearestZombie(pos,range){ let best=null,bd=range*range; for(const z of game.zombies){ if(!z.alive)continue; const d=pos.distanceToSquared(z.pos); if(d<bd){bd=d;best=z;} } return best; }
function damageZombie(z,dmg){ if(!z?.alive)return; z.hp-=dmg; if(z.hp<=0){ z.alive=false; game.kills++; if(Math.random()<.18) addSupply(1,false); } }
function cannonBlast(pos,dmg,radius){
  for(const z of game.zombies){ if(z.alive){ const d=z.pos.distanceTo(pos); if(d<radius) damageZombie(z,dmg*(1-d/radius*.55)); }}
  const ring=new THREE.Mesh(new THREE.RingGeometry(.7,1.4,26),new THREE.MeshBasicMaterial({color:0xffd38b,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false})); ring.rotation.x=-Math.PI/2; ring.position.copy(pos); ring.position.y=.25; scene.add(ring); game.effects.push({mesh:ring,t:0,d:.42,type:'ring'});
  hitFlash(pos,0xffd078);
}
function tracer(from,to,color,duration){
  const a=from.clone();a.y+=3; const b=to.clone();b.y+=1.8; const geo=new THREE.BufferGeometry().setFromPoints([a,b]); const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85})); scene.add(line); game.effects.push({mesh:line,t:0,d:duration,type:'fade'});
}
function muzzleFlash(pos){ hitFlash(pos.clone().add(new THREE.Vector3(0,3,0)),0xffdc8a,.18); }
function hitFlash(pos,color,d=.22){ const m=new THREE.Mesh(new THREE.SphereGeometry(.7,7,5),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false})); m.position.copy(pos);m.position.y+=1;scene.add(m);game.effects.push({mesh:m,t:0,d,type:'flash'}); }
function updateEffects(dt){
  const keep=[]; for(const e of game.effects){ e.t+=dt; const q=e.t/e.d; if(q>=1){scene.remove(e.mesh);continue;} e.mesh.material.opacity=1-q; if(e.type==='ring')e.mesh.scale.setScalar(1+q*8); if(e.type==='flash')e.mesh.scale.setScalar(1+q*2); keep.push(e); } game.effects=keep;
}

function addSupply(n,check=true){ game.supply+=n; if(check&&game.supply>=game.nextSupply) triggerUpgrade(); }
function triggerUpgrade(){
  if(game.paused) return; game.paused=true; game.upgradeCount++; game.level++; game.nextSupply=Math.round(game.nextSupply*1.55+8);
  const picks=weightedPicks(UPGRADES,3); els.upgradeCards.innerHTML='';
  for(const u of picks){
    const card=document.createElement('div'); card.className='upgrade-card'; card.innerHTML=`<div class="tier">${u.tier}</div><div class="icon">${u.icon}</div><div class="card-title">${u.name}</div><div class="card-desc">${u.desc}</div><div class="effect">${u.effect}</div>`;
    card.onclick=()=>{ u.apply(game); els.upgradeScreen.classList.remove('visible'); game.paused=false; toast('보급 승인',`<strong>${u.name}</strong> 적용`); };
    els.upgradeCards.appendChild(card);
  }
  els.upgradeScreen.classList.add('visible');
}
function weightedPicks(list,n){ const pool=[...list],out=[]; while(out.length<n&&pool.length){ const sum=pool.reduce((s,u)=>s+u.weight,0); let r=Math.random()*sum,i=0; for(;i<pool.length;i++){r-=pool[i].weight;if(r<=0)break;} out.push(pool.splice(Math.min(i,pool.length-1),1)[0]); } return out; }

function updateCamera(dt){
  const target=game?game.player.group.position:new THREE.Vector3();
  const desired=target.clone().add(new THREE.Vector3(54,66,58)); camera.position.lerp(desired,1-Math.exp(-dt*3.2)); camera.lookAt(target.x,target.y+1,target.z);
  sun.position.set(target.x-85,140,target.z-45); sun.target.position.copy(target); if(!sun.target.parent)scene.add(sun.target);
}
function updateHUD(){ if(!game)return;
  els.civilianStat.textContent=`${game.carried} / ${game.evacuated}`; els.squadStat.textContent=`${game.soldiers.length} / ${game.squadMax}`; els.armorStat.textContent=String(1+game.vehicles.length); els.supplyStat.textContent=`${game.supply} / ${game.nextSupply}`;
  els.formationStat.textContent=game.formation==='spread'?'SPREAD':'TIGHT'; els.formationStat.style.color=game.formation==='spread'?'var(--ice)':'var(--mint)';
  const threat=game.activeFacility?Math.min(5,2+game.facilitiesDone):Math.min(5,1+Math.floor(game.time/75)); game.threat=Math.max(game.threat,threat); els.threatLabel.textContent=String(game.threat); els.threatBar.style.width=`${game.threat*20}%`;
  if(game.activeFacility){
    const f=game.activeFacility; const t=Math.max(0,game.defenseRemaining); els.missionText.textContent=`${f.type} DEFENSE · INTEGRITY ${Math.round(game.facilityIntegrity)}%`; els.objectiveTitle.textContent=`${f.name} 방어`; els.objectiveDesc.textContent=`구조 헬기 도착까지 버티십시오 · 시설 무결성 ${Math.round(game.facilityIntegrity)}%`; els.objectiveTimer.textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.ceil(t%60)).padStart(2,'0')}`; els.objectiveTimer.classList.remove('hidden');
  } else { els.missionText.textContent=game.facilitiesDone?`시설 ${game.facilitiesDone}/${game.facilities.length} 확보`:'도시 수색 중'; }
}
function finishGame(){
  if(!game?.running)return; game.running=false; cancelAnimationFrame(raf); const total=game.evacuated, survival=game.rescued?Math.round(game.evacuated/game.rescued*100):0; const grade=total>=55?'S':total>=40?'A':total>=25?'B':'C';
  els.resultBody.innerHTML=`<div class="result-grid"><div class="result-cell"><span>CIVILIANS EVACUATED</span><b>${total}</b></div><div class="result-cell"><span>ZOMBIES NEUTRALIZED</span><b>${game.kills}</b></div><div class="result-cell"><span>FACILITIES SECURED</span><b>${game.facilitiesDone} / ${game.facilities.length}</b></div><div class="result-cell"><span>SQUAD SURVIVORS</span><b>${game.soldiers.length}</b></div></div><div class="small-label">OPERATION GRADE</div><div class="grade">${grade}</div>`;
  els.resultScreen.classList.add('visible');
}
function toast(title,body){ const d=document.createElement('div'); d.className='toast'; d.innerHTML=`<b>${title}</b> · ${body}`; els.toastLayer.appendChild(d); setTimeout(()=>d.remove(),2700); }
function onResize(){ camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); }
function lerpAngle(a,b,t){ const d=Math.atan2(Math.sin(b-a),Math.cos(b-a)); return a+d*t; }
function smooth(t){return t*t*(3-2*t)}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
