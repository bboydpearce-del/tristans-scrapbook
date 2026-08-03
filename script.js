const app=document.getElementById('app');
const data=window.SCRAPBOOK_DATA;
if(!app) throw new Error('Gallery could not find the #app element.');
if(!data || !Array.isArray(data.categories)) throw new Error('Gallery data did not load.');
let currentCategory=0,currentIndex=0,isViewing=false,activeMountedPhoto=null;
let albumInteractionLocked=false;

const BOOKS=[
 {l:2.5,t:17.2,w:22.1,h:37.2,r:-1.5},
 {l:25.0,t:17.0,w:22.0,h:33.5,r:-1},
 {l:45.8,t:15.8,w:23.4,h:35.0,r:-1},
 {l:68.5,t:22.6,w:25.0,h:32.8,r:1},
 {l:2.5,t:50.7,w:28.0,h:44.0,r:-1},
 {l:27.7,t:49.2,w:23.8,h:42.0,r:-1},
 {l:49.7,t:49.0,w:24.4,h:40.5,r:-1},
 {l:73.3,t:55.0,w:25.5,h:39.3,r:.5}
];

// Geometry of the visible album inside each transparent cover PNG.  The cover
// photographs are not identical rectangles: each was cut from the desk at a
// slightly different angle and aspect ratio.  The reader must use that same
// physical geometry rather than forcing every album into one universal shape.
const COVER_GEOMETRY=[
 {ratio:347.467/318.213,angle:-5.711,sx:361/318.213,sy:381/347.467},
 {ratio:332.758/310.371,angle:-6.511,sx:357/310.371,sy:360/332.758},
 {ratio:347.704/308.741,angle:-9.462,sx:373/308.741,sy:352/347.704},
 {ratio:335.135/364.879,angle:-5.641,sx:408/364.879,sy:345/335.135},
 {ratio:393.370/387.636,angle:-6.143,sx:427/387.636,sy:439/393.370},
 {ratio:394.554/330.801,angle:-7.125,sx:386/330.801,sy:431/394.554},
 {ratio:381.725/344.135,angle:-5.932,sx:391/344.135,sy:417/381.725},
 {ratio:381.263/358.219,angle:-8.471,sx:415/358.219,sy:387/381.263}
];

function showCover(){showDesk()}

function showDesk(){
 albumInteractionLocked=false;
 closePhoto(false);
 document.title="Tristan's Gallery";
 const books=data.categories.map((c,i)=>`<button class="desk-book desk-book-${i+1}" data-book="${i}" aria-label="Open ${esc(c.name)}"><span>${esc(c.name)}</span></button>`).join('');
 app.innerHTML=`<section class="desk-screen"><div class="desk-frame"><img class="desk-image" src="images/ui/album-desk.png" alt="Eight photograph albums arranged on a wooden writing desk"><div class="desk-hotspots">${books}</div></div></section>`;
 const deskScreen=app.querySelector('.desk-screen');
 const settleDeskSize=()=>{
  const viewport=window.visualViewport;
  const vw=Math.round(viewport?.width || document.documentElement.clientWidth || innerWidth);
  const vh=Math.round(viewport?.height || document.documentElement.clientHeight || innerHeight);
  deskScreen.style.setProperty('--desk-vw',`${vw}px`);
  deskScreen.style.setProperty('--desk-vh',`${vh}px`);
  deskScreen.classList.add('desk-size-ready');
 };
 // Do not expose an oversized provisional frame. Measure after the browser has
 // completed its opening layout, then reveal the desk at its final pixel size.
 requestAnimationFrame(()=>requestAnimationFrame(settleDeskSize));
 app.querySelectorAll('.desk-book').forEach(b=>b.addEventListener('click',e=>openAlbum(Number(b.dataset.book),b)));
}

