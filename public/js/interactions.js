// Delegated feedback survives screen re-renders and covers mouse, touch, and keyboard.
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function feedback(button,x,y){
 if(button.disabled||reduced.matches)return;
 button.animate([{transform:'scale(1)'},{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:210,easing:'ease-out'});
 const pulse=document.createElement('span');pulse.className='tap-feedback';pulse.setAttribute('aria-hidden','true');pulse.style.left=x+'px';pulse.style.top=y+'px';
 const modal=button.closest('dialog');(modal||document.body).appendChild(pulse);
 const motion=pulse.animate([{transform:'translate(-50%,-50%) scale(.25)',opacity:.28},{transform:'translate(-50%,-50%) scale(1.9)',opacity:0}],{duration:380,easing:'ease-out'});
 motion.onfinish=()=>pulse.remove();motion.oncancel=()=>pulse.remove();
}
export function enableInteractions(){
 document.addEventListener('pointerdown',event=>{const button=event.target.closest('button');if(button)feedback(button,event.clientX,event.clientY);},{capture:true});
 document.addEventListener('click',event=>{if(event.detail!==0)return;const button=event.target.closest('button');if(button){const rect=button.getBoundingClientRect();feedback(button,rect.left+rect.width/2,rect.top+rect.height/2);}},{capture:true});
}
