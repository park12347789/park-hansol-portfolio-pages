    const x=(rand()-.5)*720,z=(rand()-.5)*720;
    if(Math.min(...[-360,-240,-120,0,120,240,360].map(r=>Math.abs(x-r)))>12 && Math.min(...[-360,-240,-120,0,120,240,360].map(r=>Math.abs(z-r)))>12) continue;
    addWreck(x,z,rand()*Math.PI*2,rand());
  }
}
function nearAnyFacility(x,z,r){ const pts=[[240,-120],[-240,120],[0,240]]; return pts.some(p=>(x-p[0])**2+(z-p[1])**2<r*r); }
function addRoadLines(x,z,horizontal){
  const geo = horizontal?new THREE.PlaneGeometry(820,.6):new THREE.PlaneGeometry(.6,820);
  const m=new THREE.MeshBasicMaterial({color:0x7a7659,transparent:true,opacity:.45}); const line=new THREE.Mesh(geo,m); line.rotation.x=-Math.PI/2; line.position.set(x,.03,z); scene.add(line);
}
function addBuilding(x,z,w,d,h,t){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const base=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),t>.5?MAT.building:MAT.buildingDark); base.position.y=h/2; base.castShadow=true; base.receiveShadow=true; g.add(base);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w*.42,2.2,d*.36),MAT.tankDark); roof.position.y=h+1.1; g.add(roof);
  if(h>32){
    const rows=Math.min(5,Math.floor(h/10));
    for(let r=0;r<rows;r++) for(const side of [-1,1]){
      const win=new THREE.Mesh(new THREE.BoxGeometry(w*.52,.9,.18),MAT.window); win.position.set(0,8+r*8,side*(d/2+.1)); g.add(win);
    }
  }
  scene.add(g);
}
function addWreck(x,z,rot,t){
  const g=new THREE.Group(); g.position.set(x,.5,z); g.rotation.y=rot;
  const body=new THREE.Mesh(new THREE.BoxGeometry(6.2,1.6,3.2),new THREE.MeshStandardMaterial({color:t>.5?0x59605d:0x5a4740,roughness:1})); body.castShadow=true; g.add(body);
  const top=new THREE.Mesh(new THREE.BoxGeometry(3.5,1.2,2.6),MAT.buildingDark); top.position.y=1.25; g.add(top); scene.add(g);
}
function addAtmosphere(){
  const geo=new THREE.BufferGeometry(); const pts=[];
  for(let i=0;i<700;i++) pts.push((Math.random()-.5)*850,Math.random()*55,(Math.random()-.5)*850);
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  const m=new THREE.PointsMaterial({color:0xb7c5bd,size:.18,transparent:true,opacity:.16,depthWrite:false}); scene.add(new THREE.Points(geo,m));
}

function renderIdleScene(){
  const preview=createTank(); preview.position.set(0,0,0); preview.rotation.y=-.6; scene.add(preview); preview.userData.preview=true;
  camera.position.set(58,52,58); camera.lookAt(0,0,0);
  function idle(){ if(game) return; preview.rotation.y+=.0015; renderer.render(scene,camera); raf=requestAnimationFrame(idle); }
  idle();
}

function startGame(){
  cancelAnimationFrame(raf);
  for(const o of [...scene.children]) if(o.userData?.preview) scene.remove(o);
  els.startScreen.classList.remove('visible');
  [els.hudTop,els.hudLeft,els.objectivePanel].forEach(e=>e.classList.remove('hidden'));
  game={
    running:true, paused:false, time:0, kills:0, rescued:0, evacuated:0, facilitiesDone:0, supply:selectedLoadout.supply||0,
    nextSupply:22, level:1, threat:1, carried:0, formation:'spread', formationT:0,
    mods:{speed:selectedLoadout.speed||1,squadDamage:1,mgDamage:1,cannonRate:1,blast:1,regen:selectedLoadout.medics?1.2:0,formation:1,defenseTime:1,rescueBonus:selectedLoadout.rescueBonus||1},
    player:createPlayer(), vehicles:[], soldiers:[], civilians:[], facilities:[], zombies:[], effects:[],
    activeFacility:null, defenseRemaining:0, defenseDuration:0, facilityIntegrity:100, helicopter:null,
    spawnAcc:0, hudAcc:0, upgradeCount:0, squadMax:0
  };
  scene.add(game.player.group);
  addSoldiers(game,selectedLoadout.soldiers||5);
  if(selectedLoadout.apc) addVehicle(game,'apc');
  setupFacilities(); setupCivilians();
  toast('작전 개시', '<strong>도시 수색</strong>을 시작합니다.');
  clock.getDelta();
  animate();
}

function createPlayer(){
