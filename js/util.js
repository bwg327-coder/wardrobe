/* 날짜 · 문자열 유틸 */
export const pad = n=>String(n).padStart(2,'0');
export const iso = d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const today = ()=>iso(new Date());
export const WK = ['일','월','화','수','목','금','토'];
export const fmtMD = s=>{const d=new Date(s+'T00:00');return `${d.getMonth()+1}월 ${d.getDate()}일`;};
export const fmtMDW = s=>{const d=new Date(s+'T00:00');return `${d.getMonth()+1}월 ${d.getDate()}일 (${WK[d.getDay()]})`;};
export const fmtYMD = s=>{const d=new Date(s+'T00:00');return `${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}.`;};
/* 기록 날짜의 기준 시각: 과거 날짜를 기록·수정할 때 세탁 시점과 비교하는 값 */
export const dayTs = (d,h=12)=> new Date(d+'T'+pad(h)+':00:00').getTime();
export const esc = s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
export const $ = s=>document.querySelector(s);
export const uid = p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
export const isHex = s=>/^#[0-9a-f]{6}$/i.test(s||'');
