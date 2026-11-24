/* WARDROBE — 앱 진입점: 부팅 · 이벤트 위임 · 순서 편집 드래그 · PWA */
import * as store from './store.js';
import { S, byId, recordOn, stats } from './store.js';
import { CATS, SLOTS, PALETTE, isCardigan } from './const.js';
import { recommend } from './recommend.js';
import { prepPhoto } from './image.js';
import { makeBackup, saveFile, parseBackup, parseBackupText, applyBackup } from './backup.js';
import { $, today, fmtMD, pad, isHex } from './util.js';
import { toast, closeSheet, sheetOpen } from './ui/common.js';
import { renderWardrobe, renderList } from './ui/wardrobe.js';
import { renderCoord } from './ui/coord.js';
import { renderLog } from './ui/log.js';
import { sheetDetail, sheetForm, drawForm, sheetSettings, syncBlock, form, STEP } from './ui/sheets.js';
import * as gsync from './sync.js';

const U=S.ui;
let installEvt=null, pendingRestore=null, lastDay=today();

function renderTabs(){
  document.querySelectorAll('.tab').forEach(b=>{ if(b.dataset.tab===U.tab) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  for(const v of ['wardrobe','coord','log']) $('#v-'+v).hidden = v!==U.tab;
}
function renderAll(){ renderTabs(); renderWardrobe(); renderCoord(); renderLog(); }
const keepY=fn=>{ const y=$('#main').scrollTop; fn(); $('#main').scrollTop=y; };
const fail=e=>{ console.error(e); toast(e?.message||'저장하지 못했습니다. 다시 시도해 주세요'); };

/* 날짜가 바뀐 뒤 앱으로 돌아오면 오늘 기준으로 다시 그림 */
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible' || S.firstRun) return;
  const t=today(); if(t===lastDay) return;
  if(U.day===lastDay) U.day=t; if(U.month===lastDay.slice(0,7)) U.month=t.slice(0,7);
  lastDay=t; store.touch(); renderAll();
});

/* ---------- 구글 드라이브 동기화 ---------- */
let SY={state:null,busy:false,conflict:null,error:null};
const syncOpt=()=>({configured:gsync.configured(), embedded:gsync.embedded(), state:SY.state, pending:gsync.pending(), busy:SY.busy, conflict:SY.conflict, error:SY.error, localAt:S.localUpdatedAt});
function openSettings(extra={}){ gsync.preload(); sheetSettings({canInstall:!!installEvt, sync:syncOpt(), ...extra}); }
function refreshSync(){
  const el=$('#sync-sec'); if(el && sheetOpen()) el.innerHTML='<h3>구글 드라이브 동기화</h3>'+syncBlock(syncOpt());
  $('.top .icon-btn')?.classList.toggle('dot', !!SY.state && (gsync.pending() || !!SY.conflict));
}
async function doSync({interactive=false, force}={}){
  if(SY.busy) return;
  SY.busy=true; refreshSync();
  try{
    const r=await gsync.sync({interactive, force});
    SY.state=await gsync.syncState(); SY.error=null;
    if(r.action==='conflict'){ SY.conflict=r.remote; if(interactive) toast('양쪽 모두 바뀌었습니다 · 남길 쪽을 골라 주세요'); else toast('동기화 확인이 필요합니다',{action:'열기',onAction:()=>openSettings()}); }
    else { SY.conflict=null; }
    if(r.action==='down'){ resetSel(); U.month=today().slice(0,7); U.day=today(); renderAll(); toast(`드라이브에서 불러왔습니다 · 의류 ${r.counts.count}벌 · 기록 ${r.counts.records}일`); }
    if(r.action==='up' && interactive) toast('드라이브에 저장했습니다');
    if(r.action==='none' && interactive) toast('이미 최신 상태입니다');
    if(r.needLogin && interactive) toast('구글 연결이 필요합니다');
  }catch(e){ SY.state=await gsync.syncState(); if(!e.auth) SY.error={msg:e?.message||'동기화하지 못했습니다', detail:e?.detail||''}; if(interactive || !e.auth) fail(e); }
  finally{ SY.busy=false; refreshSync(); }
}
let syncT=0;
store.hooks.onChange=()=>{ refreshSync(); clearTimeout(syncT); if(SY.state?.auto!==false && SY.state && gsync.hasToken()) syncT=setTimeout(()=>doSync(),4000); };
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && SY.state?.auto!==false && SY.state && gsync.hasToken()) doSync(); });

