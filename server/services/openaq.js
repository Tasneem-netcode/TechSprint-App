/**
 * OpenAQ API Service
 * Fetches air quality data for Indian cities
 * API Documentation: https://docs.openaq.org/
 */

const OPENAQ_BASE_URL = 'https://api.openaq.org/v3';

// City coordinates for India (matched with OpenWeather service)
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

// Demo data for when API is unavailable
const DEMO_DATA = {
    Delhi: {
        pm25: 156,
        pm10: 245,
        no2: 62,
        o3: 45,
        so2: 18,
        co: 1.2
    },
    Mumbai: {
        pm25: 89,
        pm10: 142,
        no2: 48,
        o3: 52,
        so2: 14,
        co: 0.9
    },
    Bangalore: {
        pm25: 67,
        pm10: 98,
        no2: 35,
        o3: 58,
        so2: 8,
        co: 0.6
    },
    Chennai: {
        pm25: 72,
        pm10: 115,
        no2: 42,
        o3: 48,
        so2: 12,
        co: 0.7
    },
    Kolkata: {
        pm25: 112,
        pm10: 178,
        no2: 55,
        o3: 38,
        so2: 22,
        co: 1.0
    },
    Hyderabad: {
        pm25: 78,
        pm10: 125,
        no2: 38,
        o3: 55,
        so2: 10,
        co: 0.65
    },
    Pune: {
        pm25: 65,
        pm10: 95,
        no2: 32,
        o3: 48,
        so2: 9,
        co: 0.55
    },
    Ahmedabad: {
        pm25: 95,
        pm10: 155,
        no2: 45,
        o3: 42,
        so2: 16,
        co: 0.85
    },
    Jaipur: {
        pm25: 88,
        pm10: 148,
        no2: 40,
        o3: 50,
        so2: 13,
        co: 0.75
    },
    Lucknow: {
        pm25: 125,
        pm10: 195,
        no2: 52,
        o3: 40,
        so2: 19,
        co: 0.95
    }
};

// WHO Guidelines for pollutants (24-hour average)
const WHO_GUIDELINES = {
    pm25: 15,    // µg/m³
    pm10: 45,    // µg/m³
    no2: 25,     // µg/m³
    o3: 100,     // µg/m³ (8-hour)
    so2: 40,     // µg/m³
    co: 4        // mg/m³
};

/**
 * Fetch air quality data for a city
 */
async function getAirQuality(city = 'Delhi') {
    try {
        // Try to fetch from OpenAQ API v3
        if (process.env.OPENAQ_API_KEY) {
            const coords = CITY_COORDS[city] || CITY_COORDS.Delhi;
            
            // Step 1: Find nearest location
            // v3 uses /locations endpoint with coordinates
            // Using a reasonably large radius (25km) to catch station in city
            const locResponse = await fetch(
                `${OPENAQ_BASE_URL}/locations?coordinates=${coords.lat},${coords.lon}&radius=25000&limit=1`,
                {
                    headers: {
                        'X-API-Key': process.env.OPENAQ_API_KEY
                    }
                }
            );

            if (locResponse.ok) {
                const locData = await locResponse.json();
                
                if (locData.results && locData.results.length > 0) {
                    const locationId = locData.results[0].id;
                    // console.log(`OpenAQ: Found station ${locData.results[0].name} (ID: ${locationId})`);

                    // Step 2: Get latest measurements for this location
                    const measureResponse = await fetch(
                         `${OPENAQ_BASE_URL}/locations/${locationId}/latest`,
                         {
                             headers: {
                                 'X-API-Key': process.env.OPENAQ_API_KEY
                             }
                         }
                    );

                    if (measureResponse.ok) {
                        const measureData = await measureResponse.json();
                        return processOpenAQData(measureData, city);
                    }
                } else {
                    // console.log('OpenAQ: No locations found near city coordinates');
                }
            } else {
                 console.warn(`OpenAQ Location Search failed: ${locResponse.status}`);
            }
        }

        // Fallback to demo data
        // console.warn('Using Demo Data for OpenAQ');
        return getDemoData(city);
    } catch (error) {
        console.error('OpenAQ API error:', error.message);
        return getDemoData(city);
    }
}

