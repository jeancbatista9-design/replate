import {test} from 'node:test';import assert from 'node:assert/strict';
import {foodIcon,whole,nutritionFacts,displayNutrient} from '../public/js/food-model.js';import {assessProduct} from '../public/js/premium-model.js';
test('nutrition display rounds facts and keeps missing values unknown',()=>{assert.equal(whole(6.3),'6');assert.equal(whole(56.7),'57');assert.equal(whole(undefined),'—');assert.equal(whole(NaN),'—');});
test('product icons identify familiar foods and never invent produce for unknown names',()=>{assert.equal(foodIcon('Nutella'),'🍫');assert.equal(foodIcon('Greek yogurt'),'🥣');assert.equal(foodIcon('Mystery brand'),'📦');});
test('servings prefer provided label values and scale only when serving size is known',()=>{
 const chips={serving_size:'About 15 chips (28g)',nutriments:{'energy-kcal_100g':565,'energy-kcal_serving':160,sodium_100g:.607,proteins_100g:7}};
 assert.equal(nutritionFacts(chips).values['energy-kcal'],160);
 delete chips.nutriments['energy-kcal_serving'];const facts=nutritionFacts(chips);assert.equal(displayNutrient('energy-kcal',facts.values['energy-kcal'],facts.basis),'160');assert.equal(displayNutrient('sodium',facts.values.sodium,facts.basis),'170');
 assert.equal(nutritionFacts({nutriments:chips.nutriments}).basis,'100g');assert.equal(displayNutrient('energy-kcal',565,'100g'),'565');
});
test('review uses serving Daily Values, goals, and unknown facts rather than an arbitrary health score',()=>{
 const p={serving_quantity:28,nutriments:{'energy-kcal_serving':160,proteins_serving:2,fiber_serving:1,sodium_serving:.17,'saturated-fat_serving':1.5,'added-sugars_serving':0}};
 const profile=goal=>[{name:'Alex',allergies:[],goal}];assert.equal(assessProduct(p,profile('protein')).goalChecks[0].fit,false);assert.equal(assessProduct(p,profile('sugar')).goalChecks[0].fit,true);assert.equal(assessProduct(p,profile('protein')).score,null);
 assert.equal(assessProduct({...p,nutriments:{...p.nutriments,sodium_serving:undefined}},profile('sodium')).verdict,'Not enough information');
 assert.equal(assessProduct({...p,nutriments:{...p.nutriments,sodium_serving:1}},profile('sodium')).verdict,'Compare alternatives');
 assert.equal(assessProduct({...p,allergens_tags:['en:peanuts']},[{name:'Alex',allergies:['peanuts'],goal:'protein'}]).verdict,'Avoid for this household');
 assert.equal(assessProduct(p,profile('sugar')).verdict,assessProduct(p,profile('sugar'),[{status:'active',name:p.product_name||'Chips'}]).verdict);
});

test('conflicting database energy and macros block an affirmative review',()=>{const p={serving_quantity:28,nutriments:{'energy-kcal_serving':158,'energy-kj_serving':187,fat_serving:2.8,carbohydrates_serving:4.2,proteins_serving:.56,fiber_serving:.28,sodium_serving:.056,'added-sugars_serving':0,'saturated-fat_serving':.42}};assert.ok(nutritionFacts(p).issues.length);assert.equal(assessProduct(p,[{name:'Alex',goal:'balanced',allergies:[]}]).verdict,'Verify the package label');});

test('calculated score changes with nutrients rather than provider grades',()=>{
 const p={product_name:'Test food',nutriscore_grade:'a',serving_quantity:100,nutriments:{'energy-kcal_100g':100,fat_100g:0,carbohydrates_100g:15,sugars_100g:0,proteins_100g:10,fiber_100g:6,sodium_100g:.1,'saturated-fat_100g':0}};
 const base=assessProduct(p);assert.ok(base.score>=80);assert.equal(assessProduct({...p,nutriscore_grade:'e'}).score,base.score);assert.equal(assessProduct({...p,nutriscore_grade:undefined}).score,base.score);
 assert.equal(assessProduct({...p,nutriments:{}}).score,null);assert.equal(assessProduct({...p,nutriments:{...p.nutriments,'energy-kcal_100g':700}}).score,null);
 const allergy=assessProduct({...p,allergens_tags:['en:milk']},[{name:'Alex',allergies:['milk'],goal:'protein'}]);assert.equal(allergy.score,base.score);assert.equal(allergy.purchase,'Avoid for this household');assert.equal(assessProduct(p,[],[{name:'Test food',status:'active'}]).score,base.score);
});
