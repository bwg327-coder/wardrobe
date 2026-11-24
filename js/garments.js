/* 의류 렌더러 — 패션 도식화(테크니컬 플랫) 라인 드로잉 + 의류 컬러 채움. 디자인 시안 v1에서 이식 */
import { CATS } from './const.js';

/* ---------- 색상 유틸 ---------- */
function rgb(h){h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.substr(i,2),16));}
function hex(a){return '#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');}
function shade(h,p){const c=rgb(h);return hex(c.map(v=>p<0? v*(1+p) : v+(255-v)*p));}
function lum(h){const [r,g,b]=rgb(h).map(v=>v/255);return .2126*r+.7152*g+.0722*b;}

/* ---------- 의류 렌더러 (패션 도식화 · 테크니컬 플랫) ---------- */
let U=0;
const MIR = s=>`<g transform="matrix(-1 0 0 1 300 0)">${s}</g>`;
let LC='#1a1a1a';
const lineC=c=>lum(c)<.2? shade(c,.5) : shade(c,-.62);
const edgeC=c=>lum(c)<.06? shade(c,.42) : '#1a1a1a';
const NS='vector-effect="non-scaling-stroke"';
function piece(d,c,tex,inner=''){
  const id='k'+(++U);
  return `<g><clipPath id="${id}"><path d="${d}"/></clipPath>
<path d="${d}" fill="${c}"/>
<g clip-path="url(#${id})">${inner}</g>
<path d="${d}" fill="none" stroke="${edgeC(c)}" stroke-width="1.15" stroke-linejoin="round" ${NS}/></g>`;
}
const seam=(d,c,op=.7,dash='')=>`<path d="${d}" fill="none" stroke="${c==='#c99a5b'?c:LC}" stroke-opacity="${Math.min(1,op+.25)}" stroke-width=".75" stroke-linecap="round" ${NS}${dash?` stroke-dasharray="${dash}"`:''}/>`;
function rib(x1,x2,y1,y2,c){
  let p='';for(let x=x1;x<=x2;x+=2.4)p+=`M${x.toFixed(1)},${y1}V${y2}`;
  return `<path d="${p}" stroke="${LC}" stroke-width=".45" stroke-opacity=".55" ${NS}/>${seam(`M${x1},${y1}H${x2}`,LC,.8)}`;
}
const innerC=(c,flat)=>shade(c, flat? -.1 : -.24);

