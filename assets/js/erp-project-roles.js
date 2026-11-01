export const projectRoleNames = { construction_lead: 'Építésvezető', maintenance_lead: 'Karbantartásvezető', construction_worker: 'Kertépítő', gardener: 'Kertész', crew_lead: 'Csoportvezető', worker: 'Résztvevő' };
export function selectableProjectRoles(workType) {
    return ['construction_lead', 'maintenance_lead', 'construction_worker', 'gardener'].map(value => ({ value, label: projectRoleNames[value], disabled: Boolean(workType && ((value === 'construction_lead' && workType !== 'construction') || (value === 'maintenance_lead' && workType !== 'maintenance'))) }));
}
