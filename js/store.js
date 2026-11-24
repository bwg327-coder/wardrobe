/* 상태 · 영속화 · 집계
   착장 횟수는 저장하지 않고 착장 기록(records)에서 매번 파생 계산한다.
   → 같은 날 재확정·기록 수정·삭제 시 중복 집계가 생기지 않는다. */
import * as db from './db.js';
import { CATS, BASE_SUBS, DATA_VERSION } from './const.js';
import { seedItems, SEED_PUFFER } from './seed.js';
import { SHAPES, shapeOk, setPhotoResolver } from './garments.js';
import { today, dayTs, uid } from './util.js';

export const S = {
  items:[], records:[], customSubs:[], prefs:{sort:'custom'},
  photoUrls:new Map(),
  ui:{tab:'wardrobe', cat:'all', q:'', reorder:false, onlyWash:false, sel:{}, editing:null, month:today().slice(0,7), day:today(), delAsk:false, recIdx:0}
};
setPhotoResolver(it=> it && it.hasPhoto ? S.photoUrls.get(it.id)||null : null);

/* ---------- 부팅 ---------- */
export async function load(){
  const [items, records, photoKeys, inited, subs, prefs] = await Promise.all([
    db.getAll('items'), db.getAll('records'), db.getAllKeys('photos'), db.get('meta','initialized'), db.get('meta','subs'), db.get('meta','prefs')
  ]);
  if(!inited){
    S.firstRun = true; S.items = [];
  } else {
    S.items = items.map(normalizeItem);
    await migrate();
  }
  S.records = records;
  S.customSubs = Array.isArray(subs)? subs : [];
  if(prefs) S.prefs = {...S.prefs, ...prefs};
  for(const k of photoKeys){ const b=await db.get('photos',k); if(b instanceof Blob) S.photoUrls.set(k, URL.createObjectURL(b)); }
  for(const it of S.items) if(it.hasPhoto && !S.photoUrls.has(it.id)) it.hasPhoto=false;
  touch();
}
export function normalizeItem(i){
  const it = {...i};
  if(!CATS.includes(it.cat)) it.cat='top';
  if(!shapeOk(it.cat,it.t)) it.t = SHAPES[it.cat][0][0];
  it.wash = clampInt(it.wash,1,99,5); it.base=clampInt(it.base,0,9999,0); it.baseSince=clampInt(it.baseSince,0,9999,0);
  it.order = Number.isFinite(it.order)? it.order : 9999;
  it.name = String(it.name||'').slice(0,60); it.colorName=String(it.colorName||'').slice(0,30); it.sub=String(it.sub||'').slice(0,20);
  it.washedAt = Number.isFinite(it.washedAt)? it.washedAt : null;
  it.created = Number.isFinite(it.created)? it.created : Date.now();
  it.hasPhoto = !!it.hasPhoto;
  return it;
}
const clampInt=(v,a,b,d)=>{v=Math.round(Number(v));return Number.isFinite(v)?Math.max(a,Math.min(b,v)):d;};

/* 데이터 보정 (기존 기기 데이터에 한 번씩 적용) */
async function migrate(){
  const done = new Set((await db.get('meta','migrations'))||[]);
  const changed=[];
  // 1) 기본 목록의 '카키'·'황토' 구두 → 오커 (실제 색은 황토색)
  if(!done.has('ochre')){
    S.items.filter(i=>i.cat==='shoes'&&((i.colorName==='카키'&&i.color==='#6f6a4a')||(i.colorName==='황토'&&i.color==='#a8742f')))
      .forEach(i=>{ i.colorName='오커'; i.color='#a8742f'; changed.push(i); });
    done.add('ochre');
  }
  // 2) 아우터 '패딩' 추가 (기본 목록으로 시작한 경우만)
  if(!done.has('puffer')){
    const fromSeed = S.items.some(i=>i.id==='o1'&&i.name==='발마칸 코트');
    if(fromSeed && !S.items.some(i=>i.t==='puffer')){
      const r=SEED_PUFFER, outerMax=Math.max(-1,...S.items.filter(i=>i.cat==='outer').map(i=>i.order));
      const it={id:uid('o-puffer-'),cat:'outer',sub:r[1],t:r[2],name:r[3],colorName:r[4],color:r[5],wash:r[6],base:0,baseSince:0,washedAt:null,created:Date.now(),order:outerMax+1,hasPhoto:false};
      S.items.push(it); changed.push(it);
    }
    done.add('puffer');
  }
  if(changed.length) await db.putMany('items',changed);
  await db.put('meta',[...done],'migrations');
}