let bkCache=null;
function prepBackup(){ bkCache=null; makeBackup().then(b=>{ bkCache=b; }).catch(()=>{}); }
function resetSel(){ U.recIdx=0; U.sel={}; U.lock={}; }
/* 사용자가 고른 분류(lock)는 두고, 나머지 분류를 그 옷에 맞춰 추천으로 채운다 */
function fillRest(idx=0){
  const r=recommend(idx,{...U.lock});
  for(const k of SLOTS) if(!(k in U.lock)){ if(r.sel[k]) U.sel[k]=r.sel[k]; else delete U.sel[k]; }
  return r;
}
const lockAll=()=>{ U.lock={}; for(const k of SLOTS) U.lock[k]=U.sel[k]||null; };
/* 예전 기록처럼 가디건이 아우터 칸에 있으면 가디건 칸으로 옮긴다 */
const normSel=sel=>{ const s={...sel}; for(const k of SLOTS) if(!byId(s[k])) delete s[k]; if(s.outer&&!s.mid&&isCardigan(byId(s.outer))){ s.mid=s.outer; delete s.outer; } return s; };

/* ---------- 클릭 ---------- */
document.addEventListener('click',async e=>{
  const b=e.target.closest('button'); if(!b || b.disabled) return;
  const d=b.dataset, act=d.act;
  try{
  if(d.tab){ U.tab=d.tab; if(sheetOpen()) closeSheet(); renderTabs(); if(U.tab==='coord') renderCoord(); $('#main').scrollTop=0; return; }
  if(d.cat && !act){ U.cat=d.cat; renderWardrobe(); return; }
  if(d.pick!==undefined){
    let k=d.pick;
    if(k==='outer' && !d.id){ delete U.sel.outer; delete U.sel.mid; U.lock.outer=null; U.lock.mid=null; }
    else if(k==='outer' && isCardigan(byId(d.id))){ // 가디건: 패딩·코트와 함께 고를 수 있고, 다시 누르면 해제
      if(U.sel.mid===d.id){ delete U.sel.mid; U.lock.mid=null; } else { U.sel.mid=d.id; U.lock.mid=d.id; }
    } else { if(d.id) U.sel[k]=d.id; else delete U.sel[k]; U.lock[k]=d.id||null; }
    U.recIdx=0; fillRest(0); keepY(renderCoord); return; }
  if(d.day){ U.day=d.day; U.delAsk=false; renderLog(); return; }
  if(d.month){ const [y,m]=U.month.split('-').map(Number); const n=new Date(y,m-1+Number(d.month),1); U.month=`${n.getFullYear()}-${pad(n.getMonth()+1)}`; U.day=U.month===today().slice(0,7)?today():U.month+'-01'; U.delAsk=false; renderLog(); return; }
  if(form){
    if(d.fCat){ syncForm(); form.cat=d.fCat; const s=store.subsOf(d.fCat)[0]; form.sub=s.name; form.t=s.t; form.addSub=null; drawForm(); return; }
    if(d.fSub){ syncForm(); const s=store.subsOf(form.cat).find(x=>x.name===d.fSub); form.sub=s.name; form.t=s.t; drawForm(); return; }
    if(d.fShape){ syncForm(); form.t=d.fShape; drawForm(); return; }
    if(d.subShape){ syncForm(); form.addSub.t=d.subShape; drawForm(); return; }
    if(d.fColor){ syncForm(); form.color=d.fColor; form.colorName=d.n; drawForm(); return; }
    if(d.step){ syncForm(); const [a,z]=STEP[d.step]; form[d.step]=Math.max(a,Math.min(z,form[d.step]+Number(d.d))); if(d.step==='base'&&form.baseSince>form.base) form.baseSince=form.base; if(d.step==='baseSince'&&form.baseSince>form.base) form.base=form.baseSince; drawForm(); return; }
  }
  switch(act){
    case 'close': closeSheet(); break;
    case 'settings': pendingRestore=null; openSettings({}); storageInfo(); prepBackup(); break;
    case 'sync-connect': SY.state=null; await doSync({interactive:true}); break;
    case 'sync-now': await doSync({interactive:true}); break;
    case 'sync-up': await doSync({interactive:true,force:'up'}); break;
    case 'sync-down': await doSync({interactive:true,force:'down'}); break;
    case 'sync-auto': await gsync.setAuto(SY.state?.auto===false); SY.state=await gsync.syncState(); refreshSync(); break;
    case 'sync-off': await gsync.disconnect(); SY={state:null,busy:false,conflict:null,error:null}; refreshSync(); toast('구글 연결을 해제했습니다'); break;
    case 'backup-copy': {
      // 클립보드 쓰기는 클릭 직후(await 전)에 호출해야 허용되는 환경이 있어 미리 만든 내용을 쓴다
      const ready=bkCache;
      const run = ready? Promise.resolve(ready) : makeBackup();
      const copy = ready && navigator.clipboard?.writeText ? navigator.clipboard.writeText(ready.text) : Promise.reject();
      const bk=await run;
      try{ await copy; toast(`백업 내용을 복사했습니다 · 의류 ${bk.count}벌 · 사진 ${bk.photos}장 · 기록 ${bk.records}일`); }
      catch(_){ openSettings({copyText:bk.text}); const t=$('#copy-box'); t?.focus(); t?.select(); }
      break; }
    case 'paste-open': pendingRestore=null; openSettings({paste:true}); $('#paste-box')?.focus(); break;
    case 'paste-load': { const v=$('#paste-box')?.value; pendingRestore=await parseBackupText(v); openSettings({restore:pendingRestore}); break; }
    case 'ask-reset': openSettings({reset:true}); break;
    case 'reset': await store.resetAll(); await gsync.forget(); SY.state=await gsync.syncState(); closeSheet(); U.recIdx=0; renderAll(); toast('모든 데이터가 초기화되었습니다'); break;
    case 'load-seed': { const n=await store.loadSeed(); resetSel(); if(sheetOpen()) closeSheet(); U.cat='all'; renderAll(); toast(`기본 옷 ${n}벌을 불러왔습니다`); break; }
    case 'backup': { toast('백업 파일을 만드는 중…'); const bk=await makeBackup(); await saveFile(bk); toast(window.self!==window.top?'파일 저장이 막힌 화면이면 ‘백업 내용 복사’를 이용하세요':`백업 완료 · 의류 ${bk.count}벌 · 사진 ${bk.photos}장 · 기록 ${bk.records}일`); break; }
    case 'restore-yes': { if(!pendingRestore) break; await applyBackup(pendingRestore); pendingRestore=null; closeSheet(); resetSel(); U.cat='all'; U.month=today().slice(0,7); U.day=today(); renderAll(); toast('백업 파일로 복원했습니다'); break; }
    case 'install': if(installEvt){ installEvt.prompt(); await installEvt.userChoice; installEvt=null; $('#install-sec')?.setAttribute('hidden',''); } break;
    case 'sub-del': await store.removeSub(d.cat,d.name); openSettings({}); toast('세부 유형을 삭제했습니다'); break;

    case 'start-seed': case 'start-empty': await store.initialize(act==='start-seed'); $('#app').classList.remove('welcome'); resetSel(); renderAll(); toast(act==='start-seed'?'기본 옷 34벌로 시작합니다':'빈 옷장으로 시작합니다. 등록 버튼으로 옷을 추가하세요'); break;
    case 'onlywash': U.onlyWash=!U.onlyWash; renderWardrobe(); break;
    case 'reorder': U.reorder=true; U.q=''; renderWardrobe(); break;
    case 'reorder-done': U.reorder=false; renderWardrobe(); renderCoord(); toast('나의 정렬순을 저장했습니다'); break;

    case 'add': sheetForm(null); break;
    case 'detail': sheetDetail(d.id); break;
    case 'ask-del': sheetDetail(d.id,true); break;
    case 'del-item': await store.deleteItem(d.id); closeSheet(); renderAll(); toast('의류를 삭제했습니다'); break;
    case 'edit': sheetForm(d.id); break;
    case 'washed': { const id=d.id, prev=await store.washItem(id); renderAll(); sheetDetail(id);
      toast('세탁 완료 · 세탁 후 착장 0회부터 다시 집계합니다',{action:'실행 취소',onAction:async()=>{ await store.undoWash(id,prev); renderAll(); if(sheetOpen()) sheetDetail(id); }}); break; }
    case 'clear-photo': if(form.previewUrl) URL.revokeObjectURL(form.previewUrl); form.previewUrl=null; form.photoBlob=null; form.noAlpha=false; syncForm(); drawForm(); break;
    case 'wash-none': syncForm(); if(form.wash){ form._lastWash=form.wash; form.wash=0; } else form.wash=form._lastWash||5; drawForm(); break;
    case 'sub-add': syncForm(); form.addSub = form.addSub? null : {name:'', t:form.t}; drawForm(); if(form.addSub) $('#f-subname')?.focus(); break;
    case 'sub-cancel': syncForm(); form.addSub=null; drawForm(); break;
    case 'sub-save': { syncForm(); const {name,t}=form.addSub; await store.addSub(form.cat,name,t); syncForm(); form.sub=name.trim(); form.t=t; form.addSub=null; drawForm(); toast(`세부 유형 ‘${name.trim()}’을(를) 추가했습니다`); break; }
    case 'save': {
      syncForm();
      if(form.busy){ toast('사진을 처리하는 중입니다. 잠시 후 다시 눌러 주세요'); return; }
      if(!form.name){ $('#f-name').focus(); toast('제품명을 입력해 주세요'); return; }
      if(!form.colorName){ $('#f-cname').focus(); toast('컬러 이름을 입력해 주세요'); return; }
      const {photoBlob,previewUrl,addSub,noAlpha,_photoUrl,busy,_lastWash,...data}=form;
      const isNew=!form.id;
      await store.saveItem(data, photoBlob);
      closeSheet();
      renderAll(); toast(isNew?'옷장에 등록했습니다':'수정했습니다'); break;
    }

    case 'rec-all': { U.lock={}; U.recIdx=0; const r=fillRest(0); renderCoord(); $('#main').scrollTop=0; toast(r.count?'세탁 주기 · 최근 코디 · 컬러 조합으로 오늘의 코디를 골랐습니다':'추천할 수 있는 옷이 없습니다 · 세탁 권장 상태를 확인해 주세요'); break; }
    case 'recommend': {
      if(CATS.every(k=>k in U.lock || (k==='outer' && 'mid' in U.lock))){ toast('모든 분류를 직접 골랐습니다 · 초기화하면 다시 추천받을 수 있습니다'); break; }
      const r=fillRest(++U.recIdx); renderCoord(); toast(r.count>1?`다른 추천 ${(U.recIdx%r.count)+1}/${r.count}`:'다른 조합이 없습니다'); break; }
    case 'sel-clear': resetSel(); keepY(renderCoord); break;
    case 'confirm': {
      const date=U.editing||today();
      const replaced=await store.confirmRecord(date,U.sel);
      toast(U.editing? `${fmtMD(date)} 기록을 ${replaced?'수정':'저장'}했습니다` : replaced?'오늘 기록을 교체했습니다 · 중복 집계 없음':'오늘 착장을 확정했습니다 · 착장 횟수 +1');
      U.editing=null; U.month=date.slice(0,7); U.day=date; renderAll(); break;
    }
    case 'cancel-edit': U.editing=null; resetSel(); renderCoord(); break;
    case 'rewear': { const r=recordOn(U.day); U.sel=normSel(r.sel); lockAll(); U.editing=null; U.tab='coord'; renderAll(); $('#main').scrollTop=0; toast('이전 코디를 불러왔습니다. 확정하면 오늘 기록이 됩니다'); break; }
    case 'edit-rec': { const r=recordOn(U.day); U.sel=normSel(r.sel); lockAll(); U.editing=U.day; U.tab='coord'; renderAll(); $('#main').scrollTop=0; break; }
    case 'add-rec': U.editing=U.day===today()?null:U.day; if(U.editing) resetSel(); U.tab='coord'; renderAll(); $('#main').scrollTop=0; break;
    case 'month-today': U.month=today().slice(0,7); U.day=today(); U.delAsk=false; renderLog(); break;
    case 'del-rec': U.delAsk=true; renderLog(); break;
    case 'del-no': U.delAsk=false; renderLog(); break;
    case 'del-yes': await store.deleteRecord(U.day); U.delAsk=false; renderAll(); toast('기록을 삭제하고 착장 횟수를 다시 계산했습니다'); break;
  }
  }catch(err){ fail(err); }
});

