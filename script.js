const app=document.getElementById('app');
const data=window.SCRAPBOOK_DATA;
let currentCategory=null,currentIndex=0,touchStartX=0;
let zoom=1,panX=0,panY=0,pointerStart=null,pinchStart=null;
function topbar(){return `<header class="topbar"><div class="topbar-inner"><button class="brand" onclick="showContents()"><img src="images/ui/tristan-portrait.jpg" alt=""><span>Tristan's scrapbook</span></button><nav class="nav-actions" aria-label="Main"><button class="text-btn" onclick="showContents()">Contents</button><button class="text-btn" onclick="showEnding()">Be seeing you</button></nav></div></header>`}
function showCover(){document.title='Tristan — Remember me';app.innerHTML=`<section class="screen cover fade-in"><div><button class="portrait-button" aria-label="Open Tristan's scrapbook" onclick="showContents()"><img class="portrait" src="images/ui/tristan-portrait.jpg" alt="Portrait of Tristan"></button><h1 class="cover-phrase">Remember me</h1><div class="hint">Touch the portrait</div></div></section>`;scrollTo(0,0)}
function showContents(){closeViewer();document.title="Tristan's scrapbook";let cards=data.categories.map((c,i)=>`<button class="chapter" onclick="showGallery(${i})"><img src="${c.cover}" alt=""><span class="chapter-copy"><span class="chapter-name">${esc(c.name)}</span><span class="chapter-count">${c.count} photographs</span></span></button>`).join('');cards+=`<button class="chapter placeholder" onclick="showPlaceholder()"><span class="chapter-copy"><span class="chapter-name">Screenshots and text</span><span class="chapter-count">To be added later</span></span></button>`;app.innerHTML=`${topbar()}<section class="contents fade-in"><h1>Tristan</h1><p class="intro">Choose a chapter, then touch any photograph to see it full size.</p><div class="chapter-grid">${cards}</div></section>`;scrollTo(0,0)}
function showGallery(i){currentCategory=i;const c=data.categories[i];document.title=`${c.name} — Tristan`;app.innerHTML=`${topbar()}<section class="gallery fade-in"><div class="gallery-heading"><h1>${esc(c.name)}</h1><div class="gallery-meta">${c.count} photographs</div></div><div class="photo-grid">${c.items.map((p,j)=>`<button class="thumb" onclick="openViewer(${j})" aria-label="View ${esc(p.caption)}"><img loading="lazy" src="${p.thumb}" alt="${esc(p.caption)}"></button>`).join('')}</div></section>`;scrollTo(0,0)}
function showPlaceholder(){document.title='Screenshots and text — Tristan';app.innerHTML=`${topbar()}<section class="contents fade-in"><h1>Screenshots and text</h1><p class="intro">This chapter has been left aside for now, ready for Sian to consider once the rest of the scrapbook has taken shape.</p></section>`;scrollTo(0,0)}
function openViewer(i){currentIndex=i;renderViewer();document.addEventListener('keydown',viewerKeys);}
function renderViewer(){
  resetZoom();
  const c=data.categories[currentCategory],p=c.items[currentIndex];
  document.querySelector('.viewer')?.remove();
  const v=document.createElement('div');
  v.className='viewer';
  v.innerHTML=`<div class="viewerbar"><button class="viewer-btn close-viewer" aria-label="Close">×</button><div class="viewer-count">${currentIndex+1} of ${c.items.length}</div><button class="viewer-btn contents-viewer" aria-label="Contents">⌂</button></div><div class="viewer-stage"><button class="arrow prev" aria-label="Previous">‹</button><img src="${p.src}" alt="${esc(p.caption)}" draggable="false"><button class="arrow next" aria-label="Next">›</button><div class="caption">${esc(p.caption)}</div><div class="zoom-help">Wheel or double-click to zoom</div></div>`;
  document.body.appendChild(v);
  const stage=v.querySelector('.viewer-stage'),img=v.querySelector('img');
  v.querySelector('.close-viewer').addEventListener('click',closeViewer);
  v.querySelector('.contents-viewer').addEventListener('click',showContents);
  v.querySelector('.prev').addEventListener('click',()=>step(-1));
  v.querySelector('.next').addEventListener('click',()=>step(1));
  stage.addEventListener('wheel',onWheel,{passive:false});
  stage.addEventListener('dblclick',()=>setZoom(zoom>1?1:2));
  stage.addEventListener('pointerdown',onPointerDown);
  stage.addEventListener('pointermove',onPointerMove);
  stage.addEventListener('pointerup',onPointerUp);
  stage.addEventListener('pointercancel',onPointerUp);
  stage.addEventListener('touchstart',onTouchStart,{passive:false});
  stage.addEventListener('touchmove',onTouchMove,{passive:false});
  stage.addEventListener('touchend',onTouchEnd,{passive:false});
  img.addEventListener('load',fitImageToStage);
  window.addEventListener('resize',fitImageToStage,{once:true});
}
function resetZoom(){zoom=1;panX=0;panY=0;pointerStart=null;pinchStart=null}
function fitImageToStage(){const stage=document.querySelector('.viewer-stage'),img=stage?.querySelector('img');if(!stage||!img||!img.naturalWidth)return;const w=stage.clientWidth,h=stage.clientHeight;const fit=Math.min(w/img.naturalWidth,h/img.naturalHeight);img.style.width=`${Math.floor(img.naturalWidth*fit)}px`;img.style.height=`${Math.floor(img.naturalHeight*fit)}px`;applyTransform()}
function applyTransform(){const stage=document.querySelector('.viewer-stage'),img=stage?.querySelector('img');if(!img)return;img.style.transform=`translate(calc(-50% + ${panX}px),calc(-50% + ${panY}px)) scale(${zoom})`;stage.classList.toggle('zoomed',zoom>1.01)}
function setZoom(next){zoom=Math.max(1,Math.min(5,next));if(zoom===1){panX=0;panY=0}applyTransform()}
function onWheel(e){e.preventDefault();setZoom(zoom*(e.deltaY<0?1.15:0.87))}
function onPointerDown(e){if(zoom<=1)return;pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY,panX,panY};e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.classList.add('dragging')}
function onPointerMove(e){if(!pointerStart||pointerStart.id!==e.pointerId)return;panX=pointerStart.panX+(e.clientX-pointerStart.x);panY=pointerStart.panY+(e.clientY-pointerStart.y);applyTransform()}
function onPointerUp(e){if(pointerStart?.id===e.pointerId)pointerStart=null;e.currentTarget.classList.remove('dragging')}
function distance(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
function onTouchStart(e){if(e.touches.length===2){pinchStart={distance:distance(e.touches[0],e.touches[1]),zoom};e.preventDefault()}else if(e.touches.length===1){touchStartX=e.touches[0].screenX}}
function onTouchMove(e){if(e.touches.length===2&&pinchStart){e.preventDefault();setZoom(pinchStart.zoom*distance(e.touches[0],e.touches[1])/pinchStart.distance)}}
function onTouchEnd(e){if(e.touches.length<2)pinchStart=null;if(zoom<=1&&e.changedTouches.length){const dx=e.changedTouches[0].screenX-touchStartX;if(Math.abs(dx)>45)step(dx<0?1:-1)}}
function step(n){const len=data.categories[currentCategory].items.length;currentIndex=(currentIndex+n+len)%len;renderViewer()}
function closeViewer(){document.querySelector('.viewer')?.remove();document.removeEventListener('keydown',viewerKeys);resetZoom()}
function viewerKeys(e){if(e.key==='Escape')closeViewer();if(e.key==='ArrowRight'&&zoom===1)step(1);if(e.key==='ArrowLeft'&&zoom===1)step(-1);if(e.key==='+'||e.key==='=')setZoom(zoom*1.2);if(e.key==='-')setZoom(zoom/1.2);if(e.key==='0')setZoom(1)}
function showEnding(){closeViewer();document.title='Tristan — Be seeing you';app.innerHTML=`<section class="screen ending fade-in"><div class="ending-wrap"><img class="portrait" src="images/ui/tristan-portrait.jpg" alt="Portrait of Tristan"><h1 class="end-phrase">Be seeing you</h1><div class="end-options"><button class="end-link" onclick="showCover()">Remember me again</button><button class="end-link" onclick="finish()">Be seeing you</button></div></div></section>`;scrollTo(0,0)}
function finish(){app.innerHTML=`<section class="screen goodbye"><p>Be seeing you.</p></section>`;document.title='Be seeing you'}
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
showCover();
