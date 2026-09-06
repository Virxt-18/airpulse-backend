import { FastifyInstance } from "fastify";

export async function airQualityRoutes(fastify: FastifyInstance) {
  fastify.get("/airQuality", async (request, reply) => {
    const { latitude, longitude } = request.query as {
      latitude?: string;
      longitude?: string;
    };

    if (!latitude || !longitude) {
      return reply.code(400).send({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    try {
      const lat = Number(latitude);
      const lon = Number(longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return reply.code(400).send({
          success: false,
          message: "Invalid latitude or longitude",
        });
      }

      const url = new URL(
        "https://air-quality-api.open-meteo.com/v1/air-quality",
      );

      url.searchParams.set("latitude", lat.toString());
      url.searchParams.set("longitude", lon.toString());

      url.searchParams.set(
        "current",
        [
          "us_aqi",
          "us_aqi_pm2_5",
          "us_aqi_pm10",
          "us_aqi_nitrogen_dioxide",
          "us_aqi_ozone",
          "us_aqi_sulphur_dioxide",
          "us_aqi_carbon_monoxide",
          "pm2_5",
          "pm10",
          "nitrogen_dioxide",
          "ozone",
          "sulphur_dioxide",
          "carbon_monoxide",
        ].join(","),
      );

      url.searchParams.set("timezone", "auto");

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Open-Meteo returned ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        location: {
          latitude: lat,
          longitude: lon,
        },
        modeledAQ: {
          current: data.current,
          current_units: data.current_units,
        },
      };
    } catch (error) {
      request.log.error(error);

      return reply.code(500).send({
        success: false,
        message: "Failed to fetch air quality data",
      });
    }
  });
}
