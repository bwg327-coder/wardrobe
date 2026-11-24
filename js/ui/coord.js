/* 데일리 코디 화면 */
import { S, stats, byId, recordOn, selItems } from '../store.js';
import { CAT, CATS } from '../const.js';
import { thumb, outfit } from '../garments.js';
import { esc, $, today, fmtMD, fmtMDW } from '../util.js';
import { IC } from './common.js';

export function renderCoord(){
  const u=S.ui, T=today();
  const isRec=k=>!!u.sel[k] && !(k in u.lock);
  const date=u.editing||T;
  const existing=recordOn(date);
  const cur=selItems(u.sel);
  const picked=Object.values(cur);
  const same = existing && CATS.every(k=>(existing.sel[k]||null)===(cur[k]?.id||null));
  const empty=!picked.length;
  const label = empty ? (u.editing?'추천 코디로 채우기':'오늘의 추천 코디 보기')
    : u.editing ? (existing? (same?'변경 사항 없음':`${fmtMD(date)} 기록 수정 저장`) : `${fmtMD(date)} 착장 기록 저장`)
    : existing ? (same?'오늘 착장 확정됨':'오늘 착장 다시 확정') : '오늘 착장 확정';
  if(!S.items.length){
    $('#v-coord').innerHTML=`<div class="cd-bar gx"><div class="cd-date">${fmtMDW(T)}<span>오늘</span></div></div>
      <div class="empty-full gx"><p class="t">코디할 의류가 없습니다</p><p class="d">옷장에 의류를 등록하면 추천 코디를 만들 수 있습니다.</p>
      <div class="r"><button class="btn btn-dark" data-tab="wardrobe">옷장으로 가기</button></div></div>`;
    return;
  }
  const keep={}; document.querySelectorAll('#v-coord .strip').forEach(st=>keep[st.dataset.strip]=st.scrollLeft);
  $('#v-coord').innerHTML=`
  ${u.editing?`<div class="editing gx"><span>${fmtMDW(u.editing)} 기록 ${existing?'수정':'작성'} 중</span><button data-act="cancel-edit">취소</button></div>`:''}
  <div class="cd-bar gx">
    <div class="cd-date">${fmtMDW(date)}<span>${u.editing?(existing?'기록 수정':'지난 날짜 기록'):'오늘'}</span></div>
    ${empty?'':`<span class="cd-acts"><button class="btn-text" data-act="recommend">${IC.shuffle}다른 추천</button></span>`}
  </div>
  <div class="stage gx">
    <div class="frame" id="frame">${outfit(cur)}</div>
  </div>
  ${CATS.map(k=>{
    const items=S.items.filter(i=>i.cat===k).sort((a,b)=>a.order-b.order); const c=cur[k];
    return `<div class="pick gx">
      <div class="pick-h"><span class="t">${CAT[k]}</span><span class="s">${c?esc(c.name)+' ['+esc(c.colorName)+']':(k in u.lock?'선택 안 함':'-')}</span>
        <span class="pager"><button data-scroll="${k}" data-d="-1" aria-label="${CAT[k]} 이전 목록">${IC.left}</button><button data-scroll="${k}" data-d="1" aria-label="${CAT[k]} 다음 목록">${IC.right}</button></span></div>
      <div class="strip" data-strip="${k}" role="group" aria-label="${CAT[k]} 선택">
        <button class="opt" data-pick="${k}" data-id="" aria-pressed="${!c && (k in u.lock)}"><span class="none">없음</span><span class="lab">생략</span></button>
        ${items.map(i=>{const st=stats(i).state;return `<button class="opt" data-pick="${k}" data-id="${i.id}" aria-pressed="${!!c&&c.id===i.id}" aria-label="${esc(i.name)} ${esc(i.colorName)}${st==='due'?', 세탁 권장':''}">
          <span class="ph">${thumb(i)}</span>${c&&c.id===i.id&&isRec(k)?'<span class="mk">추천</span>':''}${st==='due'?'<span class="mk w">세탁</span>':''}
          <span class="lab">${esc(i.sub)} · ${esc(i.colorName)}</span></button>`;}).join('')}
      </div></div>`;}).join('')}
  <div class="confirm gx${empty?'':' two'}">
    ${empty?'':`<button class="btn btn-line" data-act="sel-clear">초기화</button>`}
    <button class="btn btn-dark" data-act="${empty?'rec-all':'confirm'}"${(!empty&&same)?' disabled':''}>${label}</button>
  </div>`;
  // 다시 그려도 각 가로 목록의 위치를 유지 (순서는 옷장의 나의 정렬순 그대로)
  document.querySelectorAll('#v-coord .strip').forEach(st=>{ const x=keep[st.dataset.strip]; if(x) st.scrollLeft=x; });
}