function syncForm(){
  if(!form) return;
  const v=id=>$('#'+id)?.value;
  if(v('f-name')!==undefined) form.name=v('f-name').trim();
  if(v('f-brand')!==undefined) form.brand=v('f-brand').trim();
  if(v('f-cname')!==undefined) form.colorName=v('f-cname').trim();
  if(form.addSub && v('f-subname')!==undefined) form.addSub.name=v('f-subname');
}

$('#scrim').addEventListener('click',()=>closeSheet());

/* ---------- 입력 ---------- */
document.addEventListener('input',e=>{
  if(e.target.id==='q'){ U.q=e.target.value; renderList(); }
});
const PAL_NAMES=new Set(PALETTE.map(([n])=>n));
document.addEventListener('keydown',e=>{
  if(e.key==='Enter' && e.target.id==='f-subname'){ e.preventDefault(); $('[data-act="sub-save"]')?.click(); }
  if(e.key==='Escape' && sheetOpen()) closeSheet();
});
document.addEventListener('change',async e=>{
  try{
  if(e.target.id==='f-hex' && form && isHex(e.target.value)){ syncForm(); form.color=e.target.value; if(PAL_NAMES.has(form.colorName)) form.colorName='사용자 컬러'; drawForm(); }
  if(e.target.id==='sort'){ await store.setPref('sort',e.target.value); U.reorder=false; renderWardrobe(); }
  if(e.target.id==='f-photo' && e.target.files[0] && form){
    syncForm(); toast('사진을 처리하는 중…');
    const f=form; f.busy=true;
    let out; try{ out=await prepPhoto(e.target.files[0]); } finally{ f.busy=false; e.target.value=''; }
    if(form!==f) return;
    const {blob,alpha}=out;
    if(form.previewUrl) URL.revokeObjectURL(form.previewUrl);
    form.photoBlob=blob; form.previewUrl=URL.createObjectURL(blob); form.noAlpha=!alpha; drawForm();
    toast(alpha?'배경이 제거된 사진을 확인했습니다':'배경이 있는 사진입니다 · 배경 제거 PNG를 권장합니다');
  }
  if(e.target.id==='restore' && e.target.files[0]){
    const f=e.target.files[0]; e.target.value='';
    pendingRestore=await parseBackup(f);
    openSettings({restore:pendingRestore});
  }
  }catch(err){ fail(err); if(e.target.type==='file') e.target.value=''; }
});

