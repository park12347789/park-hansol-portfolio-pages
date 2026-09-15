import {Game,TYPES,FACILITIES,DAY_LENGTH,TARGET} from './core.mjs';
import {createStation} from './scene.mjs';
const $=id=>document.getElementById(id), KEY='stackline.save.v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={train:'M5 3h14v14H5z M8 7h8 M8 11h2 M14 11h2 M7 17l-3 4 M17 17l3 4 M6 20h12',person:'M15 6a3 3 0 1 1-6 0a3 3 0 0 1 6 0 M5 21v-4a7 7 0 0 1 14 0v4 M9 15v6 M15 15v6',ticket:'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z M15 6v2 M15 11v2 M15 16v2 M7 10h4 M7 14h3',wood:'M4 7l12-3 5 4v12L9 22l-5-4z M4 7l5 4 12-3 M9 11v11 M7 6l5 4 M7 14l-3-3',food:'M6 8h12l2 13H4z M9 8V5h6v3 M12 12v5 M10 14l2 2 2-2',box:'M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11 M7 5l9 4v5',clock:'M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0 M12 7v5l3 2',leaf:'M20 3C8 2 3 6 5 14c3 8 13 5 15-11z M5 21L16 8'};
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.box}"/></svg>`;}
for(const el of document.querySelectorAll('[data-icon]'))el.innerHTML=icon(el.dataset.icon);
let game=new Game(),resumed=false,selection=null,sound=false,audio=null,toastTimer=0,view=null,modalKind='welcome',beforeModalPaused=true;
let drag=null,suppressClick=false,renderCache={},saveTimer=0,uiTimer=0,lastFrame=performance.now();
try{const raw=localStorage.getItem(KEY);if(raw){game=Game.restore(JSON.parse(raw));resumed=true;}}catch(e){$('save-status').textContent='이전 저장을 읽지 못해 새 게임을 준비했습니다.';}
if(resumed){$('begin').textContent=game.ended?'운영 결과 보기 →':game.dayEnded?'근무 결과 보기 →':'이전 근무 이어하기 →';$('modal-title').innerHTML='역장님,<br>다시 오셨군요.';}
function html(id,text){if(renderCache[id]!==text){$(id).innerHTML=text;renderCache[id]=text;}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2700);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(game.snapshot()));$('save-status').textContent='자동 저장됨 · 탭을 벗어나면 일시정지';}catch(e){$('save-status').textContent='저장 공간을 사용할 수 없습니다. 이 탭에서만 진행됩니다.';}}
function beep(freq=540,duration=.08){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.65,audio.currentTime+duration);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{sound=false;}}
const timeText=t=>{const mins=360+Math.min(DAY_LENGTH,t)*4;return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(Math.floor(mins%60)).padStart(2,'0')}`;};
function facilityHTML(id){const f=game.facilities[id],staff=game.staff(id),meta=FACILITIES[id];return `<div class="facility" data-facility="${id}" data-drop="facility:${id}" role="button" tabindex="0" aria-label="${meta.name}: 직원 또는 일감 배치"><div class="facility-top">${icon(meta.icon)}<div><h3>${meta.name}</h3><span class="recipe">${id==='ticket'?'직원 + 환승객 → 발권':'직원 + 목재·식품 → 포장'}</span></div></div><div class="staff-info"><span>배치 직원 <b>${staff}</b></span><span id="status-${id}">${f.queue.length?staff?'작업 중':'직원 필요':'일감 대기'}</span></div><div class="bar"><i id="progress-${id}"></i></div><div class="queue-text"><span>쌓인 일감 <b>${f.queue.length}</b> / 18</span><button data-return="${id}" ${!f.queue.length?'disabled':''} title="대기 카드를 모두 돌려놓습니다. 진행 중인 작업은 초기화됩니다.">회수</button></div></div>`;}
function render(){
  html('day',`${String(game.day).padStart(2,'0')} <em>/ 03</em>`);$('clock').textContent=timeText(game.time);
  html('money',`${Math.floor(game.money).toLocaleString()} <em>G</em>`);html('reputation',`${game.reputation} <em>/ 100</em>`);
  $('pause').textContent=game.paused?'▶':'Ⅱ';$('pause').classList.toggle('active',game.paused);$('pause').setAttribute('aria-label',game.paused?'재개':'일시정지');
  $('speed').textContent=`${game.speed}×`;$('speed').classList.toggle('active',game.speed>1);$('sound').classList.toggle('active',sound);
  $('capacity').textContent=`${game.stored} / ${game.capacity}`;
  html('workers',game.workers.map((f,i)=>`<button class="worker ${f?'assigned':''} ${selection?.type==='worker'&&selection.id===i?'selected':''}" data-worker="${i}" title="직원 ${i+1}: ${f?FACILITIES[f].name:'미배치'}">${icon('person')} ${String(i+1).padStart(2,'0')}<small>${f?FACILITIES[f].name:'대기'}</small></button>`).join('')+'<button class="rest" data-rest="true" data-drop="rest" title="선택한 직원을 대기로 돌립니다.">대기</button>');
  const hand=Object.entries(TYPES).filter(([k])=>game.hand[k]>0).map(([k,v])=>`<button class="card ${v.color} ${selection?.type==='card'&&selection.kind===k?'selected':''}" data-card="${k}" title="${v.name} 묶음 ${game.hand[k]}개 · ${v.facility?FACILITIES[v.facility].name+'에 쌓기':'맞는 열차에 적재'}"><span class="category">${v.facility?'일감':'준비 완료'}</span><span class="qty">${game.hand[k]}</span><span class="card-art">${icon(v.icon)}</span><strong>${v.name}</strong></button>`).join('');
  html('hand',hand||'<div class="empty-hand">카드를 모두 배치했습니다.<br>시설이 작업을 마치면 이곳으로 돌아옵니다.</div>');
  html('facilities',Object.keys(FACILITIES).map(facilityHTML).join(''));
  for(const [id,f] of Object.entries(game.facilities)){
    const progress=f.queue.length?Math.min(100,f.progress/TYPES[f.queue[0]].duration*100):0;$(`progress-${id}`).style.width=`${progress}%`;
    const el=document.querySelector(`[data-facility="${id}"]`);el.classList.toggle('drop-ready',selection?.type==='worker'||(selection?.type==='card'&&TYPES[selection.kind].facility===id));
  }
  $('selection-hint').textContent=selection?.type==='worker'?`직원 ${selection.id+1} 선택됨 → 매표소 / 화물장 / 대기를 누르세요.`:selection?.type==='card'?`${TYPES[selection.kind].name} 묶음 선택됨 → ${TYPES[selection.kind].facility?FACILITIES[TYPES[selection.kind].facility].name+'를':'맞는 정차 열차를'} 누르세요.`:'직원 카드를 누른 뒤 매표소나 화물장을 누르세요. 드래그도 가능합니다.';
  html('platforms',[0,1].map(lane=>{
    if(lane>=game.platformCount)return `<div class="platform locked"><div class="track">PLATFORM 02</div><h3>아직 닫힌 승강장</h3><div class="manifest">두 번째 열차를 동시에 받으세요.<br>확장 비용 180G</div></div>`;
    const t=game.active.find(t=>t.lane===lane);
    if(!t)return `<div class="platform"><div class="track">PLATFORM 0${lane+1}</div><h3>다음 열차를 기다리는 중</h3><div class="manifest">선로가 비어 있습니다.</div></div>`;
    const docked=t.state==='docked',full=t.loaded>=t.amount,available=game.hand[t.wants];
    return `<div class="platform" data-train="${t.id}" data-drop="train:${t.id}"><div class="track">PLATFORM 0${lane+1}<span class="timer ${t.remaining<15?'urgent':''}">${docked?Math.ceil(t.remaining)+'초':t.state==='arriving'?'진입 중':'출발 중'}</span></div><h3>${esc(t.name)}</h3><div class="manifest">${TYPES[t.wants].name} <b>${t.loaded} / ${t.amount}</b> · 준비 ${available}</div><div class="bar load-progress"><i style="width:${t.loaded/t.amount*100}%"></i></div><div class="actions"><button data-load="${t.id}" ${!docked||!available||full?'disabled':''}>${t.type==='passenger'?'탑승':'적재'} ${docked?Math.min(available,t.amount-t.loaded):''}</button><button class="${full?'primary':''}" data-depart="${t.id}" ${!docked?'disabled':''}>${full?'완적 출발 →':'조기 출발'}</button></div></div>`;
  }).join(''));
  html('timetable',game.upcoming.slice(0,4).map(t=>`<div class="train-row"><span class="train-symbol">${icon('train')}</span><div><strong>${esc(t.name)}</strong><small>${TYPES[t.wants].name} ${t.amount} · ${timeText(t.at)}</small></div><span class="eta mono">${t.state==='queued'?'대기':Math.max(0,Math.ceil(t.at-game.time))+'s'}</span></div>`).join('')||'<div class="small">오늘 예정된 열차가 모두 도착했습니다.</div>');
  $('day-label').textContent=`DAY ${String(game.day).padStart(2,'0')}`;
  const defs={platform:['승강장 개통',game.platformCount>=2?'2개 운영 중':'동시 정차 +1'],hire:['직원 채용',`${game.workers.length} / 6명`],speed:['도구 개선',`작업 속도 +30% · Lv.${game.workLevel}`],patience:['대합실 확장',`정차 여유 +15초 · Lv.${game.patienceLevel}`]};
  html('upgrades',Object.entries(defs).map(([id,[name,desc]])=>{const cost=game.price(id);return `<button class="upgrade" data-buy="${id}" ${game.money<cost||game.ended?'disabled':''}><strong>${name}</strong><span>${desc}</span><b>${Number.isFinite(cost)?cost+' G':'완료'}</b></button>`;}).join(''));
  $('goal-bar').style.width=`${Math.min(100,game.earned/TARGET*100)}%`;$('goal-earned').textContent=`${game.earned.toLocaleString()} / 1,400 G`;$('goal-trains').textContent=`완적 ${game.fullTrains}회`;
  html('journal',game.events.slice(0,3).map(e=>`<p>${esc(e.text)}</p>`).join(''));
  const unstaffed=Object.keys(FACILITIES).find(id=>game.facilities[id].queue.length&&!game.staff(id));
  $('scene-message').textContent=game.ended?game.ended.reason:game.paused?'시간이 멈췄습니다. 카드를 배치한 뒤 ▶를 눌러 주세요.':unstaffed?`${FACILITIES[unstaffed].name}에 일감이 있지만 직원이 없습니다.`:game.active.some(t=>t.state==='docked'&&t.loaded===t.amount)?'열차가 가득 찼습니다. 완적 출발 버튼으로 보상을 받으세요.':game.upcoming.some(t=>t.state==='queued')?'진입 대기 열차가 있습니다. 승강장을 비우거나 확장해 주세요.':'직원은 자동으로 작업합니다. 준비된 승객·화물을 열차에 실어 주세요.';
  if(!modalKind&&(game.ended||game.dayEnded))showResult();
}
function actFacility(id){
  if(selection?.type==='worker'){game.assign(selection.id,id);toast(`직원 ${selection.id+1} → ${FACILITIES[id].name}`);selection=null;beep();}
  else if(selection?.type==='card'){if(game.stack(selection.kind,id)){selection=null;beep(440);}else toast('이 시설에서 처리할 수 없는 카드이거나 일감이 가득 찼습니다.');}
  else toast(`${FACILITIES[id].name}: 직원 카드와 ${id==='ticket'?'환승객':'목재·식품'} 카드를 먼저 선택해 주세요.`);
  render();save();
}
function actTrain(id,kind=null){const n=game.load(id,kind);if(n){beep(680);selection=null;}else toast('맞는 준비 완료 카드가 없거나, 열차가 아직 정차하지 않았습니다.');render();save();}
function closeModal(){modalKind=null;$('modal-backdrop').classList.add('hidden');}
function begin(){closeModal();if(game.ended||game.dayEnded)showResult();else {game.paused=false;beep();render();save();}}
$('begin').addEventListener('click',begin);
$('pause').addEventListener('click',()=>{if(modalKind||game.ended||game.dayEnded)return;game.paused=!game.paused;render();save();});
$('speed').addEventListener('click',()=>{game.speed=game.speed===3?1:game.speed+1;render();});
$('sound').addEventListener('click',()=>{sound=!sound;beep();$('sound').title=sound?'효과음 끄기':'효과음 켜기';render();});
function modal(content,kind){beforeModalPaused=game.paused;game.paused=true;modalKind=kind;$('modal').innerHTML=content;$('modal-backdrop').classList.remove('hidden');requestAnimationFrame(()=>$('modal').querySelector('button')?.focus());}
$('help').addEventListener('click',()=>{if(modalKind)return;modal(`<div class="eyebrow">STATION MANUAL</div><h2 id="modal-title">카드를 쌓아<br>열차를 보내세요.</h2><div class="instructions"><div><b class="step">1</b><div><strong>직원 선택 → 시설 선택</strong><span>배치한 직원은 반복 작업합니다. 여러 명을 쌓으면 빨라집니다.</span></div></div><div><b class="step">2</b><div><strong>일감 묶음 선택 → 시설 선택</strong><span>환승객은 매표소, 목재·식품은 화물장입니다. 한 번에 묶음 전체가 이동합니다.</span></div></div><div><b class="step">3</b><div><strong>탑승 / 적재 → 완적 출발</strong><span>준비 완료 카드는 해당 열차에만 실을 수 있습니다. 정차 시간이 끝나면 자동 출발합니다.</span></div></div></div><p class="description">기본 정차 시간은 67초이며, 다음 날부터 4초씩 줄어듭니다. 대합실을 확장하면 15초 늘어납니다.<br>매일 운영비는 직원당 12G + 역 유지비 14G입니다.<br>3일 동안 누적 운송 수익 1,400G와 평판 40 이상을 달성하세요.</p><button class="primary" id="close-help">근무로 돌아가기</button>`,'help');$('close-help').onclick=()=>{game.paused=beforeModalPaused;closeModal();render();};});
$('reset').addEventListener('click',()=>{if(modalKind)return;modal('<div class="eyebrow">NEW SHIFT</div><h2 id="modal-title">처음부터<br>다시 시작할까요?</h2><p class="description">이 브라우저에 저장된 현재 근무 기록을 새 게임으로 교체합니다.</p><button id="confirm-reset" class="primary">새 게임 시작</button><button id="cancel-reset" class="secondary">계속 운영하기</button>','reset');$('confirm-reset').onclick=resetGame;$('cancel-reset').onclick=()=>{game.paused=beforeModalPaused;closeModal();};});
function resetGame(){game=new Game();selection=null;renderCache={};closeModal();game.paused=false;save();render();}
function showResult(){
  const ended=game.ended,win=ended?.win;
  modal(`<div class="eyebrow">${ended?'THREE DAYS, ONE STATION':'END OF SHIFT'}</div><h2 id="modal-title">${ended?win?'들녘역이<br>다시 연결되었습니다.':'다음 근무는<br>조금 더 여유롭게.':`${game.day}일차,<br>근무를 마쳤습니다.`}</h2><p class="description">${esc(ended?.reason||`오늘 운영비 ${game.wage}G를 정산했습니다. 직원 배치, 카드, 자금과 확장은 다음 날에도 유지됩니다.`)}</p><div class="result-grid"><div><span>누적 운송 수익</span><strong>${game.earned.toLocaleString()}G</strong></div><div><span>완적 출발</span><strong>${game.fullTrains}회</strong></div><div><span>현재 평판</span><strong>${game.reputation}</strong></div><div><span>운영 자금</span><strong>${Math.floor(game.money)}G</strong></div></div><button id="result-next" class="primary">${ended?'새로운 3일 시작 →':'다음 날 근무 시작 →'}</button>`,'result');
  $('result-next').onclick=()=>{if(ended)resetGame();else {game.nextDay();closeModal();save();render();}};save();
}
document.addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;return;}if(modalKind)return;
  const target=e.target.closest('[data-worker],[data-card],[data-return],[data-facility],[data-load],[data-depart],[data-train],[data-buy],[data-rest]');if(!target||target.disabled)return;
  if(target.dataset.worker!==undefined){const id=Number(target.dataset.worker);selection=selection?.type==='worker'&&selection.id===id?null:{type:'worker',id};render();return;}
  if(target.dataset.card){const kind=target.dataset.card;selection=selection?.type==='card'&&selection.kind===kind?null:{type:'card',kind};render();return;}
  if(target.dataset.return){game.returnQueue(target.dataset.return);render();save();return;}
  if(target.dataset.facility){actFacility(target.dataset.facility);return;}
  if(target.dataset.load){actTrain(target.dataset.load);return;}
  if(target.dataset.depart){const t=game.trains.find(t=>t.id===target.dataset.depart);if(t&&t.loaded<t.amount){modal(`<div class="eyebrow">EARLY DEPARTURE</div><h2 id="modal-title">빈자리를 남기고<br>출발할까요?</h2><p class="description">${t.amount-t.loaded}${t.type==='passenger'?'명':'개'}을 처리하지 못했습니다. 조기 출발하면 평판이 하락하지만 승강장을 바로 비울 수 있습니다.</p><button id="confirm-depart" class="primary">지금 출발</button><button id="cancel-depart" class="secondary">더 처리하기</button>`,'depart');$('confirm-depart').onclick=()=>{game.paused=beforeModalPaused;closeModal();game.depart(t.id);beep(340,.3);save();render();};$('cancel-depart').onclick=()=>{game.paused=beforeModalPaused;closeModal();};}else {game.depart(target.dataset.depart);beep(760,.3);save();render();}return;}
  if(target.dataset.train){if(selection?.type==='card')actTrain(target.dataset.train,selection.kind);return;}
  if(target.dataset.buy){if(game.buy(target.dataset.buy)){beep(850,.12);toast('역 확장이 적용되었습니다.');}else toast('운영 자금이 부족합니다.');render();save();return;}
  if(target.dataset.rest!==undefined){if(selection?.type==='worker'){game.assign(selection.id,null);selection=null;render();save();}else toast('대기로 돌릴 직원 카드를 먼저 선택해 주세요.');}
});
// Pointer drag is optional. Tap-select then tap-target works on mouse, keyboard and touch.
document.addEventListener('pointerdown',e=>{
  if(modalKind||e.button!==0)return;const el=e.target.closest('[data-worker],[data-card]');if(!el)return;
  drag={x:e.clientX,y:e.clientY,el,pointerId:e.pointerId,ghost:null,source:el.dataset.worker!==undefined?{type:'worker',id:Number(el.dataset.worker)}:{type:'card',kind:el.dataset.card}};
});
document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){drag.ghost=drag.el.cloneNode(true);drag.ghost.removeAttribute('id');drag.ghost.classList.add('drag-ghost');drag.ghost.style.width=drag.el.offsetWidth+'px';drag.ghost.style.height=drag.el.offsetHeight+'px';document.body.append(drag.ghost);selection=drag.source;}
  if(drag.ghost){drag.ghost.style.left=e.clientX-30+'px';drag.ghost.style.top=e.clientY-25+'px';for(const el of document.querySelectorAll('.drop-hover'))el.classList.remove('drop-hover');document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]')?.classList.add('drop-hover');}
});
function endDrag(e,cancel=false){
  if(!drag)return;const d=drag;drag=null;for(const el of document.querySelectorAll('.drop-hover'))el.classList.remove('drop-hover');
  if(d.ghost){d.ghost.remove();suppressClick=true;setTimeout(()=>suppressClick=false,100);if(!cancel){selection=d.source;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]')?.dataset.drop;
    if(target?.startsWith('facility:'))actFacility(target.slice(9));else if(target?.startsWith('train:')&&selection.type==='card')actTrain(target.slice(6),selection.kind);else if(target==='rest'&&selection.type==='worker'){game.assign(selection.id,null);selection=null;save();}else toast('카드를 시설 또는 맞는 열차 위에 놓아 주세요.');}render();}
}
document.addEventListener('pointerup',e=>endDrag(e));document.addEventListener('pointercancel',e=>endDrag(e,true));
document.addEventListener('keydown',e=>{
  if(modalKind){if(e.key==='Tab'){const buttons=[...$('modal').querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}return;}
  if(e.code==='Space'&&e.target===document.body){e.preventDefault();$('pause').click();}
  if(e.key==='Escape'){selection=null;render();}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-facility]')){e.preventDefault();actFacility(e.target.dataset.facility);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){game.paused=true;save();render();}lastFrame=performance.now();});window.addEventListener('pagehide',save);
async function loadRenderer(){
  let lastError;
  for(const url of ['https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js','https://unpkg.com/three@0.180.0/build/three.module.js']){
    try{const THREE=await Promise.race([import(url),new Promise((_,reject)=>setTimeout(()=>reject(Error('3D 모듈 연결 시간 초과')),12000))]);view=createStation(THREE,$('scene'),()=>game);$('scene-loading').classList.add('hidden');return;}
    catch(e){lastError=e;}
  }
  console.error('STACKLINE_3D_LOAD_FAILED',lastError);$('scene-loading').innerHTML='<strong>3D 화면을 불러오지 못했습니다.</strong><small>WebGL2 지원과 인터넷 연결을 확인한 뒤 새로고침해 주세요.<br>카드 운영 게임은 아래 보드에서 계속 플레이할 수 있습니다.</small>';
}
function loop(now){const dt=Math.min(.25,(now-lastFrame)/1000);lastFrame=now;if(!document.hidden&&!modalKind)game.step(dt*game.speed);saveTimer+=dt;uiTimer+=dt;if(uiTimer>.12&&!drag){uiTimer=0;render();}if(saveTimer>5){saveTimer=0;save();}requestAnimationFrame(loop);}
render();loadRenderer();requestAnimationFrame(loop);requestAnimationFrame(()=>$('begin')?.focus());
// Read-only diagnostics; the live simulation is not exposed to the page console.
window.stackline={getSnapshot:()=>game.snapshot(),get rendererReady(){return !!view;},get renderInfo(){return view?{calls:view.renderer.info.render.calls,triangles:view.renderer.info.render.triangles,trains:view.trainCount}:null;}};