const rot=(s,a,x,y,flat)=>flat?`<g transform="rotate(${a} ${x} ${y})">${s}</g>`:s;
const dot=(x,y,c,r=1.7)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${shade(c,lum(c)<.2?.18:-.08)}" stroke="${LC}" stroke-width=".6" ${NS}/>`;
const STITCH='#c99a5b';
/* 상의 공통 몸판 */
function longSleeve(c,flat,len=228,cuff='rib'){
  const sl=`M102,86 C90,92 84,110 82,140 L78,${len} L98,${len+2} L100,150 C101,128 102,112 102,100 Z`;
  const inner = cuff==='rib'? rib(66,108,len-13,len+3,c) : seam(`M79,${len-14} L99,${len-12}`,LC)+dot(92,len-6,c,1.3);
  return ()=>rot(piece(sl,c,'',inner),20,102,90,flat);
}
function tKnit(c,flat,kind='knit'){
  const sleeve=longSleeve(c,flat,228,'rib');
  const body='M128,80 Q150,96 172,80 L198,86 C200,120 199,180 199,228 L101,228 C101,180 100,120 102,86 Z';
  const neckIn=`<path d="M128,80 Q150,66 172,80 Q150,96 128,80 Z" fill="${innerC(c,flat)}"/>`;
  let inner=rib(96,204,213,229,c);
  if(kind==='sweat'||kind==='hoodie') inner+=seam('M128,81 L103,112',LC)+seam('M172,81 L197,112',LC);
  if(kind==='sweat') inner+=seam('M144,90 L150,100 L156,90',LC);
  if(kind==='hoodie') inner+=piece('M116,168 L184,168 L194,213 L106,213 Z',c,'',seam('M119,171 Q112,190 109,211',LC)+seam('M181,171 Q188,190 191,211',LC)+seam('M118,174 H182',LC,.5,'1.4 1'));
  const b=piece(body,c,'',inner);
  const neckW = kind==='knit'?5:6;
  const neck=`<path d="M128,80 Q150,96 172,80" fill="none" stroke="${c}" stroke-width="${neckW}"/>${seam('M128,80 Q150,96 172,80',LC,.5)}${seam(`M130.5,${80+neckW/2} Q150,${96+neckW/1.4} 169.5,${80+neckW/2}`,LC,.8)}`;
  let hood='';
  if(kind==='hoodie'){
    hood=piece('M118,86 C108,62 120,38 150,36 C180,38 192,62 182,86 Q150,74 118,86 Z',c,'',seam('M150,38 V60',LC,.6))
      +`<path d="M128,84 C124,64 134,50 150,49 C166,50 176,64 172,84 Q150,94 128,84 Z" fill="${innerC(c,flat)}" stroke="${edgeC(c)}" stroke-width="1" ${NS}/>`;
  }
  const strings = kind==='hoodie' ? `<path d="M142,92 L140,132 M158,92 L160,132" stroke="${shade(c,lum(c)<.3?.4:-.2)}" stroke-width="1.6" stroke-linecap="round"/>`+seam('M142,92 L140,132',LC,.6)+seam('M158,92 L160,132',LC,.6) : '';
  return {back:'',front:hood+neckIn+sleeve()+MIR(sleeve())+b+(kind==='hoodie'?seam('M128,84 Q150,96 172,84',LC,.9):neck)+strings};
}
function tShirt(c,flat){
  const sleeve=longSleeve(c,flat,230,'cuff');
  const body='M128,78 L172,78 L198,86 C200,130 199,190 200,226 Q176,239 150,236 Q124,239 100,226 C101,190 100,130 102,86 Z';
  const neckIn=`<path d="M127,78 Q150,67 173,78 L150,97 Z" fill="${innerC(c,flat)}"/>`;
  let btn='';for(const y of [112,134,156,178,200,222])btn+=dot(150,y,c,1.5);
  const pocket=x=>seam(`M${x},112 H${x+17} V130 Q${x+8.5},133 ${x},130 Z`,LC)+seam(`M${x-1},109 H${x+18} V116 L${x+8.5},119 L${x-1},116 Z`,LC)+dot(x+8.5,116,c,1);
  const b=piece(body,c,'',seam('M146,97 V236',LC)+seam('M154,97 V236',LC)+btn+pocket(115)+pocket(168)+seam('M102,100 Q125,104 146,100',LC,.5,'1.4 1')+seam('M154,100 Q175,104 198,100',LC,.5,'1.4 1'));
  const collar=()=>piece('M127,77 L150,97 L141,107 L121,86 Z',c,'',seam('M124,84 L141,103',LC,.5));
  return {back:'',front:neckIn+sleeve()+MIR(sleeve())+b+collar()+MIR(collar())};
}
function tTee(c,flat,henley=false){
  const sl='M102,86 C92,89 84,97 78,122 L97,129 L102,113 Z';
  const sleeve= henley? longSleeve(c,flat,228,'rib') : ()=>rot(piece(sl,c,'',seam('M80,117 L98,124',LC,.6,'1.4 1')),10,102,90,flat);
  const body='M130,80 Q150,94 170,80 L198,86 L199,228 L101,228 L102,86 Z';
  const neckIn=`<path d="M130,80 Q150,67 170,80 Q150,94 130,80 Z" fill="${innerC(c,flat)}"/>`;
  let inner=seam('M101,222 H199',LC,.6,'1.4 1');
  if(henley) inner+=seam('M146,88 V126 H154 V88',LC)+dot(150,98,c,1.5)+dot(150,108,c,1.5)+dot(150,118,c,1.5);
  const b=piece(body,c,'',inner);
  const neck=`<path d="M130,80 Q150,94 170,80" fill="none" stroke="${c}" stroke-width="4"/>${seam('M132,82.5 Q150,96 168,82.5',LC,.7)}`;
  return {back:'',front:neckIn+sleeve()+MIR(sleeve())+b+neck};
}
function tPants(c,t){
  const d='M106,204 L194,204 L198,240 C200,290 198,330 197,373 L154,375 L150,266 L146,375 L103,373 C102,330 100,290 102,240 Z';
  const den=t==='denim', st=den?STITCH:LC, dash=den?'1.6 1.1':'';
  let loops=''; for(const x of [113,135,165,187]) loops+=`<rect x="${x-1.6}" y="203" width="3.2" height="12" fill="${c}" stroke="${edgeC(c)}" stroke-width=".8" ${NS}/>`;
  let inner = seam('M104,214.5 H196',st,.9,dash)+loops
    + seam('M143,215 V246 Q144,255 150,258',st,.8,dash)
    + seam('M109,215 Q115,226 118,240',st,.8,dash)+seam('M191,215 Q185,226 182,240',st,.8,dash);
  if(den){
    inner += seam('M178,220 L190,220 L189.5,231 L178.5,231 Z',st,.9,dash)+seam('M103,367 L146,369',st,.9,dash)+seam('M197,367 L154,369',st,.9,dash)
      + `<circle cx="118" cy="240" r="1.2" fill="#b08d57"/><circle cx="182" cy="240" r="1.2" fill="#b08d57"/>`+dot(150,209,'#9a8a6a',2.2);
  } else if(t==='slacks'){
    inner += seam('M125,250 L125,372',LC,.45)+seam('M175,250 L175,372',LC,.45)+seam('M126,215 L127,236',LC,.7)+seam('M174,215 L173,236',LC,.7)+dot(150,209,c,1.6);
  } else {
    inner += seam('M103,366 L146,368',LC,.5,'1.4 1')+seam('M197,366 L154,368',LC,.5,'1.4 1')+dot(150,209,c,1.6);
  }
  return {back:'',front:piece(d,c,'',inner)};
}
const coatSleeve=(c,flat)=>()=>rot(piece('M100,84 C86,92 76,118 74,160 L68,262 L93,265 L96,172 C97,140 99,112 100,100 Z',c,'',seam('M69,252 L93,255',LC,.6)),12,100,88,flat);
function tCoat(c,flat){
  const back = piece('M100,84 Q150,64 200,84 C206,160 210,240 212,312 L88,312 C90,240 94,160 100,84 Z',shade(c,-.24),'')
    + piece('M122,73 Q150,58 178,73 L176,81 Q150,70 124,81 Z',shade(c,-.1),'');
  const sleeve=coatSleeve(c,flat);
  const panel=()=>piece('M124,72 C114,74 106,78 100,84 C95,150 92,230 88,313 L134,315 C135,240 136,170 138,122 L131,98 Z',c,'',
      seam('M124,72 Q114,96 99,118',LC,.7)+seam('M103,224 L113,254',LC,.8)+seam('M105,223 L115,253',LC,.4)+seam('M89,305 L134,307',LC,.5));
  const lapel=()=>piece('M124,71 C128,84 133,100 138,122 L130,104 C125,96 119,88 115,80 Z',c,'',seam('M118,81 C123,88 128,96 132,104',LC,.4));
  return {back, front:sleeve()+MIR(sleeve())+panel()+MIR(panel())+lapel()+MIR(lapel())};
}
function tDouble(c,flat){
  const back = `<path d="M124,72 Q150,64 176,72 L150,150 Z" fill="${innerC(c,flat)}" stroke="${edgeC(c)}" stroke-width="1" ${NS}/>`
    + piece('M120,74 Q150,60 180,74 L178,82 Q150,72 122,82 Z',shade(c,-.12),'');
  const sleeve=coatSleeve(c,flat);
  let btn='';for(const y of [176,206,236])btn+=dot(134,y,c,2.6)+dot(166,y,c,2.6);
  const body=piece('M124,72 L150,150 L176,72 C186,74 194,78 200,84 C205,150 208,230 212,320 L88,320 C92,230 95,150 100,84 C106,78 114,74 124,72 Z',c,'',
      seam('M166,146 L168,320',LC,.9)+seam('M89,312 H211',LC,.5)+btn
      +seam('M100,250 H128 V260 H100.5 Z',LC)+seam('M172,250 H200 V260 H172 Z',LC)+seam('M110,154 L130,150',LC,.8)
      +seam('M124,72 Q114,96 99,118',LC,.5)+seam('M176,72 Q186,96 201,118',LC,.5));
  const lapel=()=>piece('M124,72 L150,150 L137,136 L108,95 L118,95 L116,82 Z',c,'',seam('M116,82 L118,95',LC,.6));
  return {back, front:sleeve()+MIR(sleeve())+body+lapel()+MIR(lapel())};
}
const blousonSleeve=(c,flat,cuff='rib')=>()=>rot(piece('M100,84 C86,92 78,118 76,160 L72,226 L95,228 L97,172 C98,140 99,112 100,100 Z',c,'',
  cuff==='rib'? rib(60,104,212,230,c) : seam('M73,212 L96,214',STITCH,.9,'1.6 1.1')+seam('M73,215 L96,217',STITCH,.9,'1.6 1.1')+dot(90,221,'#9a8a6a',1.6)),16,100,88,flat);
