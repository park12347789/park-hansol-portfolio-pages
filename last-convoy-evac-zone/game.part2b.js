  const group=createTank(); group.position.set(0,0,0);
  return {group,vel:new THREE.Vector3(),yaw:0,cannonCd:.25,mgCd:0};
}
function createTank(){
  const g=new THREE.Group();
  const hull=new THREE.Mesh(new THREE.BoxGeometry(8,2.1,12),MAT.tank); hull.position.y=2.1; hull.castShadow=true; g.add(hull);
  const glacis=new THREE.Mesh(new THREE.BoxGeometry(7.1,1.3,3.2),MAT.tank); glacis.position.set(0,3.15,-4.3); glacis.rotation.x=-.18; g.add(glacis);
  for(const x of [-4.15,4.15]){ const tr=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.7,11.1),MAT.tankDark); tr.position.set(x,1.45,0); tr.castShadow=true; g.add(tr); }
  const turretPivot=new THREE.Group(); turretPivot.position.y=3.7; g.add(turretPivot); g.userData.turret=turretPivot;
  const turret=new THREE.Mesh(new THREE.BoxGeometry(5.8,1.7,5.1),MAT.tank); turret.position.z=-.4; turret.castShadow=true; turretPivot.add(turret);
  const barrel=new THREE.Mesh(new THREE.BoxGeometry(.62,.62,8.4),MAT.tankDark); barrel.position.set(0,.2,-5.8); turretPivot.add(barrel);
  const cupola=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.65,10),MAT.tankDark); cupola.position.set(0,1.15,0); turretPivot.add(cupola);
  const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,3.3,5),MAT.tankDark); antenna.position.set(1.7,2.2,1.4); antenna.rotation.z=-.04; turretPivot.add(antenna);
  g.userData.kind='tank'; return g;
}
function createAPC(){
  const g=new THREE.Group();
  const hull=new THREE.Mesh(new THREE.BoxGeometry(7,2.6,10),MAT.apc); hull.position.y=2.15; hull.castShadow=true; g.add(hull);
  const nose=new THREE.Mesh(new THREE.BoxGeometry(6.4,1.2,2.6),MAT.apc); nose.position.set(0,3.2,-3.9); nose.rotation.x=-.23; g.add(nose);
  for(const x of [-3.7,3.7]) for(const z of [-3.2,0,3.2]){ const wh=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.8,10),MAT.tankDark); wh.rotation.z=Math.PI/2; wh.position.set(x,1.05,z); g.add(wh); }
  const t=new THREE.Group(); t.position.y=3.8; g.add(t); g.userData.turret=t;
  const gun=new THREE.Mesh(new THREE.BoxGeometry(.35,.35,5),MAT.tankDark); gun.position.z=-2.8; t.add(gun);
  g.userData.kind='apc'; return g;
}
function addVehicle(g,type){
  if(!g) return; const mesh=type==='tank'?createTank():createAPC(); scene.add(mesh);
  const idx=g.vehicles.length; mesh.position.copy(g.player.group.position); mesh.position.x+=8+(idx%2)*7; mesh.position.z+=9+Math.floor(idx/2)*10;
  g.vehicles.push({type,group:mesh,slot:idx,mgCd:Math.random()*.4,cannonCd:.8+Math.random()*.7});
  updateHUD(); toast(type==='tank'?'기갑 증원':'장갑차 합류', type==='tank'?'추가 <strong>MBT</strong>가 호송대에 합류했습니다.':'<strong>APC</strong>가 호송대에 합류했습니다.');
}
function addSoldiers(g,count){
  if(!g) return;
  for(let i=0;i<count;i++){
    const mesh=createSoldier(); scene.add(mesh); mesh.position.copy(g.player.group.position);
    g.soldiers.push({mesh,hp:100,maxHp:100,fireCd:Math.random()*.4,index:g.soldiers.length});
    g.squadMax++;
  }
  updateHUD();
}
function createSoldier(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.6,1.3,3,7),MAT.soldier); body.position.y=1.65; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.52,8,6),MAT.soldierDark); head.position.y=3.05; head.castShadow=true; g.add(head);
  const gun=new THREE.Mesh(new THREE.BoxGeometry(.22,.22,2.2),MAT.tankDark); gun.position.set(.55,2,-.65); gun.rotation.y=-.15; g.add(gun);
  return g;
}

function setupFacilities(){
  const data=[
    {name:'ST. MARY HOSPITAL',type:'HOSPITAL',pos:[240,-120],color:0xd6e0dc,people:18,reward:'야전 의료 보급'},
    {name:'CENTRAL POLICE',type:'POLICE',pos:[-240,120],color:0x6385a0,people:12,reward:'무장 인원 증원'},
    {name:'CITY RADIO',type:'RADIO',pos:[0,240],color:0x9c8b73,people:22,reward:'항공 구조 정보'}
  ];
  for(const f of data){
    const g=createFacility(f); g.position.set(f.pos[0],0,f.pos[1]); scene.add(g);
    game.facilities.push({...f,group:g,state:'idle',capture:0,integrity:100});
  }
}
function createFacility(f){
  const g=new THREE.Group();
  const mat=f.type==='HOSPITAL'?MAT.hospital:f.type==='POLICE'?MAT.police:MAT.radio;
  const base=new THREE.Mesh(new THREE.BoxGeometry(34,12,28),mat); base.position.y=6; base.castShadow=true; base.receiveShadow=true; g.add(base);
  const top=new THREE.Mesh(new THREE.BoxGeometry(25,3.5,20),MAT.buildingDark); top.position.y=13.5; g.add(top);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(15,15,.35,32),new THREE.MeshStandardMaterial({color:0x333a37,roughness:1})); pad.position.set(0,.18,-27); g.add(pad);
  const ring=new THREE.Mesh(new THREE.RingGeometry(9.5,10.2,40),new THREE.MeshBasicMaterial({color:0xcbd7d1,transparent:true,opacity:.7,side:THREE.DoubleSide})); ring.rotation.x=-Math.PI/2; ring.position.set(0,.4,-27); g.add(ring);
