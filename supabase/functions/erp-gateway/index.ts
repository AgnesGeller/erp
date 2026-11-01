import {createGateway} from './handler.ts';
import {createCustomerDirectory} from './customers.ts';
import {createQuotes} from './quotes.ts';
import {makeQuotePdf} from './quote-pdf.ts';
const url=Deno.env.get('SUPABASE_URL')??'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const customers=createCustomerDirectory({url,key,sourceKey:Deno.env.get('KASSZA_SERVICE_ROLE_KEY')??''});
const quotes=createQuotes({url,key,context:(organization_id,customer_id,token,actor,memberships)=>customers({action:'quote_context',organization_id,customer_id},token,actor,memberships),pdf:makeQuotePdf});
Deno.serve(createGateway({url,anonKey:Deno.env.get('SUPABASE_ANON_KEY')??'',serviceKey:key,emailFlowsEnabled:false,customers,quotes}));