function openAlbum(i,button){
 // Acquire one global lock before doing any layout or animation work. Without
 // this, two rapid clicks on different desk books can create two independent
 // flyers, which then stack over one another and leave the reader frozen.
 if(albumInteractionLocked) return;
 albumInteractionLocked=true;
 app.querySelectorAll('.desk-book').forEach(bookButton=>{
  bookButton.disabled=true;
  bookButton.setAttribute('aria-disabled','true');
 });
 currentCategory=i; currentIndex=0;
 // Use the hotspot's unrotated box within the desk, not its transformed
 // axis-aligned bounding rectangle.  The album PNG already contains the book
 // at its photographed desk angle; measuring the rotated hotspot and then
 // rotating the flyer again caused the visible snap at pickup.
 const frame=button.closest('.desk-frame');
 const fr=frame.getBoundingClientRect();
 const geometry=BOOKS[i];
 const br={
  left:fr.left+(fr.width*geometry.l/100),
  top:fr.top+(fr.height*geometry.t/100),
  width:fr.width*geometry.w/100,
  height:fr.height*geometry.h/100
 };
 // The two remaining cut-outs (albums 4 and 7) are lifted inside a
 // transparent padded shell.  The visible image keeps exactly the same desk
 // geometry, but the browser receives extra raster space around it so the
 // rotated lower edge cannot be clipped by the compositing boundary.
 const paddedFlyer=(i===3 || i===6);
 const flyer=document.createElement(paddedFlyer?'div':'img');
 flyer.className='album-flyer album-flyer-smooth'+(paddedFlyer?' album-flyer-padded':'');
 let flyerImage=null;
 const flyerPad=paddedFlyer?18:0;
 if(paddedFlyer){
  flyerImage=document.createElement('img');
  flyerImage.className='album-flyer-padded-image';
  flyerImage.src=`images/ui/albums/album-${i+1}.png`;
  flyerImage.alt='';
  flyer.appendChild(flyerImage);
 }else{
  flyer.src=`images/ui/albums/album-${i+1}.png`;
  flyer.alt='';
 }
 // The desk album is baked into the desk photograph, whereas the moving
 // album is a separately cut image. Their painted edges are not pixel-identical,
 // so an instantaneous opaque substitution always produces a visible snap.
 // Begin the cut-out transparent and blend it in over the first part of the lift.
 flyer.style.left=`${br.left-flyerPad}px`;
 flyer.style.top=`${br.top-flyerPad}px`;
 flyer.style.opacity='0';
 flyer.style.width=`${br.width+flyerPad*2}px`;
 flyer.style.height=`${br.height+flyerPad*2}px`;
 flyer.style.transformOrigin=paddedFlyer?`${flyerPad}px ${flyerPad}px`:'top left';
 if(flyerImage){
  flyerImage.style.left=`${flyerPad}px`;
  flyerImage.style.top=`${flyerPad}px`;
  flyerImage.style.width=`${br.width}px`;
  flyerImage.style.height=`${br.height}px`;
 }
 document.body.appendChild(flyer);
 button.style.visibility='hidden';
 app.querySelector('.desk-screen')?.classList.add('desk-receding');

 const ratio=br.height/br.width;
 const targetW=Math.min(innerWidth*.46,560);
 const targetH=targetW*ratio;
 const targetLeft=(innerWidth-targetW)/2;
 const targetTop=Math.max(42,(innerHeight-targetH)/2);
 const dx=targetLeft-br.left;
 const dy=targetTop-br.top;
 const scale=targetW/br.width;

 const lift=flyer.animate([
  {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',filter:'drop-shadow(0 8px 8px rgba(0,0,0,.18))',opacity:0},
  {offset:.08,transform:`translate3d(${dx*.012}px,${dy*.012}px,0) scale(${1+(scale-1)*.008}) rotate(-.04deg)`,filter:'drop-shadow(0 9px 9px rgba(0,0,0,.20))',opacity:.45},
  {offset:.18,transform:`translate3d(${dx*.055}px,${dy*.055}px,0) scale(${1+(scale-1)*.045}) rotate(-.15deg)`,filter:'drop-shadow(0 11px 10px rgba(0,0,0,.25))',opacity:1},
  {offset:.72,transform:`translate3d(${dx*.79}px,${dy*.79}px,0) scale(${1+(scale-1)*.79}) rotate(-1.7deg)`,filter:'drop-shadow(0 28px 25px rgba(0,0,0,.50))',opacity:1},
  {transform:`translate3d(${dx}px,${dy}px,0) scale(${scale}) rotate(-1.5deg)`,filter:'drop-shadow(0 34px 30px rgba(0,0,0,.58))',opacity:1}
 ],{
  duration:1500,
  easing:'cubic-bezier(.42,0,.18,1)',
  fill:'forwards'
 });

 lift.finished.then(()=>{
  // Keep the original desk and the exact same lifted image on screen. Replacing
  // them with a second "held" scene caused the desk to snap in geometry and
  // brightness at the moment the lift finished.
  lift.commitStyles();
  lift.cancel();
  flyer.classList.add('album-flyer-waiting');
  flyer.setAttribute('role','button');
  flyer.setAttribute('tabindex','0');
  flyer.setAttribute('aria-label',`Open ${data.categories[i].name}`);

  const open=()=>{
   if(flyer.dataset.opening==='true')return;
   flyer.dataset.opening='true';
   flyer.classList.remove('album-flyer-waiting');

   // Create the reader with its own cover still closed. The lifted cover then
   // hands over to that closed cover before any opening movement begins. This
   // prevents two covers being visible while one of them rotates.
   const book=renderAlbum(i,'handoff');
   const current=flyer.style.transform;
   const commit=flyer.animate([
    {transform:current,opacity:1},
    {transform:current,opacity:0}
   ],{duration:140,easing:'linear',fill:'forwards'});
   commit.finished.then(()=>{
    flyer.remove();
    requestAnimationFrame(()=>requestAnimationFrame(()=>book?.beginOpening?.()));
   }).catch(()=>{
    flyer.remove();
    book?.beginOpening?.();
   });
  };
  flyer.addEventListener('click',open,{once:true});
  flyer.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
 }).catch(()=>{
  flyer.remove();
  albumInteractionLocked=false;
  showDesk();
 });
}

function photoPage(itemIndex, side){
 const c=data.categories[currentCategory];
 if(itemIndex<0 || itemIndex>=c.items.length){
  return `<div class="page-inner page-inner-${side}"><div class="album-title-page"><span class="title-rule"></span><p>${itemIndex<0?'Photographs of Tristan':'End of album'}</p></div></div>`;
 }
 const p=c.items[itemIndex];
 return `<div class="page-inner page-inner-photo">
  <button class="mounted-photo" data-item="${itemIndex}" type="button" aria-label="View ${esc(p.caption)} in full colour">
   <img src="${p.src}" alt="${esc(p.caption)}" draggable="false">
  </button>
 </div>`;
}

function blankAlbumPage(side){
 return `<div class="page-inner page-inner-${side}" aria-hidden="true"></div>`;
}

function makeSheets(c){
 const count=c.items.length;
 return Array.from({length:count},(_,sheetIndex)=>{
  const turned=sheetIndex<currentIndex;
  const z=turned ? 30+sheetIndex : 200-sheetIndex;
  return `<div class="book-sheet ${turned?'is-turned':''}" data-sheet="${sheetIndex}" style="z-index:${z}">
   <div class="sheet-side sheet-side-front">${photoPage(sheetIndex,'right')}</div>
   <div class="sheet-side sheet-side-back">${blankAlbumPage('left')}</div>
  </div>`;
 }).join('');
}

function renderAlbum(i,opening=false){
 const c=data.categories[i];
 const sheetCount=c.items.length;
 currentIndex=Math.max(0,Math.min(currentIndex,sheetCount));
 document.title=`${c.name} — Tristan's Gallery`;
 app.innerHTML=`<section class="reader-screen">
  <div class="reader-desk" aria-hidden="true"><img src="images/ui/album-desk.png" alt=""></div>
  <button class="reader-close" type="button" aria-label="Return to albums">Albums</button>
  <div class="album-stage">
   <div class="open-album" style="--book-ratio:${COVER_GEOMETRY[i].ratio.toFixed(4)};--cover-correction:${(-COVER_GEOMETRY[i].angle).toFixed(3)}deg;--cover-scale-x:${COVER_GEOMETRY[i].sx.toFixed(4)};--cover-scale-y:${COVER_GEOMETRY[i].sy.toFixed(4)}" aria-label="Open ${esc(c.name)} photograph album">
    <div class="book-shadow" aria-hidden="true"></div>
    <div class="back-cover back-cover-left" aria-hidden="true"></div>
    <div class="back-cover back-cover-right" aria-hidden="true"></div>
    <div class="left-page-anchor" aria-hidden="true"></div>
    <div class="page-stack page-stack-right" aria-hidden="true"></div>
    <article class="album-page album-page-right base-page-right">${photoPage(c.items.length,'right')}</article>
    <div class="sheet-stack">${makeSheets(c)}</div>
    <button class="photo-hit-area" type="button" aria-label="View current photograph in full colour"></button>
    <div class="book-spine" aria-hidden="true"></div>
    <div class="front-cover" aria-hidden="true"><img src="images/ui/albums/album-${i+1}.png" alt="" draggable="false"><div class="cover-inside"></div></div>
   </div>
  </div>
  <button class="page-arrow page-prev" type="button" aria-label="Previous sheet" ${currentIndex===0?'disabled':''}><span aria-hidden="true"><img src="images/ui/page-turn-motif.png" alt=""></span></button>
  <button class="page-arrow page-next" type="button" aria-label="Next sheet" ${currentIndex>=sheetCount?'disabled':''}><span aria-hidden="true"><img src="images/ui/page-turn-motif.png" alt=""></span></button>
 </section>`;
 app.querySelector('.reader-close').addEventListener('click',showDesk);
 bindMountedPhotos();
 app.querySelector('.page-prev').addEventListener('click',()=>turnPage(-1));
 app.querySelector('.page-next').addEventListener('click',()=>turnPage(1));
 updatePhotoHitArea();
 const book=app.querySelector('.open-album');

 // The blank left page is intentionally not present in the DOM while the
 // album is closed.  It is created only after the front cover has actually
 // begun to move, preventing any single-frame glimpse during the handoff.
 const addLeftPage=()=>{
  if(!book || book.querySelector('.base-page-left')) return;
  const anchor=book.querySelector('.left-page-anchor');
  if(!anchor) return;
  anchor.insertAdjacentHTML('afterend',
   `<div class="page-stack page-stack-left" aria-hidden="true"></div>
    <article class="album-page album-page-left base-page-left"><div class="page-inner page-inner-left" aria-label="Blank inside cover"></div></article>`
  );
 };
 const beginOpening=()=>{
  if(!book) return;
  book.classList.add('is-open');
  setTimeout(addLeftPage,220);
 };

 if(opening===true){setTimeout(beginOpening,260)}
 else if(opening==='handoff'){book.beginOpening=beginOpening}
 else {addLeftPage(); book?.classList.add('is-open')}
 addSwipe(book);
 return book;
}

function bindMountedPhotos(){
 // Photo clicks are handled once at document level. Keeping this function
 // allows the album renderer to remain unchanged.
}

function getCurrentVisibleMountedPhoto(){
 const c=data.categories[currentCategory];
 if(!c || currentIndex<0 || currentIndex>=c.items.length) return null;
 return app.querySelector(`.book-sheet[data-sheet="${currentIndex}"] .mounted-photo`);
}

function pointInsideRect(x,y,r){
 return x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
}

function handleMountedPhotoClick(e){
 if(isViewing) return;
 let mounted=e.target.closest && e.target.closest('.mounted-photo');
 // In a 3-D transformed page stack the browser can report an invisible sheet
 // as the click target. Fall back to the photograph's actual screen rectangle.
 if(!mounted){
  const visible=getCurrentVisibleMountedPhoto();
  const img=visible&&visible.querySelector('img');
  if(img){
   const r=img.getBoundingClientRect();
   if(pointInsideRect(e.clientX,e.clientY,r)) mounted=visible;
  }
 }
 if(!mounted || !document.body.contains(mounted)) return;
 e.preventDefault();
 e.stopImmediatePropagation();
 const itemIndex=Number(mounted.dataset.item);
 if(Number.isInteger(itemIndex)) openPhoto(itemIndex,mounted);
}
document.addEventListener('click',handleMountedPhotoClick,true);
window.openPhoto=openPhoto;

function openCurrentPhoto(){
 const c=data.categories[currentCategory];
 if(currentIndex<0 || currentIndex>=c.items.length)return;
 const mounted=app.querySelector(`.book-sheet[data-sheet="${currentIndex}"] .mounted-photo`);
 if(mounted) openPhoto(currentIndex,mounted);
}

function updatePhotoHitArea(){
 const btn=app.querySelector('.photo-hit-area');
 const c=data.categories[currentCategory];
 if(!btn)return;
 const available=currentIndex>=0 && currentIndex<c.items.length;
 btn.disabled=!available;
 btn.setAttribute('aria-label',available?`View ${c.items[currentIndex].caption} in full colour`:'No photograph on this page');
}

function updateSheetControls(){
 const c=data.categories[currentCategory];
 const sheetCount=c.items.length;
 const prev=app.querySelector('.page-prev');
 const next=app.querySelector('.page-next');
 if(prev) prev.disabled=currentIndex===0;
 if(next) next.disabled=currentIndex>=sheetCount;
 updatePhotoHitArea();
}

function turnPage(dir){
 const c=data.categories[currentCategory];
 const sheetCount=c.items.length;
 const target=currentIndex+dir;
 if(target<0 || target>sheetCount)return;
 const book=app.querySelector('.open-album');
 if(!book || book.classList.contains('is-turning'))return;
 const sheetIndex=dir>0?currentIndex:currentIndex-1;
 const sheet=book.querySelector(`.book-sheet[data-sheet="${sheetIndex}"]`);
 if(!sheet)return;
 book.classList.add('is-turning');
 sheet.style.zIndex='400';
 // Force layout before changing the transform so the browser performs a true turn.
 void sheet.offsetWidth;
 if(dir>0) sheet.classList.add('is-turned');
 else sheet.classList.remove('is-turned');
 currentIndex=target;
 updateSheetControls();
 const finish=()=>{
  sheet.removeEventListener('transitionend',finish);
  const idx=Number(sheet.dataset.sheet);
  sheet.style.zIndex=sheet.classList.contains('is-turned')?String(30+idx):String(200-idx);
  book.classList.remove('is-turning');
 };
 sheet.addEventListener('transitionend',finish);
 setTimeout(finish,700);
}

function elementPositionWithin(el, ancestor){
 let x=0,y=0,node=el;
 while(node && node!==ancestor){
  x+=node.offsetLeft||0;
  y+=node.offsetTop||0;
  node=node.offsetParent;
 }
 return {x,y};
}

function openPhoto(itemIndex,mounted){
 if(isViewing)return;
 const sourceImg=mounted&&mounted.querySelector('img');
 if(!sourceImg)return;
 const begin=()=>{
  const p=data.categories[currentCategory].items[itemIndex];
  const sourceRect=sourceImg.getBoundingClientRect();
  if(!sourceRect.width||!sourceRect.height)return;

  isViewing=true;
  activeMountedPhoto=mounted;
  mounted.style.visibility='hidden';

  // The full-colour photograph now lives in an independent viewport layer.
  // It is not a child of the transformed album, so the browser can render the
  // source image at full resolution without inheriting book perspective.
  const overlay=document.createElement('div');
  overlay.className='viewport-photo-overlay';

  const backdrop=document.createElement('button');
  backdrop.type='button';
  backdrop.className='viewport-photo-backdrop';
  backdrop.setAttribute('aria-label','Return photograph to album');

  const flight=document.createElement('button');
  flight.type='button';
  flight.className='viewport-photo-flight';
  flight.setAttribute('aria-label','Return photograph to album');
  Object.assign(flight.style,{
   left:`${sourceRect.left}px`,top:`${sourceRect.top}px`,
   width:`${sourceRect.width}px`,height:`${sourceRect.height}px`
  });

  const cloneImg=document.createElement('img');
  cloneImg.src=p.src;
  cloneImg.alt=p.caption||'';
  flight.appendChild(cloneImg);

  const caption=document.createElement('p');
  caption.className='viewport-photo-caption';
  caption.textContent=p.caption;

  overlay.append(backdrop,flight,caption);
  document.body.appendChild(overlay);

  const dismiss=e=>{e.preventDefault();e.stopPropagation();closePhoto(true)};
  backdrop.addEventListener('click',dismiss);
  document.addEventListener('keydown',photoKey);

  // Independent touch zoom/pan for the full-resolution photograph.
  // A still tap closes it; one-finger movement pans only while zoomed;
  // two fingers pinch smoothly between the fitted size and 4×.
  const gesture={
   pointers:new Map(),scale:1,panX:0,panY:0,
   startScale:1,startPanX:0,startPanY:0,startDistance:0,
   startCentreX:0,startCentreY:0,singleStartX:0,singleStartY:0,
   moved:false
  };
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const applyGesture=(animate=false)=>{
   const maxX=Math.max(0,flight.clientWidth*(gesture.scale-1)/2);
   const maxY=Math.max(0,flight.clientHeight*(gesture.scale-1)/2);
   gesture.panX=clamp(gesture.panX,-maxX,maxX);
   gesture.panY=clamp(gesture.panY,-maxY,maxY);
   flight.style.transition=animate?'transform .22s ease-out':'none';
   flight.style.setProperty('--photo-zoom',gesture.scale.toFixed(4));
   flight.style.setProperty('--photo-pan-x',gesture.panX.toFixed(2)+'px');
   flight.style.setProperty('--photo-pan-y',gesture.panY.toFixed(2)+'px');
   flight.classList.toggle('is-zoomed',gesture.scale>1.01);
   if(animate)setTimeout(()=>{if(flight)flight.style.transition='none'},240);
  };
  const resetGesture=(animate=true)=>{
   gesture.scale=1;gesture.panX=0;gesture.panY=0;gesture.moved=false;
   applyGesture(animate);
  };
  const pointerValues=()=>Array.from(gesture.pointers.values());
  const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  const centre=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});

  flight.addEventListener('pointerdown',e=>{
   e.preventDefault();e.stopPropagation();
   flight.setPointerCapture?.(e.pointerId);
   gesture.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   gesture.moved=false;
   const pts=pointerValues();
   if(pts.length===1){
    gesture.singleStartX=e.clientX;gesture.singleStartY=e.clientY;
    gesture.startPanX=gesture.panX;gesture.startPanY=gesture.panY;
   }else if(pts.length===2){
    gesture.startDistance=Math.max(1,distance(pts[0],pts[1]));
    const c=centre(pts[0],pts[1]);
    gesture.startCentreX=c.x;gesture.startCentreY=c.y;
    gesture.startScale=gesture.scale;
    gesture.startPanX=gesture.panX;gesture.startPanY=gesture.panY;
   }
  });
  flight.addEventListener('pointermove',e=>{
   if(!gesture.pointers.has(e.pointerId))return;
   e.preventDefault();e.stopPropagation();
   gesture.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   const pts=pointerValues();
   if(pts.length>=2){
    const d=Math.max(1,distance(pts[0],pts[1]));
    const c=centre(pts[0],pts[1]);
    gesture.scale=clamp(gesture.startScale*(d/gesture.startDistance),1,4);
    gesture.panX=gesture.startPanX+(c.x-gesture.startCentreX);
    gesture.panY=gesture.startPanY+(c.y-gesture.startCentreY);
    gesture.moved=true;
    applyGesture(false);
   }else if(pts.length===1&&gesture.scale>1.01){
    const dx=pts[0].x-gesture.singleStartX;
    const dy=pts[0].y-gesture.singleStartY;
    if(Math.abs(dx)>2||Math.abs(dy)>2)gesture.moved=true;
    gesture.panX=gesture.startPanX+dx;
    gesture.panY=gesture.startPanY+dy;
    applyGesture(false);
   }
  });
  const finishPointer=e=>{
   if(!gesture.pointers.has(e.pointerId))return;
   e.preventDefault();e.stopPropagation();
   const wasSingle=gesture.pointers.size===1;
   const point=gesture.pointers.get(e.pointerId);
   if(wasSingle&&point){
    const travel=Math.hypot(point.x-gesture.singleStartX,point.y-gesture.singleStartY);
    if(travel>6)gesture.moved=true;
   }
   gesture.pointers.delete(e.pointerId);
   try{flight.releasePointerCapture?.(e.pointerId)}catch(_){ }
   const pts=pointerValues();
   if(pts.length===1){
    gesture.singleStartX=pts[0].x;gesture.singleStartY=pts[0].y;
    gesture.startPanX=gesture.panX;gesture.startPanY=gesture.panY;
   }
   if(gesture.pointers.size===0){
    if(gesture.scale<1.02)resetGesture(true);
    if(wasSingle&&!gesture.moved&&gesture.scale<=1.01)closePhoto(true);
    gesture.moved=false;
   }
  };
  flight.addEventListener('pointerup',finishPointer);
  flight.addEventListener('pointercancel',finishPointer);
  flight.addEventListener('lostpointercapture',e=>gesture.pointers.delete(e.pointerId));

  const placeTarget=()=>{
   const vw=window.innerWidth, vh=window.innerHeight;
   const naturalW=cloneImg.naturalWidth||sourceRect.width;
   const naturalH=cloneImg.naturalHeight||sourceRect.height;
   const ratio=naturalW/naturalH;
   const maxW=vw*.94;
   const maxH=vh*.82;
   let targetW=maxW, targetH=targetW/ratio;
   if(targetH>maxH){targetH=maxH;targetW=targetH*ratio;}
   const targetLeft=(vw-targetW)/2;
   const targetTop=Math.max(10,(vh-targetH)/2-12);
   const target={left:targetLeft,top:targetTop,width:targetW,height:targetH};

   const move=flight.animate([
    {left:`${sourceRect.left}px`,top:`${sourceRect.top}px`,width:`${sourceRect.width}px`,height:`${sourceRect.height}px`},
    {left:`${target.left}px`,top:`${target.top}px`,width:`${target.width}px`,height:`${target.height}px`}
   ],{duration:620,easing:'cubic-bezier(.2,.72,.2,1)',fill:'forwards'});
   const colour=cloneImg.animate([
    {filter:'sepia(.78) saturate(.62) contrast(.92) brightness(1.04)'},
    {offset:.55,filter:'sepia(.15) saturate(.92) contrast(.99) brightness(1.01)'},
    {filter:'none'}
   ],{duration:620,easing:'ease-out',fill:'forwards'});
   move.onfinish=()=>{
 caption.style.left='50%';
 caption.style.top=(target.top+target.height+12)+'px';
 caption.style.bottom='auto';
 caption.classList.add('shown');
};
   mounted._photoState={overlay,flight,cloneImg,backdrop,caption,dismiss,move,colour,target};
  };

  if(cloneImg.complete&&cloneImg.naturalWidth)placeTarget();
  else cloneImg.addEventListener('load',placeTarget,{once:true});
 };
 if(sourceImg.complete&&sourceImg.naturalWidth)begin();
 else sourceImg.addEventListener('load',begin,{once:true});
}

