import {createSurveyAi} from './handler.ts';
Deno.serve(createSurveyAi({url:Deno.env.get('SUPABASE_URL')??'',anonKey:Deno.env.get('SUPABASE_ANON_KEY')??'',groqKey:Deno.env.get('ERP_GROQ_API_KEY')??'',noteModel:Deno.env.get('ERP_GROQ_NOTE_MODEL')??'openai/gpt-oss-20b'}));
