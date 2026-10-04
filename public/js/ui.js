import {foodIcon} from './food-model.js';
export const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
export const date = (offset=0) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+offset*86400000));
export const days = expiry => Math.round((Date.parse(expiry+'T00:00:00Z')-Date.parse(date()+'T00:00:00Z'))/86400000);
export const emoji = foodIcon;
export function icon(name){const paths={home:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',kitchen:'M5 3h14v18H5z M5 10h14 M8 6v1 M8 13v3',scan:'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M7 8v8 M11 8v8 M14 8v8 M17 8v8',meals:'M4 3v7a3 3 0 0 0 6 0V3 M7 3v18 M18 3v18 M18 3c-5 4-5 9 0 9',shopping:'M3 3h3l3 12h10l2-8H7 M10 20h.01 M18 20h.01',impact:'M4 20v-5 M10 20V9 M16 20V4 M22 20H2',household:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M18 5a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4',plus:'M12 5v14 M5 12h14',arrow:'M5 12h14 M13 6l6 6-6 6',check:'m5 12 4 4 10-10',leaf:'M20 3C8 2 3 10 6 16s14 7 14-13z M5 21 15 9'};return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.leaf}"/></svg>`;}
export function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}
let modalScroll=0,modalHash='';
export function modal(html){const el=document.querySelector('#modal');if(!el.open){modalScroll=window.scrollY;modalHash=location.hash;document.body.style.top=`-${modalScroll}px`;document.body.classList.add('modal-open');document.documentElement.classList.add('modal-open');}
el.innerHTML=`<button class="close" aria-label="Close dialog">×</button>${html}`;el.scrollTop=0;el.querySelector('.close').onclick=()=>el.close();if(!el.open)el.showModal();
el.onclose=()=>{if(el.open)return;document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open');document.body.style.top='';window.scrollTo(0,location.hash===modalHash?modalScroll:0);};
el.onclick=e=>{if(e.target===el){const r=el.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)el.close();}};}

export const title = value => String(value??'').replace(/\b[a-z]/g,c=>c.toUpperCase());

export function ingredientsMarkup(text){
 if(!text?.trim())return '<section class="product-ingredients"><h3>Ingredients</h3><p class="ingredients-empty">Ingredient information is unavailable. Check your package.</p></section>';
 const parts=[];let depth=0,start=0;
 for(let i=0;i<text.length;i++){if('(['.includes(text[i]))depth++;else if(')]'.includes(text[i]))depth=Math.max(0,depth-1);else if(text[i]===','&&depth===0){parts.push(text.slice(start,i).trim());start=i+1;}}
 parts.push(text.slice(start).trim());const ingredients=parts.filter(Boolean);
 const list=items=>'<ul class="ingredient-list">'+items.map(item=>'<li>'+esc(item.toUpperCase())+'</li>').join('')+'</ul>';
 return '<section class="product-ingredients"><div class="ingredients-heading"><h3>Ingredients</h3><span>As listed on the product</span></div>'+list(ingredients.slice(0,6))+(ingredients.length>6?'<details class="ingredients-more"><summary>View '+(ingredients.length-6)+' More Ingredients</summary>'+list(ingredients.slice(6))+'</details>':'')+'</section>';
}
