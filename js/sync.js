/* 구글 드라이브 동기화 — 서버 없이 브라우저에서 직접 본인 드라이브의 '앱 전용 숨김 폴더(appDataFolder)'에 저장.
   파일 하나(wardrobe-sync.json)에 백업과 같은 형식으로 전체 데이터를 담는다.
   판정: 드라이브 쪽 rev가 마지막 동기화 이후 바뀌었는지 + 이 기기에서 그 이후 수정했는지
     - 드라이브만 바뀜 → 불러오기 / 이 기기만 바뀜 → 올리기 / 둘 다 바뀜 → 사용자에게 선택 요청(자동으로 덮어쓰지 않음) */
import { S, getMeta, setMeta, replaceData } from './store.js';
import { makeBackup, parseBackupText } from './backup.js';
import { GOOGLE_CLIENT_ID } from './config.js';

const SCOPE='https://www.googleapis.com/auth/drive.appdata openid email';
const FILE='wardrobe-sync.json';
const API='https://www.googleapis.com/drive/v3', UP='https://www.googleapis.com/upload/drive/v3';
const TK='wardrobe.gtoken';

export const configured = ()=>!!GOOGLE_CLIENT_ID;
export const embedded = ()=>{ try{ return window.self!==window.top; }catch(_){ return true; } };
let st=null; // {fileId, remoteRev, lastSyncAt, email, auto}
export async function syncState(){ if(!st) st=(await getMeta('sync'))||null; return st; }
async function saveState(p){ st={...(st||{}),...p}; await setMeta('sync',st); return st; }

/* ---------- 토큰 (1시간 유효, 이 기기에만 보관) ---------- */
function savedToken(){ try{ const t=JSON.parse(localStorage.getItem(TK)||'null'); return t&&t.exp>Date.now()+60000? t.token : null; }catch(_){ return null; } }
function keepToken(token,sec){ try{ localStorage.setItem(TK,JSON.stringify({token,exp:Date.now()+(sec-60)*1000})); }catch(_){} }
function dropToken(){ try{ localStorage.removeItem(TK); }catch(_){} }
export const hasToken = ()=>!!savedToken();

let gisP=null;
export function preload(){ if(configured() && !embedded()) loadGis().catch(()=>{}); }
function loadGis(){
  if(window.google?.accounts?.oauth2) return Promise.resolve();
  if(gisP) return gisP;
  gisP=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://accounts.google.com/gsi/client'; s.async=true; s.onload=res; s.onerror=()=>{ gisP=null; rej(new Error('구글 로그인 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요')); }; document.head.appendChild(s); });
  return gisP;
}
/* 사용자가 버튼을 눌렀을 때만 호출 (팝업 차단 방지) */
export async function signIn({hint}={}){
  if(!configured()) throw new Error('구글 연결 설정이 아직 없습니다');
  await loadGis();
  return new Promise((res,rej)=>{
    const c=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID, scope:SCOPE, hint,
      callback:r=>{ if(r.error) return rej(new Error('구글 연결이 취소되었습니다')); keepToken(r.access_token,Number(r.expires_in)||3600); res(r.access_token); },
      error_callback:e=>rej(new Error(e?.type==='popup_closed'?'구글 연결 창이 닫혔습니다':'구글 연결 창을 열 수 없습니다. 팝업 차단을 확인해 주세요')) });
    c.requestAccessToken({prompt: hint? '' : 'consent'});
  });
}
async function token(interactive){
  const t=savedToken(); if(t) return t;
  if(!interactive) return null;
  return signIn({hint:st?.email});
}
async function gfetch(url,opt={},tk){
  const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),Authorization:'Bearer '+tk}});
  if(r.status===401){ dropToken(); throw Object.assign(new Error('구글 연결이 만료되었습니다. 다시 동기화를 눌러 주세요'),{auth:true}); }
  if(!r.ok) throw new Error(`드라이브 오류 (${r.status})`);
  return r;
}