/* ---------- 나의 정렬순: 핸들 드래그 (같은 분류 안에서만 이동) ---------- */
let drag=null;
const sib=(row,dir)=>{let n=dir<0?row.previousElementSibling:row.nextElementSibling;return n&&n.classList.contains('row')&&n.dataset.cat===row.dataset.cat?n:null;};
function persistOrder(cat){
  const ids=[...document.querySelectorAll(`#list .row[data-cat="${cat}"]`)].map(r=>r.dataset.id);
  store.saveOrder(ids).catch(fail);
}
let autoScroll=0;
document.addEventListener('pointerdown',e=>{
  const h=e.target.closest('.handle'); if(!h) return;
  e.preventDefault(); h.setPointerCapture(e.pointerId);
  const row=h.closest('.row'); row.classList.add('dragging'); drag={row,y0:e.clientY,cy:e.clientY};
  const tick=()=>{ if(!drag) return; const main=$('#main'), m=main.getBoundingClientRect(); let v=0;
    if(drag.cy<m.top+60) v=-8; else if(drag.cy>m.bottom-60) v=8;
    if(v){ const before=main.scrollTop; main.scrollTop+=v; drag.y0-=(main.scrollTop-before); move(); }
    autoScroll=requestAnimationFrame(tick); };
  autoScroll=requestAnimationFrame(tick);
});
function move(){
  const r=drag.row; let dy=drag.cy-drag.y0;
  const n=sib(r,1), p=sib(r,-1);
  if(n && dy>n.offsetHeight/2){ n.after(r); drag.y0+=n.offsetHeight; }
  else if(p && -dy>p.offsetHeight/2){ p.before(r); drag.y0-=p.offsetHeight; }
  r.style.transform=`translateY(${drag.cy-drag.y0}px)`;
}
document.addEventListener('pointermove',e=>{ if(!drag) return; drag.cy=e.clientY; move(); });
function endDrag(){ if(!drag) return; cancelAnimationFrame(autoScroll); const r=drag.row; r.style.transform=''; r.classList.remove('dragging'); persistOrder(r.dataset.cat); drag=null; }
document.addEventListener('pointerup',endDrag); document.addEventListener('pointercancel',endDrag);
document.addEventListener('keydown',e=>{
  const h=e.target.closest&&e.target.closest('.handle'); if(!h||!['ArrowUp','ArrowDown'].includes(e.key)) return;
  e.preventDefault(); const r=h.closest('.row'), t=sib(r,e.key==='ArrowUp'?-1:1); if(!t) return;
  e.key==='ArrowUp'?t.before(r):t.after(r); persistOrder(r.dataset.cat); h.focus();
});

