import { createReport, listReports } from '../services/reportService';

export { listReports };
export async function submitReport(location: string, description: string) { return createReport(location, description); }
