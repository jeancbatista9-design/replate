import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../server/index.js';
import {openDatabase} from '../server/db.js';
import {validateItem,recommendations,today} from '../server/domain.js';
test('validation rejects impossible dates, negative prices and empty names',()=>{
 for(const body of [{name:'',expiry:today()},{name:'Eggs',expiry:'2026-02-30'},{name:'Eggs',expiry:today(),price:-1}])assert.throws(()=>validateItem(body));
});
test('recipes rank household conflicts last and prioritize urgent inventory',()=>{
 const result=recommendations([{id:'1',name:'Spinach',status:'active',expiry:today()}],[{name:'Sam',diet:'vegan',allergies:['peanuts']}]);
 assert.equal(result[0].id,'green-pasta');assert.ok(result.find(r=>r.id==='toast').warnings.length);assert.ok(result.find(r=>r.id==='omelet').warnings.length);
});
test('persistent workflows, authorization and household isolation',async()=>{
 const db=openDatabase(':memory:'),server=createApp(db);server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 let cookie='';const call=async(path,method='GET',body,customCookie=cookie)=>{const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:customCookie},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 try{
  assert.equal((await call('/state')).status,401);
  assert.equal((await call('/demo-session','POST',{})).status,200);
  assert.equal((await call('/demo','POST',{})).status,201);
  assert.equal((await call('/demo','POST',{})).status,409);
  let s=(await call('/state')).data;assert.equal(s.items.length,8);assert.equal(s.profiles.length,2);
  const id=s.items[0].id;await call('/items/'+id,'PATCH',{status:'eaten'});assert.equal((await call('/state')).data.items.find(i=>i.id===id).status,'eaten');
  await call('/shopping','POST',{name:'Carrots'});s=(await call('/state')).data;const shopping=s.shopping[0].id;await call('/shopping/'+shopping,'PATCH',{checked:true});
  assert.equal((await call('/checkout','POST',{storage:'fridge',expiry:today()})).status,200);
  s=(await call('/state')).data;assert.equal(s.shopping.length,0);assert.ok(s.items.some(i=>i.name==='Carrots'));
  await call('/plans','POST',{day:today(),recipe:'green-pasta'});assert.equal((await call('/state')).data.plans.length,1);
  const demoCookie=cookie;
  assert.equal((await call('/auth/register','POST',{name:'Other',email:'other@example.com',password:'a-long-password'})).status,200);
  assert.equal((await call('/state')).data.items.length,0);
  assert.equal((await call('/items/'+id,'PATCH',{status:'wasted'})).status,404);
  assert.equal((await call('/state','GET',undefined,demoCookie)).data.items.find(i=>i.id===id).status,'eaten');
  assert.equal((await call('/products?code=bad')).status,400);
  assert.equal((await call('/auth/logout','POST',{})).status,200);assert.equal((await call('/state')).status,401);
  assert.equal((await call('/auth/login','POST',{email:'other@example.com',password:'wrong-password'})).status,401);
  assert.equal((await call('/auth/login','POST',{email:'other@example.com',password:'a-long-password'})).status,200);
 }finally{server.close();await once(server,'close');db.close();}
});

