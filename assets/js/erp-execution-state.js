import { transitionTask, workRoleRank } from './erp-workplan-model.js';
/** A korábbi, tényleges események hivatkozott alapok maradnak; nem írunk új pipát. */
export function executionForProgress(original) { const task = structuredClone(original), actual = task.approvals ?? [], actualLevels = new Set(actual.map((a) => a.level)); task.approvals = actual; task.actual_approvals = structuredClone(actual); if (task.baseline_active && task.baseline) {
    for (const a of task.baseline.approvals ?? []) {
        if (!actualLevels.has(a.level))
            task.approvals.push({ ...structuredClone(a), reference_only: true });
    }
} return task; }
export function executionOfficeAccepted(task) { return executionForProgress(task).approvals.some(a => a.level === 2); }
export function transitionExecutionPart(task, command, ctx) { if (command.type === 'accept' && ctx.role === 'client' && !executionOfficeAccepted(task))
    throw Error('Előbb az iroda vegye át ezt a részfeladatot.'); const result = transitionTask(task, command, ctx); if (command.type === 'reject' && task.baseline_active) {
    const rank = workRoleRank(ctx.role), prior = (task.baseline?.approvals ?? []).filter((a) => a.level < rank);
    result.event.affected_actors = [...new Set([...result.event.affected_actors, ...prior.map((a) => a.actor_id)])].sort();
    result.event.affected_subjects = [...new Set([...result.event.affected_subjects, ...prior.flatMap((a) => a.subjects ?? [])])].sort();
    result.task.baseline_active = false;
} return result; }
