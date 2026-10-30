import { pathToFileURL } from 'node:url';
const { default: sharp } = await import(pathToFileURL(process.argv[2]).href);
import {writeFile} from 'node:fs/promises';
const source = process.argv[3];
for (const [file,size] of [['icon-512.png',512],['icon-192.png',192],['apple-touch-icon.png',180],['favicon.png',32]]) {
 const logo=await sharp(source).resize(Math.round(size*.76),Math.round(size*.76),{fit:'inside'}).png().toBuffer();
 await sharp({create:{width:size,height:size,channels:4,background:'#214a35'}}).composite([{input:logo,gravity:'centre'}]).png().toFile('assets/'+file);
}
const logo=await sharp(source).resize(360,360,{fit:'inside'}).png().toBuffer();
const text=Buffer.from('<svg width="1200" height="630"><text x="500" y="230" font-family="Arial" font-size="58" font-weight="bold" fill="white">DÍSZKERTEK</text><text x="500" y="310" font-family="Arial" font-size="28" fill="white">Integrált vállalatirányítási</text><text x="500" y="354" font-family="Arial" font-size="28" fill="white">és ügyfélkapcsolati alkalmazás</text></svg>');
await sharp({create:{width:1200,height:630,channels:4,background:'#214a35'}}).composite([{input:logo,left:70,top:135},{input:text}]).png().toFile('assets/megosztas.png');


