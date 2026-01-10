const express = require('express');
const router = express.Router();

const openaqService = require('../services/openaq');
const openweatherService = require('../services/openweather');
const geminiService = require('../services/gemini');
const riskCalculator = require('../services/riskCalculator');

/**
 * GET /api/environmental-data
 * Fetch current environmental conditions for India
 */
router.get('/environmental-data', async (req, res) => {
    try {
        const city = req.query.city || 'Delhi';
        const industry = req.query.industry || 'Generic Industrial Zone';
        const cacheKey = `env:${city}:${industry}`;
        const cache = require('../lib/cache');

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
            const gcacheKey = `ai:conditions:${city}:${industry}:${riskAnalysis.overallRisk.aqi}`;
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
    } catch (error) {
        console.error('Error fetching environmental data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch environmental data',
            message: error.message
        });
    }
});

/**
 * GET /api/forecast
 * Get short-term and long-term environmental risk forecast
 */
router.get('/forecast', async (req, res) => {
    try {
        const city = req.query.city || 'Delhi';
        const industry = req.query.industry || 'Generic Industrial Zone';
        const cache = require('../lib/cache');
        const cacheKey = `forecast:${city}:${industry}`;

        const cached = cache.get(cacheKey);
        if (cached) {
            res.set('X-Cache', 'HIT');
            return res.json(cached);
        }

        // Fetch weather forecast and current air quality
        const [airQualityData, weatherForecast] = await Promise.all([
            openaqService.getAirQuality(city),
            openweatherService.getWeatherForecast(city)
        ]);

        // Generate risk forecast with industry context
        const forecast = riskCalculator.generateForecast(airQualityData, weatherForecast, industry);

        // Get AI interpretation for forecast (cache for 20 minutes)
        let aiInsights = null;
        if (process.env.GEMINI_API_KEY) {
            const gkey = `ai:forecast:${city}:${industry}:${forecast.shortTerm && forecast.shortTerm[0] ? forecast.shortTerm[0].level : ''}`;
            const gcached = cache.get(gkey);
            if (gcached) aiInsights = gcached;
            else {
                aiInsights = await geminiService.interpretForecast(forecast, airQualityData, weatherForecast, industry);
                cache.set(gkey, aiInsights, 20 * 60 * 1000);
            }
        }

        const payload = {
            success: true,
            timestamp: new Date().toISOString(),
            city: city,
            industry: industry,
            forecast: forecast,
            aiInsights: aiInsights
        };

        cache.set(cacheKey, payload, 5 * 60 * 1000); // cache forecast for 5 minutes
        res.set('X-Cache', 'MISS');
        res.json(payload);
    } catch (error) {
        console.error('Error generating forecast:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate forecast',
            message: error.message
        });
    }
});

/**
 * POST /api/report
 * Accepts a pollution incident report and stores it to server/data/reports.json
 */
router.post('/report', async (req, res) => {
    try {
        const report = req.body;
        if (!report || !report.location || !report.pollutantType || !report.description || !report.reportedBy) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // If MongoDB is configured, insert into `reports` collection
        const { getDb } = require('../lib/mongo');
        const db = await getDb();
        if (db) {
            const reportsCol = db.collection('reports');
            const newReport = Object.assign({
                timestamp: new Date().toISOString(),
                verified: false
            }, report);

            const result = await reportsCol.insertOne(newReport);
            newReport._id = result.insertedId;

            return res.json({ success: true, report: newReport });
        }

        // Fallback to file storage
        const fs = require('fs');
        const path = require('path');
        const dataPath = path.join(__dirname, '../data/reports.json');

        let reports = [];
        try {
            const raw = fs.readFileSync(dataPath, 'utf8');
            reports = JSON.parse(raw || '[]');
        } catch (e) {
            // ignore, start with empty
            reports = [];
        }

        const newReport = Object.assign({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            verified: false
        }, report);

        reports.push(newReport);
        fs.writeFileSync(dataPath, JSON.stringify(reports, null, 2), 'utf8');

        res.json({ success: true, report: newReport });
    } catch (error) {
        console.error('Error saving report:', error);
        res.status(500).json({ success: false, error: 'Failed to save report', message: error.message });
    }
});