/* 첫 실행: 기본 옷 목록으로 시작하거나 빈 옷장으로 시작 */
export async function initialize(withSeed){
  const items = withSeed? seedItems() : [];
  if(items.length) await db.putMany('items', items);
  await db.put('meta', {at:Date.now(), dataVersion:DATA_VERSION}, 'initialized');
  await db.put('meta', ['ochre','puffer'], 'migrations');
  S.items = items; S.firstRun = false; touch();
}

/* ---------- 집계 (메모) ---------- */
let ver=0, cache=null;
export function touch(){ ver++; cache=null; }
export const byId = id=> id? S.items.find(i=>i.id===id) : undefined;
function buildStats(){
  const recsBy = new Map();
  for(const r of S.records) for(const id of Object.values(r.sel||{})){ if(!recsBy.has(id)) recsBy.set(id,[]); recsBy.get(id).push(r); }
  const m=new Map();
  for(const it of S.items){
    const recs = recsBy.get(it.id)||[];
    const total = it.base + recs.length;
    const since = it.baseSince + (it.washedAt ? recs.filter(r=>r.ts>it.washedAt).length : recs.length);
    const dates = recs.map(r=>r.date).sort().reverse();
    const state = since>=it.wash ? 'due' : since>=it.wash-1 ? 'soon' : 'ok';
    m.set(it.id,{total, since, last:dates[0]||null, state, dates});
  }
  return m;
}
export function stats(it){ if(!cache) cache=buildStats(); return cache.get(it.id) || {total:0,since:0,last:null,state:'ok',dates:[]}; }
export const recordOn = date=>S.records.find(r=>r.date===date);
export const selItems = sel=>{ const o={}; for(const k of CATS){ const i=byId(sel?.[k]); if(i) o[k]=i; } return o; };

/* ---------- 세부 유형 ---------- */
export function subsOf(cat){
  return [...BASE_SUBS[cat].map(([name,t])=>({name,t,base:true})), ...S.customSubs.filter(s=>s.cat===cat).map(s=>({...s,base:false}))];
}
export async function addSub(cat,name,t){
  name=name.trim().slice(0,20);
  if(!name) throw new Error('세부 유형 이름을 입력해 주세요');
  if(subsOf(cat).some(s=>s.name===name)) throw new Error('이미 있는 세부 유형입니다');
  S.customSubs.push({cat,name,t}); await db.put('meta',S.customSubs,'subs');
}
export async function removeSub(cat,name){
  S.customSubs = S.customSubs.filter(s=>!(s.cat===cat&&s.name===name)); await db.put('meta',S.customSubs,'subs');
}

