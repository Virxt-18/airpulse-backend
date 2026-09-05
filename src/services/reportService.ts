import { Report } from '../types';

const reports: Report[] = [];

export async function createReport(location: string, description: string): Promise<Report> {
  const report: Report = { id: crypto.randomUUID(), location, description, status: 'received', createdAt: new Date().toISOString() };
  reports.push(report);
  return report;
}

export async function listReports(): Promise<Report[]> { return reports; }
