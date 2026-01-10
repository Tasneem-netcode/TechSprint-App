/**
 * OpenWeatherMap API Service (Vercel-compatible)
 */

const BASE = "https://api.openweathermap.org/data/2.5";

const CITY_COORDS = {
  Delhi: { lat: 28.6139, lon: 77.209 },
  Hyderabad: { lat: 17.385, lon: 78.4867 }
};

export async function getCurrentWeather(city = "Delhi") {
  try {
    if (!process.env.OPENWEATHERMAP_API_KEY) return demo(city);

    const { lat, lon } = CITY_COORDS[city] || CITY_COORDS.Delhi;

    const res = await fetch(
      `${BASE}/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`
    );

    if (!res.ok) return demo(city);

    const data = await res.json();
    return format(data, city);
  } catch {
    return demo(city);
  }
}

function format(data, city) {
  return {
    city,
    current: {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6),
      description: data.weather[0]?.description
    }
  };
}

function demo(city) {
  return {
    city,
    isDemo: true,
    current: {
      temperature: 28,
      humidity: 60,
      windSpeed: 8,
      description: "Clear"
    }
  };
}
