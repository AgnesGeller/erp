import {readFile,writeFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
await writeFile(new URL('../supabase/functions/erp-gateway/quote-engine.ts',import.meta.url),'// Generált másolat. Forrás: src/erp-quote-engine.ts; frissítés: build.\n'+await readFile(new URL('../src/erp-quote-engine.ts',import.meta.url),'utf8'));
const result=spawnSync(process.execPath,['node_modules/typescript/bin/tsc',...process.argv.slice(2)],{cwd:new URL('../',import.meta.url),stdio:'inherit'});process.exit(result.status??1);
