/* 공통 UI: 아이콘 · 토스트 · 바텀 시트(안드로이드 뒤로 가기 대응) */
import { $ } from '../util.js';

export const IC={
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  down:'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="m3 4.5 3 3 3-3"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m15 5-7 7 7 7"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m9 5 7 7-7 7"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m9 5 7 7-7 7"/></svg>',
  plus:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
  shuffle:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.6 0 2.7-1.6 3.6-3.5M14 10c.8-1.7 1.6-3 2.5-3H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/></svg>',
  grip:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 8h14M5 12h14M5 16h14"/></svg>',
  x:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m6 6 12 12M18 6 6 18"/></svg>',
};

/* 토스트 (선택적 실행 취소 버튼) */
let tt;
export function toast(msg,{action,onAction,ms=2600}={}){
  const t=$('#toast');
  t.innerHTML=''; const s=document.createElement('span'); s.textContent=msg; t.appendChild(s);
  if(action){ const b=document.createElement('button'); b.className='toast-act'; b.textContent=action; b.onclick=()=>{ t.classList.remove('on'); onAction?.(); }; t.appendChild(b); ms=Math.max(ms,4500); }
  t.classList.toggle('has-act',!!action);
  t.classList.add('on'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('on'),ms);
}

/* 바텀 시트 */
let onClose=null, lastFocus=null;
export const sheetOpen=()=>$('#sheet').classList.contains('on');
export function openSheet(html,{keepScroll=false,closeCb}={}){
  const sh=$('#sheet'), was=sheetOpen(), sc=keepScroll? sh.querySelector('.sheet-b')?.scrollTop||0 : 0;
  sh.innerHTML=`<div class="grab"><i></i></div>`+html;
  if(keepScroll && sh.querySelector('.sheet-b')) sh.querySelector('.sheet-b').scrollTop=sc;
  if(closeCb!==undefined) onClose=closeCb;
  if(!was){
    lastFocus=document.activeElement;
    sh.classList.add('on'); $('#scrim').classList.add('on'); $('#app').classList.add('sheet-open');
    history.pushState({sheet:1},'');
    requestAnimationFrame(()=>sh.querySelector('h2')?.focus?.({preventScroll:true}));
  }
}
function hide(){
  $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on'); $('#app').classList.remove('sheet-open');
  const cb=onClose; onClose=null; cb?.();
  lastFocus?.focus?.({preventScroll:true});
}
export function closeSheet(){
  if(!sheetOpen()) return;
  if(history.state?.sheet) history.back(); else hide();
}
window.addEventListener('popstate',()=>{ if(sheetOpen()) hide(); });
