import { pathToFileURL } from 'node:url';
const { default: sharp } = await import(pathToFileURL(process.argv[2]).href);
const source = process.argv[3];
for (const [file,size] of [['icon-512.png',512],['icon-192.png',192],['apple-touch-icon.png',180],['favicon.png',32]]) {
 const logo=await sharp(source).resize(Math.round(size*.76),Math.round(size*.76),{fit:'inside'}).png().toBuffer();
 await sharp({create:{width:size,height:size,channels:4,background:'#214a35'}}).composite([{input:logo,gravity:'centre'}]).png().toFile('assets/'+file);
}
// A megosztási képen a platform jeleníti meg a címet és a leírást.
// A logó ezért nagy méretű, világos alapon, ismételt apró szöveg nélkül.
const logo=await sharp(source).trim().resize(560,490,{fit:'inside'}).png().toBuffer();
await sharp({create:{width:1200,height:630,channels:4,background:'#f5f4ef'}})
 .composite([{input:logo,gravity:'centre'}]).png().toFile('assets/megosztas-v2.png');
