import { createAlert, listAlerts } from '../services/alertService';

export { listAlerts };
export async function subscribeAlert(location: string, threshold: number) { return createAlert(location, threshold); }
