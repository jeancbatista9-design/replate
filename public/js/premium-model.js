import {calculateNutritionScore} from './nutrition-score.js';
import {goals,whole,nutritionFacts,validNutrient} from './food-model.js';
export const tiers={free:{name:'RePlate Free',monthly:0,profiles:2},plus:{name:'RePlate+',monthly:4.99,annual:39.99,profiles:6},family:{name:'RePlate Family',monthly:7.99,profiles:12}};
export function assessProduct(p,profiles=[],items=[]){
 const facts=nutritionFacts(p),n=facts.issues.length?{}:facts.values,serving=facts.basis==='serving';
 const tags=(p.allergens_tags||[]).map(a=>a.replace(/^en:/,'').replaceAll('-',' '));
 const conflicts=profiles.flatMap(m=>(m.allergies||[]).filter(a=>tags.includes(a)).map(a=>`${m.name}: ${a}`));
 const name=(p.product_name||'').toLowerCase(),duplicate=!!name&&items.some(i=>i.status==='active'&&(i.name.toLowerCase().includes(name)||name.includes(i.name.toLowerCase())));
 const reasons=[...facts.issues],dailyValues={'saturated-fat':20,sodium:2.3,'added-sugars':50,fiber:28};
 const dv=key=>serving&&validNutrient(n[key])?n[key]/dailyValues[key]*100:null;
 const labels={'saturated-fat':'Saturated fat',sodium:'Sodium','added-sugars':'Added sugar',fiber:'Fiber'};
 const signals=Object.keys(dailyValues).map(key=>({key,label:labels[key],percent:dv(key)}));
 for(const s of signals)if(s.percent!==null)reasons.push(`${s.label}: ${Math.round(s.percent)}% Daily Value per serving${s.percent>=20?' · high':s.percent<=5?' · low':''}.`);
 const high=signals.filter(s=>s.key!=='fiber'&&s.percent!==null&&s.percent>=20);
 const goalChecks=profiles.map(m=>{const goal=m.goal||'balanced';let fit=null,text;
 if(goal==='balanced'){const available=['saturated-fat','sodium','added-sugars','fiber'].every(k=>dv(k)!==null);fit=available?(high.length?false:dv('fiber')>=10):null;text=high.length?'high in '+high.map(s=>s.label.toLowerCase()).join(', '):available?(fit?'contributes fiber without high saturated fat, sodium, or added sugar':'limited fiber contribution; compare with more nutrient-dense options'):'not enough serving-level facts for an overall judgment';}
 else if(goal==='sodium'||goal==='fiber'){const percent=dv(goal);fit=percent===null?null:goal==='sodium'?percent<=5:percent>=20;text=percent===null?'serving-level facts are missing':Math.round(percent)+'% Daily Value per serving · '+(fit?'fits this goal':'compare alternatives');}
 else if(goal==='protein'){const value=n.proteins;fit=serving&&validNutrient(value)?value>=10:null;text=fit===null?'protein per serving is missing':whole(value)+' g protein per serving · '+(fit?'meets your 10 g comparison target':'below your 10 g comparison target');}
 else if(goal==='sugar'){const percent=dv('added-sugars');fit=percent===null?null:percent<=5;text=percent===null?'added sugar per serving is missing; total sugar cannot establish added sugar':Math.round(percent)+'% Daily Value added sugar per serving · '+(fit?'fits this goal':'compare alternatives');}
 return {name:m.name,goal:goals[goal],fit,text:m.name+' · '+goals[goal]+': '+text+'.'};
 });
 reasons.push(...goalChecks.map(g=>g.text));
 const missing=Object.keys(dailyValues).filter(k=>!validNutrient(n[k]));if(missing.length)reasons.push((facts.issues.length?'Unverified facts withheld: ':'Missing facts: ')+missing.map(k=>labels[k].toLowerCase()).join(', ')+'. Unknown values are not zero.');
 if(!serving)reasons.push('Serving size is missing. These facts are per 100 g / 100 ml; no serving-based Daily Values or goal verdict can be calculated.');
 if(conflicts.length)reasons.unshift('Listed allergen conflicts: '+conflicts.join('; '));
 const dietWarnings=profiles.filter(m=>m.diet==='vegan'&&tags.some(a=>['milk','eggs','fish','shellfish'].includes(a))).map(m=>m.name+' prefers vegan foods');reasons.push(...dietWarnings);
 if(duplicate)reasons.push('Already in your kitchen: check your stock before buying. This does not change the nutrition assessment.');
 const calculated=calculateNutritionScore(p),score=calculated.score,grade=score===null?'':score>=80?'a':score>=70?'b':score>=50?'c':score>=25?'d':'e';
 const rating=score===null?'Unrated':grade==='a'?'Excellent':grade==='b'?'Good':grade==='c'?'Moderate':grade==='d'?'Poor':'Very Poor';
 const tone=score===null?'unknown':grade==='a'?'excellent':grade==='b'?'good':grade==='c'?'moderate':'poor';
 const purchase=conflicts.length?'Avoid for this household':dietWarnings.length?'Does not fit dietary preferences':facts.issues.length?'Verify the package label':score===null?'Not enough data to rate':score<50?'Look for a better-rated alternative':goalChecks.some(g=>g.fit===false)?'Compare alternatives for your goals':goalChecks.some(g=>g.fit===null)?'Check your goal fit before buying':score>=70?'A stronger nutritional choice':'Consider occasionally; compare alternatives';
 if(score===null&&!facts.issues.length)reasons.push('Finish your rating by confirming the core facts from a nutrition-label photo. A database grade is not needed.');
 const unmet=goalChecks.some(g=>g.fit===false),unknown=goalChecks.some(g=>g.fit===null)||!serving||missing.length>0;
 return {score,calculated,rating,tone,purchase,grade,conflicts,reasons,goalChecks,signals,facts,duplicate,verdict:conflicts.length?'Avoid for this household':dietWarnings.length?'Does not fit dietary preferences':facts.issues.length?'Verify the package label':high.length||unmet?'Compare alternatives':unknown?'Not enough information':goalChecks.length?'Fits your selected goals':'Review the nutrition facts'};
}
