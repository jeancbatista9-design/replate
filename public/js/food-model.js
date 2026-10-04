export const goals={balanced:'Balanced Eating',protein:'More Protein',fiber:'More Fiber',sugar:'Less Sugar',sodium:'Less Sodium'};
export function whole(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0?String(Math.round(value)):'—';}
export function foodIcon(product){
 const name=String(typeof product==='string'?product:product.product_name||'').toLowerCase();
 const rules=[[/nutella|chocolate spread|hazelnut spread/,'🍫'],[/peanut butter|nut butter/,'🥜'],[/cereal|granola|oatmeal|yogurt|yoghurt/,'🥣'],[/chocolate|cocoa/,'🍫'],[/cookie|biscuit/,'🍪'],[/ice cream/,'🍨'],[/chips|crisps/,'🥔'],[/soda|cola|soft drink/,'🥤'],[/coffee/,'☕'],[/tea\b/,'🍵'],[/juice/,'🧃'],[/water/,'💧'],[/spinach|lettuce|salad/,'🥬'],[/strawberr/,'🍓'],[/blueberr/,'🫐'],[/apple/,'🍎'],[/orange/,'🍊'],[/lemon/,'🍋'],[/avocado/,'🥑'],[/egg/,'🥚'],[/broccoli/,'🥦'],[/pasta|spaghetti|noodle/,'🍝'],[/tomato/,'🍅'],[/rice/,'🍚'],[/bread|toast/,'🍞'],[/banana/,'🍌'],[/milk/,'🥛'],[/carrot/,'🥕'],[/peanut|almond|nut/,'🥜'],[/chicken/,'🍗'],[/cheese/,'🧀'],[/fish|salmon|tuna/,'🐟'],[/beef|steak/,'🥩']];
 return rules.find(([pattern])=>pattern.test(name))?.[1]||'📦';
}
export const nutrientKeys=['energy-kcal','fat','saturated-fat','carbohydrates','sugars','added-sugars','fiber','proteins','sodium'];
export const validNutrient=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
export function nutritionFacts(p){
 const n=p.nutriments||{},size=String(p.serving_size||''),match=size.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
 const quantity=validNutrient(p.serving_quantity)&&p.serving_quantity>0?p.serving_quantity:match?Number(match[1].replace(',','.')):null;
 const hasServing=quantity!==null||nutrientKeys.some(k=>validNutrient(n[k+'_serving']));
 const basis=hasServing?'serving':'100g',values={},estimated=[];
 const read=(k,suffix)=>{if(validNutrient(n[k+'_'+suffix]))return n[k+'_'+suffix];if(k==='energy-kcal'&&validNutrient(n['energy-kj_'+suffix]))return n['energy-kj_'+suffix]/4.184;if(k==='sodium'&&validNutrient(n['salt_'+suffix]))return n['salt_'+suffix]/2.5;return null;};
 for(const k of nutrientKeys){let value=read(k,basis);if(value===null&&hasServing&&quantity!==null){const per100=read(k,'100g');if(per100!==null){value=per100*quantity/100;estimated.push(k);}}values[k]=value;}
 const issues=[];
 const mass=basis==='100g'?100:quantity;
 if(mass&&['fat','carbohydrates','proteins','sugars','fiber','saturated-fat','sodium'].some(k=>validNutrient(values[k])&&values[k]>mass+.5))issues.push('A nutrient exceeds the weight of the stated portion. Check the units.');
 if(validNutrient(values.fat)&&validNutrient(values['saturated-fat'])&&values['saturated-fat']>values.fat+.5)issues.push('Saturated fat exceeds total fat.');
 const kcal=values['energy-kcal'];
 if(validNutrient(kcal)&&['fat','carbohydrates','proteins'].every(k=>validNutrient(values[k]))){const macro=9*values.fat+4*values.carbohydrates+4*values.proteins;if(kcal>30&&Math.abs(macro-kcal)/kcal>.4)issues.push('Calories and the listed fat, carbohydrate, and protein values do not agree.');}
 const kj=read('energy-kj',basis);if(validNutrient(kcal)&&validNutrient(kj)&&kcal>30&&Math.abs(kj/4.184-kcal)/kcal>.3)issues.push('The database lists conflicting kcal and kJ energy values.');
 return {basis,quantity,issues,label:hasServing?'Per Serving'+(size?' · '+size:quantity?' · '+quantity+' g':' · Size Not Listed'):'Per 100 g / 100 ml · Serving Size Unavailable',values,estimated};
}
export function displayNutrient(key,value,basis){if(!validNutrient(value))return '—';if(key==='sodium')return whole(value*1000);if(key==='energy-kcal'&&basis==='serving')return String(value>50?Math.round(value/10)*10:value>=5?Math.round(value/5)*5:0);return whole(value);}
