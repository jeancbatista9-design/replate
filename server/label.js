import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
export function parseLabel(text){
 const t=text.replace(/\r/g,'');const fields={};
 const definitions={calories:/Calories\s*(\d+(?:\.\d+)?)/i,fat:/Total\s*Fat\s*(\d+(?:\.\d+)?)\s*g/i,saturated:/Sat(?:urated)?\s*Fat\s*(\d+(?:\.\d+)?)\s*g/i,carbs:/Total\s*Carbohydrate\s*(\d+(?:\.\d+)?)\s*g/i,sugar:/Total\s*Sugars?\s*(\d+(?:\.\d+)?)\s*g/i,added:/(?:Includes\s*)?(\d+(?:\.\d+)?)\s*g\s*Added\s*Sugars?/i,fiber:/Dietary\s*Fiber\s*(\d+(?:\.\d+)?)\s*g/i,protein:/Protein\s*(\d+(?:\.\d+)?)\s*g/i,sodium:/Sodium\s*(\d+(?:\.\d+)?)\s*mg/i,serving:/Serving\s*Size[^\n]*?\(?\s*(\d+(?:\.\d+)?)\s*g\b/i};
 for(const [key,re]of Object.entries(definitions)){const match=t.match(re);if(match)fields[key]=Number(match[1]);}
 return fields;
}
export async function readLabel(image){
 if(typeof image!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(image))throw Error('Choose a JPEG, PNG, or WebP label photo.');
 const bytes=Buffer.from(image.split(',')[1],'base64');if(!bytes.length||bytes.length>4e6)throw Error('Choose a photo smaller than 4 MB.');
 const dir=await mkdtemp(join(tmpdir(),'replate-label-'));
 try{const path=join(dir,'label');await writeFile(path,bytes);const {stdout}=await promisify(execFile)(resolve('scripts/read-label'),[path],{timeout:30000,maxBuffer:100000});return {text:stdout,fields:parseLabel(stdout)};}finally{await rm(dir,{recursive:true,force:true});}
}
