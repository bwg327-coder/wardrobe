/* 데일리 코디 화면 */
import { S, stats, byId, recordOn, selItems } from '../store.js';
import { CAT, CATS } from '../const.js';
import { thumb, outfit } from '../garments.js';
import { recommend, describe } from '../recommend.js';
import { esc, $, today, fmtMD, fmtMDW } from '../util.js';
import { IC } from './common.js';

export function renderCoord(){
  const u=S.ui, T=today();
  const rec=recommend(u.recIdx);
  const why=describe(u.sel, rec.sel);
  const date=u.editing||T;
  const existing=recordOn(date);
  const cur=selItems(u.sel);
  const picked=Object.values(cur);
  const dueSel=picked.filter(i=>stats(i).state==='due');
  const same = existing && CATS.every(k=>(existing.sel[k]||null)===(cur[k]?.id||null));
  const label = u.editing ? (existing? (same?'변경 사항 없음':`${fmtMD(date)} 기록 수정 저장`) : `${fmtMD(date)} 착장 기록 저장`)
    : existing ? (same?'오늘 착장 확정됨':'오늘 착장 다시 확정') : '오늘 착장 확정';
  if(!S.items.length){
    $('#v-coord').innerHTML=`<div class="cd-bar gx"><div class="cd-date">${fmtMDW(T)}<span>오늘</span></div></div>
      <div class="empty-full gx"><p class="t">코디할 의류가 없습니다</p><p class="d">옷장에 의류를 등록하면 추천 코디를 만들 수 있습니다.</p>
      <div class="r"><button class="btn btn-dark" data-tab="wardrobe">옷장으로 가기</button></div></div>`;
    return;
  }
  $('#v-coord').innerHTML=`
  ${u.editing?`<div class="editing gx"><span>${fmtMDW(u.editing)} 기록 ${existing?'수정':'작성'} 중</span><button data-act="cancel-edit">취소</button></div>`:''}
  <div class="cd-bar gx">
    <div class="cd-date">${fmtMDW(date)}<span>${u.editing?(existing?'기록 수정':'지난 날짜 기록'):'오늘'}</span></div>
    <button class="btn-text" data-act="recommend">${IC.shuffle}추천 코디</button>
  </div>
  <div class="stage gx">
    <div class="frame" id="frame">${outfit(cur)}</div>
    <div class="frame-cap"><span>착장형 · 고스트 마네킹</span><span>${picked.some(i=>i.hasPhoto)?'사진 레이어 합성':'도식화'}</span></div>
  </div>
  <div class="why gx">
    ${why?`<div class="why-line"><span class="k">컬러</span><span>${esc(why.color)}</span></div>
    <div class="why-line"><span class="k">착장 빈도</span><span>${why.wear}</span></div>
    <div class="why-line"><span class="k">세탁 상태</span><span>${why.wash}</span></div>`
    : `<div class="why-line"><span class="k">안내</span><span>${rec.count?'아래에서 의류를 고르거나 추천 코디를 눌러 보세요':'모든 의류가 세탁 권장 상태라 추천할 조합이 없습니다'}</span></div>`}
    ${dueSel.map(i=>{const s=stats(i);return `<div class="warn"><span><b>세탁 권장</b> · ${esc(i.name)} [${esc(i.colorName)}]은(는) 세탁 후 ${s.since}회 착용해 기준 ${i.wash}회에 도달했습니다.</span></div>`;}).join('')}
  </div>
  ${CATS.map(k=>{
    const items=S.items.filter(i=>i.cat===k).sort((a,b)=>a.order-b.order); const c=cur[k];
    return `<div class="pick gx">
      <div class="pick-h"><span class="t">${CAT[k]}</span><span class="s">${c?esc(c.name)+' ['+esc(c.colorName)+']':'선택 안 함'}</span>${c&&rec.sel[k]===c.id?'<span class="rec">추천</span>':''}
        <span class="pager"><button data-scroll="${k}" data-d="-1" aria-label="${CAT[k]} 이전 목록">${IC.left}</button><button data-scroll="${k}" data-d="1" aria-label="${CAT[k]} 다음 목록">${IC.right}</button></span></div>
      <div class="strip" data-strip="${k}" role="group" aria-label="${CAT[k]} 선택">
        <button class="opt" data-pick="${k}" data-id="" aria-pressed="${!c}"><span class="none">없음</span><span class="lab">생략</span></button>
        ${items.map(i=>{const st=stats(i).state;return `<button class="opt" data-pick="${k}" data-id="${i.id}" aria-pressed="${!!c&&c.id===i.id}" aria-label="${esc(i.name)} ${esc(i.colorName)}${st==='due'?', 세탁 권장':''}">
          <span class="ph">${thumb(i)}</span>${rec.sel[k]===i.id?'<span class="mk">추천</span>':''}${st==='due'?'<span class="mk w">세탁</span>':''}
          <span class="lab">${esc(i.sub)} · ${esc(i.colorName)}</span></button>`;}).join('')}
      </div></div>`;}).join('')}
  <div class="confirm gx">
    <button class="btn btn-dark" data-act="confirm"${(!picked.length||same)?' disabled':''}>${label}</button>
    <div class="sub">${u.editing?'저장하면 이 날짜의 기록이 교체되고 착장 횟수를 다시 계산합니다':'확정 시에만 착장 +1 · 같은 날 재확정해도 중복 집계 없음'}</div>
  </div>`;
}
