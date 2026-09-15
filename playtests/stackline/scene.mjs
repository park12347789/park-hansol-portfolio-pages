// All models are procedural, original geometry; no downloaded art or textures.
export function createStation(THREE, host, getGame) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#dce5d5');
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.domElement.setAttribute('aria-label','들녘역 3D 디오라마. 드래그로 회전할 수 있습니다.');
  host.prepend(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-25,25,17,-17,0.1,200);
  let angle=0.57,zoom=1,drag=null,last=0,frame=0;
  const target=new THREE.Vector3(0,0.2,0),palette={grass:'#a8bb8a',soil:'#8a795e',edge:'#7a694f',rail:'#7e867e',sleeper:'#8b806b',stone:'#c6c6b4',cream:'#e9ddb8',roof:'#af7051',dark:'#355043',wood:'#a98050',metal:'#425851',gold:'#d4aa61',green:'#598568',orange:'#b87645',window:'#354f4c'};
  const mats=new Map(),geos=new Map();
  function mat(c){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:0.9}));return mats.get(c);}
  function geo(k,fn){if(!geos.has(k))geos.set(k,fn());return geos.get(k);}
  function mesh(g,c,p,x,y,z,shadow=true){const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m;}
  function box(p,x,y,z,w,h,d,c,shadow=true){return mesh(geo(`b${w},${h},${d}`,()=>new THREE.BoxGeometry(w,h,d)),c,p,x,y,z,shadow);}
  function cyl(p,x,y,z,r,h,c,n=10){return mesh(geo(`c${r},${h},${n}`,()=>new THREE.CylinderGeometry(r,r,h,n)),c,p,x,y,z);}
  function ball(p,x,y,z,r,c){return mesh(geo(`i${r}`,()=>new THREE.IcosahedronGeometry(r,0)),c,p,x,y,z);}
  function group(x=0,y=0,z=0,p=scene){const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g;}
  scene.add(new THREE.HemisphereLight('#fff5db','#789070',2.5));
  const sun=new THREE.DirectionalLight('#fff0d0',3.4);sun.position.set(-17,30,14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-26,right:26,top:23,bottom:-23,near:1,far:85});sun.shadow.normalBias=.035;sun.shadow.bias=-.00025;scene.add(sun);
  box(scene,0,-1,0,40,1.6,23,palette.soil);box(scene,0,-1.82,0,39.5,.12,22.5,palette.edge);
  box(scene,0,-.13,0,40,.25,23,palette.grass);box(scene,0,-2.05,0,200,.15,200,'#dce5d5',false);
  // Water ribbon, cut into one edge of the model railway board.
  box(scene,-16,.025,0,3.8,.08,23,'#88b8b1',false);
  for(let z=-10;z<11;z+=2.5)box(scene,-16+(Math.sin(z)*.7),.075,z,1.5,.013,.06,'#b8d2c5',false);
  for(const z of [-2,2]){
    box(scene,0,.04,z,40,.15,2.3,palette.stone,false);
    box(scene,-16,.12,z,5,.26,2.35,palette.wood);
    for(const zz of [z-.65,z+.65]){box(scene,0,.24,zz,40,.13,.095,palette.rail,false);box(scene,0,.32,zz,40,.03,.105,'#aeb7a6',false);}
  }
  const sleeperGeo=new THREE.BoxGeometry(.25,.12,1.8), sleepers=new THREE.InstancedMesh(sleeperGeo,mat(palette.sleeper),112),matrix=new THREE.Matrix4();
  let sn=0;for(const z of [-2,2])for(let i=0;i<56;i++){matrix.makeTranslation(-19.6+i*.71,.16,z);sleepers.setMatrixAt(sn++,matrix);}sleepers.receiveShadow=true;scene.add(sleepers);
  const platforms=[];
  for(let lane=0;lane<2;lane++){
    const p=group(0,0,lane===0?-.05:-4.05);platforms.push(p);
    box(p,1,.35,0,25,.67,1.48,'#dad4be');box(p,1,.71,0,25,.09,1.53,'#e6dfc9');
    for(let i=0;i<25;i++)box(p,-11+i,.77,lane===0?.64:-.64,.55,.012,.1,'#dcb96b',false);
    for(const x of [-9,9]){
      cyl(p,x,1.9,0,.055,2.3,palette.metal,6);box(p,x,3.06,0,.65,.17,.34,'#f6e8b5');
      const lamp=ball(p,x,2.9,0,.14,'#ead28e');lamp.castShadow=false;
    }
    for(const x of [-6,5]){box(p,x,1.0,0,1.55,.13,.48,palette.wood);box(p,x,1.35,-.2,1.55,.53,.1,palette.wood);for(const xx of [x-.55,x+.55])box(p,xx,.85,0,.1,.3,.35,palette.dark);}
    const sign=group(-2,1.45,0,p);box(sign,0,.3,0,2.0,.57,.12,palette.dark);for(const x of [-.65,.65])box(sign,x,-.15,0,.06,1.1,.06,palette.dark);
  }
  const locked=group(0,0,-4.05);box(locked,0,.82,0,7,.05,.8,'#c9d4bd',false);
  for(let x=-3;x<=3;x++)box(locked,x,.86,0,.35,.06,.84,'#a8b89a',false);
  function roof(p,x,y,z,w,d,c){
    const r=group(x,y,z,p);
    for(const side of [-1,1]){const m=box(r,0,0,side*d*.24,w,.19,d*.57,c);m.rotation.x=side*.45;}
    return r;
  }
  // Station house, canopy, clock, tiny timetable, doors and flower boxes.
  const station=group(-1,0,-7.6);box(station,0,.25,0,8.4,.5,3.65,palette.stone);
  box(station,0,1.68,0,7.4,2.65,2.85,palette.cream);box(station,0,.55,0,7.55,.22,2.95,'#c4ae80');
  roof(station,0,3.12,0,8.3,3.6,palette.roof);
  for(const x of [-2.6,2.6]){
    box(station,x,1.9,1.45,1.08,1.12,.12,palette.window);
    box(station,x,1.9,1.53,.065,1.12,.045,'#d5c691');box(station,x,1.9,1.53,1.08,.06,.045,'#d5c691');
    box(station,x,1.22,1.64,1.35,.22,.37,palette.wood);
    for(let i=0;i<4;i++){ball(station,x-.4+i*.27,1.46,1.65,.15,i%2?'#bb866d':'#d1ac71');}
  }
  box(station,0,1.4,1.46,1.2,2,.1,palette.dark);box(station,.37,1.35,1.56,.09,.09,.06,palette.gold);
  box(station,0,2.85,1.48,2.7,.38,.12,palette.dark);
  const clock=cyl(station,0,3.04,1.61,.32,.08,'#f1e4bf',18);clock.rotation.x=Math.PI/2;
  box(station,0,3.13,1.66,.035,.2,.02,palette.dark);const ch=box(station,.07,3.07,1.67,.17,.035,.02,palette.dark);ch.rotation.z=.2;
  box(station,0,2.54,2.25,7.8,.14,1.7,'#769175');for(const x of [-3.5,3.5])cyl(station,x,1.28,2.8,.06,2.4,palette.dark,6);
  box(station,3.1,3.52,-.6,.5,1.1,.5,'#8b735c');box(station,3.1,4.1,-.6,.7,.16,.7,'#756653');
  const ticketBooth=group(-7.5,0,6.1);box(ticketBooth,0,1,0,2.7,1.9,2.1,'#dbcca6');roof(ticketBooth,0,2.15,0,3.25,2.6,'#739477');
  box(ticketBooth,0,1.18,1.08,1.3,.72,.12,palette.window);box(ticketBooth,0,.88,1.25,1.8,.12,.46,palette.wood);box(ticketBooth,0,1.85,1.16,1.65,.25,.06,palette.dark);
  const cargoYard=group(7,0,6.0);box(cargoYard,0,.17,0,6.2,.34,4.1,'#c2baa0');
  for(const x of [-2.45,2.45])box(cargoYard,x,1.8,-.8,.2,3.3,.2,palette.dark);
  box(cargoYard,0,3.4,-.8,5.4,.25,.3,palette.dark);cyl(cargoYard,.7,2.6,-.8,.035,1.55,'#807864',6);box(cargoYard,.7,1.87,-.8,.3,.15,.22,palette.metal);
  function crate(p,x,y,z,size=.7,color=palette.wood){
    box(p,x,y,z,size,size,size,color);
    box(p,x,y,z+size/2+.015,size*.15,size*.97,.025,'#d3b077');
    box(p,x,y+size/2+.012,z,size*.15,.025,size,'#d3b077');
  }
  for(let i=0;i<6;i++)crate(cargoYard,-1.6+(i%3)*.8,.7+Math.floor(i/3)*.68,-.2,.63,i%2?'#af8955':'#ba9969');
  const yardStock=group(2.2,.4,1,cargoYard);for(let i=0;i<4;i++)crate(yardStock,(i%2)*.55,.3+Math.floor(i/2)*.5,0,.5,'#8b9d75');
  // Paving, fenced garden and low-poly vegetation.
  box(scene,0,.04,7.2,6,.055,5.5,'#c7c7b0',false);
  for(let x=-12;x<14;x+=1.2){box(scene,x,.55,10.6,.12,1.1,.12,palette.wood);}
  for(const y of [.35,.78])box(scene,.6,y,10.6,26,.1,.09,palette.wood);
  function tree(x,z,s=1){const p=group(x,0,z);cyl(p,0,.78*s,0,.13*s,1.55*s,'#8c7b56',7);ball(p,0,2.0*s,0,1.02*s,'#6d925e');ball(p,-.48*s,1.8*s,.1,.69*s,'#829e68');}
  for(const [x,z,s] of [[-12,-8,1.1],[-10,-9,.85],[11,-8,1.2],[14,-7,.85],[17,-8,1.0],[17,8,.9],[14,9,1.05],[-12,8,.9],[-10,9,.75],[-18,8,.9],[-18,-8,1]])tree(x,z,s);
  for(let i=0;i<23;i++){const x=17.9-Math.floor(i/6)*.43,z=-9+(i%6)*3.4;if(Math.abs(z)<3)continue;ball(scene,x,.15,z,.18,i%3?'#97a678':'#ddd3a0');}
  for(const x of [12,16]){box(scene,x,.26,-10,1.1,.52,.64,'#a7ab91');ball(scene,x,.51,-10,.32,'#a7ab91');}
  // Track signals.
  const signals=[];
  for(const [i,z] of [[0,2],[1,-2]]){const p=group(13,0,z+1.15);cyl(p,0,1.2,0,.06,2.4,palette.metal,7);box(p,0,2.4,0,.34,.65,.28,palette.dark);signals.push(ball(p,0,2.51,.17,.11,'#b66c52'));}
  const staffModels=[];
  function person(p,x,z,c='#d6a46d'){
    const g=group(x,0,z,p);cyl(g,0,.5,0,.16,.43,c,7);ball(g,0,.86,0,.18,'#d5b083');cyl(g,0,1.04,0,.21,.1,palette.dark,8);
    for(const side of [-1,1])box(g,side*.075,.17,0,.11,.34,.13,palette.dark);return g;
  }
  for(let i=0;i<6;i++)staffModels.push(person(scene,-3.2+i*.65,8.3,i%2?'#bfa16d':'#678d74'));
  const passengers=[];for(let i=0;i<10;i++)passengers.push(person(scene,-7+i*.52,.0,i%3?'#a78465':'#9aab7d'));
  const trainModels=new Map(),wheels=[];
  function makeTrain(t){
    const g=group(),wheelset=[],cargo=[];
    const loco=group(0,0,0,g),bodyColor=t.type==='passenger'?'#b97745':'#537c68';
    box(loco,0,.63,0,3.1,.34,1.32,palette.dark);box(loco,-1.07,1.49,0,1.12,1.6,1.2,bodyColor);
    box(loco,-1.05,2.35,0,1.45,.18,1.5,palette.dark);
    for(const side of [-1,1])box(loco,-1.07,1.8,side*.612,.65,.58,.035,'#d1ceab');
    const boiler=cyl(loco,.45,1.23,0,.57,1.85,bodyColor,12);boiler.rotation.z=Math.PI/2;
    const front=cyl(loco,1.4,1.23,0,.59,.12,palette.dark,12);front.rotation.z=Math.PI/2;
    const headlamp=cyl(loco,1.52,1.42,0,.18,.16,'#efce89',12);headlamp.rotation.z=Math.PI/2;
    cyl(loco,.99,1.97,0,.21,.75,palette.dark,10);cyl(loco,.99,2.39,0,.3,.15,palette.dark,10);cyl(loco,.0,1.89,0,.24,.35,palette.gold,10);
    box(loco,1.57,.64,0,.45,.25,1.6,palette.dark);box(loco,1.72,.48,0,.2,.16,1.8,palette.dark);
    function addWheels(parent,positions,r=.32){
      for(const x of positions)for(const side of [-1,1]){const w=cyl(parent,x,.48,side*.69,r,.15,palette.dark,12);w.rotation.x=Math.PI/2;wheelset.push(w);const h=cyl(parent,x,.48,side*.785,r*.44,.02,palette.gold,8);h.rotation.x=Math.PI/2;}
    }
    addWheels(loco,[-.98,.08,1.06],.38);
    for(let c=0;c<2;c++){
      const car=group(-3.48-c*3.75,0,0,g);
      box(car,0,.65,0,3.3,.3,1.4,palette.dark);box(car,1.8,.6,0,.38,.09,.1,palette.metal);addWheels(car,[-1.03,1.03],.3);
      if(t.type==='passenger'){
        box(car,0,1.25,0,3.18,1.03,1.31,'#d7ca9f');box(car,0,.93,0,3.23,.27,1.34,'#668c70');
        box(car,0,1.89,0,3.49,.29,1.54,'#597b64');
        for(const x of [-1.03,-.34,.34,1.03])for(const side of [-1,1]){box(car,x,1.42,side*.662,.46,.5,.035,palette.window);box(car,x,1.11,side*.68,.51,.04,.055,'#f1d8a3');}
        box(car,1.615,1.31,0,.06,.86,.7,palette.dark);
      }else{
        box(car,0,1.0,0,3.15,.18,1.35,palette.wood);
        for(const side of [-1,1])box(car,0,1.23,side*.68,3.22,.58,.1,'#b08957');
        for(const x of [-1.59,1.59])box(car,x,1.23,0,.1,.58,1.35,'#a07b4e');
        for(let j=0;j<4;j++){const b=group(-.96+(j%2)*1.16,1.38,-.3+Math.floor(j/2)*.63,car);crate(b,0,0,0,.55,t.resource==='food'?'#929e6b':'#ca9d62');cargo.push(b);}
      }
    }
    trainModels.set(t.id,{g,wheelset,cargo});return trainModels.get(t.id);
  }
  // Steam is pooled; nothing is allocated per frame.
  const steamGeo=new THREE.IcosahedronGeometry(.3,1),steamMat=new THREE.MeshStandardMaterial({color:'#f7f1d9',transparent:true,opacity:.42,depthWrite:false,roughness:1});
  const smoke=Array.from({length:14},()=>{const m=new THREE.Mesh(steamGeo,steamMat);m.visible=false;scene.add(m);return m;});
  function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);const aspect=w/h;const half=aspect<1.55?23.2/aspect:16.2;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.zoom=zoom;camera.updateProjectionMatrix();}
  const ro=new ResizeObserver(resize);ro.observe(host);resize();
  function updateCamera(){camera.position.set(Math.sin(angle)*38,28,Math.cos(angle)*38);camera.lookAt(target);camera.zoom=zoom;camera.updateProjectionMatrix();}
  function project(id,x,y,z,text){const el=document.getElementById(id);if(!el)return;const v=new THREE.Vector3(x,y,z).project(camera);el.classList.remove('hidden');el.style.left=`${(v.x*.5+.5)*host.clientWidth}px`;el.style.top=`${(-v.y*.5+.5)*host.clientHeight}px`;if(el.textContent!==text)el.textContent=text;}
  let disposed=false;
  function render(now){
    if(disposed)return;frame=requestAnimationFrame(render);
    if(document.hidden)return;
    // 30 FPS cap avoids burning CPU on static management screens.
    if(now-last<31)return;last=now;const g=getGame(),activeIds=new Set(g.active.map(t=>t.id));updateCamera();
    platforms[1].visible=g.platformCount>=2;locked.visible=g.platformCount<2;
    for(const [id,v] of trainModels)if(!activeIds.has(id)){scene.remove(v.g);trainModels.delete(id);}
    for(const t of g.active){
      const m=trainModels.get(t.id)||makeTrain(t),p=Math.min(1,t.motion/(t.state==='arriving'?3:3.8));
      const ease=1-Math.pow(1-p,3);m.g.position.set(t.state==='arriving'?-27+32*ease:t.state==='departing'?5+34*p*p:5,0,t.lane===0?2:-2);
      for(const w of m.wheelset)if(t.state!=='docked'&&!g.paused)w.rotation.y=now*.005*g.speed;
      for(let i=0;i<m.cargo.length;i++)m.cargo[i].visible=i<Math.ceil(t.loaded/t.amount*m.cargo.length);
    }
    const lead=g.active.find(t=>t.state!=='departing')||g.active[0],lm=lead&&trainModels.get(lead.id);
    for(let i=0;i<smoke.length;i++){
      const s=smoke[i];s.visible=!!lm;
      if(lm){const p=((g.paused?0:now*.00018)+i/smoke.length)%1;s.position.set(lm.g.position.x+.99-p*2.2,2.7+p*4.3,lm.g.position.z+Math.sin(i*3)*p*.35);s.scale.setScalar(.5+p*2.3);}
    }
    for(let i=0;i<staffModels.length;i++){
      const p=staffModels[i];p.visible=i<g.workers.length;if(!p.visible)continue;
      const f=g.workers[i],x=f==='ticket'?-7.6+(i%3)*.43:f==='cargo'?5.8+(i%3)*.55:-3.2+i*.65,z=f==='ticket'?7.6:f==='cargo'?7.8:8.3;
      p.position.set(x,(f&&!g.paused?Math.sin(now*.009+i)*.04:0),z);p.rotation.y=f==='cargo'?Math.PI*.2:Math.PI;
    }
    const waiting=Math.min(10,g.hand.passenger+g.hand.ticket+g.facilities.ticket.queue.length);
    for(let i=0;i<passengers.length;i++){passengers[i].visible=i<waiting;passengers[i].position.y=.76;}
    yardStock.visible=g.hand.wood+g.hand.food+g.facilities.cargo.queue.length>0;
    for(let i=0;i<signals.length;i++){signals[i].material=mat(g.active.some(t=>t.lane===i)?'#bd7656':'#80a46b');}
    project('label-ticket',-7.5,2.7,6.1,`매표소 · 직원 ${g.staff('ticket')}`);project('label-cargo',7,3.9,6,`화물장 · 직원 ${g.staff('cargo')}`);
    renderer.render(scene,camera);
  }
  renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,angle};renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(drag)angle=drag.angle-(e.clientX-drag.x)*.004;});
  renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
  document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.camera;if(a==='left')angle-=.2;if(a==='right')angle+=.2;if(a==='in')zoom=Math.min(1.65,zoom+.12);if(a==='out')zoom=Math.max(.75,zoom-.12);resize();}));
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();document.getElementById('scene-loading').classList.remove('hidden');document.getElementById('scene-loading').textContent='3D 화면 연결이 끊겼습니다. 새로고침해 주세요. 진행 상황은 자동 저장됩니다.';});
  frame=requestAnimationFrame(render);
  return {renderer,scene,camera,get trainCount(){return trainModels.size;},dispose(){disposed=true;cancelAnimationFrame(frame);ro.disconnect();for(const m of mats.values())m.dispose();for(const g of geos.values())g.dispose();sleeperGeo.dispose();steamGeo.dispose();steamMat.dispose();renderer.dispose();renderer.domElement.remove();}};
}
