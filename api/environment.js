import { getAirQuality } from "./_services/openaq.js";
import { getCurrentWeather } from "./_services/openweather.js";
import { interpretConditions } from "./_services/gemini.js";

export default async function handler(req, res) {
  try {
    const city = req.query.city || "Delhi";
    const industry = req.query.industry || "Urban";

    const airQuality = await getAirQuality(city);
    const weather = await getCurrentWeather(city);

    const riskAnalysis = {
      overallRisk: {
        aqi: airQuality.aqi?.value,
        level: airQuality.aqi?.category
      }
    };

    const interpretation = await interpretConditions(
      airQuality,
      weather,
      riskAnalysis,
      industry
    );

    res.status(200).json({
      city,
      timestamp: new Date().toISOString(),
      airQuality,
      weather,
      interpretation
    });
  } catch (err) {
    console.error("Environment API error:", err);
    res.status(500).json({ error: "Failed to load environment data" });
  }
}
