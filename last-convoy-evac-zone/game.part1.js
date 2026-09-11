
// LAST CONVOY: EVAC ZONE
// Data-driven web prototype. Add new starting columns in LOADOUTS and new field upgrades in UPGRADES.

const $ = (q) => document.querySelector(q);
const els = {
  game: $('#game'), startScreen: $('#startScreen'), upgradeScreen: $('#upgradeScreen'), resultScreen: $('#resultScreen'),
  startBtn: $('#startBtn'), restartBtn: $('#restartBtn'), loadoutCards: $('#loadoutCards'), upgradeCards: $('#upgradeCards'),
  hudTop: $('#hudTop'), hudLeft: $('#hudLeft'), objectivePanel: $('#objectivePanel'),
  civilianStat: $('#civilianStat'), squadStat: $('#squadStat'), armorStat: $('#armorStat'), supplyStat: $('#supplyStat'),
  formationStat: $('#formationStat'), missionText: $('#missionText'), threatBar: $('#threatBar'), threatLabel: $('#threatLabel'),
  objectiveTitle: $('#objectiveTitle'), objectiveDesc: $('#objectiveDesc'), objectiveTimer: $('#objectiveTimer'),
  toastLayer: $('#toastLayer'), resultBody: $('#resultBody')
};

const LOADOUTS = [
  { id:'patrol', name:'BALANCED PATROL', kicker:'STANDARD ISSUE', desc:'주력전차 1대와 소총수 6명. 기동·화력·생존성을 고르게 확보한 기본 편성.', tags:['MBT ×1','RIFLE ×6','SUPPLY +0'], soldiers:6, tankMG:1, supply:0, speed:1 },
  { id:'rescue', name:'RESCUE COLUMN', kicker:'CIVIL DEFENSE', desc:'주력전차 1대, 소총수 4명, 의무병 1명. 구조 보급 획득량이 높고 분대 회복이 빠릅니다.', tags:['MBT ×1','SQUAD ×5','MEDIC'], soldiers:5, medics:1, rescueBonus:1.35, speed:1.05 },
  { id:'armor', name:'ARMORED SPEARHEAD', kicker:'HEAVY RESPONSE', desc:'주력전차 1대와 장갑차 1대, 소총수 4명. 초반 화력과 좀비 돌파력이 높습니다.', tags:['MBT ×1','APC ×1','RIFLE ×4'], soldiers:4, apc:1, speed:.94 }
];

const UPGRADES = [
  { id:'reinforce', tier:'COMMON', icon:'✚', name:'보병 증원', desc:'인근 생존 군인을 편입합니다.', effect:'+3 분대원', weight:5, apply:g=>addSoldiers(g,3) },
  { id:'apc', tier:'RARE', icon:'▰', name:'장갑차 지원', desc:'기관총으로 주변을 제압하는 장갑차가 호송대에 합류합니다.', effect:'+1 APC · +2 분대원', weight:3, apply:g=>{ addVehicle(g,'apc'); addSoldiers(g,2); } },
  { id:'tank', tier:'EPIC', icon:'◆', name:'추가 전차', desc:'독립 사격이 가능한 추가 주력전차를 투입합니다.', effect:'+1 MBT', weight:1.5, apply:g=>addVehicle(g,'tank') },
  { id:'rifle', tier:'COMMON', icon:'⌁', name:'개량 소총', desc:'분대 화기 통제와 탄약을 개선합니다.', effect:'보병 피해 +25%', weight:5, apply:g=>g.mods.squadDamage*=1.25 },
  { id:'autoloader', tier:'RARE', icon:'◉', name:'자동장전 장치', desc:'전차 주포 장전 사이클을 단축합니다.', effect:'주포 연사 +25%', weight:3, apply:g=>g.mods.cannonRate*=1.25 },
  { id:'hmg', tier:'COMMON', icon:'≋', name:'중기관총 탄띠', desc:'차량 기관총의 지속화력을 높입니다.', effect:'차량 MG 피해 +30%', weight:4, apply:g=>g.mods.mgDamage*=1.30 },
  { id:'medic', tier:'RARE', icon:'✦', name:'야전 의무반', desc:'분대원이 천천히 체력을 회복합니다.', effect:'분대 초당 회복 +2', weight:2.5, apply:g=>g.mods.regen+=2 },
  { id:'formation', tier:'COMMON', icon:'⌬', name:'전술 대형', desc:'전개 대형의 사격 범위와 집결 대형의 이동 보너스를 개선합니다.', effect:'대형 효과 +20%', weight:4, apply:g=>g.mods.formation*=1.2 },
  { id:'air', tier:'EPIC', icon:'⌃', name:'항공 통제 링크', desc:'헬기 접근 경로를 최적화해 방어 시간을 줄입니다.', effect:'시설 방어시간 -18%', weight:1.2, apply:g=>g.mods.defenseTime*=.82 },
  { id:'rescue', tier:'COMMON', icon:'◇', name:'구조 우선 프로토콜', desc:'민간인 구조 시 더 많은 보급품을 확보합니다.', effect:'구조 보급 +35%', weight:4, apply:g=>g.mods.rescueBonus*=1.35 },
  { id:'shell', tier:'RARE', icon:'✹', name:'대인 파편탄', desc:'전차 포탄 폭발 범위를 확장합니다.', effect:'포탄 폭발범위 +28%', weight:3, apply:g=>g.mods.blast*=1.28 },
  { id:'engine', tier:'COMMON', icon:'»', name:'엔진 튜닝', desc:'호송대의 도심 기동성을 개선합니다.', effect:'이동속도 +12%', weight:4, apply:g=>g.mods.speed*=1.12 }
];

