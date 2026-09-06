import { FastifyInstance } from "fastify";

export async function weatherRoutes(fastify: FastifyInstance) {
  fastify.get("/weather", async (request, reply) => {
    const { lat, lon } = request.query as {
      lat?: string;
      lon?: string;
    };

    // Validate parameters
    if (!lat || !lon) {
      return reply.code(400).send({
        error: true,
        message: "lat and lon are required",
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return reply.code(400).send({
        error: true,
        message: "Invalid latitude or longitude",
      });
    }

    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");

      url.searchParams.set("latitude", latitude.toString());
      url.searchParams.set("longitude", longitude.toString());

      // Current weather
      url.searchParams.set(
        "current",
        [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "is_day",
          "precipitation",
          "rain",
          "weather_code",
          "cloud_cover",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
        ].join(","),
      );

      // Hourly forecast
      url.searchParams.set(
        "hourly",
        [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "precipitation_probability",
          "precipitation",
          "rain",
          "weather_code",
          "cloud_cover",
          "visibility",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
        ].join(","),
      );

      // Daily forecast
      url.searchParams.set(
        "daily",
        [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "apparent_temperature_max",
          "apparent_temperature_min",
          "sunrise",
          "sunset",
          "precipitation_sum",
          "rain_sum",
          "precipitation_probability_max",
          "wind_speed_10m_max",
          "wind_gusts_10m_max",
        ].join(","),
      );

      // Return local time for the requested coordinates
      url.searchParams.set("timezone", "auto");

      // 7-day forecast
      url.searchParams.set("forecast_days", "7");

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();

        fastify.log.error(`Open-Meteo error: ${errorText}`);

        return reply.code(response.status).send({
          error: true,
          message: "Failed to fetch weather data",
        });
      }

      const data = await response.json();

      return reply.send({
        success: true,

        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
        },

        current: data.current,

        hourly: data.hourly,

        daily: data.daily,
      });
    } catch (error) {
      fastify.log.error(error);

      return reply.code(500).send({
        error: true,
        message: "Failed to fetch weather data",
      });
    }
  });
}
