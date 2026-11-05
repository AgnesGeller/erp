-- Saját ERP-referenciák változatkapcsolatának fedőindexe.
begin;
create index if not exists reference_variants_base on erp.reference_variants(organization_id,reference_id,base_revision);
commit;
