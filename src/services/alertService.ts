import { Alert } from '../types';

const alerts: Alert[] = [];

export async function createAlert(location: string, threshold: number): Promise<Alert> {
  const alert: Alert = { id: crypto.randomUUID(), location, threshold, enabled: true };
  alerts.push(alert);
  return alert;
}

export async function listAlerts(): Promise<Alert[]> { return alerts; }
