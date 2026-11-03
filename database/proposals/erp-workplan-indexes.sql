create index if not exists task_dependency_owner_task on erp.task_dependencies(organization_id,plan_id,task_id);
create index if not exists task_dependency_owner_required on erp.task_dependencies(organization_id,plan_id,requires_task);
create index if not exists work_notification_project on erp.work_notifications(organization_id,project_id);
create index if not exists work_notification_event on erp.work_notifications(organization_id,event_id);
create index if not exists workplan_quote_version on erp.workplans(organization_id,quote_id,quote_version);
create index if not exists workplan_project_lookup on erp.workplans(project_id);
