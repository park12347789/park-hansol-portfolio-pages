// V4 final integration: load map styling and keep shelter passengers separate from on-foot evacuees.
(function(){const link=document.createElement('link');link.rel='stylesheet';link.href='./v4.css';document.head.appendChild(link);const k=document.querySelector('.keys');if(k)k.innerHTML='<b>W / S</b> 전진·후진 · <b>A / D</b> 차체 선회 · <b>MOUSE</b> 포탑 · <b>LMB</b> 주포 · <b>SPACE</b> 대형 · <b>TAB</b> 작전지도';})();
function secureShelter(s){
  s.state='secured';s.fortified=true;game.rescued+=s.people;toast(`${s.name} 확보`,`생존자 <strong>${s.people}명</strong> 확인 · ${s.method==='bus'?'대형 버스':'수송 트럭'} 대피 준비`);
  for(const x of [-10,-5,0,5,10]){const m=new THREE.Mesh(new THREE.BoxGeometry(3.8,1.4,2),new THREE.MeshStandardMaterial({color:0x867657,roughness:1}));m.position.set(x,1,-15.5);s.group.add(m);}s.evacAt=game.time+5.5;
}
function completeEvacConvoy(c){
  if(c.done)return;c.done=true;c.state='escaped';game.evacuated+=c.passengers;toast('육상 대피 성공',`<strong>${c.passengers}명</strong>이 도시 봉쇄선을 통과했습니다.`);setTimeout(()=>{if(c.group.parent)scene.remove(c.group);},1200);if(c.shelter)c.shelter.state='evacuated';
}
function failEvacConvoy(c){
  if(c.done)return;c.done=true;c.state='destroyed';game.lostCivilians+=c.passengers;toast('대피차량 파괴',`탑승 생존자 <strong>${c.passengers}명</strong>을 잃었습니다.`);const pos=c.group.position.clone();hitFlash(pos,0xff4f37,.7);for(let i=0;i<2;i++){const fire=new THREE.Mesh(new THREE.ConeGeometry(1.4,5,6),new THREE.MeshBasicMaterial({color:i?0xffb243:0xff592f,transparent:true,opacity:.85}));fire.position.copy(pos);fire.position.y=2.5;fire.position.x+=(i-.5)*2;scene.add(fire);game.effects.push({mesh:fire,t:0,d:12,type:'fade'});}game.hordeBurst=(game.hordeBurst||0)+70;if(c.shelter)c.shelter.state='failed';
}
