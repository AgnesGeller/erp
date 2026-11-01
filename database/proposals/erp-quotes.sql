-- Saját ERP-árajánlatok, árlista- és sablonverziók. Nincs forrásrendszer-módosítás.
begin;
grant erp_api to postgres;
grant create on schema public to erp_api;
create table erp.price_books(organization_id uuid primary key references erp.organizations(id),revision bigint not null default 1,document jsonb not null check(jsonb_typeof(document)='object'),updated_at timestamptz not null default now());
create table erp.price_book_versions(organization_id uuid not null,revision bigint not null,document jsonb not null,actor_id uuid not null,created_at timestamptz not null default now(),primary key(organization_id,revision),foreign key(organization_id) references erp.price_books(organization_id));
create table erp.quotes(id uuid primary key default gen_random_uuid(),organization_id uuid not null references erp.organizations(id),number text not null,source_customer_id uuid not null,source_location_id uuid not null,title text not null,current_version bigint not null default 1,revision bigint not null default 1,status text not null default 'draft' check(status in ('draft','ready','sent','accepted','rejected','withdrawn')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(organization_id,id),unique(organization_id,number),foreign key(organization_id,source_location_id,source_customer_id) references erp.work_sites(organization_id,source_location_id,source_customer_id));
create index quotes_customer_date on erp.quotes(organization_id,source_customer_id,created_at desc);
create table erp.quote_versions(organization_id uuid not null,quote_id uuid not null,version bigint not null,input jsonb not null,calculation jsonb not null,customer jsonb not null,actor_id uuid not null,created_at timestamptz not null default now(),primary key(organization_id,quote_id,version),foreign key(organization_id,quote_id) references erp.quotes(organization_id,id));
create table erp.quote_events(id uuid primary key default gen_random_uuid(),organization_id uuid not null,quote_id uuid not null,version bigint not null,actor_id uuid not null,event text not null,details jsonb not null default '{}',created_at timestamptz not null default now(),foreign key(organization_id,quote_id,version) references erp.quote_versions(organization_id,quote_id,version));
create index quote_events_time on erp.quote_events(organization_id,quote_id,created_at);
create table erp_private.quote_requests(organization_id uuid not null,request_id uuid not null,payload jsonb not null,result uuid not null,primary key(organization_id,request_id));
create table erp_private.quote_counters(organization_id uuid primary key references erp.organizations(id),next_number bigint not null);
create table erp_private.quote_mail_jobs(organization_id uuid not null,request_id uuid not null,quote_id uuid not null,version bigint not null,actor_id uuid not null,recipient text not null,subject text not null,body text not null,pdf_sha256 text not null,status text not null check(status in ('processing','sent','failed','unknown')),provider_id text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(organization_id,request_id),foreign key(organization_id,quote_id,version) references erp.quote_versions(organization_id,quote_id,version));
create index quote_mail_state on erp_private.quote_mail_jobs(organization_id,quote_id,status);
do $$declare t text;begin foreach t in array array['price_books','price_book_versions','quotes','quote_versions','quote_events'] loop execute format('alter table erp.%I enable row level security',t);execute format('alter table erp.%I force row level security',t);execute format('revoke all on erp.%I from public,anon,authenticated,service_role',t);execute format('grant select on erp.%I to erp_api',t);execute format('create policy office_read on erp.%I for select to erp_api using(erp_private.is_office(organization_id))',t);end loop;foreach t in array array['quote_requests','quote_counters','quote_mail_jobs'] loop execute format('alter table erp_private.%I enable row level security',t);execute format('alter table erp_private.%I force row level security',t);execute format('revoke all on erp_private.%I from public,anon,authenticated,service_role',t);end loop;end$$;

create function public.erp_quote_catalog(p_org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;return (select jsonb_build_object('revision',revision,'document',document) from erp.price_books where organization_id=p_org);end$$;
alter function public.erp_quote_catalog(uuid) owner to erp_api;
revoke all on function public.erp_quote_catalog(uuid) from public,anon,service_role;
grant execute on function public.erp_quote_catalog(uuid) to authenticated;
create function public.erp_quotes_list(p_org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;return coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'number',q.number,'title',q.title,'status',q.status,'revision',q.revision,'current_version',q.current_version,'customer_name',v.customer->>'name','address',v.customer->>'address','gross',v.calculation->'gross','issues',v.calculation->'issues','updated_at',q.updated_at) order by q.updated_at desc) from erp.quotes q join erp.quote_versions v on v.organization_id=q.organization_id and v.quote_id=q.id and v.version=q.current_version where q.organization_id=p_org),'[]');end$$;
alter function public.erp_quotes_list(uuid) owner to erp_api;
revoke all on function public.erp_quotes_list(uuid) from public,anon,service_role;
grant execute on function public.erp_quotes_list(uuid) to authenticated;
create function public.erp_quote_get(p_org uuid,p_quote uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare q erp.quotes;begin if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;select * into q from erp.quotes where organization_id=p_org and id=p_quote;if not found then raise exception 'Az ajánlat nem érhető el.' using errcode='42501';end if;return jsonb_build_object('quote',to_jsonb(q),'versions',(select jsonb_agg(to_jsonb(v) order by version) from erp.quote_versions v where organization_id=p_org and quote_id=p_quote),'events',coalesce((select jsonb_agg(to_jsonb(e) order by created_at) from erp.quote_events e where organization_id=p_org and quote_id=p_quote),'[]'),'project',(select jsonb_build_object('id',p.id,'status',p.work_status) from erp.garden_projects p where organization_id=p_org and accepted_quote_id=p_quote));end$$;
-- A kertépítés indítási kapuja már hiteles, elfogadott ERP-ajánlatra épülhet.
alter table erp.garden_projects add column accepted_quote_id uuid,add column accepted_quote_version bigint,add constraint project_quote_link foreign key(organization_id,accepted_quote_id,accepted_quote_version) references erp.quote_versions(organization_id,quote_id,version),add constraint one_project_per_quote unique(organization_id,accepted_quote_id);
alter table erp.garden_projects drop constraint work_lifecycle;
alter table erp.garden_projects add constraint work_lifecycle check((work_type='construction' and work_status in ('preparation','waiting_start','running','cancelled')) or (work_type='maintenance' and work_status in ('requested','confirmed','cancelled')));
alter table erp.garden_projects drop constraint work_activity;
alter table erp.garden_projects add constraint work_activity check(active=(work_status in ('confirmed','running'))),add constraint construction_quote_gate check(work_status not in ('waiting_start','running') or (accepted_quote_id is not null and accepted_quote_version is not null));
alter function public.erp_quote_get(uuid,uuid) owner to erp_api;
revoke all on function public.erp_quote_get(uuid,uuid) from public,anon,service_role;
grant execute on function public.erp_quote_get(uuid,uuid) to authenticated;

create function public.erp_quote_catalog_save(p_org uuid,p_actor uuid,p_revision bigint,p_document jsonb) returns bigint language plpgsql security definer set search_path='' as $$declare rev bigint;old_document jsonb;begin perform erp_private.require_customer_office(p_org,p_actor);if jsonb_typeof(p_document) is distinct from 'object' or octet_length(p_document::text)>2000000 then raise exception 'Érvénytelen árlista.' using errcode='22023';end if;perform pg_advisory_xact_lock(hashtextextended(p_org::text||'quote-catalog',0));select revision,document into rev,old_document from erp.price_books where organization_id=p_org for update;if rev=p_revision+1 and old_document=p_document then return rev;end if;if coalesce(rev,0) is distinct from p_revision then raise exception 'Az árlista megváltozott. Frissítsd.' using errcode='40001';end if;rev:=coalesce(rev,0)+1;insert into erp.price_books(organization_id,revision,document) values(p_org,rev,p_document) on conflict(organization_id) do update set revision=excluded.revision,document=excluded.document,updated_at=clock_timestamp();insert into erp.price_book_versions values(p_org,rev,p_document,p_actor,clock_timestamp());return rev;end$$;
create function public.erp_quote_save(p_org uuid,p_actor uuid,p_request uuid,p_quote uuid,p_revision bigint,p_input jsonb,p_calculation jsonb,p_customer jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare q erp.quotes;prior erp_private.quote_requests;data jsonb;seq bigint;ver bigint;site erp.work_sites;
begin
 perform erp_private.require_customer_office(p_org,p_actor);perform set_config('request.jwt.claim.sub',p_actor::text,true);
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or jsonb_typeof(p_calculation) is distinct from 'object' or octet_length(p_input::text)>2000000 then raise exception 'Érvénytelen ajánlat.' using errcode='22023';end if;
 data:=jsonb_build_object('quote',p_quote,'revision',p_revision,'input',p_input);
 perform pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));select * into prior from erp_private.quote_requests where organization_id=p_org and request_id=p_request;
 if found then if prior.payload<>data then raise exception 'A mentés adatai eltérnek.' using errcode='40001';end if;return prior.result;end if;
 select * into site from erp.work_sites where organization_id=p_org and source_customer_id=(p_input->>'customer_id')::uuid and source_location_id=(p_input->>'location_id')::uuid and source_active and source_approved and checked_at>clock_timestamp()-interval '2 minutes';
 if not found or p_customer->>'address' is distinct from site.address then raise exception 'Frissítsd az ügyfél munkavégzési címét.' using errcode='22023';end if;
 if p_quote is null then
  if p_revision is distinct from 0 then raise exception 'Érvénytelen revízió.' using errcode='40001';end if;
  insert into erp_private.quote_counters values(p_org,1) on conflict(organization_id) do update set next_number=erp_private.quote_counters.next_number+1 returning next_number into seq;
  insert into erp.quotes(organization_id,number,source_customer_id,source_location_id,title) values(p_org,'DK-'||to_char(current_date,'YYYY')||'-'||lpad(seq::text,5,'0'),site.source_customer_id,site.source_location_id,btrim(p_input->>'title')) returning * into q;ver:=1;
 else
  select * into q from erp.quotes where organization_id=p_org and id=p_quote for update;
  if not found then raise exception 'Az ajánlat nem érhető el.' using errcode='42501';end if;
  if q.revision is distinct from p_revision then raise exception 'Az ajánlat megváltozott. Frissítsd.' using errcode='40001';end if;
  if q.status<>'draft' or exists(select 1 from erp_private.quote_mail_jobs where organization_id=p_org and quote_id=q.id and status in ('processing','unknown')) then raise exception 'Ez az ajánlat nem szerkeszthető.' using errcode='22023';end if;
  if q.source_customer_id<>site.source_customer_id or q.source_location_id<>site.source_location_id then raise exception 'Az ügyfél és a cím nem cserélhető.' using errcode='22023';end if;
  ver:=q.current_version+1;update erp.quotes set title=btrim(p_input->>'title'),current_version=ver,revision=revision+1,updated_at=clock_timestamp() where id=q.id;
 end if;
 insert into erp.quote_versions values(p_org,q.id,ver,p_input,p_calculation,p_customer,p_actor,clock_timestamp());
 insert into erp.quote_events(organization_id,quote_id,version,actor_id,event) values(p_org,q.id,ver,p_actor,'save');
 insert into erp_private.quote_requests values(p_org,p_request,data,q.id);return q.id;
