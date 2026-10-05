import { Report } from '../types';
import { searchCities } from './geocodingService';
import { classifyImage } from './visionService';

const reports: Report[] = [];

const CATEGORY_FALLBACK: Record<string, string> = {
  Smoke: 'Possible smoke pollution',
  Industrial: 'Possible industrial emission',
  'Garbage burning': 'Possible garbage burning',
  'Crop burning': 'Possible biomass burning',
  Dust: 'Possible dust event',
  Traffic: 'Possible traffic emission',
  Other: 'Possible localized pollution'
};

async function geocode(location: string, latitude?: number, longitude?: number) {
  if (latitude !== undefined && longitude !== undefined) return { latitude, longitude };
  const match = (await searchCities(location).catch(() => []))[0];
  return match ? { latitude: match.latitude, longitude: match.longitude } : { latitude: 0, longitude: 0 };
}

export async function createReport(
  location: string,
  description: string,
  category = 'Other',
  image?: { name: string; buffer: Buffer; path?: string },
  coordinates?: { latitude?: number; longitude?: number }
): Promise<Report> {
  const position = await geocode(location, coordinates?.latitude, coordinates?.longitude);

  // Prefer the vision model when a photo exists; otherwise fall back to the declared category.
  const vision = image ? await classifyImage(image.buffer, image.name, `${category} ${description}`) : null;
  const aiClassification = vision?.label || CATEGORY_FALLBACK[category] || CATEGORY_FALLBACK.Other;
  const aiConfidence = vision?.confidence ?? (image ? 0.55 : 0.45);

  const report: Report = {
    id: crypto.randomUUID(),
    location,
    description,
    category,
    latitude: position.latitude,
    longitude: position.longitude,
    imageName: image?.name,
    imagePath: image?.path,
    aiClassification,
    aiConfidence: Number(aiConfidence.toFixed(2)),
    aiModel: vision?.model || (vision ? 'vision' : 'category-heuristic'),
    status: 'received',
    createdAt: new Date().toISOString()
  };
  reports.push(report);
  return report;
}

export async function listReports(): Promise<Report[]> { return reports; }

export async function getReportsByLocation(): Promise<Report[]> { return reports; }

export async function updateReportStatus(id: string, status: Report['status']): Promise<Report | undefined> {
  const report = reports.find((item) => item.id === id);
  if (report) report.status = status;
  return report;
}