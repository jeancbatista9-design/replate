import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let sharp;try{sharp=require('sharp');}catch{sharp=require('/Users/alexarias/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const logo=await fs.readFile('public/logo.svg');
for(const size of [192,512])await sharp(logo).resize(size,size).png().toFile('public/app-icon-'+size+'.png');
await sharp(logo).resize(180,180).png().toFile('public/apple-touch-icon.png');
const inset=await sharp(logo).resize(300,300).png().toBuffer();
await sharp({create:{width:512,height:512,channels:4,background:'#254f39'}}).composite([{input:inset,left:106,top:106}]).png().toFile('public/app-icon-maskable.png');
await fs.mkdir('public/splash',{recursive:true});
const devices=[[320,568,2],[375,667,2],[414,736,3],[375,812,3],[390,844,3],[393,852,3],[402,874,3],[414,896,2],[428,926,3],[430,932,3],[440,956,3]];
const links=[];
for(const [w,h,scale] of devices)for(const orientation of ['portrait','landscape']){
 const width=(orientation==='portrait'?w:h)*scale,height=(orientation==='portrait'?h:w)*scale,cx=width/2,cy=height/2;
 const icon=await sharp(logo).resize(80*scale,80*scale).png().toBuffer();
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f7f8f2"/><text x="${cx}" y="${cy+68*scale}" text-anchor="middle" fill="#254f39" font-family="Georgia,serif" font-size="${42*scale}">RePlate</text><text x="${cx}" y="${cy+100*scale}" text-anchor="middle" fill="#768071" font-family="Arial,sans-serif" font-size="${13*scale}">Eat it first. Waste less.</text></svg>`);
 const name=`launch-${w}x${h}-${scale}x-${orientation}.png`;
 await sharp(svg).composite([{input:icon,left:Math.round(cx-40*scale),top:Math.round(cy-60*scale)}]).png().toFile('public/splash/'+name);
 links.push(`<link rel="apple-touch-startup-image" href="/splash/${name}" media="screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${scale}) and (orientation: ${orientation})">`);
}
let html=await fs.readFile('public/index.html','utf8');html=html.replace(/<!-- ios-startup -->[\s\S]*?<!-- \/ios-startup -->/,'');html=html.replace('</head>',`<!-- ios-startup -->\n${links.join('\n')}\n<!-- /ios-startup -->\n</head>`);await fs.writeFile('public/index.html',html);
console.log(`Generated Apple icon, maskable icon, and ${links.length} startup images.`);
