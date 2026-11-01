import { createGateway } from './handler.ts';
import { createCustomerDirectory } from './customers.ts';
Deno.serve(createGateway({
  url: Deno.env.get('SUPABASE_URL') ?? '',
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  // Csak az ERP-átirányítás és az SMTP ellenőrzése után kapcsolható be.
  emailFlowsEnabled: false,
  customers: createCustomerDirectory({
    url: Deno.env.get('SUPABASE_URL') ?? '',
    key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    sourceKey: Deno.env.get('KASSZA_SERVICE_ROLE_KEY') ?? ''
  })
}));
