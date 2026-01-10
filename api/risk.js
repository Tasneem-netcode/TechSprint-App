import { getAirQuality } from "./_services/openaq.js";
import { getCurrentWeather } from "./_services/openweather.js";

function calculateRisk(airQuality, weather) {
  const aqi = airQuality.aqi?.value || 0;

  let level = "Low";
  if (aqi > 300) level = "Severe";
  else if (aqi > 200) level = "Very Poor";
  else if (aqi > 100) level = "Moderate";

  return {
    aqi,
    level,
    factors: {
      wind: weather.current?.windSpeed,
      humidity: weather.current?.humidity
    }
  };
}

export default async function handler(req, res) {
  try {
    const city = req.query.city || "Delhi";

    const airQuality = await getAirQuality(city);
    const weather = await getCurrentWeather(city);

    const risk = calculateRisk(airQuality, weather);

    res.status(200).json({
      city,
      timestamp: new Date().toISOString(),
      risk
    });
  } catch (err) {
    console.error("Risk API error:", err);
    res.status(500).json({ error: "Failed to calculate risk" });
  }
}