async function remoteMeta(tk){
  const q=encodeURIComponent(`name='${FILE}'`);
  const r=await gfetch(`${API}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime,appProperties)&orderBy=modifiedTime desc`,{},tk);
  const f=(await r.json()).files?.[0]; return f? {id:f.id, rev:f.appProperties?.rev||f.modifiedTime, device:f.appProperties?.device||'', at:f.appProperties?.at||f.modifiedTime} : null;
}
const deviceName=()=>/Android/i.test(navigator.userAgent)?'안드로이드':/iPhone|iPad/i.test(navigator.userAgent)?'iOS':/Windows/i.test(navigator.userAgent)?'Windows PC':/Mac/i.test(navigator.userAgent)?'Mac':'기기';
async function upload(tk,fileId){
  const t0=Date.now(); const bk=await makeBackup(); const rev=Date.now().toString(36)+Math.random().toString(36).slice(2,7), at=new Date().toISOString();
  const meta={name:FILE, mimeType:'application/json', appProperties:{rev, at, device:deviceName()}};
  if(!fileId) meta.parents=['appDataFolder'];
  const b='wardrobe'+Math.random().toString(36).slice(2);
  const body=new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n`, bk.text, `\r\n--${b}--`]);
  const r=await gfetch(fileId? `${UP}/files/${fileId}?uploadType=multipart&fields=id` : `${UP}/files?uploadType=multipart&fields=id`,
    {method:fileId?'PATCH':'POST', headers:{'Content-Type':`multipart/related; boundary=${b}`}, body},tk);
  const id=(await r.json()).id;
  await saveState({fileId:id, remoteRev:rev, lastSyncAt:t0});
  return bk;
}
async function download(tk,rm){
  const r=await gfetch(`${API}/files/${rm.id}?alt=media`,{},tk);
  const parsed=await parseBackupText(await r.text());
  await replaceData(parsed,{fromSync:true});
  await saveState({fileId:rm.id, remoteRev:rm.rev, lastSyncAt:Date.now()});
  return parsed;
}
async function fetchEmail(tk){ try{ const r=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+tk}}); if(r.ok) return (await r.json()).email||''; }catch(_){} return ''; }

/* ---------- 동기화 실행 ----------
   반환: {action:'none'|'up'|'down'|'conflict'|'skip', remote?, counts?} */
let running=null;
export function sync(opts){ if(!running) running=run(opts).finally(()=>running=null); return running; }
async function run({interactive=false, force}={}){
  await syncState();
  if(!configured() || (!st && !interactive)) return {action:'skip'};
  const tk=await token(interactive); if(!tk) return {action:'skip', needLogin:true};
  if(!st?.email){ await saveState({email:await fetchEmail(tk), auto:st?.auto??true}); }
  const rm=await remoteMeta(tk);
  const localDirty = (S.localUpdatedAt||0) > (st.lastSyncAt||0);
  if(force==='up'){ const bk=await upload(tk,rm?.id); return {action:'up',counts:bk}; }
  if(force==='down'){ if(!rm) return {action:'none'}; const p=await download(tk,rm); return {action:'down',counts:{count:p.items.length,records:p.records.length}}; }
  if(!rm){ const bk=await upload(tk,null); return {action:'up',counts:bk}; }
  const remoteChanged = rm.rev!==st.remoteRev;
  // 처음 연결하는 기기에 이미 옷 데이터가 있으면, 수정 기록이 없어도 자동으로 덮어쓰지 않고 묻는다
  const firstTime=!st.remoteRev;
  if(remoteChanged && (localDirty || (firstTime && (S.items.length||S.records.length)))) return {action:'conflict', remote:rm};
  if(remoteChanged){ const p=await download(tk,rm); return {action:'down',counts:{count:p.items.length,records:p.records.length}}; }
  if(localDirty){ const bk=await upload(tk,rm.id); return {action:'up',counts:bk}; }
  await saveState({lastSyncAt:Math.max(st.lastSyncAt||0, S.localUpdatedAt||0)});
  return {action:'none'};
}
export async function setAuto(v){ await saveState({auto:!!v}); }
export async function disconnect(){
  const t=savedToken(); dropToken();
  try{ if(t && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(t,()=>{}); }catch(_){}
  st=null; await setMeta('sync',null);
}
export const pending = ()=> !!st && (S.localUpdatedAt||0) > (st.lastSyncAt||0);
/* 이 기기 데이터를 초기화한 뒤에는 다음 동기화 때 자동으로 덮어쓰지 않고 묻도록 기준을 지운다 */
export async function forget(){ await syncState(); if(st) await saveState({remoteRev:null,lastSyncAt:0}); }
