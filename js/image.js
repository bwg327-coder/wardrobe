/* 사진 처리 — 기기에서만 처리 (업로드 없음)
   배경 제거한 PNG를 권장: 투명 영역을 유지한 채 긴 변 1200px 이하로 줄여 저장한다. */
const MAX=1200;
export async function prepPhoto(file){
  if(!file || !/^image\//.test(file.type)) throw new Error('이미지 파일만 등록할 수 있습니다');
  const bmp = await decode(file);
  const s=Math.min(1, MAX/Math.max(bmp.width,bmp.height));
  const w=Math.max(1,Math.round(bmp.width*s)), h=Math.max(1,Math.round(bmp.height*s));
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  const cx=cv.getContext('2d'); cx.drawImage(bmp,0,0,w,h);
  bmp.close?.();
  const alpha = hasAlpha(cx,w,h);
  // 투명 배경: WebP(알파 지원) → 미지원 기기는 PNG / 불투명: JPEG
  let blob = alpha ? await toBlob(cv,'image/webp',.92) : await toBlob(cv,'image/jpeg',.9);
  if(alpha && (!blob || blob.type!=='image/webp')) blob = await toBlob(cv,'image/png');
  if(!blob) throw new Error('사진을 처리하지 못했습니다');
  return {blob, alpha};
}
async function decode(file){
  if('createImageBitmap' in window){ try{ return await createImageBitmap(file,{imageOrientation:'from-image'}); }catch(_){} }
  const url=URL.createObjectURL(file);
  try{ const im=new Image(); im.src=url; await im.decode(); return im; } finally{ URL.revokeObjectURL(url); }
}
function hasAlpha(cx,w,h){
  const d=cx.getImageData(0,0,w,h).data, step=Math.max(4, Math.floor(d.length/4/40000))*4;
  for(let i=3;i<d.length;i+=step) if(d[i]<250) return true;
  return false;
}
const toBlob=(cv,type,q)=>new Promise(r=>cv.toBlob(r,type,q));
export const blobToDataURL = b=>new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsDataURL(b); });
export async function dataURLToBlob(u){
  const m=/^data:(image\/(png|jpeg|webp|gif));base64,/.exec(u||''); if(!m) throw new Error('사진 형식 오류');
  const bin=atob(u.slice(m[0].length)); const a=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i);
  return new Blob([a],{type:m[1]});
}
