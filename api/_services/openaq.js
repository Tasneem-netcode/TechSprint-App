/**
 * OpenAQ API Service (Vercel-compatible)
 */

const OPENAQ_BASE_URL = "https://api.openaq.org/v3";

const CITY_COORDS = {
  Delhi: { lat: 28.6139, lon: 77.209 },
  Hyderabad: { lat: 17.385, lon: 78.4867 }
};

/* ================= FETCH ================= */

export async function getAirQuality(city = "Delhi") {
  try {
    if (!process.env.OPENAQ_API_KEY) return demo(city);

    const coords = CITY_COORDS[city] || CITY_COORDS.Delhi;

    const locRes = await fetch(
      `${OPENAQ_BASE_URL}/locations?coordinates=${coords.lat},${coords.lon}&radius=25000&limit=1`,
      { headers: { "X-API-Key": process.env.OPENAQ_API_KEY } }
    );

    if (!locRes.ok) return demo(city);

    const loc = await locRes.json();
    if (!loc.results?.length) return demo(city);

    const id = loc.results[0].id;

    const dataRes = await fetch(
      `${OPENAQ_BASE_URL}/locations/${id}/latest`,
      { headers: { "X-API-Key": process.env.OPENAQ_API_KEY } }
    );

    if (!dataRes.ok) return demo(city);

    return normalize(await dataRes.json(), city);
  } catch {
    return demo(city);
  }
}

/* ================= NORMALIZATION ================= */

function normalize(data, city) {
  const pollutants = {};

  for (const m of data.results || []) {
    const key = m.parameter?.name?.toLowerCase();
    if (key) pollutants[key] = { value: m.value };
  }

  const pm25 = pollutants.pm25?.value || 80;

  return {
    city,
    pollutants,
    aqi: calculateAQI(pm25)
  };
}

/* ================= AQI ================= */

export function calculateAQI(pm25) {
  if (pm25 <= 30) return { value: 50, category: "Good" };
  if (pm25 <= 60) return { value: 100, category: "Moderate" };
  if (pm25 <= 90) return { value: 200, category: "Poor" };
  return { value: 300, category: "Severe" };
}

/* ================= DEMO ================= */

function demo(city) {
  return {
    city,
    isDemo: true,
    pollutants: { pm25: { value: 75 } },
    aqi: calculateAQI(75)
  };
}
