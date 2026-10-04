import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
export const token = () => randomBytes(32).toString('hex');
export const digest = value => createHash('sha256').update(value).digest('hex');
export function hashPassword(password) {const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function verifyPassword(password,hash) {const [salt,key]=hash.split(':');return timingSafeEqual(Buffer.from(key,'hex'),scryptSync(password,salt,64));}
export function sessionUser(req,db) {
  const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('replate='))?.slice(8);
  return raw?db.prepare('SELECT u.id,u.household,u.name,u.email,h.username FROM sessions s JOIN users u ON u.id=s.user LEFT JOIN user_handles h ON h.user=u.id WHERE s.token=? AND s.expires>?').get(digest(raw),Date.now()):null;
}
export function setSession(res,db,user) {const raw=token();db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(raw),user,Date.now()+7*86400000);res.setHeader('Set-Cookie',`replate=${raw}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.NODE_ENV==='production'?'; Secure':''}`);}