/**
 * Process OpenAQ API v3 response
 */
function processOpenAQData(data, city) {
    const measurements = {};
    
    // v3 returns results array with { parameter: { name: ... }, value: ..., datetime: ... }
    if (data.results && Array.isArray(data.results)) {
        data.results.forEach(m => {
            if (m.parameter && m.parameter.name) {
                const param = m.parameter.name.toLowerCase();
                // Store if not exists or if newer (though latest endpoint should give latest)
                measurements[param] = {
                    value: m.value,
                    unit: m.unit || (m.parameter ? m.parameter.units : 'µg/m³'),
                    lastUpdated: m.datetime ? m.datetime.utc : new Date().toISOString()
                };
            }
        });
    }

    // Normalize and return
    return normalizeAirQualityData(measurements, city);
}

/**
 * Get demo data for a city
 */
function getDemoData(city) {
    const cityData = DEMO_DATA[city] || DEMO_DATA.Delhi;
    
    // Add some realistic variation
    const variation = () => 0.9 + Math.random() * 0.2;
    
    return {
        city: city,
        isDemo: true,
        timestamp: new Date().toISOString(),
        pollutants: {
            pm25: {
                value: Math.round(cityData.pm25 * variation()),
                unit: 'µg/m³',
                status: getStatus('pm25', cityData.pm25),
                whoGuideline: WHO_GUIDELINES.pm25,
                exceedance: (cityData.pm25 / WHO_GUIDELINES.pm25).toFixed(1)
            },
            pm10: {
                value: Math.round(cityData.pm10 * variation()),
                unit: 'µg/m³',
                status: getStatus('pm10', cityData.pm10),
                whoGuideline: WHO_GUIDELINES.pm10,
                exceedance: (cityData.pm10 / WHO_GUIDELINES.pm10).toFixed(1)
            },
            no2: {
                value: Math.round(cityData.no2 * variation()),
                unit: 'µg/m³',
                status: getStatus('no2', cityData.no2),
                whoGuideline: WHO_GUIDELINES.no2,
                exceedance: (cityData.no2 / WHO_GUIDELINES.no2).toFixed(1)
            },
            o3: {
                value: Math.round(cityData.o3 * variation()),
                unit: 'µg/m³',
                status: getStatus('o3', cityData.o3),
                whoGuideline: WHO_GUIDELINES.o3,
                exceedance: (cityData.o3 / WHO_GUIDELINES.o3).toFixed(1)
            },
            so2: {
                value: Math.round(cityData.so2 * variation()),
                unit: 'µg/m³',
                status: getStatus('so2', cityData.so2),
                whoGuideline: WHO_GUIDELINES.so2,
                exceedance: (cityData.so2 / WHO_GUIDELINES.so2).toFixed(1)
            },
            co: {
                value: (cityData.co * variation()).toFixed(2),
                unit: 'mg/m³',
                status: getStatus('co', cityData.co),
                whoGuideline: WHO_GUIDELINES.co,
                exceedance: (cityData.co / WHO_GUIDELINES.co).toFixed(1)
            }
        },
        aqi: calculateAQI(cityData),
        summary: generateSummary(cityData)
    };
}

/**
 * Normalize air quality data from API response
 */
