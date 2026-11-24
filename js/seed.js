/* 초기 데이터 — 사용자 옷 34벌 (시안 데이터 그대로, 착장 횟수는 0부터 시작) */
const L=[ // cat, sub, shape, name, colorName, hex, wash
  ['outer','코트','balmacaan','발마칸 코트','다크 네이비','#1f2637',15],
  ['outer','코트','double','더블 코트','블랙','#1c1c1e',15],
  ['outer','블루종','ma1','MA-1','올리브','#59593c',12],
  ['outer','자켓','denimjk','데님 자켓','블루','#5a78a0',15],
  ['outer','블루종','harrington','해링턴 자켓','브라운','#6e4b33',12],
  ['outer','바람막이','windbreaker','바람막이','블랙','#1c1c1e',10],
  ['outer','패딩','puffer','패딩','블랙','#1c1c1e',10],
  ['outer','가디건','cardigan','가디건','버건디','#5e2531',6],
  ['outer','가디건','cardigan','가디건','미디엄 그레이','#8a8a88',6],
  ['top','티셔츠','tee','티셔츠 1','화이트','#f4f3ef',2],
  ['top','티셔츠','tee','티셔츠 2','화이트','#f4f3ef',2],
  ['top','롱슬리브','henley','헨리넥 롱슬리브','블랙','#1c1c1e',3],
  ['top','롱슬리브','henley','헨리넥 롱슬리브','그레이','#9a9a98',3],
  ['top','샴브레이 셔츠','shirt','샴브레이 셔츠','라이트 인디고','#8fa3c0',3],
  ['top','샴브레이 셔츠','shirt','샴브레이 셔츠','다크 인디고','#3a4c70',3],
  ['top','스웨트셔츠','hoodie','후디드 스웨트셔츠','멜란지 그레이','#a5a5a2',4],
  ['top','스웨트셔츠','sweat','스웨트셔츠','오트밀','#d8cdb8',4],
  ['top','니트','knit','니트','네이비','#232c45',5],
  ['top','니트','knit','니트','차콜','#3b3b3e',5],
  ['bottom','치노','chino','치노','카키 1','#d2cfc6',6],
  ['bottom','치노','chino','치노','35 브라운','#cbb894',6],
  ['bottom','치노','chino','치노','36 브라운','#7a5638',6],
  ['bottom','치노','chino','치노','카키 2','#3f4a36',6],
  ['bottom','데님','denim','데님','67 블루','#5a78a0',10],
  ['bottom','데님','denim','데님','69 네이비','#26324d',10],
  ['bottom','슬랙스','slacks','슬랙스','라이트 브라운','#a8876a',6],
  ['bottom','슬랙스','slacks','슬랙스','네이비','#232c45',6],
  ['bottom','슬랙스','slacks','슬랙스','미디엄 그레이','#8a8a88',6],
  ['shoes','스니커즈','sneaker','스니커즈','크림','#ece4d0',15],
  ['shoes','스니커즈','sneaker','스니커즈','그레이','#9a9a98',15],
  ['shoes','구두','dress','구두','브라운','#6b4429',20],
  ['shoes','구두','dress','구두','오커','#a8742f',20],
  ['shoes','구두','dress','구두','블랙','#1c1c1e',20],
  ['shoes','구두','derby','더비 슈즈','블랙','#1c1c1e',20],
];
export function seedItems(){
  const pre={outer:'o',top:'t',bottom:'b',shoes:'s'}, n={outer:0,top:0,bottom:0,shoes:0}, now=Date.now();
  return L.map((r,i)=>({id:pre[r[0]]+(++n[r[0]]), cat:r[0], sub:r[1], t:r[2], name:r[3], colorName:r[4], color:r[5], wash:r[6],
    base:0, baseSince:0, washedAt:null, created:now+i, order:i, hasPhoto:false}));
}
export const SEED_COUNT = L.length;
export const SEED_PUFFER = L.find(r=>r[2]==='puffer');
