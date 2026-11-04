-- Csak meglévő saját ERP-olvasás szűkítése munkanapra; jogosultság és táblaszerkezet változatlan.
begin;
do $patch$ declare definition text;old_fragment text:='and (selected_lot is null or e.lot_id=selected_lot) and (p_filter->''before_event''';new_fragment text:='and (selected_lot is null or e.lot_id=selected_lot) and (p_filter->>''work_date'' is null or e.work_date=(p_filter->>''work_date'')::date) and (p_filter->''before_event''';begin
select pg_get_functiondef('public.erp_material_read(uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure) into definition;
if position(new_fragment in definition)>0 then return;end if;
if position(old_fragment in definition)=0 then raise exception 'Az ERP-anyagolvasás eltér a tesztelt kiindulástól.';end if;
execute replace(definition,old_fragment,new_fragment);
end $patch$;
commit;
