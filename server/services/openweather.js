/**
 * OpenWeatherMap API Service
 * Fetches weather data and forecasts for Indian cities
 * API Documentation: https://openweathermap.org/api
 */

const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// City coordinates for India
const CITY_COORDS = {
    Delhi: { lat: 28.6139, lon: 77.2090 },
    Mumbai: { lat: 19.0760, lon: 72.8777 },
    Bangalore: { lat: 12.9716, lon: 77.5946 },
    Chennai: { lat: 13.0827, lon: 80.2707 },
    Kolkata: { lat: 22.5726, lon: 88.3639 },
    Hyderabad: { lat: 17.3850, lon: 78.4867 },
    Pune: { lat: 18.5204, lon: 73.8567 },
    Ahmedabad: { lat: 23.0225, lon: 72.5714 },
    Jaipur: { lat: 26.9124, lon: 75.7873 },
    Lucknow: { lat: 26.8467, lon: 80.9462 }
};

// Demo weather data
const DEMO_WEATHER = {
    Delhi: {
        temp: 18,
        humidity: 65,
        windSpeed: 8,
        windDir: 'NW',
        pressure: 1015,
        visibility: 4,
        description: 'Hazy',
        icon: '50d'
    },
    Mumbai: {
        temp: 28,
        humidity: 75,
        windSpeed: 12,
        windDir: 'W',
        pressure: 1012,
        visibility: 8,
        description: 'Partly Cloudy',
        icon: '02d'
    },
    Bangalore: {
        temp: 24,
        humidity: 55,
        windSpeed: 10,
        windDir: 'E',
        pressure: 1018,
        visibility: 10,
        description: 'Clear',
        icon: '01d'
    },
    Chennai: {
        temp: 30,
        humidity: 80,
        windSpeed: 15,
        windDir: 'SE',
        pressure: 1010,
        visibility: 7,
        description: 'Humid',
        icon: '03d'
    },
    Kolkata: {
        temp: 22,
        humidity: 70,
        windSpeed: 6,
        windDir: 'S',
        pressure: 1014,
        visibility: 5,
        description: 'Misty',
        icon: '50d'
    }
};

/**
 * Get current weather for a city
 */
async function getCurrentWeather(city = 'Delhi') {
    try {
        if (process.env.OPENWEATHERMAP_API_KEY) {
            const coords = CITY_COORDS[city] || CITY_COORDS.Delhi;
            const response = await fetch(
                `${OPENWEATHER_BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`
            );

            if (response.ok) {
                const data = await response.json();
                return processWeatherData(data, city);
            }
        }

        return getDemoWeather(city);
    } catch (error) {
        console.error('OpenWeatherMap API error:', error.message);
        return getDemoWeather(city);
    }
}

/**
 * Get weather forecast (5 days)
 */
async function getWeatherForecast(city = 'Delhi') {
    try {
        if (process.env.OPENWEATHERMAP_API_KEY) {
            const coords = CITY_COORDS[city] || CITY_COORDS.Delhi;
            const response = await fetch(
                `${OPENWEATHER_BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`
            );

            if (response.ok) {
                const data = await response.json();
                return processForecastData(data, city);
            }
        }

        return getDemoForecast(city);
    } catch (error) {
        console.error('OpenWeatherMap Forecast API error:', error.message);
        return getDemoForecast(city);
    }
}

/**
 * Process weather API response
 */
function processWeatherData(data, city) {
    return {
        city: city,
        isDemo: false,
        timestamp: new Date().toISOString(),
        current: {
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
            windDirection: getWindDirection(data.wind.deg),
            visibility: Math.round((data.visibility || 10000) / 1000),
            description: data.weather[0]?.description || 'Clear',
            icon: data.weather[0]?.icon || '01d',
            clouds: data.clouds?.all || 0
        },
        sun: {
            sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-IN'),
            sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-IN')
        },
        environmentalFactors: calculateEnvironmentalFactors(data)
    };
}

/**
 * Process forecast API response
 */
function processForecastData(data, city) {
    const daily = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('en-IN');
        
        if (!daily[date]) {
            daily[date] = {
                temps: [],
                humidity: [],
                wind: [],
                rain: 0,
                descriptions: []
            };
        }
        
        daily[date].temps.push(item.main.temp);
        daily[date].humidity.push(item.main.humidity);
        daily[date].wind.push(item.wind.speed * 3.6);
        daily[date].rain += item.rain?.['3h'] || 0;
        daily[date].descriptions.push(item.weather[0].main);
    });

    const forecast = Object.entries(daily).slice(0, 5).map(([date, data]) => ({
        date: date,
        tempHigh: Math.round(Math.max(...data.temps)),
        tempLow: Math.round(Math.min(...data.temps)),
        humidity: Math.round(data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length),
        windSpeed: Math.round(data.wind.reduce((a, b) => a + b, 0) / data.wind.length),
        rainChance: data.rain > 0 ? Math.min(100, Math.round(data.rain * 10)) : 0,
        condition: getMostFrequent(data.descriptions)
    }));

    return {
        city: city,
        isDemo: false,
        timestamp: new Date().toISOString(),
        days: forecast,
        trends: analyzeTrends(forecast)
    };
}

