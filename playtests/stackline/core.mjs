// STACKLINE — deterministic simulation, independent of the renderer and the DOM.
export const VERSION = 1;
export const DAY_LENGTH = 180;
export const TARGET = 1400;
export const TYPES = {
  passenger: {name:'환승객', icon:'person', color:'teal', facility:'ticket', result:'ticket', duration:5.5},
  ticket: {name:'발권 승객', icon:'ticket', color:'mint', value:16},
  wood: {name:'목재', icon:'wood', color:'orange', facility:'cargo', result:'woodbox', duration:7},
  food: {name:'식품', icon:'food', color:'rose', facility:'cargo', result:'foodbox', duration:7},
  woodbox: {name:'목재 화물', icon:'box', color:'orange', value:26},
  foodbox: {name:'식품 화물', icon:'box', color:'rose', value:30}
};
export const FACILITIES = {ticket:{name:'매표소',icon:'ticket'}, cargo:{name:'화물장',icon:'box'}};
const CARD_KEYS = Object.keys(TYPES);
const TRAIN_STATES = ['scheduled','queued','arriving','docked','departing','gone'];
const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
const int = (n,a,b) => Number.isInteger(n) && n>=a && n<=b;
export function schedule(day) {
  return [0,29,58,87,116,143].map((at,i) => {
    const passenger=i%2===0, resource=passenger?'passenger':i===3?'food':'wood';
    const amount=(passenger ? 4+Math.floor(i/2) : i===1?3:4)+day-1;
    return {id:`${day}-${i}`,name:passenger?`새들호 ${101+i+day*10}`:`들녘화물 ${201+i+day*10}`,
      type:passenger?'passenger':'freight',resource,wants:TYPES[resource].result,amount,loaded:0,
      at,state:'scheduled',lane:-1,motion:0,waited:0,remaining:0,stocked:false,settled:false};
  });
}
export class Game {
  constructor() {
    this.day=1; this.time=0; this.money=140; this.reputation=85; this.earned=0; this.served=0;
    this.departures=0; this.fullTrains=0; this.paused=true; this.speed=1; this.ended=null; this.dayEnded=false;
    this.platformCount=1; this.workLevel=1; this.patienceLevel=0;
    this.workers=[null,null,null];
    this.hand=Object.fromEntries(CARD_KEYS.map(k=>[k,0]));
    this.hand.wood=2; this.hand.food=1;
    this.facilities={ticket:{queue:[],progress:0},cargo:{queue:[],progress:0}};
    this.trains=schedule(1); this.events=[]; this.seq=0;
    this.trains[0].state='docked'; this.trains[0].lane=0; this.trains[0].remaining=67;
    this.stock(this.trains[0]);
    this.log('첫 열차가 도착했습니다. 직원과 환승객을 매표소에 쌓아 주세요.');
  }
  log(text) {this.events.unshift({id:++this.seq,text});this.events=this.events.slice(0,12);}
  get stored() {return Object.values(this.hand).reduce((a,b)=>a+b,0)+Object.values(this.facilities).reduce((n,f)=>n+f.queue.length,0);}
  get capacity() {return 42+(this.platformCount-1)*18;}
  get wage() {return this.workers.length*12+14;}
  get active() {return this.trains.filter(t=>['arriving','docked','departing'].includes(t.state));}
  get upcoming() {return this.trains.filter(t=>['scheduled','queued'].includes(t.state));}
  get rates() {return 1+(this.workLevel-1)*0.3;}
  staff(id) {return this.workers.filter(w=>w===id).length;}
  stock(t) {
    if(t.stocked)return;
    const received=Math.min(t.amount,Math.max(0,this.capacity-this.stored));
    this.hand[t.resource]+=received;t.stocked=true;
    if(received<t.amount){this.reputation=clamp(this.reputation-5,0,100);this.log('대기 공간 부족으로 일부 일감을 받지 못했습니다.');}
  }
  assign(worker,facility) {
    if(this.ended||!int(worker,0,this.workers.length-1)||!(facility===null||FACILITIES[facility]))return false;
    this.workers[worker]=facility;return true;
  }
  stack(kind,facility) {
    if(this.ended||!TYPES[kind]||TYPES[kind].facility!==facility||!this.hand[kind])return false;
    const f=this.facilities[facility], n=Math.min(this.hand[kind],18-f.queue.length);
    if(n<=0)return false;
    this.hand[kind]-=n;f.queue.push(...Array(n).fill(kind));
    this.log(`${TYPES[kind].name} ${n}개 묶음을 ${FACILITIES[facility].name}에 올렸습니다.`);return true;
  }
  returnQueue(facility) {
    const f=this.facilities[facility];if(!f||this.ended)return false;
    for(const k of f.queue)this.hand[k]++;
    f.queue=[];f.progress=0;return true;
  }
  load(id,kind=null) {
    const t=this.trains.find(x=>x.id===id);
    if(this.ended||!t||t.state!=='docked'||(kind&&kind!==t.wants))return 0;
    const n=Math.min(this.hand[t.wants],t.amount-t.loaded);
    if(n<=0)return 0;
    this.hand[t.wants]-=n;t.loaded+=n;
    this.log(`${t.name}에 ${TYPES[t.wants].name} ${n}${t.type==='passenger'?'명':'개'}을 실었습니다.`);return n;
  }
  depart(id,automatic=false) {
    const t=this.trains.find(x=>x.id===id);
    if(this.ended||!t||t.state!=='docked'||t.settled)return false;
    const full=t.loaded>=t.amount, reward=t.loaded*TYPES[t.wants].value+(full?35:0);
    t.settled=true;t.state='departing';t.motion=0;
    this.money+=reward;this.earned+=reward;this.served+=t.loaded;this.departures++;
    if(full){this.fullTrains++;this.reputation=clamp(this.reputation+4,0,100);}
    else this.reputation=clamp(this.reputation-Math.ceil((t.amount-t.loaded)/t.amount*12),0,100);
    this.log(`${t.name} ${automatic?'시간 만료로 ':''}출발 · +${reward}G${full?' · 완적 보너스 포함':' · 미처리로 평판 하락'}`);
    if(this.reputation<=0)this.finish(false,'평판이 모두 소진되었습니다.');
    return true;
  }
  price(upgrade) {
    return {platform:this.platformCount>=2?Infinity:180,hire:this.workers.length>=6?Infinity:90+(this.workers.length-3)*40,
      speed:this.workLevel>=3?Infinity:130+(this.workLevel-1)*80,patience:this.patienceLevel>=2?Infinity:100+this.patienceLevel*70}[upgrade]??Infinity;
  }
  buy(upgrade) {
    const cost=this.price(upgrade);if(this.ended||!Number.isFinite(cost)||this.money<cost)return false;
    this.money-=cost;
    if(upgrade==='platform')this.platformCount++;
    if(upgrade==='hire')this.workers.push(null);
    if(upgrade==='speed')this.workLevel++;
    if(upgrade==='patience'){
      this.patienceLevel++;
      for(const t of this.trains)if(t.state==='docked')t.remaining+=15;
    }
    this.log(`${{platform:'2번 승강장 개통',hire:'직원 채용',speed:'작업 도구 개선',patience:'대합실 확장'}[upgrade]} · -${cost}G`);return true;
  }
  finish(win,reason) {this.ended={win,reason};this.paused=true;}
  step(dt) {
    if(this.paused||this.ended||this.dayEnded||!Number.isFinite(dt)||dt<=0)return;
    // Fixed-size substeps preserve simulation results under fast-forward and slow frames.
    let left=Math.min(dt,3600);
    while(left>0&&!this.paused&&!this.ended&&!this.dayEnded){const h=Math.min(left,0.1);this.tick(h);left-=h;}
  }
  tick(dt) {
    this.time=Math.min(DAY_LENGTH,this.time+dt);
    for(const [id,f] of Object.entries(this.facilities)) {
      if(!f.queue.length){f.progress=0;continue;}
      f.progress+=dt*this.staff(id)*this.rates;
      while(f.queue.length && f.progress+1e-8>=TYPES[f.queue[0]].duration){
        const k=f.queue.shift();f.progress-=TYPES[k].duration;this.hand[TYPES[k].result]++;
      }
      if(!f.queue.length)f.progress=0;
    }
    for(const t of this.trains) {
      if(t.state==='scheduled'&&this.time>=t.at){t.state='queued';this.stock(t);this.log(`${t.name} 진입 요청 · ${TYPES[t.wants].name} ${t.amount}`);}
      if(t.state==='queued'){
        const lane=Array.from({length:this.platformCount},(_,i)=>i).find(i=>!this.active.some(a=>a.lane===i));
        if(lane!==undefined){t.lane=lane;t.state='arriving';t.motion=0;}
        else {t.waited+=dt;if(t.waited>48){t.state='gone';this.reputation=clamp(this.reputation-10,0,100);this.log(`${t.name} 선로 대기 초과 · 평판 -10`);}}
      } else if(t.state==='arriving'){
        t.motion+=dt;if(t.motion>=3){t.state='docked';t.motion=0;t.remaining=67-(this.day-1)*4+this.patienceLevel*15;}
      } else if(t.state==='docked'){
        t.remaining=Math.max(0,t.remaining-dt);if(t.remaining<=0)this.depart(t.id,true);
      } else if(t.state==='departing'){
        t.motion+=dt;if(t.motion>=3.8){t.state='gone';t.lane=-1;}
      }
    }
    if(this.reputation<=0&&!this.ended)this.finish(false,'열차 지연으로 역의 평판이 모두 소진되었습니다.');
    // The shift closes only after every train has cleared the station.
    if(this.time>=DAY_LENGTH && this.trains.every(t=>t.state==='gone')&&!this.ended){
      this.money-=this.wage;this.dayEnded=true;this.paused=true;this.log(`${this.day}일차 마감 · 운영비 -${this.wage}G`);
      if(this.money<0)this.finish(false,'운영비를 지불할 자금이 부족합니다.');
      else if(this.day>=3)this.finish(this.earned>=TARGET&&this.reputation>=40,
        this.earned>=TARGET&&this.reputation>=40?'3일 운영 목표를 달성했습니다.':'3일 목표: 누적 운송 수익 1,400G / 평판 40 이상');
    }
  }
  nextDay() {
    if(!this.dayEnded||this.ended)return false;
    this.day++;this.time=0;this.trains=schedule(this.day);this.dayEnded=false;this.paused=false;
    this.log(`${this.day}일차 시작 · 더 많은 승객과 화물이 찾아옵니다.`);return true;
  }
  snapshot() {
    const {day,time,money,reputation,earned,served,departures,fullTrains,paused,speed,ended,dayEnded,platformCount,workLevel,patienceLevel,workers,hand,facilities,trains,events,seq}=this;
    return JSON.parse(JSON.stringify({version:VERSION,day,time,money,reputation,earned,served,departures,fullTrains,paused,speed,ended,dayEnded,platformCount,workLevel,patienceLevel,workers,hand,facilities,trains,events,seq}));
  }
  static restore(d) {
    if(!d||d.version!==VERSION||!int(d.day,1,3)||!Number.isFinite(d.time)||d.time<0||d.time>DAY_LENGTH)throw Error('저장 버전 또는 날짜가 올바르지 않습니다.');
    for(const k of ['money','reputation','earned','served','departures','fullTrains','seq'])if(!Number.isFinite(d[k])||Math.abs(d[k])>1e7)throw Error('저장 수치 오류');
    if(!int(d.platformCount,1,2)||!int(d.workLevel,1,3)||!int(d.patienceLevel,0,2)||![1,2,3].includes(d.speed)||typeof d.dayEnded!=='boolean')throw Error('저장 확장 오류');
    if(!Array.isArray(d.workers)||d.workers.length<3||d.workers.length>6||d.workers.some(x=>x!==null&&!Object.hasOwn(FACILITIES,x)))throw Error('저장 직원 오류');
    for(const k of CARD_KEYS)if(!int(d.hand?.[k],0,1000))throw Error('저장 카드 오류');
    for(const id of Object.keys(FACILITIES)){
      const f=d.facilities?.[id];if(!f||!Array.isArray(f.queue)||f.queue.length>18||f.queue.some(k=>TYPES[k]?.facility!==id)||!Number.isFinite(f.progress)||f.progress<0||f.progress>100)throw Error('저장 시설 오류');
    }
    if(!Array.isArray(d.trains)||d.trains.length!==6)throw Error('저장 열차 오류');
    const expected=schedule(d.day),lanes=new Set();
    for(let i=0;i<6;i++){
      const t=d.trains[i],e=expected[i];
      for(const key of ['id','name','type','resource','wants','amount','at'])if(t[key]!==e[key])throw Error('저장 시간표 오류');
      if(!TRAIN_STATES.includes(t.state)||!int(t.loaded,0,t.amount)||!int(t.lane,-1,d.platformCount-1)||typeof t.stocked!=='boolean'||typeof t.settled!=='boolean')throw Error('저장 열차 상태 오류');
      for(const key of ['motion','waited','remaining'])if(!Number.isFinite(t[key])||t[key]<0||t[key]>1000)throw Error('저장 타이머 오류');
      if(['arriving','docked','departing'].includes(t.state)){if(t.lane<0||lanes.has(t.lane))throw Error('중복 승강장');lanes.add(t.lane);}
    }
    if(d.ended!==null&&(!d.ended||typeof d.ended.win!=='boolean'||typeof d.ended.reason!=='string'))throw Error('저장 결과 오류');
    const g=new Game();
    for(const k of Object.keys(g.snapshot()))if(k!=='version'&&k!=='events')g[k]=JSON.parse(JSON.stringify(d[k]));
    g.events=Array.isArray(d.events)?d.events.filter(e=>int(e.id,0,1e7)&&typeof e.text==='string').slice(0,12):[];
    g.paused=true;return g;
  }
}