function closePhoto(animate=true){
 const mounted=activeMountedPhoto;
 if(!mounted){isViewing=false;return}
 document.removeEventListener('keydown',photoKey);
 const st=mounted._photoState;
 const finish=()=>{
  mounted.style.visibility='';
  st?.overlay?.remove();
  delete mounted._photoState;
  isViewing=false;activeMountedPhoto=null;
 };
 if(!animate||!st){finish();return}
 st.caption?.classList.remove('shown');
 st.flight?.style.setProperty('--photo-zoom','1');
 st.flight?.style.setProperty('--photo-pan-x','0px');
 st.flight?.style.setProperty('--photo-pan-y','0px');
 st.flight?.classList.remove('is-zoomed');
 st.move?.cancel();st.colour?.cancel();
 const sourceImg=mounted.querySelector('img');
 const r=(sourceImg||mounted).getBoundingClientRect();
 const cs=getComputedStyle(st.flight);
 const from={left:cs.left,top:cs.top,width:cs.width,height:cs.height};
 const move=st.flight.animate([
  from,
  {left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`}
 ],{duration:560,easing:'cubic-bezier(.33,.02,.18,1)',fill:'forwards'});
 st.cloneImg.animate([
  {filter:'none'},
  {offset:.62,filter:'sepia(.20) saturate(.88) contrast(.98) brightness(1.02)'},
  {filter:'sepia(.78) saturate(.62) contrast(.92) brightness(1.04)'}
 ],{duration:560,easing:'ease-in',fill:'forwards'});
 const fade=st.backdrop.animate([{opacity:1},{offset:.45,opacity:1},{opacity:0}],{duration:560,fill:'forwards'});
 move.onfinish=finish;
}

function photoKey(e){if(e.key==='Escape'||e.key==='Enter'||e.key===' ')closePhoto(true)}

function addSwipe(el){
 let startX=0,startY=0;
 el.addEventListener('pointerdown',e=>{startX=e.clientX;startY=e.clientY});
 el.addEventListener('pointerup',e=>{const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy))turnPage(dx<0?1:-1)});
}

function showEnding(){
 closePhoto(false);
 document.title='Tristan — Be seeing you';
 app.innerHTML=`<section class="screen ending"><div class="ending-wrap"><img class="portrait" src="images/ui/tristan-portrait.jpg" alt="Portrait of Tristan"><h1 class="end-phrase">Be seeing you</h1><button class="end-link" type="button">Remember me again</button></div></section>`;
 app.querySelector('.end-link').addEventListener('click',showDesk);
}

function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
showDesk();
