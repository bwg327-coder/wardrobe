/* IndexedDB 저장소 — 외부 서버·DB 없이 이 기기에만 저장
   stores: items(id) · records(date) · photos(id → Blob) · meta(key → value) */
const NAME='wardrobe', VER=1;
let dbp=null;
function open(){
  if(dbp) return dbp;
  dbp = new Promise((res,rej)=>{
    const r=indexedDB.open(NAME,VER);
    r.onupgradeneeded=()=>{
      const db=r.result;
      if(!db.objectStoreNames.contains('items')) db.createObjectStore('items',{keyPath:'id'});
      if(!db.objectStoreNames.contains('records')) db.createObjectStore('records',{keyPath:'date'});
      if(!db.objectStoreNames.contains('photos')) db.createObjectStore('photos');
      if(!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    r.onsuccess=()=>{ const db=r.result; db.onversionchange=()=>db.close(); res(db); };
    r.onerror=()=>rej(r.error);
    r.onblocked=()=>rej(new Error('다른 탭에서 앱이 열려 있어 저장소를 열 수 없습니다'));
  });
  return dbp;
}
const done = tx=>new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error||new Error('저장 취소됨')); });
const req = r=>new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });

export async function getAll(store){ const db=await open(); return req(db.transaction(store).objectStore(store).getAll()); }
export async function getAllKeys(store){ const db=await open(); return req(db.transaction(store).objectStore(store).getAllKeys()); }
export async function get(store,key){ const db=await open(); return req(db.transaction(store).objectStore(store).get(key)); }
export async function put(store,val,key){ const db=await open(); const tx=db.transaction(store,'readwrite'); key===undefined? tx.objectStore(store).put(val) : tx.objectStore(store).put(val,key); return done(tx); }
export async function del(store,key){ const db=await open(); const tx=db.transaction(store,'readwrite'); tx.objectStore(store).delete(key); return done(tx); }
export async function putMany(store,vals){ const db=await open(); const tx=db.transaction(store,'readwrite'); const s=tx.objectStore(store); vals.forEach(v=>s.put(v)); return done(tx); }

/* 전체 교체 (복원·초기화) — 한 트랜잭션으로 원자적 처리 */
export async function replaceAll({items=[],records=[],photos=[],meta=[]}){
  const db=await open();
  const tx=db.transaction(['items','records','photos','meta'],'readwrite');
  for(const n of ['items','records','photos','meta']) tx.objectStore(n).clear();
  items.forEach(v=>tx.objectStore('items').put(v));
  records.forEach(v=>tx.objectStore('records').put(v));
  photos.forEach(([k,b])=>tx.objectStore('photos').put(b,k));
  meta.forEach(([k,v])=>tx.objectStore('meta').put(v,k));
  return done(tx);
}
