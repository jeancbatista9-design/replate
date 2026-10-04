export const recipes = [
  {id:'green-pasta',name:'Garden green pasta',emoji:'🍝',minutes:20,category:'Italian',ingredients:['pasta','spinach','tomato'],allergens:['gluten'],diet:'vegan',steps:['Boil pasta according to the package. Reserve a cup of cooking water.','Sauté chopped tomatoes in olive oil for 5 minutes. Add spinach and wilt.','Toss with pasta and a splash of cooking water. Season and serve.']},
  {id:'omelet',name:'The clean-out-the-fridge omelet',emoji:'🍳',minutes:15,category:'Breakfast',ingredients:['egg','spinach','cheese'],allergens:['eggs','milk'],diet:'vegetarian',steps:['Chop your vegetables and sauté until tender.','Whisk eggs, pour into the pan and cook over medium-low heat.','Add cheese, fold when the eggs are fully set, and serve.']},
  {id:'rice-bowl',name:'Roasted broccoli rice bowl',emoji:'🥦',minutes:30,category:'Bowls',ingredients:['broccoli','rice','carrot'],allergens:[],diet:'vegan',steps:['Cook rice according to the package.','Roast chopped broccoli and carrots with olive oil at 425°F for 20 minutes.','Serve vegetables over rice with lemon and your favorite dressing.']},
  {id:'parfait',name:'Berry breakfast parfait',emoji:'🍓',minutes:5,category:'Breakfast',ingredients:['yogurt','strawberr','banana'],allergens:['milk'],diet:'vegetarian',steps:['Wash and slice the fruit.','Layer yogurt and fruit in a bowl or glass.','Add seeds or your favorite topping and serve.']},
  {id:'toast',name:'Peanut butter banana toast',emoji:'🍌',minutes:5,category:'Breakfast',ingredients:['bread','peanut butter','banana'],allergens:['gluten','peanuts'],diet:'vegan',steps:['Toast your bread.','Spread with peanut butter.','Top with banana slices and a pinch of cinnamon.']},
  {id:'soup',name:'Anything-goes vegetable soup',emoji:'🥕',minutes:25,category:'One pot',ingredients:['carrot','tomato','spinach'],allergens:[],diet:'vegan',steps:['Dice vegetables and sauté the firm ones for 5 minutes.','Add tomatoes, water or broth, and simmer for 15 minutes.','Stir in leafy greens, cook until tender, and season.']}
];
export const today = (offset=0) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+offset*86400000));
export function daysLeft(expiry) { return Math.round((Date.parse(expiry+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000); }
export function recommendations(items, profiles) {
  const active=items.filter(i=>i.status==='active');
  return recipes.map(r=>{
    const used=active.filter(i=>r.ingredients.some(k=>i.name.toLowerCase().includes(k)));
    const missing=r.ingredients.filter(k=>!active.some(i=>i.name.toLowerCase().includes(k)));
    const warnings=profiles.flatMap(p=>{
      const conflicts=p.allergies.filter(a=>r.allergens.includes(a));
      if(p.diet==='vegan'&&r.diet!=='vegan') conflicts.push('vegan preference');
      return conflicts.length?[`${p.name}: ${conflicts.join(', ')}`]:[];
    });
    return {...r,used:used.map(i=>i.id),missing,warnings,score:used.length*10+used.filter(i=>daysLeft(i.expiry)<=3).length*5};
  }).sort((a,b)=>a.warnings.length-b.warnings.length||b.score-a.score);
}
export function validateItem(body) {
  const {name,category='other',storage='fridge',quantity=1,unit='items',price=0,expiry,allergens=[]}=body;
  if(typeof name!=='string'||!name.trim()||name.length>120) throw new Error('Enter a food name (up to 120 characters).');
  if(!['fridge','freezer','pantry'].includes(storage)) throw new Error('Choose fridge, freezer, or pantry.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(expiry||'')||!Number.isFinite(Date.parse(expiry))||new Date(expiry).toISOString().slice(0,10)!==expiry) throw new Error('Enter a valid package or estimated date.');
  if(!Number.isFinite(+quantity)||+quantity<=0||+quantity>10000||!Number.isFinite(+price)||+price<0||+price>100000) throw new Error('Enter a valid quantity and total price.');
  if(!Array.isArray(allergens)||allergens.some(a=>typeof a!=='string'||a.length>40)||allergens.length>20) throw new Error('Invalid allergen list.');
  if(typeof category!=='string'||category.length>40||typeof unit!=='string'||unit.length>30) throw new Error('Invalid category or unit.');
  return {name:name.trim(),category,storage,quantity:+quantity,unit,price:+price,expiry,allergens};
}
