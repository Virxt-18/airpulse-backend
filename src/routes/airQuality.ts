import { FastifyInstance } from "fastify";

export async function airQualityRoutes(fastify: FastifyInstance) {
  fastify.get("/airQuality", async (request, reply) => {
    const {
      lat,
      lon,
      radius = "10000",
    } = request.query as {
      lat?: string;
      lon?: string;
      radius?: string;
    };

    if (!lat || !lon) {
      return reply.code(400).send({
        error: "lat and lon are required",
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);
    const searchRadius = Number(radius);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(searchRadius)
    ) {
      return reply.code(400).send({
        error: "Invalid latitude, longitude or radius",
      });
    }

    try {
      // 1. Find OpenAQ monitoring stations near the user
      const locationsResponse = await fetch(
        `https://api.openaq.org/v3/locations?coordinates=${latitude},${longitude}&radius=${searchRadius}&limit=100`,
        {
          headers: {
            "X-API-Key": process.env.OPENAQ_API_KEY!,
          },
        },
      );

      if (!locationsResponse.ok) {
        const errorText = await locationsResponse.text();

        fastify.log.error(errorText);

        return reply.code(locationsResponse.status).send({
          error: "OpenAQ locations request failed",
        });
      }

      const locationsData = await locationsResponse.json();

      // 2. Get latest measurements for every nearby station
      const locations = locationsData.results ?? [];

      const stations = await Promise.all(
        locations.map(async (location: any) => {
          try {
            const latestResponse = await fetch(
              `https://api.openaq.org/v3/locations/${location.id}/latest`,
              {
                headers: {
                  "X-API-Key": process.env.OPENAQ_API_KEY!,
                },
              },
            );

            if (!latestResponse.ok) {
              return null;
            }

            const latestData = await latestResponse.json();

            return {
              id: location.id,
              name: location.name,
              locality: location.locality,
              country: location.country,
              coordinates: location.coordinates,
              measurements: latestData.results ?? [],
            };
          } catch {
            return null;
          }
        }),
      );

      return reply.send({
        userLocation: {
          latitude,
          longitude,
        },
        radius: searchRadius,
        stations: stations.filter(Boolean),
      });
    } catch (error) {
      fastify.log.error(error);

      return reply.code(500).send({
        error: "Failed to fetch air quality data",
      });
    }
  });
}
