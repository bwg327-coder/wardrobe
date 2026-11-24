/* 바텀 시트: 의류 정보 · 등록/수정 · 설정 */
import { S, stats, byId, subsOf } from '../store.js';
import { CAT, CATS, PALETTE, APP_VERSION } from '../const.js';
import { thumb, drawing, SHAPES } from '../garments.js';
import { esc, fmtMD, fmtMDW, iso, today, isHex } from '../util.js';
import { IC, openSheet } from './common.js';

/* ---------- 의류 정보 ---------- */
export function sheetDetail(id,ask=false){
  const i=byId(id); if(!i) return;
  const s=stats(i), ym=today().slice(0,7);
  const month=s.dates.filter(d=>d.startsWith(ym)).map(d=>+d.slice(8)).reverse();
  openSheet(`<div class="sheet-h gx"><h2 id="sheet-title" tabindex="-1">의류 정보</h2><button class="btn-text" data-act="close">닫기</button></div>
  <div class="sheet-b gx">
    <div class="det-top"><div class="ph">${thumb(i)}</div>
      <div class="info"><div class="meta">${CAT[i.cat]} · ${esc(i.sub)}</div>${i.brand?`<div class="brand">${esc(i.brand)}</div>`:''}<div class="name">${esc(i.name)}</div>
      <div class="color"><i class="sw" style="background:${i.color}"></i>${esc(i.colorName)}</div>
      <div class="det-big"><div><b>${s.total}</b><span>누적 착장</span></div><div><b>${s.since}</b><span>세탁 후 착장</span></div></div>
      ${i.wash?`<div class="bar" aria-hidden="true"><i style="width:${Math.min(100,s.since/i.wash*100)}%"></i></div>`:''}
      <div class="f-hint">${!i.wash?'세탁 기준 없음 · 알림을 표시하지 않습니다':s.state==='due'?'세탁 기준에 도달했습니다':s.state==='soon'?'다음 착용 후 세탁 권장':`세탁까지 ${i.wash-s.since}회 남음`}</div></div></div>
    <dl class="kv" style="margin:0">
      <div><dt>세탁 기준</dt><dd>${i.wash?`${i.wash}회 착용마다`:'지정 안 함'}</dd></div>
      <div><dt>최근 착용</dt><dd>${s.last?fmtMDW(s.last):'기록 없음'}</dd></div>
      <div><dt>최근 세탁</dt><dd>${i.washedAt?fmtMD(iso(new Date(i.washedAt))):'기록 없음'}</dd></div>
      <div><dt>이번 달 착용일</dt><dd class="num">${month.length?month.map(d=>d+'일').join(', '):'-'}</dd></div>
      ${i.base?`<div><dt>등록 전 착장</dt><dd>${i.base}회 포함</dd></div>`:''}
    </dl>
    ${ask?`<div class="confirm-del"><span>삭제해도 지난 착장 기록은 남고, 해당 칸은 ‘삭제된 의류’로 표시됩니다.</span><div class="r"><button class="btn btn-line btn-sm" data-act="detail" data-id="${id}">취소</button><button class="btn btn-dark btn-sm" data-act="del-item" data-id="${id}">삭제</button></div></div>`:''}
    <div class="det-act">
      <button class="btn ${s.since?'btn-dark':'btn-line'} wide" data-act="washed" data-id="${id}"${s.since?'':' disabled'}>세탁 완료</button>
      <button class="btn btn-line" data-act="edit" data-id="${id}">수정</button>
      <button class="btn btn-line" data-act="ask-del" data-id="${id}">삭제</button>
    </div>
  </div>`);
}