function tBlouson(c,flat,t='ma1'){
  const back = piece('M100,84 Q150,64 200,84 L205,224 L95,224 Z',shade(c,-.24),'');
  const ma1=t==='ma1', har=t==='harrington', den=t==='denimjk';
  const collarBack = ma1? piece('M123,72 Q150,60 177,72 L177,82 Q150,72 123,82 Z',c,'',rib(120,180,60,84,c))
    : piece('M121,70 Q150,56 179,70 L178,82 Q150,72 122,82 Z',c,'',seam('M123,74 Q150,62 177,74',den?STITCH:LC,.7,den?'1.6 1.1':''));
  const sleeve=blousonSleeve(c,flat,den?'cuff':'rib');
  let inner='', st=den?STITCH:LC, dash=den?'1.6 1.1':'';
  if(den){
    inner = seam('M95,211 H141',st,.9,dash)+seam('M95,214 H141',st,.9,dash)+seam('M118,128 L119,211',st,.9,dash)+seam('M121,128 L122,211',st,.9,dash)
      + seam('M105,112 H131 V122 L118,127 L105,122 Z',st,.9,dash)+seam('M106,126 H130 V150 H106 Z',st,.6,dash)+dot(118,121,'#9a8a6a',1.5)
      + dot(135,100,'#9a8a6a',2)+dot(135,130,'#9a8a6a',2)+dot(135,160,'#9a8a6a',2)+dot(135,190,'#9a8a6a',2)+dot(135,219,'#9a8a6a',2)+seam('M139,90 V224',st,.9,dash);
  } else {
    inner = rib(90,145,210,225,c)+seam('M139.5,86 V210',LC,.9,'1 .8');
    inner += har? seam('M103,168 L121,175 L119,182 L101,175 Z',LC)+seam('M100,84 L123,72',LC,.5)+seam('M100,104 Q120,110 141,104',LC,.5)
               : seam('M106,166 L116,194',LC,.8)+seam('M108,165 L118,193',LC,.4)+seam('M100,84 L123,72',LC,.5);
  }
  const panel=()=>piece('M123,72 C114,74 106,78 100,84 C97,130 95,180 95,224 L141,224 L141,86 Z',c,'',inner);
  const col = ma1? ()=>piece('M123,72 L141,86 L141,94 L121,80 Z',c,'',rib(118,142,70,96,c))
    : den? ()=>piece('M122,71 L141,88 L134,104 L113,84 Z',c,'',seam('M119,78 L136,93 L132,100',STITCH,.9,'1.6 1.1'))
    : ()=>piece('M121,70 L141,84 L141,94 L119,81 Z',c,'')+(dot(137,88,c,1.4));
  const pocketSleeve = ma1? piece('M80,116 L95,116 L95,136 L80,136 Z',c,'',seam('M83,116 V132 M86,116 V132',LC,.6)+`<rect x="85" y="113" width="3" height="4" fill="#b8b8b4" stroke="${LC}" stroke-width=".5" ${NS}/>`) : '';
  return {back:back+collarBack, front:sleeve()+rot(pocketSleeve,16,100,88,flat)+MIR(sleeve())+panel()+MIR(panel())+col()+MIR(col())};
}
function tWindbreaker(c,flat){
  const back = piece('M100,84 Q150,64 200,84 L206,238 L94,238 Z',shade(c,-.24),'')+piece('M119,64 Q150,52 181,64 L181,82 Q150,72 119,82 Z',c,'',seam('M121,70 Q150,58 179,70',LC,.6));
  const sleeve=()=>rot(piece('M100,84 C86,92 77,118 75,160 L71,238 L95,240 L97,172 C98,140 99,112 100,100 Z',c,'',seam('M72,228 L95,230',LC,.8)+seam('M72,231 L95,233',LC,.5,'1.2 1')+seam('M98,96 L84,104',LC,.4)),16,100,88,flat);
  const panel=()=>piece('M119,66 C112,74 106,78 100,84 C97,140 95,190 94,238 L141,238 L141,84 Z',c,'',
    seam('M139.5,84 V238',LC,.9,'1 .8')+seam('M100,112 Q120,117 141,112',LC,.7)+seam('M107,172 L116,204',LC,.9)+`<rect x="105.5" y="170" width="3" height="5" fill="#b8b8b4" stroke="${LC}" stroke-width=".5" ${NS}/>`
    +seam('M94,229 H141',LC,.7)+seam('M94,232 H141',LC,.5,'1.2 1'));
  const col=()=>piece('M119,64 L141,78 L141,94 L118,82 Z',c,'');
  const toggle=`<rect x="99" y="236" width="4" height="7" rx="1.5" fill="#3a3a3a" stroke="${LC}" stroke-width=".5" ${NS}/><path d="M101,233 V236" stroke="${LC}" stroke-width=".8" ${NS}/>`;
  return {back, front:sleeve()+MIR(sleeve())+panel()+MIR(panel())+col()+MIR(col())+toggle};
}
function tPuffer(c,flat){
  /* 패딩: 스탠드 칼라 · 가로 퀼팅 · 센터 지퍼 · 립 커프스 */
  const back = piece('M98,86 Q150,62 202,86 L208,248 L92,248 Z',shade(c,-.24),'')
    + piece('M116,56 Q150,44 184,56 L184,84 Q150,74 116,84 Z',c,'',seam('M118,64 Q150,52 182,64',LC,.6));
  let sq=''; for(const [y,x1,x2] of [[118,74,100],[146,71,99],[174,69,98],[202,67,97]]) sq+=seam(`M${x1},${y} Q${(x1+x2)/2},${y+5} ${x2},${y-1}`,LC,.8);
  const sleeve=()=>rot(piece('M100,82 C80,88 71,118 69,160 L65,232 L97,236 L99,170 C100,140 101,112 101,98 Z',c,'',sq+rib(62,100,226,240,c)),14,100,88,flat);
  let q=''; for(const y of [108,134,160,186,212]) q+=seam(`M93,${y} Q117,${y+6} 141,${y}`,LC,.85);
  const panel=()=>piece('M116,60 C109,68 103,77 98,86 C93,140 90,200 92,248 Q116,252 141,250 L141,80 Z',c,'',
    q+seam('M92,238 Q116,243 141,240',LC,.6)+seam('M139.5,80 V250',LC,.95,'1 .8')+seam('M103,190 L110,222',LC,.9));
  const col=()=>piece('M116,56 L141,68 L141,94 L115,84 Z',c,'',seam('M116,70 L141,81',LC,.5));
  const pull=`<rect x="138" y="96" width="4" height="9" rx="1.5" fill="#3a3a3a" stroke="${LC}" stroke-width=".5" ${NS}/>`;
  return {back, front:sleeve()+MIR(sleeve())+panel()+MIR(panel())+col()+MIR(col())+pull};
}
function tMac(c,flat){
  /* 맥코트: 싱글 브레스트 · 노치 라펠 · 무릎 길이 · 3버튼 · 사선 웰트 포켓 · 뒤 트임 없는 깔끔한 실루엣 */
  const back = `<path d="M126,72 Q150,64 174,72 L150,138 Z" fill="${innerC(c,flat)}" stroke="${edgeC(c)}" stroke-width="1" ${NS}/>`
    + piece('M121,74 Q150,60 179,74 L177,82 Q150,72 123,82 Z',shade(c,-.12),'');
  const sleeve=coatSleeve(c,flat);
  let btn=''; for(const y of [160,196,232]) btn+=dot(150,y,c,2.3);
  const body=piece('M126,72 L150,138 L174,72 C186,74 194,78 200,84 C204,150 207,230 210,318 L90,318 C93,230 96,150 100,84 C106,78 114,74 126,72 Z',c,'',
      seam('M155,138 L157,318',LC,.9)+seam('M91,309 H209',LC,.5)+btn
      +seam('M108,232 L119,262',LC,.9)+seam('M110,231 L121,261',LC,.4)+seam('M192,232 L181,262',LC,.9)+seam('M190,231 L179,261',LC,.4)
      +seam('M126,72 Q114,96 99,118',LC,.5)+seam('M174,72 Q186,96 201,118',LC,.5));
  const lapel=()=>piece('M126,72 L150,138 L140,128 L112,96 L121,92 L117,82 Z',c,'',seam('M117,82 L121,92',LC,.7)+seam('M121,92 L112,96',LC,.4));
  return {back, front:sleeve()+MIR(sleeve())+body+lapel()+MIR(lapel())};
}
function tCardigan(c,flat){
  const sleeve=longSleeve(c,flat,234,'rib');
  let btn='';for(const y of [152,172,192,212])btn+=dot(150,y,c,1.8);
  const body=piece('M126,76 L150,142 L174,76 L198,86 C200,130 200,190 200,235 L100,235 C100,190 100,130 102,86 Z',c,'',
    rib(96,204,220,236,c)+seam('M133,78 L150,126 L167,78',LC,.7)+seam('M150,142 V220',LC,.7)+btn
    +seam('M112,186 H134 V212 H112 Z',LC,.8)+seam('M166,186 H188 V212 H166 Z',LC,.8));
  const back=`<path d="M126,76 Q150,66 174,76 L172,96 L150,150 L128,96 Z" fill="${innerC(c,flat)}" stroke="${edgeC(c)}" stroke-width="1" ${NS}/>`;
  return {back, front:sleeve()+MIR(sleeve())+body};
}
function shoe(c,t){
  LC=lineC(c);
  if(t==='sneaker'){
    let lace='';for(let i=0;i<4;i++){const x=33+i*5.4,y=-21.2+i*2.4;lace+=`<path d="M${x-2.2},${y-1.6} L${x+2.4},${y+1.7}" stroke="${shade(c,.25)}" stroke-width="1.5" stroke-linecap="round"/>`+seam(`M${x-2.2},${y-1.6} L${x+2.4},${y+1.7}`,LC,.4);}
    return piece('M3,-7 C1,-17 3,-25 9,-28 L18,-27 C23,-25 27,-23 32,-22 L37,-21 C47,-18 55,-14 60,-9 L61,-7 Z',c,'',
        seam('M3,-7 C1,-17 3,-25 9,-28 L12,-28 C8,-22 7,-14 8,-7',LC,.6)+seam('M47,-17 Q54,-13 58,-8',LC,.6)+seam('M14,-27 C16,-19 20,-12 22,-7',LC,.5))
      +`<path d="M9.5,-27.4 L31.5,-22" stroke="${LC}" stroke-width="1.2" stroke-linecap="round"/>`+lace
      +piece('M0,-8 L60,-8 Q66,-8 65,-4 Q65,0 60,0 L4,0 Q0,0 0,-4 Z','#f6f4ee','',`<path d="M1,-4.2 L64.5,-4.2" stroke="#8c8a84" stroke-width=".7" ${NS}/>`);
  }
  const derby=t==='derby';
  const sole = lum(c)>.12? shade(c,-.55) : '#2a2a2a';
  return piece('M2,-5 C0,-13 2,-21 8,-24 L19,-23 C25,-21 31,-19 36,-18 C47,-15 56,-11 61,-6 Q63,-5 62,-4 L2,-4 Z',c,'',
      (derby? seam('M19,-23 C21,-16 23,-10 28,-5',LC,.8) : seam('M46,-15.5 Q49.5,-10 48,-4',LC,.9)+seam('M24,-21 C27,-15 30,-10 34,-6',LC,.6)))
    +`<path d="M9,-23 L35,-18" stroke="${LC}" stroke-width="1.2" stroke-linecap="round"/>`
    +(derby?`<path d="M33,-19 L38,-17.5 M34.5,-17.3 L39.5,-16" stroke="${LC}" stroke-width=".9"/>`:`<path d="M31,-19.5 L36,-18.5 M31.5,-18 L36.5,-17 M32,-16.5 L37,-15.5" stroke="${LC}" stroke-width=".7"/>`)
    +`<path d="M0,-4 L62,-4 Q64,-4 64,-2 L62,0 L2,0 Q0,0 0,-2 Z" fill="${sole}" stroke="#1a1a1a" stroke-width="1" ${NS}/><path d="M0,-4 L14,-4 L14,1 L1,1 Z" fill="${shade(sole,-.2)}" stroke="#1a1a1a" stroke-width="1" ${NS}/>`+seam('M16,-2 H60',lineC(sole),.6,'1.2 1');
}
// 착장형 위치(측면 페어) · 단독/플랫용 겹친 페어
const shoesGhost = it=>`<g transform="translate(156 392) scale(.95)">${shoe(it.color,it.t)}</g><g transform="translate(144 392) scale(-.95 .95)">${shoe(it.color,it.t)}</g>`;
const shoesPair = it=>`<g transform="translate(14 54) scale(1.12)">${shoe(it.color,it.t)}</g><g transform="translate(4 72) scale(1.12)">${shoe(it.color,it.t)}</g>`;

