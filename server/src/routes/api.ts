import { Router, Request, Response } from 'express';
const router = Router();

const openaqService = require('../services/openaq');
const openweatherService = require('../services/openweather');
const geminiService = require('../services/gemini');
const riskCalculator = require('../services/riskCalculator');

/**
 * GET /api/environmental-data
 * Fetch current environmental conditions for India
 */
router.get('/environmental-data', async (req: Request, res: Response) => {
  try {
    const city = (req.query.city as string) || 'Delhi';
    const industry = (req.query.industry as string) || 'Generic Industrial Zone';
    const cacheKey = `env:${city}:${industry}`;
    const cache = require('../../lib/cache');

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Fetch data from both APIs in parallel
    const [airQualityData, weatherData] = await Promise.all([
      openaqService.getAirQuality(city),
      openweatherService.getCurrentWeather(city)
    ]);

    // Calculate risk scores with industry context
    const riskAnalysis = riskCalculator.calculateOverallRisk(airQualityData, weatherData, industry);

    // Get AI interpretation if Gemini is configured (cache results)
    let aiInsights = null;
    if (process.env.GEMINI_API_KEY) {
      const gcacheKey = `ai:conditions:${city}:${industry}:${riskAnalysis.overallRisk?.aqi}`;
      const aiCached = cache.get(gcacheKey);
      if (aiCached) {
        aiInsights = aiCached;
      } else {
        aiInsights = await geminiService.interpretConditions(airQualityData, weatherData, riskAnalysis, industry);
        // cache AI for 10 minutes
        cache.set(gcacheKey, aiInsights, 10 * 60 * 1000);
      }
    }

    const payload = {
      success: true,
      timestamp: new Date().toISOString(),
      city: city,
      industry: industry,
      data: {
        airQuality: airQualityData,
        weather: weatherData,
        riskAnalysis: riskAnalysis,
        aiInsights: aiInsights
      }
    };

    // Cache environmental payload for 3 minutes
    cache.set(cacheKey, payload, 3 * 60 * 1000);
    res.set('X-Cache', 'MISS');
    res.json(payload);
  } catch (error: any) {
    console.error('Error fetching environmental data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch environmental data',
      message: error.message
    });
  }
});

// ... the rest of the file omitted for brevity; we'll add additional handlers as needed

export default router;
module.exports = router;