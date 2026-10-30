import { createGateway } from './handler.ts';
Deno.serve(createGateway({
  url: Deno.env.get('SUPABASE_URL') ?? '',
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? ''
}));