function normalizeAirQualityData(measurements, city) {
    const normalized = {};
    
    // List of keys we care about
    const keysToCheck = ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co'];
    
    keysToCheck.forEach(param => {
        if (measurements[param]) {
            normalized[param] = {
                value: measurements[param].value,
                unit: measurements[param].unit,
                status: getStatus(param, measurements[param].value),
                whoGuideline: WHO_GUIDELINES[param],
                exceedance: (measurements[param].value / WHO_GUIDELINES[param]).toFixed(1)
            };
        } else {
            // Use demo data as fallback for missing params
            const demoCity = DEMO_DATA[city] || DEMO_DATA.Delhi;
            normalized[param] = {
                value: demoCity[param],
                unit: param === 'co' ? 'mg/m³' : 'µg/m³',
                status: getStatus(param, demoCity[param]),
                whoGuideline: WHO_GUIDELINES[param],
                exceedance: (demoCity[param] / WHO_GUIDELINES[param]).toFixed(1)
            };
        }
    });

    const demoCity = DEMO_DATA[city] || DEMO_DATA.Delhi;
    
    // Calculate AQI based on real PM2.5 if available
    const aqiData = measurements['pm25'] ? { pm25: measurements['pm25'].value } : demoCity;
    const aqi = calculateAQI(aqiData);

    return {
        city: city,
        isDemo: Object.keys(measurements).length === 0, // It's demo if we found no measurements
        timestamp: new Date().toISOString(),
        pollutants: normalized,
        aqi: aqi,
        summary: generateSummary(aqiData.pm25 ? { pm25: aqiData.pm25 } : demoCity) // approximate summary
    };
}

/**
 * Get status based on pollutant value
 */
function getStatus(pollutant, value) {
    const guideline = WHO_GUIDELINES[pollutant];
    // prevent div by zero if guideline undefined (though it is defined)
    if (!guideline) return 'good';
    
    const ratio = value / guideline;

    if (ratio <= 1) return 'good';
    if (ratio <= 2) return 'moderate';
    if (ratio <= 3) return 'unhealthy';
    if (ratio <= 5) return 'very-unhealthy';
    return 'hazardous';
}

/**
 * Calculate overall AQI (simplified Indian AQI calculation)
 */
function calculateAQI(data) {
    // Using PM2.5 as primary indicator (simplified)
    const pm25 = data.pm25;
    
    let aqi, category;
    
    if (pm25 <= 30) {
        aqi = Math.round((pm25 / 30) * 50);
        category = 'Good';
    } else if (pm25 <= 60) {
        aqi = Math.round(50 + ((pm25 - 30) / 30) * 50);
        category = 'Satisfactory';
    } else if (pm25 <= 90) {
        aqi = Math.round(100 + ((pm25 - 60) / 30) * 100);
        category = 'Moderate';
    } else if (pm25 <= 120) {
        aqi = Math.round(200 + ((pm25 - 90) / 30) * 100);
        category = 'Poor';
    } else if (pm25 <= 250) {
        aqi = Math.round(300 + ((pm25 - 120) / 130) * 100);
        category = 'Very Poor';
    } else {
        aqi = Math.round(400 + ((pm25 - 250) / 130) * 100);
        category = 'Severe';
    }

    return {
        value: Math.min(aqi, 500),
        category: category,
        color: getAQIColor(category)
    };
}

/**
 * Get color for AQI category
 */
function getAQIColor(category) {
    const colors = {
        'Good': '#00e400',
        'Satisfactory': '#92d050',
        'Moderate': '#ffff00',
        'Poor': '#ff7e00',
        'Very Poor': '#ff0000',
        'Severe': '#8f3f97'
    };
    return colors[category] || '#808080';
}

/**
 * Generate summary text
 */
function generateSummary(data) {
    if (data.pm25 === undefined) return "Data unavailable.";
    
    const pm25Ratio = data.pm25 / WHO_GUIDELINES.pm25;
    
    if (pm25Ratio <= 1) {
        return 'Air quality is within safe limits. Normal outdoor activities are safe.';
    } else if (pm25Ratio <= 2) {
        return 'Air quality is moderately elevated. Sensitive individuals should limit prolonged outdoor exposure.';
    } else if (pm25Ratio <= 3) {
        return 'Air quality is unhealthy. Consider reducing outdoor activities, especially for sensitive groups.';
    } else if (pm25Ratio <= 5) {
        return 'Air quality is very unhealthy. Significant health impacts possible. Limit outdoor exposure.';
    } else {
        return 'Air quality is hazardous. Avoid outdoor activities. Health warnings in effect.';
    }
}

module.exports = {
    getAirQuality,
    WHO_GUIDELINES,
    calculateAQI
};