/* ---------- 등록 / 수정 ---------- */
export let form=null;
export function sheetForm(id){
  const i=id?byId(id):null;
  form = i? {...i, photoBlob:undefined, previewUrl:null} :
    {id:null,cat:'top',sub:'티셔츠',t:'tee',brand:'',name:'',colorName:'화이트',color:'#f4f3ef',wash:2,base:0,baseSince:0,hasPhoto:false,photoBlob:undefined,previewUrl:null};
  form.addSub=null; form.noAlpha=false;
  drawForm(false);
}
export function closeForm(){ if(form?.previewUrl) URL.revokeObjectURL(form.previewUrl); form=null; }
const stepper=(key,v,min,max,label)=>`<div class="stepper" role="group" aria-label="${label}"><button data-step="${key}" data-d="-1" aria-label="${label} 줄이기"${v<=min?' disabled':''}>−</button><output class="num">${key==='wash'&&!v?'없음':v}</output><button data-step="${key}" data-d="1" aria-label="${label} 늘리기"${v>=max?' disabled':''}>+</button></div>`;
export const STEP={wash:[0,99],base:[0,999],baseSince:[0,999]};
function preview(f){
  if(f.photoBlob===null) return drawing(f);
  if(f.previewUrl) return thumb({...f,_photoUrl:f.previewUrl});
  return thumb(f);
}
export function drawForm(keep=true){
  const f=form; if(!f) return;
  const subs=subsOf(f.cat);
  const inPalette=PALETTE.some(([,h])=>h===f.color);
  const showPhoto = f.photoBlob===null ? false : (f.previewUrl || f.hasPhoto);
  const html=`<div class="sheet-h gx"><h2 id="sheet-title" tabindex="-1">${f.id?'의류 수정':'의류 등록'}</h2><button class="btn-text" data-act="close">취소</button></div>
  <div class="sheet-b gx">
    <div class="f"><span class="lbl">분류</span><div class="chips">${CATS.map(k=>`<button class="chip" data-f-cat="${k}" aria-pressed="${f.cat===k}">${CAT[k]}</button>`).join('')}</div></div>
    <div class="f"><span class="lbl">세부 유형</span><div class="chips">${subs.map(s=>`<button class="chip" data-f-sub="${esc(s.name)}" aria-pressed="${f.sub===s.name}">${esc(s.name)}</button>`).join('')}
      ${subs.some(s=>s.name===f.sub)||!f.sub?'':`<button class="chip" aria-pressed="true" disabled>${esc(f.sub)}</button>`}
      <button class="chip chip-add" data-act="sub-add" aria-expanded="${!!f.addSub}">${IC.plus}직접 추가</button></div>
      ${f.addSub?`<div class="subadd">
        <input id="f-subname" type="text" maxlength="20" placeholder="예) 트렌치 코트" value="${esc(f.addSub.name)}" aria-label="새 세부 유형 이름">
        <div class="f-hint">도식화에 쓸 기본 형태를 고르세요.</div>
        <div class="shapes">${SHAPES[f.cat].map(([t,l])=>`<button class="shape" data-sub-shape="${t}" aria-pressed="${f.addSub.t===t}"><span class="ph">${drawing({...f,t})}</span><span class="lab">${l}</span></button>`).join('')}</div>
        <div class="r"><button class="btn btn-line btn-sm" data-act="sub-cancel">취소</button><button class="btn btn-dark btn-sm" data-act="sub-save">추가</button></div>
      </div>`:''}
    </div>
    <div class="f"><label for="f-brand">브랜드 <span class="opt-l">선택</span></label><input id="f-brand" type="text" maxlength="40" placeholder="예) 유니클로" value="${esc(f.brand||'')}" autocomplete="off"></div>
    <div class="f"><label for="f-name">제품명</label><input id="f-name" type="text" maxlength="60" placeholder="예) 헨리넥 롱슬리브" value="${esc(f.name)}"></div>
    <div class="f"><span class="lbl">컬러</span>
      <div class="swatches">${PALETTE.map(([n,h])=>`<button class="swb" data-f-color="${h}" data-n="${n}" aria-pressed="${f.color===h}"><i style="background:${h}"></i>${n}</button>`).join('')}
        <label class="swb swb-custom" aria-pressed="${!inPalette}"><i style="background:${inPalette?'conic-gradient(#c33,#cc3,#3c3,#3cc,#33c,#c3c,#c33)':f.color}"></i>직접 선택<input id="f-hex" type="color" class="sr" value="${isHex(f.color)?f.color:'#8a8a88'}"></label></div>
      <div class="f-row"><label for="f-cname" class="sr">컬러 이름</label><input id="f-cname" type="text" maxlength="30" value="${esc(f.colorName)}" placeholder="컬러 이름"><span class="f-hint">이름은 자유롭게 바꿀 수 있습니다 (예: 35 브라운)</span></div>
    </div>
    <div class="f"><span class="lbl">사진</span><div class="photo"><div class="ph${showPhoto?' has-photo':''}">${preview(f)}</div>
      <div class="photo-opts"><label class="btn btn-line btn-sm" for="f-photo">${showPhoto?'사진 바꾸기':'사진 선택'}</label><input id="f-photo" type="file" accept="image/png,image/webp,image/jpeg,image/*" class="sr">
      ${showPhoto?`<button class="btn-text" style="height:32px;font-size:12.5px" data-act="clear-photo">사진 지우고 도식화 사용</button>`:''}
      <span>${showPhoto? (f.noAlpha?'배경이 있는 사진입니다. 배경을 제거한 PNG를 쓰면 코디 이미지에 자연스럽게 합성됩니다.':'실제 사진이 목록과 코디 이미지에 표시됩니다.') :'배경을 제거한 PNG를 권장합니다. 사진이 없으면 아래 형태와 컬러로 도식화를 그립니다.'}</span></div></div></div>
    <div class="f"><span class="lbl lbl-pager">도식화 형태<span class="pager"><button data-scroll-shapes="-1" aria-label="이전 형태">${IC.left}</button><button data-scroll-shapes="1" aria-label="다음 형태">${IC.right}</button></span></span><div class="shapes" id="f-shapes">${SHAPES[f.cat].map(([t,l])=>`<button class="shape" data-f-shape="${t}" aria-pressed="${f.t===t}"><span class="ph">${drawing({...f,t})}</span><span class="lab">${l}</span></button>`).join('')}</div></div>
    <div class="f"><span class="lbl">세탁 기준 횟수</span><div class="wash-row">${stepper('wash',f.wash,...STEP.wash,'세탁 기준 횟수')}
      <button class="chip" data-act="wash-none" aria-pressed="${!f.wash}">지정 안 함</button></div>
      <div class="f-hint">${f.wash?`${f.wash}회 착용하면 세탁 권장 알림을 표시합니다.`:'세탁 알림 없이 착장 횟수만 기록합니다. 세탁 필요순에서는 맨 뒤에 놓입니다.'}</div></div>
    <details class="f more"${f.base||f.baseSince?' open':''}><summary>앱 사용 전 착장 횟수</summary>
      <div class="f-2">
        <div><span class="lbl">누적 착장</span>${stepper('base',f.base,...STEP.base,'누적 착장')}</div>
        <div><span class="lbl">마지막 세탁 후</span>${stepper('baseSince',f.baseSince,...STEP.baseSince,'마지막 세탁 후 착장')}</div>
      </div>
      <div class="f-hint">앱에 기록하기 전의 착장 횟수를 더합니다. 세탁 완료를 누르면 ‘마지막 세탁 후’는 0이 됩니다.</div>
    </details>
  </div>
  <div class="sheet-foot gx"><button class="btn btn-dark" data-act="save">${f.id?'수정 완료':'등록하기'}</button></div>`;
  const xs=[...document.querySelectorAll('#sheet .shapes')].map(el=>el.scrollLeft);
  openSheet(html,{keepScroll:keep,closeCb:closeForm});
  if(keep) document.querySelectorAll('#sheet .shapes').forEach((el,i)=>{ if(xs[i]) el.scrollLeft=xs[i]; });
}