/* ---------- 가로 목록 넘기기: 터치 스와이프 · 마우스 드래그 · 화살표 ----------
   웹뷰·임베드 환경에서 기본 가로 스크롤이 막히는 경우가 있어 직접 처리한다. */
const STRIPS='.strip,.shapes';
let sw=null, swallowClick=false, fling=0;
function swStart(el,x,y){ cancelAnimationFrame(fling); sw={el,x,y,sl:el.scrollLeft,dir:null,lx:x,lt:performance.now(),v:0}; }
function swMove(x,y){
  const dx=x-sw.x, dy=y-sw.y;
  if(!sw.dir){ if(Math.abs(dx)<6&&Math.abs(dy)<6) return false; sw.dir=Math.abs(dx)>Math.abs(dy)?'x':'y'; }
  if(sw.dir!=='x') return false;
  const now=performance.now(), dt=Math.max(1,now-sw.lt); sw.v=(x-sw.lx)/dt; sw.lx=x; sw.lt=now;
  sw.el.scrollLeft=sw.sl-dx; return true;
}
function swEnd(){
  if(!sw) return; const {el,dir}=sw; let v=sw.v; sw=null;
  if(dir!=='x') return;
  swallowClick=true; setTimeout(()=>swallowClick=false,60);
  const step=()=>{ if(Math.abs(v)<.02) return; el.scrollLeft-=v*16; v*=.94; fling=requestAnimationFrame(step); };
  fling=requestAnimationFrame(step);
}
document.addEventListener('touchstart',e=>{ const el=e.target.closest(STRIPS); if(el&&e.touches.length===1) swStart(el,e.touches[0].clientX,e.touches[0].clientY); },{passive:true});
document.addEventListener('touchmove',e=>{ if(sw && swMove(e.touches[0].clientX,e.touches[0].clientY)) e.preventDefault(); },{passive:false});
document.addEventListener('touchend',swEnd); document.addEventListener('touchcancel',swEnd);
document.addEventListener('mousedown',e=>{ const el=e.target.closest(STRIPS); if(el&&e.button===0){ swStart(el,e.clientX,e.clientY); } });
document.addEventListener('mousemove',e=>{ if(sw) swMove(e.clientX,e.clientY); });
document.addEventListener('mouseup',swEnd);
document.addEventListener('click',e=>{ if(swallowClick && e.target.closest(STRIPS)){ e.stopPropagation(); e.preventDefault(); } },true);
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-scroll],[data-scroll-shapes]'); if(!b) return;
  const el=b.dataset.scrollShapes? document.querySelector('#f-shapes') : document.querySelector(`.strip[data-strip="${b.dataset.scroll}"]`); if(!el) return;
  el.scrollBy({left:Number(b.dataset.d||b.dataset.scrollShapes)*el.clientWidth*.8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
});