/**
 * Get demo weather data
 */
function getDemoWeather(city) {
    const baseData = DEMO_WEATHER[city] || DEMO_WEATHER.Delhi;
    const variation = () => 0.95 + Math.random() * 0.1;

    return {
        city: city,
        isDemo: true,
        timestamp: new Date().toISOString(),
        current: {
            temperature: Math.round(baseData.temp * variation()),
            feelsLike: Math.round(baseData.temp * variation() * 1.02),
            humidity: Math.round(baseData.humidity * variation()),
            pressure: Math.round(baseData.pressure),
            windSpeed: Math.round(baseData.windSpeed * variation()),
            windDirection: baseData.windDir,
            visibility: Math.round(baseData.visibility * variation()),
            description: baseData.description,
            icon: baseData.icon,
            clouds: Math.round(30 + Math.random() * 40)
        },
        sun: {
            sunrise: '06:45 AM',
            sunset: '05:52 PM'
        },
        environmentalFactors: {
            pollutantDispersion: baseData.windSpeed > 10 ? 'good' : 'poor',
            inversionRisk: baseData.temp < 15 ? 'high' : 'low',
            dustRisk: baseData.humidity < 40 ? 'moderate' : 'low',
            rainWashout: 'none'
        }
    };
}

/**
 * Get demo forecast data
 */
function getDemoForecast(city) {
    const baseData = DEMO_WEATHER[city] || DEMO_WEATHER.Delhi;
    const days = [];
    
    for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        days.push({
            date: date.toLocaleDateString('en-IN'),
            tempHigh: Math.round(baseData.temp + 3 + Math.random() * 4),
            tempLow: Math.round(baseData.temp - 5 - Math.random() * 3),
            humidity: Math.round(baseData.humidity + (Math.random() - 0.5) * 20),
            windSpeed: Math.round(baseData.windSpeed + (Math.random() - 0.5) * 6),
            rainChance: Math.round(Math.random() * 40),
            condition: ['Clear', 'Partly Cloudy', 'Cloudy', 'Hazy'][Math.floor(Math.random() * 4)]
        });
    }

    return {
        city: city,
        isDemo: true,
        timestamp: new Date().toISOString(),
        days: days,
        trends: {
            temperatureTrend: 'stable',
            humidityTrend: 'stable',
            windTrend: 'decreasing',
            rainOutlook: 'low'
        }
    };
}

/**
 * Calculate environmental factors from weather data
 */
function calculateEnvironmentalFactors(data) {
    const windSpeed = data.wind?.speed || 0;
    const temp = data.main?.temp || 20;
    const humidity = data.main?.humidity || 50;
    const rain = data.rain?.['1h'] || 0;

    return {
        pollutantDispersion: windSpeed > 3 ? 'good' : windSpeed > 1.5 ? 'moderate' : 'poor',
        inversionRisk: temp < 10 && windSpeed < 2 ? 'high' : temp < 15 ? 'moderate' : 'low',
        dustRisk: humidity < 40 && windSpeed > 5 ? 'high' : humidity < 50 ? 'moderate' : 'low',
        rainWashout: rain > 0 ? 'active' : 'none'
    };
}

/**
 * Get wind direction from degrees
 */
function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

/**
 * Get most frequent item in array
 */
function getMostFrequent(arr) {
    const counts = {};
    arr.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Clear';
}

/**
 * Analyze trends from forecast data
 */
function analyzeTrends(forecast) {
    if (forecast.length < 2) {
        return { temperatureTrend: 'stable', humidityTrend: 'stable', windTrend: 'stable', rainOutlook: 'low' };
    }

    const first = forecast[0];
    const last = forecast[forecast.length - 1];

    return {
        temperatureTrend: last.tempHigh > first.tempHigh + 2 ? 'increasing' : last.tempHigh < first.tempHigh - 2 ? 'decreasing' : 'stable',
        humidityTrend: last.humidity > first.humidity + 10 ? 'increasing' : last.humidity < first.humidity - 10 ? 'decreasing' : 'stable',
        windTrend: last.windSpeed > first.windSpeed + 5 ? 'increasing' : last.windSpeed < first.windSpeed - 5 ? 'decreasing' : 'stable',
        rainOutlook: forecast.some(d => d.rainChance > 60) ? 'likely' : forecast.some(d => d.rainChance > 30) ? 'possible' : 'low'
    };
}

module.exports = {
    getCurrentWeather,
    getWeatherForecast,
    CITY_COORDS
};