/* ---------- 의류 ---------- */
export async function saveItem(form, photo){ // photo: Blob(교체) | null(삭제) | undefined(유지)
  const isNew = !form.id;
  const prev = isNew? null : byId(form.id);
  const it = normalizeItem({...(prev||{}), ...form,
    id: form.id || uid('n'),
    created: prev?.created || Date.now(),
    order: prev? prev.order : Math.max(-1,...S.items.filter(x=>x.cat===form.cat).map(x=>x.order))+1 });
  if(prev && prev.cat!==it.cat) it.order = Math.max(-1,...S.items.filter(x=>x.cat===it.cat&&x.id!==it.id).map(x=>x.order))+1;
  if(photo instanceof Blob){ await db.put('photos',photo,it.id); setPhotoUrl(it.id,photo); it.hasPhoto=true; }
  else if(photo===null){ await db.del('photos',it.id); setPhotoUrl(it.id,null); it.hasPhoto=false; }
  await db.put('items',it);
  if(prev) Object.assign(prev,it); else S.items.push(it);
  touch(); return it;
}
function setPhotoUrl(id,blob){
  const old=S.photoUrls.get(id); if(old) URL.revokeObjectURL(old);
  if(blob) S.photoUrls.set(id,URL.createObjectURL(blob)); else S.photoUrls.delete(id);
}
export async function deleteItem(id){
  await db.del('items',id); await db.del('photos',id); setPhotoUrl(id,null);
  S.items = S.items.filter(i=>i.id!==id);
  for(const k of CATS) if(S.ui.sel[k]===id) delete S.ui.sel[k];
  touch();
}
export async function saveOrder(ids){
  const changed=[]; ids.forEach((id,i)=>{ const it=byId(id); if(it && it.order!==i){ it.order=i; changed.push(it); } });
  if(changed.length) await db.putMany('items',changed);
}
export async function washItem(id){
  const it=byId(id); const prev={washedAt:it.washedAt, baseSince:it.baseSince};
  it.washedAt=Date.now(); it.baseSince=0; await db.put('items',it); touch(); return prev;
}
export async function undoWash(id,prev){ const it=byId(id); if(!it) return; Object.assign(it,prev); await db.put('items',it); touch(); }

/* ---------- 착장 기록 (하루 1기록, 확정 시에만 생성) ---------- */
export async function confirmRecord(date, sel){
  const clean={}; for(const k of CATS) if(sel[k] && byId(sel[k])) clean[k]=sel[k];
  if(!Object.keys(clean).length) throw new Error('의류를 하나 이상 선택해 주세요');
  if(date>today()) throw new Error('미래 날짜에는 기록할 수 없습니다');
  const ex=recordOn(date);
  const rec={date, sel:clean, ts: date===today()? Date.now() : (ex?.ts || dayTs(date)), updated:Date.now()};
  await db.put('records',rec);
  if(ex) Object.assign(ex,rec); else S.records.push(rec);
  touch(); return !!ex;
}
export async function deleteRecord(date){ await db.del('records',date); S.records=S.records.filter(r=>r.date!==date); touch(); }

/* ---------- 환경설정 ---------- */
export async function setPref(k,v){ S.prefs[k]=v; await db.put('meta',S.prefs,'prefs'); }

/* ---------- 초기화 · 기본 목록 ---------- */
export async function resetAll(){
  await db.replaceAll({meta:[['initialized',{at:Date.now(),dataVersion:DATA_VERSION}],['prefs',S.prefs]]});
  for(const u of S.photoUrls.values()) URL.revokeObjectURL(u);
  S.photoUrls.clear(); S.items=[]; S.records=[]; S.customSubs=[]; S.ui.sel={}; S.ui.editing=null; touch();
}
export async function loadSeed(){
  const base = Math.max(-1,...S.items.map(i=>i.order))+1;
  const add = seedItems().map((it,i)=>({...it, id:uid(it.id+'-'), order:base+i}));
  await db.putMany('items',add); S.items.push(...add); touch(); return add.length;
}
/* 복원: 검증이 끝난 데이터로 전체 교체 */
export async function replaceData({items,records,photos,customSubs,prefs}){
  await db.replaceAll({items, records, photos, meta:[['initialized',{at:Date.now(),dataVersion:DATA_VERSION}],['subs',customSubs],['prefs',{...S.prefs,...prefs}]]});
  for(const u of S.photoUrls.values()) URL.revokeObjectURL(u);
  S.photoUrls.clear();
  for(const [k,b] of photos) S.photoUrls.set(k,URL.createObjectURL(b));
  S.items=items; S.records=records; S.customSubs=customSubs; S.prefs={...S.prefs,...prefs};
  S.ui.sel={}; S.ui.editing=null; touch();
}
export async function photoBlob(id){ return db.get('photos',id); }
