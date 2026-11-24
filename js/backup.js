/* 백업 · 복원 — JSON 한 파일에 의류·사진·착장 기록·세부 유형·설정을 담는다 */
import { S, photoBlob, normalizeItem, replaceData } from './store.js';
import { CATS, APP_VERSION, DATA_VERSION } from './const.js';
import { SHAPES } from './garments.js';
import { blobToDataURL, dataURLToBlob } from './image.js';
import { today } from './util.js';

export async function makeBackup(){
  const photos={};
  for(const it of S.items) if(it.hasPhoto){ const b=await photoBlob(it.id); if(b) photos[it.id]=await blobToDataURL(b); }
  const data={ app:'WARDROBE', format:'wardrobe-backup', dataVersion:DATA_VERSION, appVersion:APP_VERSION, exportedAt:new Date().toISOString(),
    items:S.items, records:S.records, customSubs:S.customSubs, prefs:S.prefs, photos };
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const name=`wardrobe-backup-${today()}.json`;
  return {blob,name,count:S.items.length,photos:Object.keys(photos).length,records:S.records.length};
}

/* 파일 저장: 웹은 다운로드, (향후 Capacitor는 Filesystem/Share 플러그인으로 교체할 지점) */
export async function saveFile({blob,name}){
  const file = new File([blob],name,{type:blob.type});
  const a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}

const DATE=/^\d{4}-\d{2}-\d{2}$/;
export async function parseBackup(file){
  if(file.size>300*1024*1024) throw new Error('파일이 너무 큽니다');
  let d; try{ d=JSON.parse(await file.text()); }catch(_){ throw new Error('JSON 파일을 읽을 수 없습니다'); }
  if(!d || d.format!=='wardrobe-backup' || !Array.isArray(d.items) || !Array.isArray(d.records)) throw new Error('WARDROBE 백업 파일이 아닙니다');
  if((d.dataVersion||1)>DATA_VERSION) throw new Error('더 새로운 버전의 앱에서 만든 백업입니다. 앱을 업데이트해 주세요');
  const ids=new Set();
  const items=d.items.filter(i=>i&&typeof i.id==='string'&&CATS.includes(i.cat)&&!ids.has(i.id)&&ids.add(i.id)).map(i=>normalizeItem({...i,color:/^#[0-9a-f]{6}$/i.test(i.color)?i.color:'#8a8a88'}));
  const records=d.records.filter(r=>r&&DATE.test(r.date)&&r.sel&&typeof r.sel==='object').map(r=>{
    const sel={}; for(const k of CATS) if(typeof r.sel[k]==='string') sel[k]=r.sel[k];
    return {date:r.date, sel, ts:Number.isFinite(r.ts)?r.ts:new Date(r.date+'T12:00').getTime(), updated:r.updated||Date.now()};
  }).filter(r=>Object.keys(r.sel).length);
  const customSubs=(Array.isArray(d.customSubs)?d.customSubs:[]).filter(s=>s&&CATS.includes(s.cat)&&typeof s.name==='string'&&SHAPES[s.cat].some(([k])=>k===s.t)).map(s=>({cat:s.cat,name:s.name.slice(0,20),t:s.t}));
  const photos=[];
  for(const [id,u] of Object.entries(d.photos||{})){ if(!ids.has(id)) continue; try{ photos.push([id,await dataURLToBlob(u)]); }catch(_){} }
  const withPhoto=new Set(photos.map(p=>p[0]));
  items.forEach(i=>i.hasPhoto=withPhoto.has(i.id));
  const prefs = d.prefs && typeof d.prefs==='object' && ['custom','most','least','wash'].includes(d.prefs.sort) ? {sort:d.prefs.sort} : {};
  return {items,records,photos,customSubs,prefs, exportedAt:d.exportedAt};
}
export const applyBackup = parsed=>replaceData(parsed);
