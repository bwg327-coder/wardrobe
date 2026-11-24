/* 착장 기록 화면 (월간 캘린더) */
import { S, byId, recordOn, selItems } from '../store.js';
import { CAT, CATS } from '../const.js';
import { outfit } from '../garments.js';
import { esc, $, pad, today, fmtMDW, WK } from '../util.js';
import { IC } from './common.js';

export function renderLog(){
  const u=S.ui, T=today();
  const [y,m]=u.month.split('-').map(Number);
  const first=new Date(y,m-1,1), days=new Date(y,m,0).getDate(), lead=first.getDay();
  const recs=S.records.filter(r=>r.date.startsWith(u.month));
  const freq={}; recs.forEach(r=>Object.values(r.sel).forEach(id=>{ if(byId(id)) freq[id]=(freq[id]||0)+1; }));
  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
  const topIt=top&&byId(top[0]);
  let cells='';
  for(let i=0;i<lead;i++) cells+=`<div class="day out"></div>`;
  for(let d=1;d<=days;d++){
    const ds=`${y}-${pad(m)}-${pad(d)}`, r=recs.find(x=>x.date===ds);
    cells+=`<button class="day${ds===T?' today':''}${ds>T?' future':''}" data-day="${ds}" aria-pressed="${u.day===ds}" aria-label="${m}월 ${d}일${r?' 착장 기록 있음':''}"><span class="d">${d}</span>${r?`<span class="mini">${outfit(selItems(r.sel),{mini:true})}</span>`:''}</button>`;
  }
  const tail=(7-(lead+days)%7)%7; for(let i=0;i<tail;i++) cells+=`<div class="day out"></div>`;
  const sel=recordOn(u.day);
  const isNow=u.month===T.slice(0,7);
  $('#v-log').innerHTML=`
  <div class="mon gx"><h2><span class="num">${y}</span>년 <span class="num">${m}</span>월</h2>
    <div class="arrows">${isNow?'':`<button class="btn-text mon-today" data-act="month-today">오늘</button>`}<button data-month="-1" aria-label="이전 달">${IC.left}</button><button data-month="1" aria-label="다음 달">${IC.right}</button></div></div>
  <div class="mon-sum gx">${recs.length? `${recs.length}일 착장 기록${topIt?` · 최다 착용 ${esc(topIt.name)} [${esc(topIt.colorName)}] ${top[1]}회`:''}`:'이 달의 착장 기록이 없습니다'}</div>
  <div class="gx"><div class="wk">${WK.map(w=>`<span>${w}</span>`).join('')}</div><div class="grid">${cells}</div></div>
  <div class="dd gx">
    <div class="dd-h"><h3>${fmtMDW(u.day)}</h3><span>${sel?'착장 기록':''}</span></div>
    ${sel?`<div class="dd-b"><div class="dd-img">${outfit(selItems(sel.sel))}</div>
      <div class="dd-list">${CATS.filter(k=>sel.sel[k]).map(k=>{const i=byId(sel.sel[k]);return `<div class="dd-it"><div class="c">${CAT[k]}</div><div class="n">${i?esc(i.name)+' ['+esc(i.colorName)+']':'<span class="gone">삭제된 의류</span>'}</div></div>`;}).join('')}</div></div>
      <div class="dd-act"><button class="btn btn-dark" data-act="rewear">다시 입기</button><button class="btn btn-line" data-act="edit-rec">수정</button><button class="btn btn-line" data-act="del-rec">삭제</button></div>
      ${u.delAsk?`<div class="confirm-del"><span>이 기록을 삭제하면 포함된 의류의 착장 횟수가 1회씩 줄어듭니다.</span><div class="r"><button class="btn btn-line btn-sm" data-act="del-no">취소</button><button class="btn btn-dark btn-sm" data-act="del-yes">삭제</button></div></div>`:''}`
    :`<div class="dd-none"><span>${u.day>T?'아직 오지 않은 날짜입니다.':'이 날의 착장 기록이 없습니다.'}</span>${u.day<=T&&S.items.length?`<button class="btn btn-line btn-sm" data-act="add-rec">${u.day===T?'오늘 코디 기록하기':'이 날짜에 코디 기록하기'}</button>`:''}</div>`}
  </div>`;
}