test('demo subscriptions persist, unlock planning and preserve data on cancellation',async()=>{
 const db=openDatabase(':memory:'),server=createApp(db);server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;let cookie='';
 const call=async(path,method='GET',body)=>{const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 try{await call('/demo-session','POST',{});await call('/demo','POST',{});
 assert.equal((await call('/state')).data.subscription.plan,'free');
 assert.equal((await call('/assistant/plan','POST',{})).status,403);
 assert.equal((await call('/profiles','POST',{name:'Child',allergies:[],diet:'none'})).status,403);
 assert.equal((await call('/subscription','POST',{plan:'family',cycle:'annual'})).status,400);
 assert.equal((await call('/subscription','POST',{plan:'plus',cycle:'annual'})).status,200);
 assert.equal((await call('/state')).data.subscription.cycle,'annual');
 assert.equal((await call('/assistant/plan','POST',{})).status,200);
 let s=(await call('/state')).data;assert.equal(s.plans.length,7);assert.ok(s.plans.every(p=>p.recipe!=='toast'));
 await call('/assistant/shopping','POST',{});const count=(await call('/state')).data.shopping.length;assert.ok(count>0);
 await call('/assistant/shopping','POST',{});assert.equal((await call('/state')).data.shopping.length,count);
 await call('/profiles','POST',{name:'Child',allergies:['milk'],diet:'none',goal:'protein'});
 assert.equal((await call('/state')).data.profiles.find(p=>p.name==='Child').goal,'protein');
 assert.equal((await call('/profiles','POST',{name:'Invalid goal',goal:'unknown'})).status,400);
 await call('/subscription','POST',{plan:'free',cycle:'monthly'});s=(await call('/state')).data;
 assert.equal(s.items.length,8);assert.equal(s.profiles.length,3);assert.equal(s.plans.length,7);assert.equal(s.shopping.length,count);
 assert.equal((await call('/assistant/shopping','POST',{})).status,403);
 const manifest=await fetch(base+'/manifest.webmanifest');assert.match(manifest.headers.get('content-type'),/manifest/);assert.equal((await manifest.json()).display,'standalone');
 }finally{server.close();await once(server,'close');db.close();}
});

test('personalized scan scores keep allergen conflicts and missing data visible',async()=>{
 const {assessProduct}=await import('../public/js/premium-model.js');
 const p={product_name:'Peanut cereal',allergens_tags:['en:peanuts'],nutriments:{sugars_100g:18,proteins_100g:7,fiber_100g:4}};
 const result=assessProduct(p,[{name:'Sam',allergies:['peanuts'],diet:'none'}],[]);
 assert.equal(result.verdict,'Avoid for this household');assert.equal(result.conflicts[0],'Sam: peanuts');assert.equal(result.score,null);
 assert.equal(assessProduct({product_name:'Unknown',nutriments:{}},[],[]).score,null);
});

test('saved scans persist once per product and remain isolated between households',async()=>{
 const db=openDatabase(':memory:'),server=createApp(db);server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;let cookie='';
 const call=async(path,method='GET',body)=>{const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 try{await call('/demo-session','POST',{});const product={code:'demo-spinach',product_name:'Baby spinach',allergens_tags:[],nutriscore_grade:'a',serving_size:'28 g',serving_quantity:28,nutriments:{sugars_100g:0.4,'energy-kcal_serving':160,sodium_serving:.17}};
 assert.equal((await call('/saved-scans','POST',{product,sample:true})).status,200);await call('/saved-scans','POST',{product,sample:true});
 let saved=(await call('/state')).data.savedScans;assert.equal(saved.length,1);assert.equal(saved[0].sample,true);assert.equal(saved[0].product_name,'Baby spinach');assert.equal(saved[0].serving_size,'28 g');assert.equal(saved[0].nutriscore_grade,'a');assert.equal(saved[0].nutriments['energy-kcal_serving'],160);assert.equal(saved[0].nutriments.sodium_serving,.17);
 const confirmed={...product,label_confirmed:true,code:'012345678905',serving_quantity:28,serving_size:'28 g',nutriments:{'energy-kcal_serving':160,fat_serving:10,carbohydrates_serving:15,proteins_serving:2,sodium_serving:.2,sugars_serving:2,fiber_serving:1,'saturated-fat_serving':1.5}};assert.equal((await call('/saved-scans','POST',{product:confirmed})).status,200);assert.equal((await call('/products?code=012345678905')).data.label_confirmed,true);assert.equal((await call('/products?code=012345678905')).data.nutriments['energy-kcal_serving'],160);
 assert.equal((await call('/saved-scans','POST',{product:{code:'bad'}})).status,400);
 await call('/auth/register','POST',{name:'Other',email:'saved@example.com',password:'a-long-password'});assert.equal((await call('/state')).data.savedScans.length,0);
 }finally{server.close();await once(server,'close');db.close();}
});

test('username signup and sign-in persist credentials without exposing password hashes',async()=>{
 const db=openDatabase(':memory:'),server=createApp(db);server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;let cookie='';
 const call=async(path,method='GET',body)=>{const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 try{
 assert.equal((await call('/auth/register','POST',{name:'Taylor',username:'taylor_plate',password:'a-long-password'})).status,200);
 const user=(await call('/state')).data.user;assert.equal(user.username,'taylor_plate');assert.equal(user.name,'Taylor');assert.equal(user.password,undefined);
 await call('/auth/logout','POST',{});
 assert.equal((await call('/auth/login','POST',{username:'taylor_plate',password:'incorrect-password'})).status,401);
 assert.equal((await call('/auth/login','POST',{username:'TAYLOR_PLATE',password:'a-long-password'})).status,200);
 assert.equal((await call('/auth/register','POST',{name:'Duplicate',username:'taylor_plate',password:'a-long-password'})).status,409);
 assert.equal((await call('/auth/register','POST',{name:'Invalid',username:'bad name',password:'a-long-password'})).status,400);
 const html=await (await fetch(base+'/')).text();assert.match(html,/apple-touch-icon/);assert.match(html,/apple-touch-startup-image/);
 }finally{server.close();await once(server,'close');db.close();}
});
