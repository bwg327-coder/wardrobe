/* 옷장 관리 화면 */
import { S, stats } from '../store.js';
import { CAT, CATS } from '../const.js';
import { thumb } from '../garments.js';
import { esc, $ } from '../util.js';
import { IC } from './common.js';

export const SORTS=[['custom','나의 정렬순'],['most','착장 많은 순'],['least','착장 적은 순'],['wash','세탁 필요 순']];
const rank={due:0,soon:1,ok:2};
const ratio=x=>x.i.wash? x.s.since/x.i.wash : -1; // 세탁 기준 없는 옷은 맨 뒤
const sorters={
  custom:(a,b)=>a.i.order-b.i.order,
  most:(a,b)=>b.s.total-a.s.total||a.i.order-b.i.order,
  least:(a,b)=>a.s.total-b.s.total||a.i.order-b.i.order,
  wash:(a,b)=>rank[a.s.state]-rank[b.s.state]||ratio(b)-ratio(a)||a.i.order-b.i.order,
};

export function renderWardrobe(){
  const u=S.ui, sort=S.prefs.sort;
  const all=S.items.map(i=>({i,s:stats(i)}));
  const dueN=all.filter(x=>x.s.state==='due').length;
  const cnt=k=>k==='all'?S.items.length:S.items.filter(i=>i.cat===k).length;
  if(!S.items.length){
    $('#v-wardrobe').innerHTML=`
    <div class="h1 gx"><h1>옷장<span class="num">0</span></h1></div>
    <div class="empty-full gx">
      <p class="t">옷장이 비어 있습니다</p>
      <p class="d">의류를 직접 등록하거나, 기본 옷 목록 34벌을 다시 불러올 수 있습니다.</p>
      <div class="r"><button class="btn btn-dark" data-act="add">${IC.plus}의류 등록</button><button class="btn btn-line" data-act="load-seed">기본 목록 불러오기</button></div>
    </div>`;
    return;
  }
  $('#v-wardrobe').innerHTML=`
  <div class="h1 gx"><h1>옷장<span class="num">${S.items.length}</span></h1>
    ${u.reorder?'':`<button class="btn btn-dark btn-sm" data-act="add">${IC.plus}등록</button>`}</div>
  ${u.reorder?'':`<label class="search"><span class="sr">검색</span>${IC.search}<input id="q" type="search" enterkeyhint="search" placeholder="제품명, 컬러, 유형 검색" value="${esc(u.q)}" autocomplete="off"></label>`}
  <div class="cats gx" role="group" aria-label="분류">${['all',...CATS].map(k=>`<button class="cat" data-cat="${k}" aria-pressed="${u.cat===k}">${k==='all'?'전체':CAT[k]}<span class="num">${cnt(k)}</span></button>`).join('')}</div>
  ${u.reorder?`<div class="tools gx reo"><span>핸들을 잡고 위아래로 끌어 순서를 바꾸세요</span><button class="btn btn-dark btn-sm" data-act="reorder-done">완료</button></div>`:`
  <div class="tools gx">
    <button class="toggle" data-act="onlywash" aria-pressed="${u.onlyWash}"><span class="box"></span>세탁 필요만 <span class="num">${dueN}</span></button>
    <div class="tools-r">${sort==='custom'?`<button class="btn-text reo-btn" data-act="reorder">순서 편집</button>`:''}
    <label class="sort"><span class="sr">정렬</span><select id="sort">
      ${SORTS.map(([v,l])=>`<option value="${v}"${sort===v?' selected':''}>${l}</option>`).join('')}
    </select>${IC.down}</label></div>
  </div>`}
  <div class="lhead gx"><span>사진</span><span>분류 · 제품명 · 컬러</span><span>${u.reorder?'이동':'착장'}</span></div>
  <div class="list" id="list"></div>
  <div style="height:24px"></div>`;
  renderList();
}

export function renderList(){
  const u=S.ui, q=u.q.trim().toLowerCase();
  const all=S.items.map(i=>({i,s:stats(i)}));
  let list = u.reorder ? all.filter(x=>u.cat==='all'||x.i.cat===u.cat)
    : all.filter(x=>(u.cat==='all'||x.i.cat===u.cat)&&(!u.onlyWash||x.s.state!=='ok')
      &&(!q||[x.i.name,x.i.colorName,x.i.sub,CAT[x.i.cat]].join(' ').toLowerCase().includes(q)));
  const ci=x=>CATS.indexOf(x.i.cat);
  list.sort((a,b)=>ci(a)-ci(b)||sorters[u.reorder?'custom':S.prefs.sort](a,b));
  let rows='', lastCat=null;
  for(const {i,s} of list){
    if(u.cat==='all' && i.cat!==lastCat){ rows+=`<div class="ghead gx"><span>${CAT[i.cat]}</span><span class="num">${list.filter(x=>x.i.cat===i.cat).length}</span></div>`; lastCat=i.cat; }
    const body=`<div class="ph">${thumb(i)}</div>
      <div class="info"><div class="meta">${CAT[i.cat]} · ${esc(i.sub)}</div><div class="name">${esc(i.name)}</div>
        <div class="color"><i class="sw" style="background:${i.color}"></i>${esc(i.colorName)}</div></div>`;
    rows += u.reorder
      ? `<div class="row gx edit" data-id="${i.id}" data-cat="${i.cat}">${body}<button class="handle" aria-label="${esc(i.name)} ${esc(i.colorName)} 순서 이동, 위아래 화살표로 이동">${IC.grip}</button></div>`
      : `<button class="row gx" data-act="detail" data-id="${i.id}">${body}
      <div class="cnt"><b>${s.total}<small>회</small></b><span class="since">${i.wash?`세탁 후 ${s.since}/${i.wash}`:`세탁 후 ${s.since}회`}</span>
        ${s.state==='due'?'<span class="tag tag-due">세탁 권장</span>':s.state==='soon'?'<span class="tag tag-soon">세탁 임박</span>':''}</div></button>`;
  }
  $('#list').innerHTML = list.length? rows : `<div class="empty">조건에 맞는 의류가 없습니다.</div>`;
}
