import { FastifyPluginAsync } from 'fastify';
import { listReports, createReport, updateReportStatus } from '../services/reportService';
import { saveUpload } from '../services/uploadService';

type ReportBody = {
  location: string;
  description: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  imageName?: string;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Accepts both JSON and multipart/form-data so photos can be attached to a report. */
const reportRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => listReports());

  app.post('/', async (request, reply) => {
    const contentType = String(request.headers['content-type'] || '');

    if (contentType.includes('multipart/form-data')) {
      let location = '';
      let description = '';
      let category = 'Other';
      let latitude: number | undefined;
      let longitude: number | undefined;
      let image: { name: string; buffer: Buffer; path: string } | undefined;

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (part.mimetype?.startsWith('image/')) {
            const buffer = await part.toBuffer();
            if (buffer.length <= MAX_IMAGE_BYTES) image = saveUpload(buffer, part.filename);
          }
          continue;
        }
        const value = String(part.value ?? '');
        if (part.fieldname === 'location') location = value;
        if (part.fieldname === 'description') description = value;
        if (part.fieldname === 'category') category = value || 'Other';
        if (part.fieldname === 'latitude' && Number.isFinite(Number(value))) latitude = Number(value);
        if (part.fieldname === 'longitude' && Number.isFinite(Number(value))) longitude = Number(value);
      }

      if (!location || !description) {
        return reply.code(400).send({ error: 'location and description are required' });
      }
      return reply.code(201).send(await createReport(location, description, category, image, { latitude, longitude }));
    }

    const body = (request.body || {}) as ReportBody;
    if (!body.location || !body.description) {
      return reply.code(400).send({ error: 'location and description are required' });
    }
    return reply.code(201).send(await createReport(body.location, body.description, body.category, undefined, body));
  });

  app.patch<{ Params: { id: string }; Body: { status: 'received' | 'reviewed' | 'under-investigation' | 'actioned' } }>('/:id', async (request, reply) => {
    const updated = await updateReportStatus(request.params.id, request.body.status);
    if (!updated) return reply.code(404).send({ error: 'report not found' });
    return updated;
  });
};

export default reportRoutes;