end$$;
create function public.erp_quote_transition(p_org uuid,p_actor uuid,p_quote uuid,p_revision bigint,p_action text) returns uuid language plpgsql security definer set search_path='' as $$
declare q erp.quotes;v erp.quote_versions;project uuid;target text;
begin
 perform erp_private.require_customer_office(p_org,p_actor);perform set_config('request.jwt.claim.sub',p_actor::text,true);
 select * into q from erp.quotes where organization_id=p_org and id=p_quote for update;
 if not found then raise exception 'Az ajánlat nem érhető el.' using errcode='42501';end if;
 if q.revision is distinct from p_revision then raise exception 'Az ajánlat megváltozott. Frissítsd.' using errcode='40001';end if;
 if exists(select 1 from erp_private.quote_mail_jobs where organization_id=p_org and quote_id=p_quote and status in ('processing','unknown')) then raise exception 'A levélküldés eredményét előbb ellenőrizni kell.' using errcode='22023';end if;
 select * into v from erp.quote_versions where organization_id=p_org and quote_id=p_quote and version=q.current_version;
 if p_action='ready' and q.status='draft' then if jsonb_array_length(v.calculation->'issues')<>0 or v.calculation->>'gross' is null then raise exception 'Javítsd az ajánlat hiányzó adatait.' using errcode='22023';end if;target:='ready';
 elsif p_action='draft' and q.status='ready' then target:='draft';
 elsif p_action='revise' and q.status in ('sent','rejected') then target:='draft';
 elsif p_action='reject' and q.status='sent' then target:='rejected';
 elsif p_action='withdraw' and q.status in ('draft','ready','sent','rejected') then target:='withdrawn';
 elsif p_action='accept' and q.status='sent' then
  target:='accepted';insert into erp.garden_projects(organization_id,name,work_type,active,work_status,source_customer_id,source_location_id,customer_name,site_address,description,creation_request,creation_payload,created_by,accepted_quote_id,accepted_quote_version)
  values(p_org,q.title,'construction',false,'waiting_start',q.source_customer_id,q.source_location_id,v.customer->>'name',v.customer->>'address','',q.id,jsonb_build_object('quote_id',q.id,'version',q.current_version),p_actor,q.id,q.current_version) returning id into project;
 elsif p_action='start' and q.status='accepted' then
  update erp.garden_projects set work_status='running',active=true,revision=revision+1,updated_at=clock_timestamp() where organization_id=p_org and accepted_quote_id=q.id and accepted_quote_version=q.current_version and work_status='waiting_start' returning id into project;
  if not found then raise exception 'A kertépítés nem indítható ebben az állapotban.' using errcode='22023';end if;target:=q.status;
 else raise exception 'Ez az állapotváltás nem engedélyezett.' using errcode='22023';end if;
 update erp.quotes set status=target,revision=revision+1,updated_at=clock_timestamp() where id=q.id;
 insert into erp.quote_events(organization_id,quote_id,version,actor_id,event,details) values(p_org,q.id,q.current_version,p_actor,p_action,jsonb_build_object('from',q.status,'to',target,'project_id',project));return project;