let selectedLoadout = LOADOUTS[0];
let scene, camera, renderer, clock, hemi, sun;
let game = null;
let raf = 0;
const keys = new Set();
const ray = new THREE.Raycaster();
const v3 = new THREE.Vector3();

const MAT = {
  asphalt: new THREE.MeshStandardMaterial({color:0x1e2529, roughness:.96}),
  sidewalk: new THREE.MeshStandardMaterial({color:0x59615f, roughness:1}),
  ground: new THREE.MeshStandardMaterial({color:0x39423b, roughness:1}),
  building: new THREE.MeshStandardMaterial({color:0x555f5c, roughness:.9}),
  buildingDark: new THREE.MeshStandardMaterial({color:0x343c3d, roughness:.95}),
  window: new THREE.MeshStandardMaterial({color:0x99b9ad, roughness:.55, metalness:.1, emissive:0x15231d, emissiveIntensity:.7}),
  tank: new THREE.MeshStandardMaterial({color:0x52694e, roughness:.75}),
  tankDark: new THREE.MeshStandardMaterial({color:0x26312a, roughness:.85}),
  apc: new THREE.MeshStandardMaterial({color:0x6a7250, roughness:.8}),
  soldier: new THREE.MeshStandardMaterial({color:0x79957a, roughness:.85}),
  soldierDark: new THREE.MeshStandardMaterial({color:0x243029, roughness:.9}),
  civilian: new THREE.MeshStandardMaterial({color:0xc9a676, roughness:.9}),
  zombie: new THREE.MeshStandardMaterial({color:0x63765f, roughness:1}),
  zombieHead: new THREE.MeshStandardMaterial({color:0x8a8b6b, roughness:1}),
  red: new THREE.MeshStandardMaterial({color:0xa83d36, emissive:0x3b0806, emissiveIntensity:.35}),
  hospital: new THREE.MeshStandardMaterial({color:0xc6d3cd, roughness:.8}),
  police: new THREE.MeshStandardMaterial({color:0x516a7a, roughness:.8}),
  radio: new THREE.MeshStandardMaterial({color:0x776e62, roughness:.85})
};

initMenu();
initThree();
renderIdleScene();

function initMenu(){
  els.loadoutCards.innerHTML = '';
  for(const l of LOADOUTS){
    const card = document.createElement('div');
    card.className='loadout-card'+(l===selectedLoadout?' selected':'');
    card.innerHTML=`<div class="card-kicker">${l.kicker}</div><div class="card-title">${l.name}</div><div class="card-desc">${l.desc}</div><div class="card-meta">${l.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>`;
    card.onclick=()=>{ selectedLoadout=l; [...els.loadoutCards.children].forEach(c=>c.classList.remove('selected')); card.classList.add('selected'); };
    els.loadoutCards.appendChild(card);
  }
  els.startBtn.onclick=startGame;
  els.restartBtn.onclick=()=>location.reload();
}

function initThree(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10171a);
  scene.fog = new THREE.FogExp2(0x11191b, .0036);
  camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, .1, 1300);
  camera.position.set(65,78,65);
  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  els.game.appendChild(renderer.domElement);
  hemi = new THREE.HemisphereLight(0xb9d4cb,0x2c3029,1.65); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffe9c8,2.3); sun.position.set(-85,140,-45); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-180; sun.shadow.camera.right=180; sun.shadow.camera.top=180; sun.shadow.camera.bottom=-180; scene.add(sun);
  clock = new THREE.Clock();
  addGroundAndCity();
  addAtmosphere();
  addEventListener('resize',onResize);
  addEventListener('keydown',e=>{ if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space'].includes(e.code)) e.preventDefault(); keys.add(e.code); if(e.code==='Space'&&game&&game.running&&!game.paused) toggleFormation(); });
  addEventListener('keyup',e=>keys.delete(e.code));
}

function addGroundAndCity(){
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900,900),MAT.ground); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
  const roadW=26, spacing=120;
  for(let i=-3;i<=3;i++){
    const x=i*spacing; const r1=new THREE.Mesh(new THREE.PlaneGeometry(roadW,840),MAT.asphalt); r1.rotation.x=-Math.PI/2; r1.position.set(x,.012,0); r1.receiveShadow=true; scene.add(r1);
    const r2=new THREE.Mesh(new THREE.PlaneGeometry(840,roadW),MAT.asphalt); r2.rotation.x=-Math.PI/2; r2.position.set(0,.014,x); r2.receiveShadow=true; scene.add(r2);
    addRoadLines(x,0,false); addRoadLines(0,x,true);
  }
  // Procedural city blocks, leaving facility plots clearer.
  const rand = mulberry32(91126);
  for(let gx=-3;gx<3;gx++) for(let gz=-3;gz<3;gz++){
    const cx=gx*spacing+spacing/2, cz=gz*spacing+spacing/2;
    for(let k=0;k<4;k++){
      const ox=(k%2?1:-1)*(22+rand()*8), oz=(k>1?1:-1)*(22+rand()*8);
      if(nearAnyFacility(cx+ox,cz+oz,52)) continue;
      addBuilding(cx+ox,cz+oz,28+rand()*22,28+rand()*22,18+rand()*50,rand());
    }
  }
  // abandoned cars / barricades for depth
  for(let i=0;i<45;i++){
