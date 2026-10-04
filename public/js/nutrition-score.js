import {nutritionFacts,validNutrient} from './food-model.js';
export function calculateNutritionScore(p){
 const facts=nutritionFacts(p),n=p.nutriments||{},per100={};
 const required=['energy-kcal','sugars','saturated-fat','sodium','fiber','proteins'];
 for(const k of required){let v=n[k+'_100g'];if(!validNutrient(v)&&k==='sodium'&&validNutrient(n.salt_100g))v=n.salt_100g/2.5;if(!validNutrient(v)&&k==='energy-kcal'&&validNutrient(n['energy-kj_100g']))v=n['energy-kj_100g']/4.184;if(!validNutrient(v)&&facts.quantity&&validNutrient(facts.values[k]))v=facts.values[k]*100/facts.quantity;per100[k]=validNutrient(v)?v:null;}
 const missing=required.filter(k=>per100[k]===null);
 if(p.requires_confirmation||missing.length||facts.issues.length)return {score:null,missing,issues:facts.issues,components:[],method:'RePlate v1'};
 const points=(v,limits)=>limits.filter(t=>v>t).length;
 const components=[['Energy',points(per100['energy-kcal']*4.184,[335,670,1005,1340,1675,2010,2345,2680,3015,3350])],['Total sugar',points(per100.sugars,[4.5,9,13.5,18,22.5,27,31,36,40,45])],['Saturated fat',points(per100['saturated-fat'],[1,2,3,4,5,6,7,8,9,10])],['Sodium',points(per100.sodium*1000,[90,180,270,360,450,540,630,720,810,900])]];
 const negative=components.reduce((sum,[,v])=>sum+v,0),fiber=points(per100.fiber,[.9,1.9,2.8,3.7,4.7]),protein=negative<11?points(per100.proteins,[1.6,3.2,4.8,6.4,8]):0;
 const raw=negative-fiber-protein,anchors=[[-10,100],[0,80],[2,70],[10,50],[18,25],[40,0]];
 let score=raw<=-10?100:0;for(let i=1;i<anchors.length;i++){const [x,y]=anchors[i],[prevX,prevY]=anchors[i-1];if(raw>prevX&&raw<=x){score=Math.round(prevY+(raw-prevX)/(x-prevX)*(y-prevY));break;}}
 return {score,raw,missing:[],issues:[],per100,components:[...components.map(([name,points])=>({name,points,kind:'limit'})),{name:'Fiber',points:fiber,kind:'benefit'},{name:'Protein',points:protein,kind:'benefit'}],method:'RePlate v1',limitations:'General-food estimate using original nutrient-profile thresholds. No fruit/vegetable bonus or special beverage, cheese, oil, or infant-food adjustment. Not an official Nutri-Score or Yuka rating.'};
}
