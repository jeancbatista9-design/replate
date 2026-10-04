import {calculateNutritionScore} from '../public/js/nutrition-score.js';
import {lookupProduct,pipelineVersion} from './products.js';
import {readLabel} from './label.js';
import {nutritionFacts} from '../public/js/food-model.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {networkInterfaces} from 'node:os';
import {openDatabase} from './db.js';
import {hashPassword,verifyPassword,sessionUser,setSession,digest} from './auth.js';
import {validateItem,recommendations,today} from './domain.js';
import {goals} from '../public/js/food-model.js';
import {tiers} from '../public/js/premium-model.js';

const decode = row => ({...row,allergens:row.allergens?JSON.parse(row.allergens):undefined,allergies:row.allergies?JSON.parse(row.allergies):undefined});
const publicRoot=resolve(import.meta.dirname,'../public');
export function createApp(db=openDatabase()) {
 const attempts=new Map();
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' https://images.openfoodfacts.org; style-src 'self'; script-src 'self'; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try {
   const url=new URL(req.url,'http://localhost'),p=url.pathname,method=req.method;
   if(!p.startsWith('/api/')) {
    if(!['GET','HEAD'].includes(method))return send(res,405,{error:'Method not allowed'});
    const file=resolve(publicRoot,'.'+decodeURIComponent(p==='/'?'/index.html':p));
    if(!file.startsWith(publicRoot+'/'))return send(res,403,{error:'Forbidden'});
    try {const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'})[extname(file)]||'application/octet-stream');res.end(method==='HEAD'?undefined:data);}catch{return send(res,404,{error:'Not found'});}return;
   }
   if(p==='/api/health')return send(res,200,{ok:true});
   if(!['GET','HEAD'].includes(method)&&req.headers.origin&&req.headers.origin!==`${req.socket.encrypted||(process.env.TRUST_PROXY==='1'&&req.headers['x-forwarded-proto']==='https')?'https':'http'}://${req.headers.host}`) return send(res,403,{error:'Cross-origin request rejected'});
   let body={};
   if(['POST','PATCH','PUT','DELETE'].includes(method)){
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>(p==='/api/labels/read'?6e6:65536))return send(res,413,{error:'Request too large'});}try{body=raw?JSON.parse(raw):{};}catch{return send(res,400,{error:'Invalid JSON'});}if(!body||Array.isArray(body)||typeof body!=='object')return send(res,400,{error:'Invalid request'});
   }
   if(['/api/auth/register','/api/auth/login'].includes(p)&&method==='POST') {
    const ip=req.socket.remoteAddress;const now=Date.now();for(const [key,value]of attempts)if(value.until<now)attempts.delete(key);
    const rate=attempts.get(ip)||{count:0,until:now+900000};if(++rate.count>30)return send(res,429,{error:'Too many attempts. Try again in 15 minutes.'});attempts.set(ip,rate);
    const username=String(body.username||'').trim().toLowerCase();
    if(username&&!/^[a-z][a-z0-9_]{2,23}$/.test(username))return send(res,400,{error:'Username: 3–24 letters, numbers, or underscores; start with a letter.'});
    const handle=username?db.prepare('SELECT u.* FROM user_handles h JOIN users u ON u.id=h.user WHERE h.username=?').get(username):null;
    const email=String(body.email||(username?`${username}@replate.local`:'')).trim().toLowerCase(),password=body.password;
    if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254||typeof password!=='string'||password.length<10||password.length>128)return send(res,400,{error:'Use a valid email and a password with 10–128 characters.'});
    let user=username?handle:db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if(p.endsWith('register')){
     const name=String(body.name||'').trim();if(!name||name.length>80)return send(res,400,{error:'Enter your name (up to 80 characters).'});
     if(user||db.prepare('SELECT id FROM users WHERE email=?').get(email))return send(res,409,{error:'This username or email already has an account. Sign in instead.'});
     const household=randomUUID(),id=randomUUID();db.exec('BEGIN');try{db.prepare('INSERT INTO households VALUES(?,?,?)').run(household,`${name.split(' ')[0]}'s kitchen`,randomBytes(16).toString('hex'));db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,household,name,email,hashPassword(password));if(username)db.prepare('INSERT INTO user_handles VALUES(?,?)').run(username,id);db.prepare('INSERT INTO profiles VALUES(?,?,?,?,?)').run(randomUUID(),household,name,'[]','none');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}user={id};
    }else if(!user||!verifyPassword(password,user.password))return send(res,401,{error:'Email or password is incorrect.'});
    setSession(res,db,user.id);return send(res,200,{ok:true});
   }
   if(p==='/api/demo-session'&&method==='POST'){
    if(process.env.DEMO_MODE==='false')return send(res,404,{error:'Demo is disabled'});
    let demo=db.prepare('SELECT id FROM users WHERE email=?').get('demo@replate.local');
    if(!demo){const h=randomUUID(),id=randomUUID();db.exec('BEGIN');try{db.prepare('INSERT INTO households VALUES(?,?,?)').run(h,'The Green Kitchen',randomBytes(16).toString('hex'));db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,h,'Alex','demo@replate.local',hashPassword(randomBytes(32).toString('hex')));db.prepare('INSERT INTO profiles VALUES(?,?,?,?,?)').run(randomUUID(),h,'Alex','[]','none');db.prepare('INSERT INTO profiles VALUES(?,?,?,?,?)').run(randomUUID(),h,'Sam','["peanuts"]','vegetarian');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}demo={id};}
    setSession(res,db,demo.id);return send(res,200,{ok:true});
   }
   const user=sessionUser(req,db);if(!user)return send(res,401,{error:'Please sign in.'});const h=user.household;
   const items=()=>db.prepare('SELECT * FROM items WHERE household=? ORDER BY expiry,name').all(h).map(decode);
   const profiles=()=>db.prepare("SELECT profiles.*,COALESCE(profile_goals.goal,'balanced') AS goal FROM profiles LEFT JOIN profile_goals ON profile_goals.profile=profiles.id WHERE household=?").all(h).map(decode);
   if(p==='/api/auth/logout'&&method==='POST'){const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('replate='))?.slice(8);if(raw)db.prepare('DELETE FROM sessions WHERE token=?').run(digest(raw));res.setHeader('Set-Cookie','replate=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return send(res,200,{ok:true});}
   const subscription=()=>db.prepare('SELECT plan,cycle,updated FROM subscriptions WHERE household=?').get(h)||{plan:'free',cycle:'monthly',updated:today()};
   if(p==='/api/subscription'&&method==='POST'){
    if(process.env.DEMO_MODE==='false')return send(res,403,{error:'Demo subscription changes are disabled.'});
    const plan=body.plan,cycle=body.cycle||'monthly';if(!tiers[plan]||!['monthly','annual'].includes(cycle)||plan!=='plus'&&cycle==='annual')return send(res,400,{error:'Invalid subscription plan or billing period.'});
    db.prepare('INSERT INTO subscriptions VALUES(?,?,?,?) ON CONFLICT(household) DO UPDATE SET plan=excluded.plan,cycle=excluded.cycle,updated=excluded.updated').run(h,plan,cycle,today());return send(res,200,{ok:true});
   }
   if(['/api/assistant/plan','/api/assistant/shopping'].includes(p)&&method==='POST'){
    if(subscription().plan==='free')return send(res,403,{error:'Try RePlate+ to unlock your food assistant.'});
    const ranked=recommendations(items(),profiles()).filter(r=>!r.warnings.length);
    if(p.endsWith('/plan')){
     if(!ranked.length)return send(res,409,{error:'No recipes match all household profiles. Review preferences or plan meals individually.'});
     db.exec('BEGIN');try{for(let n=0;n<7;n++){const day=today(n);const r=ranked[n%ranked.length];db.prepare('INSERT INTO plans VALUES(?,?,?) ON CONFLICT(household,day) DO UPDATE SET recipe=excluded.recipe').run(h,day,r.id);}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(res,200,{ok:true});
    }
    const planned=db.prepare('SELECT recipe FROM plans WHERE household=? AND day>=? AND day<=?').all(h,today(),today(6));
    if(!planned.length)return send(res,409,{error:'Plan some meals first, then build your grocery list.'});
    const missing=[...new Set(planned.flatMap(plan=>ranked.find(r=>r.id===plan.recipe)?.missing||[]))];const existing=db.prepare('SELECT name FROM shopping WHERE household=?').all(h).map(i=>i.name.toLowerCase());
    db.exec('BEGIN');try{for(const name of missing)if(!existing.includes(name.toLowerCase()))db.prepare('INSERT INTO shopping VALUES(?,?,?,?,0)').run(randomUUID(),h,name,1);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(res,200,{ok:true});
   }
   if(p==='/api/saved-scans'&&method==='POST'){
    const v=body.product;
    if(!v||typeof v.code!=='string'||!/^(?:\d{8,14}|demo-[a-z-]{1,40})$/.test(v.code)||typeof v.product_name!=='string'||!v.product_name.trim()||v.product_name.length>200)return send(res,400,{error:'Invalid scanned product.'});
    const data={nutrient_bounds:v.nutrient_bounds?.sugars==='<'?{sugars:'<'}:undefined,label_confirmed:body.sample!==true&&v.label_confirmed===true,source:v.label_confirmed?{name:'Label confirmed by you'}:v.source?.name?{name:String(v.source.name).slice(0,100)}:undefined,requires_confirmation:v.requires_confirmation===true,source_note:String(v.source_note||'').slice(0,300),nutriscore_grade:/^[a-e]$/.test(v.nutriscore_grade||'')?v.nutriscore_grade:null,serving_size:String(v.serving_size||'').slice(0,150),serving_quantity:Number.isFinite(v.serving_quantity)&&v.serving_quantity>0?v.serving_quantity:null,code:v.code,product_name:v.product_name,brands:String(v.brands||'').slice(0,200),ingredients_text:String(v.ingredients_text||'').slice(0,5000),allergens_tags:Array.isArray(v.allergens_tags)?v.allergens_tags.filter(a=>typeof a==='string').slice(0,30):[],nutriments:{},sample:body.sample===true};
    for(const k of ['energy-kcal','energy-kj','fat','carbohydrates','proteins','sugars','fiber','saturated-fat','sodium','salt','added-sugars'])for(const basis of ['100g','serving'])if(Number.isFinite(v.nutriments?.[k+'_'+basis])&&v.nutriments[k+'_'+basis]>=0)data.nutriments[k+'_'+basis]=v.nutriments[k+'_'+basis];
    if(data.label_confirmed&&(!data.serving_quantity||calculateNutritionScore(data).score===null))return send(res,400,{error:'Check the serving size and label values; the nutrition facts conflict.'});
    db.prepare('INSERT INTO saved_scans VALUES(?,?,?,?) ON CONFLICT(household,code) DO UPDATE SET data=excluded.data,saved=excluded.saved').run(h,v.code,JSON.stringify(data),new Date().toISOString());return send(res,200,{ok:true});
   }
   if(p==='/api/state'&&method==='GET')return send(res,200,{user,savedScans:db.prepare('SELECT data,saved FROM saved_scans WHERE household=? ORDER BY saved DESC').all(h).map(r=>({...JSON.parse(r.data),saved:r.saved})),subscription:subscription(),household:db.prepare('SELECT * FROM households WHERE id=?').get(h),items:items(),profiles:profiles(),shopping:db.prepare('SELECT * FROM shopping WHERE household=?').all(h),plans:db.prepare('SELECT * FROM plans WHERE household=? ORDER BY day').all(h),recipes:recommendations(items(),profiles())});
   if(p==='/api/items'&&method==='POST'){const v=validateItem(body);db.prepare('INSERT INTO items VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),h,v.name,v.category,v.storage,v.quantity,v.unit,v.price,v.expiry,JSON.stringify(v.allergens),'active',today());return send(res,201,{ok:true});}
   if(p.startsWith('/api/items/')&&method==='PATCH'){
    const id=p.split('/').pop(),item=db.prepare('SELECT * FROM items WHERE id=? AND household=?').get(id,h);if(!item)return send(res,404,{error:'Item not found'});
    const status=body.status||item.status;if(!['active','eaten','wasted','donated'].includes(status))return send(res,400,{error:'Invalid item status'});
    const v=validateItem({...decode(item),...body});db.prepare('UPDATE items SET name=?,category=?,storage=?,quantity=?,unit=?,price=?,expiry=?,allergens=?,status=?,updated=? WHERE id=? AND household=?').run(v.name,v.category,v.storage,v.quantity,v.unit,v.price,v.expiry,JSON.stringify(v.allergens),status,today(),id,h);return send(res,200,{ok:true});
   }
   if(p==='/api/demo'&&method==='POST'){
    if(items().length)return send(res,409,{error:'Sample groceries can only be added to an empty kitchen.'});
    const sample=[['Spinach','produce',2,3.49],['Strawberries','produce',1,4.99],['Eggs','dairy',12,4.5],['Greek yogurt','dairy',6,5.99],['Broccoli','produce',4,2.49],['Pasta','pantry',90,1.99],['Tomatoes','produce',5,3.99],['Rice','pantry',120,3.49]];
    db.exec('BEGIN');try{for(const [name,category,days,price]of sample){const expiry=today(days);db.prepare('INSERT INTO items VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),h,name,category,category==='pantry'?'pantry':'fridge',1,'pack',price,expiry,JSON.stringify(name==='Eggs'?['eggs']:name.includes('yogurt')?['milk']:name==='Pasta'?['gluten']:[]),'active',today());}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(res,201,{ok:true});
   }
   if(p==='/api/shopping'&&method==='POST'){const name=String(body.name||'').trim(),q=+(body.quantity||1);if(!name||name.length>120||!Number.isFinite(q)||q<=0||q>10000)return send(res,400,{error:'Enter a name and valid quantity.'});db.prepare('INSERT INTO shopping VALUES(?,?,?,?,0)').run(randomUUID(),h,name,q);return send(res,201,{ok:true});}
   if(p.startsWith('/api/shopping/')){const id=p.split('/').pop();if(method==='DELETE')db.prepare('DELETE FROM shopping WHERE id=? AND household=?').run(id,h);else if(method==='PATCH')db.prepare('UPDATE shopping SET checked=? WHERE id=? AND household=?').run(body.checked?1:0,id,h);else return send(res,405,{error:'Method not allowed'});return send(res,200,{ok:true});}
   if(p==='/api/checkout'&&method==='POST'){
    const selected=db.prepare('SELECT * FROM shopping WHERE household=? AND checked=1').all(h);if(!selected.length)return send(res,400,{error:'Check the groceries you purchased first.'});const v=validateItem({name:'Checkout',expiry:body.expiry,storage:body.storage});
    db.exec('BEGIN');try{for(const s of selected){db.prepare('INSERT INTO items VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),h,s.name,'other',v.storage,s.quantity,'items',0,v.expiry,'[]','active',today());db.prepare('DELETE FROM shopping WHERE id=? AND household=?').run(s.id,h);}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(res,200,{ok:true});
   }
   if(p==='/api/profiles'&&method==='POST'){
    const name=String(body.name||'').trim(),diet=body.diet||'none',allergies=body.allergies||[],goal=body.goal||'balanced';if(!Object.hasOwn(goals,goal))return send(res,400,{error:'Invalid nutrition goal'});if(!name||name.length>80||!['none','vegetarian','vegan'].includes(diet)||!Array.isArray(allergies)||allergies.some(a=>!['milk','eggs','peanuts','tree nuts','gluten','fish','shellfish','soy','sesame'].includes(a)))return send(res,400,{error:'Invalid profile'});
    const profileId=body.id||randomUUID();if(body.id){const result=db.prepare('UPDATE profiles SET name=?,allergies=?,diet=? WHERE id=? AND household=?').run(name,JSON.stringify(allergies),diet,body.id,h);if(!result.changes)return send(res,404,{error:'Profile not found'});}else{if(profiles().length>=tiers[subscription().plan].profiles)return send(res,403,{error:'Your plan’s profile limit is reached. Existing profiles and allergy checks remain available.'});db.prepare('INSERT INTO profiles VALUES(?,?,?,?,?)').run(profileId,h,name,JSON.stringify(allergies),diet);}db.prepare('INSERT INTO profile_goals VALUES(?,?) ON CONFLICT(profile) DO UPDATE SET goal=excluded.goal').run(profileId,goal);return send(res,200,{ok:true});
   }
   if(p.startsWith('/api/profiles/')&&method==='DELETE'){db.prepare('DELETE FROM profiles WHERE id=? AND household=?').run(p.split('/').pop(),h);return send(res,200,{ok:true});}
   if(p==='/api/plans'&&method==='POST'){if(!/^\d{4}-\d{2}-\d{2}$/.test(body.day||'')||!recommendations([],[]).some(r=>r.id===body.recipe))return send(res,400,{error:'Choose a day and recipe'});db.prepare('INSERT INTO plans VALUES(?,?,?) ON CONFLICT(household,day) DO UPDATE SET recipe=excluded.recipe').run(h,body.day,body.recipe);return send(res,200,{ok:true});}
   if(p==='/api/plans'&&method==='DELETE'){db.prepare('DELETE FROM plans WHERE household=? AND day=?').run(h,body.day);return send(res,200,{ok:true});}
   if(p==='/api/household/join'&&method==='POST'){
    if(items().length||db.prepare('SELECT COUNT(*) n FROM users WHERE household=?').get(h).n>1||db.prepare('SELECT COUNT(*) n FROM shopping WHERE household=?').get(h).n||db.prepare('SELECT COUNT(*) n FROM plans WHERE household=?').get(h).n)return send(res,409,{error:'Joining is available from a new, empty household so existing data is preserved.'});
    const target=db.prepare('SELECT id FROM households WHERE invite=?').get(String(body.code||'').trim());if(!target)return send(res,404,{error:'Household code not found'});if(target.id===h)return send(res,400,{error:'You already belong to this household'});db.prepare('UPDATE users SET household=? WHERE id=?').run(target.id,user.id);return send(res,200,{ok:true});
   }
   if(p==='/api/labels/read'&&method==='POST'){try{return send(res,200,await readLabel(body.image));}catch{return send(res,422,{error:'Could not read this photo. Try a clearer image or enter the label values below.'});}}
   if(p==='/api/products'&&method==='GET'){
    const code=url.searchParams.get('code')||'';if(!/^\d{8,14}$/.test(code))return send(res,400,{error:'Enter an 8–14 digit barcode.'});
    const confirmed=db.prepare('SELECT data FROM saved_scans WHERE household=? AND code=?').get(h,code);if(confirmed&&JSON.parse(confirmed.data).label_confirmed)return send(res,200,JSON.parse(confirmed.data));
    const cached=db.prepare('SELECT * FROM products WHERE code=?').get(code);if(cached&&cached.fetched>Date.now()-86400000&&JSON.parse(cached.data).pipeline_version===pipelineVersion)return send(res,200,JSON.parse(cached.data));
    const product=await lookupProduct(code);db.prepare('INSERT INTO products VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET data=excluded.data,fetched=excluded.fetched').run(code,JSON.stringify(product),Date.now());return send(res,200,product);
   }
   return send(res,404,{error:'Endpoint not found'});
  }catch(error){if(error.message?.startsWith('Enter ')||error.message?.startsWith('Choose ')||error.message?.startsWith('Invalid '))return send(res,400,{error:error.message});console.error(error);send(res,500,{error:'Something went wrong. Please try again.'});}
 });
}
if(process.argv[1]===resolve(import.meta.filename)){
 const port=Number(process.env.PORT||3000),host=process.env.HOST||'0.0.0.0';
 createApp().listen(port,host,()=>{
  console.log(`RePlate: http://localhost:${port} (bound to ${host})`);
  if(host==='0.0.0.0')for(const entries of Object.values(networkInterfaces()))for(const entry of entries||[])if(entry.family==='IPv4'&&!entry.internal)console.log(`Wi-Fi / LAN: http://${entry.address}:${port}`);
 });
}