/**
 * POST /api/ai-interpret
 * Get AI interpretation for specific data
 */
router.post('/ai-interpret', async (req, res) => {
    try {
        const { type, data } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.json({
                success: true,
                interpretation: getDefaultInterpretation(type, data)
            });
        }

        const interpretation = await geminiService.customInterpretation(type, data);

        res.json({
            success: true,
            interpretation: interpretation
        });
    } catch (error) {
        console.error('Error getting AI interpretation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get AI interpretation',
            message: error.message
        });
    }
});

/**
 * POST /api/alert-explain
 * Return a short Gemini explanation for a triggered alert
 */
router.post('/alert-explain', async (req, res) => {
    try {
        const { industry, aqi, pm25, windSpeed, persistence } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.json({ success: true, explanation: 'AI explanation unavailable.' });
        }

        const explanation = await geminiService.explainAlert({ industry, aqi, pm25, windSpeed, persistence });

        res.json({ success: true, explanation });
    } catch (error) {
        console.error('Error explaining alert:', error);
        res.status(500).json({ success: false, explanation: 'AI explanation unavailable.' });
    }
});

/**
 * GET /api/cities
 * Get list of supported cities
 */
router.get('/cities', (req, res) => {
    res.json({
        success: true,
        cities: [
            { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
            { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
            { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
            { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
            { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
            { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
            { name: 'Pune', lat: 18.5204, lon: 73.8567 },
            { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
            { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
            { name: 'Lucknow', lat: 26.8467, lon: 80.9462 }
        ]
    });
});

/**
 * GET /api/reports
 * Paginated list of reports (admin only)
 */
router.get('/reports', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const sessions = require('../lib/sessions');
        const sess = sessions.get(sessionId);

        if (!sess) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const db = await require('../lib/mongo').getDb();
        if (!db) return res.status(503).json({ success: false, error: 'DB not available' });

        const usersCol = db.collection('users');
        const userDoc = await usersCol.findOne({ email: sess.email });
        if (!userDoc || userDoc.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });

        const limit = Math.min(100, parseInt(req.query.limit) || 10);
        const page = Math.max(1, parseInt(req.query.page) || 1);

        const reportsCol = db.collection('reports');
        // Ensure an index on timestamp for fast sorting (idempotent)
        await reportsCol.createIndex({ timestamp: -1 });
        const total = await reportsCol.countDocuments();
        const reports = await reportsCol.find({}, { projection: { description: 0 } }).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).toArray();

        res.json({ success: true, page, limit, total, reports });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch reports' });
    }
});

/**
 * POST /api/reports/:id/verify
 * Mark a report as verified (admin only)
 */
router.post('/reports/:id/verify', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const sessions = require('../lib/sessions');
        const sess = sessions.get(sessionId);

        if (!sess) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const db = await require('../lib/mongo').getDb();
        if (!db) return res.status(503).json({ success: false, error: 'DB not available' });

        const usersCol = db.collection('users');
        const userDoc = await usersCol.findOne({ email: sess.email });
        if (!userDoc || userDoc.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });

        const { ObjectId } = require('mongodb');
        const id = req.params.id;
        const reportsCol = db.collection('reports');
        const result = await reportsCol.updateOne({ _id: new ObjectId(id) }, { $set: { verified: true } });

        if (result.modifiedCount === 0) return res.status(404).json({ success: false, error: 'Report not found' });

        res.json({ success: true });
    } catch (error) {
        console.error('Error verifying report:', error);
        res.status(500).json({ success: false, error: 'Failed to verify report' });
    }
});

/**
 * Default interpretation when Gemini is not configured
 */
function getDefaultInterpretation(type, data) {
    const interpretations = {
        conditions: "Based on the current environmental data, the air quality and weather conditions are being monitored. Regular assessment helps identify potential risks early.",
        forecast: "Environmental forecasting combines weather patterns with air quality trends to provide early warning of potential risks. Proactive monitoring enables better preparedness.",
        risk: "Risk assessment considers multiple environmental factors including air pollution levels, weather conditions, and their potential impacts on health and ecosystems."
    };
    return interpretations[type] || interpretations.conditions;
}

module.exports = router;