end$$;
create function public.erp_quote_mail_begin(p_org uuid,p_actor uuid,p_quote uuid,p_revision bigint,p_request uuid,p_recipient text,p_subject text,p_body text,p_sha text) returns jsonb language plpgsql security definer set search_path='' as $$declare q erp.quotes;job erp_private.quote_mail_jobs;begin
 perform erp_private.require_customer_office(p_org,p_actor);select * into q from erp.quotes where organization_id=p_org and id=p_quote for update;
 if not found then raise exception 'Az ajánlat nem érhető el.' using errcode='42501';end if;
 select * into job from erp_private.quote_mail_jobs where organization_id=p_org and request_id=p_request;
 if found then if (job.quote_id,job.recipient,job.subject,job.body,job.pdf_sha256) is distinct from (p_quote,p_recipient,p_subject,p_body,p_sha) then raise exception 'A küldés adatai eltérnek.' using errcode='40001';end if;return to_jsonb(job)||jsonb_build_object('send',false);end if;
 if q.revision is distinct from p_revision then raise exception 'Az ajánlat megváltozott.' using errcode='40001';end if;
 if q.status<>'ready' or exists(select 1 from erp_private.quote_mail_jobs where organization_id=p_org and quote_id=q.id and status in ('processing','unknown','sent') and version=q.current_version) then raise exception 'A küldés nem indítható.' using errcode='22023';end if;
 if length(p_recipient)>254 or p_recipient!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_subject is null or length(p_subject) not between 1 and 200 or p_subject~E'[\r\n]' or p_body is null or length(p_body)>20000 or p_sha!~'^[a-f0-9]{64}$' then raise exception 'Ellenőrizd a levelet.' using errcode='22023';end if;
 insert into erp_private.quote_mail_jobs(organization_id,request_id,quote_id,version,actor_id,recipient,subject,body,pdf_sha256,status) values(p_org,p_request,q.id,q.current_version,p_actor,p_recipient,p_subject,p_body,p_sha,'processing') returning * into job;
 insert into erp.quote_events(organization_id,quote_id,version,actor_id,event,details) values(p_org,q.id,q.current_version,p_actor,'mail_processing',jsonb_build_object('request_id',p_request,'recipient',p_recipient,'pdf_sha256',p_sha));return to_jsonb(job)||jsonb_build_object('send',true);
