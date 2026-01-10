import { getAirQuality } from "./_services/openaq.js";

export default async function handler(req, res) {
  try {
    const city = req.query.city || "Delhi";

    const airQuality = await getAirQuality(city);

    res.status(200).json({
      city,
      timestamp: new Date().toISOString(),
      airQuality
    });
  } catch (err) {
    console.error("Pollution API error:", err);
    res.status(500).json({ error: "Failed to load pollution data" });
  }
}
