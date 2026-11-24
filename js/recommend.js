/* 규칙 기반 코디 추천 (외부 AI 없음)
   점수 = 세탁 후 착장 비율·누적 착장이 적을수록 + 상·하의 명도 대비 + 아우터/상의 구분 + 직전 코디와 중복 감점.
   세탁 권장(due) 의류는 후보에서 제외. 버튼을 다시 누르면 상위 조합을 차례로 보여준다. */
import { S, stats, byId } from './store.js';
import { CATS } from './const.js';
import { lum } from './garments.js';
import { today as todayISO } from './util.js';

const TOP_N = 8;
export function rankOutfits(fixed={}){
  const st=new Map(S.items.map(i=>[i.id,stats(i)]));
  const L=new Map(S.items.map(i=>[i.id,lum(i.color)]));
  const pool={}; for(const k of CATS) pool[k]=S.items.filter(i=>i.cat===k&&st.get(i.id).state!=='due');
  const T=todayISO(); const last=[...S.records].filter(r=>r.date<T).sort((a,b)=>b.date.localeCompare(a.date))[0]?.sel||{};
  const lastIds=new Set(Object.values(last));
  const opts=k=> k in fixed ? [byId(fixed[k])||null] : pool[k].length?pool[k]:[null];
  const own=x=>{ if(!x) return 0; const s=st.get(x.id); return -(s.since/x.wash*1.2 + s.total*.04) - (lastIds.has(x.id)?.35:0); };
  const best=[];
  for(const o of opts('outer'))for(const t of opts('top'))for(const b of opts('bottom'))for(const s of opts('shoes')){
    let sc=own(o)+own(t)+own(b)+own(s);
    if(t&&b){ sc+= Math.abs(L.get(t.id)-L.get(b.id))>.12?1:-.6; }
    if(o&&t){ sc+= Math.abs(L.get(o.id)-L.get(t.id))>.03?.4:-.4; }
    if(o&&b&&Math.abs(L.get(o.id)-L.get(b.id))<.05) sc-=.6;
    if(b&&s){ sc+= (L.get(b.id)>.3 && L.get(s.id)<.1)?.3:0; }
    if(best.length<TOP_N || sc>best[best.length-1].sc){
      best.push({sc, sel:{outer:o?.id, top:t?.id, bottom:b?.id, shoes:s?.id}});
      best.sort((a,b)=>b.sc-a.sc); if(best.length>TOP_N) best.pop();
    }
  }
  return {list:best};
}
export function recommend(idx=0, fixed={}){
  const {list}=rankOutfits(fixed);
  if(!list.length) return {sel:{}, count:0};
  const pick=list[idx%list.length];
  const sel={}; for(const k of CATS) if(pick.sel[k]) sel[k]=pick.sel[k];
  return {sel, count:list.length};
}
/* 현재 조합 설명. lock: 사용자가 직접 고른 분류, 나머지 채워진 분류는 추천 */
export function describe(sel, lock={}){
  const t=byId(sel.top), b=byId(sel.bottom), o=byId(sel.outer);
  const ids=CATS.map(k=>sel[k]).filter(id=>byId(id));
  if(!ids.length) return null;
  const tone=[o,t,b].filter(Boolean).map(x=>x.colorName).join(' · ');
  const last=[...S.records].filter(r=>r.date<todayISO()).sort((a,b)=>b.date.localeCompare(a.date))[0]?.sel||{};
  const overlap=ids.filter(id=>Object.values(last).includes(id)).length;
  const locked=CATS.filter(k=>k in lock).length, recN=CATS.filter(k=>!(k in lock)&&byId(sel[k])).length;
  const due=S.items.filter(i=>stats(i).state==='due');
  const dueIn=ids.filter(id=>stats(byId(id)).state==='due').length;
  const mode = !locked ? '오늘의 추천 · 세탁 후 착장이 적은 옷 우선' : recN ? `고른 옷에 맞춰 ${recN}벌 추천` : '직접 고른 조합';
  return {
    color: (tone||'신발만 선택') + (t&&b? (Math.abs(lum(t.color)-lum(b.color))>.12?' — 상·하의 명도 대비':' — 톤온톤') :''),
    wear: mode + (overlap?` · 지난 코디와 ${overlap}벌 겹침`:' · 지난 코디와 겹치지 않음'),
    wash: dueIn? `세탁 권장 의류 ${dueIn}벌 포함` : due.length? `세탁 권장 ${due.length}벌 제외` : '세탁 권장 의류 없음',
  };
}