/* ---------- 설정 ---------- */
export function sheetSettings(opt={}){
  const custom=S.customSubs;
  openSheet(`<div class="sheet-h gx"><h2 id="sheet-title" tabindex="-1">설정</h2><button class="btn-text" data-act="close">닫기</button></div>
  <div class="sheet-b gx">
    <div class="set-sec"><h3>데이터</h3>
      <button class="set-row" data-act="backup"><span><div class="t">백업 파일 만들기</div><div class="d">의류 · 사진 · 착장 기록 · 설정을 JSON 파일로 저장</div></span>${IC.chev}</button>
      <label class="set-row" for="restore" style="cursor:pointer"><span><div class="t">백업 파일로 복원</div><div class="d">현재 데이터를 백업 파일 내용으로 바꿉니다</div></span>${IC.chev}</label><input id="restore" type="file" accept="application/json,.json" class="sr">
      ${opt.restore?`<div class="confirm-del"><span>백업 파일 확인 · 의류 ${opt.restore.items.length}벌 · 사진 ${opt.restore.photos.length}장 · 착장 기록 ${opt.restore.records.length}일${opt.restore.exportedAt?` · ${esc(new Date(opt.restore.exportedAt).toLocaleString('ko-KR'))} 백업`:''}<br>복원하면 지금 기기에 있는 데이터는 이 내용으로 바뀝니다.</span><div class="r"><button class="btn btn-line btn-sm" data-act="settings">취소</button><button class="btn btn-dark btn-sm" data-act="restore-yes">복원</button></div></div>`:''}
      <button class="set-row" data-act="load-seed"><span><div class="t">기본 옷 목록 불러오기</div><div class="d">처음 제공된 34벌을 옷장에 추가합니다</div></span>${IC.chev}</button>
      <button class="set-row danger" data-act="ask-reset"><span><div class="t">데이터 초기화</div><div class="d">이 기기에 저장된 모든 의류와 기록을 삭제합니다</div></span>${IC.chev}</button>
      ${opt.reset?`<div class="confirm-del"><span>초기화하면 되돌릴 수 없습니다. 먼저 백업 파일을 만들어 두는 것을 권장합니다.</span><div class="r"><button class="btn btn-line btn-sm" data-act="settings">취소</button><button class="btn btn-dark btn-sm" data-act="reset">초기화</button></div></div>`:''}
    </div>
    ${custom.length?`<div class="set-sec"><h3>직접 추가한 세부 유형</h3>
      ${custom.map(s=>{const used=S.items.filter(i=>i.cat===s.cat&&i.sub===s.name).length;return `<div class="set-row"><span><div class="t">${esc(s.name)}</div><div class="d">${CAT[s.cat]} · ${SHAPES[s.cat].find(x=>x[0]===s.t)?.[1]||''} 형태${used?` · ${used}벌 사용 중`:''}</div></span>
        <button class="btn-text" data-act="sub-del" data-cat="${s.cat}" data-name="${esc(s.name)}" aria-label="${esc(s.name)} 삭제">삭제</button></div>`;}).join('')}
      <div class="f-hint">삭제해도 이미 등록한 의류의 세부 유형 표시는 유지됩니다.</div></div>`:''}
    <div class="set-sec" id="install-sec" ${opt.canInstall?'':'hidden'}><h3>앱</h3>
      <button class="set-row" data-act="install"><span><div class="t">홈 화면에 설치</div><div class="d">앱처럼 전체 화면으로 실행하고 오프라인에서도 사용</div></span>${IC.chev}</button></div>
    <div class="ver" id="storage-info">저장 위치 · 이 기기(브라우저 로컬 저장소)<br>WARDROBE ${APP_VERSION} · 인터넷 연결 없이 동작하며 데이터는 외부로 전송되지 않습니다.</div>
  </div>`,{keepScroll:!!(opt.restore||opt.reset)});
}