function tpl(it,flat){
  LC=lineC(it.color); const c=it.color;
  switch(it.t){
    case 'balmacaan': return tCoat(c,flat);
    case 'double': return tDouble(c,flat);
    case 'mac': return tMac(c,flat);
    case 'ma1': case 'harrington': case 'denimjk': return tBlouson(c,flat,it.t);
    case 'cardigan': return tCardigan(c,flat);
    case 'windbreaker': return tWindbreaker(c,flat);
    case 'puffer': return tPuffer(c,flat);
    case 'knit': case 'sweat': case 'hoodie': return tKnit(c,flat,it.t);
    case 'shirt': return tShirt(c,flat);
    case 'tee': return tTee(c,flat);
    case 'henley': return tTee(c,flat,true);
    case 'chino': case 'denim': case 'slacks': return tPants(c,it.t);
  }
  return {back:'',front:''};
}
const BB={mac:[64,58,236,324],puffer:[60,44,240,254],windbreaker:[66,50,234,246],balmacaan:[64,58,236,320],double:[64,58,236,326],ma1:[66,58,234,232],harrington:[66,56,234,232],denimjk:[66,58,234,232],cardigan:[74,66,226,240],
  tee:[74,66,226,232],henley:[74,66,226,234],shirt:[74,66,226,240],sweat:[74,66,226,234],hoodie:[74,32,226,234],knit:[74,66,226,234],chino:[96,198,204,378],denim:[96,198,204,378],slacks:[96,198,204,378]};
