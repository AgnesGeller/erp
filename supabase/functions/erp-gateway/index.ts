import { createGateway } from './handler.ts';
Deno.serve(createGateway({
  url: Deno.env.get('SUPABASE_URL') ?? '',
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  // Csak az ERP-átirányítás és az SMTP ellenőrzése után kapcsolható be.
  emailFlowsEnabled: false
}));