end$$;
create function public.erp_quote_mail_finish(p_org uuid,p_actor uuid,p_request uuid,p_status text,p_provider text) returns void language plpgsql security definer set search_path='' as $$declare job erp_private.quote_mail_jobs;begin
 perform erp_private.require_customer_office(p_org,p_actor);
 -- A quote-sorzár azonos sorrendben történik a begin/transition hívásokkal.
 select * into job from erp_private.quote_mail_jobs where organization_id=p_org and request_id=p_request;if not found then raise exception 'A küldés nem található.' using errcode='42501';end if;
 perform 1 from erp.quotes where organization_id=p_org and id=job.quote_id for update;
 if job.status<>'processing' then return;end if;if p_status not in ('sent','failed','unknown') then raise exception 'Érvénytelen küldési eredmény.' using errcode='22023';end if;
 update erp_private.quote_mail_jobs set status=p_status,provider_id=left(p_provider,500),updated_at=clock_timestamp() where organization_id=p_org and request_id=p_request;
 if p_status='sent' then update erp.quotes set status='sent',revision=revision+1,updated_at=clock_timestamp() where organization_id=p_org and id=job.quote_id and current_version=job.version and status='ready';end if;
 insert into erp.quote_events(organization_id,quote_id,version,actor_id,event,details) values(p_org,job.quote_id,job.version,p_actor,'mail_'||p_status,jsonb_build_object('request_id',p_request,'provider_id',left(p_provider,500)));