function bb(it,flat){
  let b=BB[it.t];
  if(!b) return [0,26,100,78];
  if(flat && it.cat!=='bottom'){ const e = it.cat==='outer'?44:52; b=[b[0]-e,b[1],b[2]+e,b[3]]; }
  return b;
}
const ghostShoeBB=[80,362,220,396];
function fit(b,slot,r=0,maxS=9){
  const bw=b[2]-b[0], bh=b[3]-b[1], s=Math.min(slot.w/bw, slot.h/bh, maxS);
  return `translate(${slot.x+slot.w/2} ${slot.y+slot.h/2}) rotate(${r}) scale(${s.toFixed(4)}) translate(${-(b[0]+b[2])/2} ${-(b[1]+b[3])/2})`;
}

/* ---------- 도식화 형태 목록 (세부 유형이 재사용하는 기본 형태) ---------- */
export const SHAPES = {
  outer:[['balmacaan','발마칸 코트'],['double','더블 코트'],['mac','맥코트'],['ma1','MA-1 블루종'],['harrington','해링턴 자켓'],['denimjk','데님 자켓'],['windbreaker','바람막이'],['puffer','패딩'],['cardigan','가디건']],
  top:[['tee','티셔츠'],['henley','롱슬리브'],['shirt','셔츠'],['sweat','스웨트셔츠'],['hoodie','후디'],['knit','니트']],
  bottom:[['chino','치노'],['denim','데님'],['slacks','슬랙스']],
  shoes:[['sneaker','스니커즈'],['dress','구두'],['derby','더비 슈즈']],
};
export const shapeOk = (cat,t)=> !!SHAPES[cat]?.some(([k])=>k===t);