/* ---------- 저장 공간 ---------- */
async function storageInfo(){
  try{
    const el=$('#storage-info'); if(!el||!navigator.storage?.estimate) return;
    const [{usage},persisted]=await Promise.all([navigator.storage.estimate(), navigator.storage.persisted?.()]);
    const mb=(usage/1048576).toFixed(1);
    el.insertAdjacentHTML('afterbegin',`사용 중 ${mb}MB · ${persisted?'자동 삭제 방지 켜짐':'브라우저 저장 공간이 부족하면 삭제될 수 있으니 정기적으로 백업하세요'}<br>`);
  }catch(_){}
}

/* ---------- PWA ---------- */
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); installEvt=e; $('#install-sec')?.removeAttribute('hidden'); });
window.addEventListener('appinstalled',()=>{ installEvt=null; toast('홈 화면에 설치했습니다'); });
if('serviceWorker' in navigator && location.protocol!=='file:'){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
      // 앱으로 돌아올 때마다 새 버전 확인
      document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') reg.update().catch(()=>{}); });
    }).catch(()=>{});
  });
  // 새 버전이 적용되면 한 번 새로고침 (시트가 열려 있거나 입력 중이면 다음에 화면으로 돌아올 때)
  let hadCtrl=!!navigator.serviceWorker.controller, reloaded=false;
  const reloadNow=()=>{ if(reloaded) return; if(sheetOpen()){ document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') reloadNow(); },{once:true}); return; } reloaded=true; location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(hadCtrl) reloadNow(); hadCtrl=true; });
}

/* ---------- 첫 실행 화면 ---------- */
function renderWelcome(){
  $('#app').classList.add('welcome');
  for(const v of ['wardrobe','coord','log']) $('#v-'+v).hidden = v!=='wardrobe';
  $('#v-wardrobe').innerHTML=`<div class="welcome-b gx">
    <p class="eyebrow">처음 시작하기</p>
    <h1>옷장을 어떻게 시작할까요?</h1>
    <p class="d">데이터는 이 기기에만 저장되며, 다른 사람과 공유되지 않습니다.</p>
    <div class="welcome-r">
      <button class="set-row" data-act="start-empty"><span><div class="t">빈 옷장으로 시작</div><div class="d">내 옷을 하나씩 직접 등록합니다</div></span>${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m9 5 7 7-7 7"/></svg>'}</button>
      <button class="set-row" data-act="start-seed"><span><div class="t">기본 옷 목록으로 시작</div><div class="d">미리 준비된 34벌(아우터 9 · 상의 10 · 하의 9 · 신발 6)을 불러옵니다</div></span>${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m9 5 7 7-7 7"/></svg>'}</button>
    </div>
    <p class="f-hint">나중에 설정에서 기본 목록을 불러오거나 초기화할 수 있습니다.</p>
  </div>`;
}

/* ---------- 부팅 ---------- */
(async function boot(){
  try{
    await store.load();
    navigator.storage?.persist?.().catch(()=>{});
    if(S.firstRun){ renderWelcome(); }
    else { resetSel(); renderAll(); }
    SY.state=await gsync.syncState(); refreshSync();
    if(SY.state && SY.state.auto!==false && gsync.hasToken()) doSync();
    document.documentElement.classList.add('ready');
  }catch(err){
    console.error(err);
    $('#main').innerHTML=`<div class="empty-full gx"><p class="t">저장소를 열 수 없습니다</p><p class="d">${String(err?.message||err)}<br>시크릿 모드에서는 저장이 제한될 수 있습니다. 일반 창에서 다시 열어 주세요.</p></div>`;
  }
})();