end$$;
do $$declare sig text;begin foreach sig in array array['erp_quote_catalog_save(uuid,uuid,bigint,jsonb)','erp_quote_save(uuid,uuid,uuid,uuid,bigint,jsonb,jsonb,jsonb)','erp_quote_transition(uuid,uuid,uuid,bigint,text)','erp_quote_mail_begin(uuid,uuid,uuid,bigint,uuid,text,text,text,text)','erp_quote_mail_finish(uuid,uuid,uuid,text,text)'] loop execute 'revoke all on function public.'||sig||' from public,anon,authenticated';execute 'grant execute on function public.'||sig||' to service_role';end loop;end$$;
-- A megrendelő kérésére kezdetben kézi kiküldés. Csak kifejezett irodai tényrögzítés.
create function public.erp_quote_manual_sent(p_org uuid,p_actor uuid,p_quote uuid,p_revision bigint,p_request uuid,p_recipient text,p_subject text,p_body text,p_sha text,p_confirmed boolean) returns void language plpgsql security definer set search_path='' as $$
declare job jsonb;
begin
 perform erp_private.require_customer_office(p_org,p_actor);
 if p_confirmed is distinct from true then raise exception 'A tényleges kézi kiküldést igazold vissza.' using errcode='22023';end if;
 job:=public.erp_quote_mail_begin(p_org,p_actor,p_quote,p_revision,p_request,p_recipient,p_subject,p_body,p_sha);
 if job->>'status'='sent' then return;end if;
 if (job->>'send')::boolean is distinct from true then raise exception 'A korábbi művelet ellenőrzésre vár.' using errcode='22023';end if;
 perform public.erp_quote_mail_finish(p_org,p_actor,p_request,'sent','manual-office-confirmation');
 insert into erp.quote_events(organization_id,quote_id,version,actor_id,event,details) values(p_org,p_quote,(job->>'version')::bigint,p_actor,'manual_send_confirmed',jsonb_build_object('recipient',p_recipient,'pdf_sha256',p_sha,'request_id',p_request));
end$$;
revoke all on function public.erp_quote_manual_sent(uuid,uuid,uuid,bigint,uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.erp_quote_manual_sent(uuid,uuid,uuid,bigint,uuid,text,text,text,text,boolean) to service_role;
revoke create on schema public from erp_api;
revoke erp_api from postgres;
commit;