/* 사진 URL 해석기: 저장소가 주입 (Blob → object URL) */
let photoOf = ()=>null;
export function setPhotoResolver(fn){ photoOf = fn; }
const attr = s=>String(s).replace(/"/g,'&quot;');

/* ---------- 단일 의류 썸네일 (스튜디오 배경) ---------- */
export function thumb(it){
  const url = it._photoUrl || photoOf(it);
  if(url) return `<img class="photo-img" src="${attr(url)}" alt="" loading="lazy" decoding="async">`;
  return drawing(it);
}
export function drawing(it){
  const isShoe = it.cat==='shoes';
  const b = isShoe? [0,26,100,78] : bb(it,false);
  const body = isShoe? shoesPair(it) : (t=>t.back+t.front)(tpl(it,false));
  const tr = fit(b,{x:10,y:12,w:280,h:376},0, isShoe?9:1.9);
  return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="300" height="400" fill="#f5f5f2"/><g transform="${tr}">${body}</g></svg>`;
}

/* ---------- 코디 이미지 합성 (착장형 · 고스트 마네킹) ----------
   사진이 있는 의류는 배경 제거 PNG를 같은 위치·순서의 레이어로 합성한다. */
const img = (url,b)=>`<image href="${attr(url)}" x="${b[0]}" y="${b[1]}" width="${b[2]-b[0]}" height="${b[3]-b[1]}" preserveAspectRatio="xMidYMid meet"/>`;
export function outfit(items, opt={}){
  const it={}; for(const k of CATS) if(items[k]) it[k]=items[k];
  const keys=CATS.filter(k=>it[k]);
  const bg=`<rect width="300" height="400" fill="#fff"/>`;
  if(!keys.length) return `<svg viewBox="0 0 300 400" aria-hidden="true">${bg}${opt.mini?'':'<text x="150" y="204" text-anchor="middle" font-size="11" fill="#9a9a96" font-family="Pretendard, sans-serif">의류를 선택하면 코디 이미지가 구성됩니다</text>'}</svg>`;
  const parts = {};
  for(const k of keys){
    const x=it[k], url=photoOf(x);
    if(url) parts[k] = {back:'', front:img(url, k==='shoes'? ghostShoeBB : bb(x,false))};
    else parts[k] = k==='shoes'? {back:'',front:shoesGhost(x)} : tpl(x,false);
  }
  const order = [parts.outer?.back, parts.shoes?.front, parts.bottom?.front, parts.top?.front, parts.outer?.front];
  let u=[999,999,-999,-999];
  for(const k of keys){const b=k==='shoes'?ghostShoeBB:bb(it[k],false);u=[Math.min(u[0],b[0]),Math.min(u[1],b[1]),Math.max(u[2],b[2]),Math.max(u[3],b[3])];}
  const tr = fit(u,{x:22,y:20,w:256,h:350},0,1.55);
  return `<svg viewBox="0 0 300 400" aria-hidden="true">${bg}<g transform="${tr}"><g>${order.join('')}</g></g></svg>`;
}
export { lum, shade };
