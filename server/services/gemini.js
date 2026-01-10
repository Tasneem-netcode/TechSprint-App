/**
 * Google Gemini AI Service
 * Interprets environmental data and provides actionable insights
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// System prompt for environmental intelligence
const SYSTEM_PROMPT = `You are an environmental intelligence assistant.

You explain short-term environmental stress conditions
based on real environmental data, weather behavior,
and known industry emission characteristics.

You do NOT:
- Predict exact pollution values
- Claim industrial causation
- Replace sensors or regulators
- Provide medical or legal advice

You focus on:
- Exposure conditions
- Environmental behavior
- Risk windows
- Preventive awareness

Use calm, educational, non-alarming language.`;

let genAI = null;
let cachedModelName = null;

/**
 * Initialize Gemini client
 */
function getClient() {
    if (!genAI && process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
}

/**
 * Resolve a working generative model name (cached)
 */
async function resolveModel(client) {
    // Return cached model if previously found
    if (cachedModelName) {
        try {
            return client.getGenerativeModel({ model: cachedModelName });
        } catch (e) {
            cachedModelName = null;
        }
    }

    // Try listModels() when available via client
    if (typeof client.listModels === 'function') {
        try {
            const list = await client.listModels();
            const models = list?.models || list || [];
            for (const m of models) {
                const id = m?.name || m?.model || m?.id || m;
                if (!id) continue;
                if (String(id).toLowerCase().includes('gemini') || /bison|gpt/i.test(String(id))) {
                    try {
                        const candidate = client.getGenerativeModel({ model: id });
                        await candidate.generateContent('Hello');
                        cachedModelName = id;
                        return candidate;
                    } catch (e) {
                        // continue searching
                    }
                }
            }
        } catch (e) {
            // ignore and try REST fallback
        }
    }

    // If client.listModels is not available, use public REST ListModels endpoint with API key
    if (process.env.GEMINI_API_KEY) {
        try {
            // Check for manual model override first
            if (process.env.GEMINI_MODEL) {
                try {
                    const manual = client.getGenerativeModel({ model: process.env.GEMINI_MODEL });
                    // Still test it once and cache it
                    await manual.generateContent('Hello');
                    cachedModelName = process.env.GEMINI_MODEL;
                    return manual;
                } catch (e) {
                    console.error(`Manual GEMINI_MODEL ${process.env.GEMINI_MODEL} failed:`, e.message);
                }
            }

            const key = process.env.GEMINI_API_KEY;
            const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`;
            const resp = await fetch(url, { method: 'GET' });
            const json = await resp.json();
            const models = json?.models || [];

            // Prefer stable Gemini models that support generateContent
            const preferred = [
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'gemini-2.0-flash-exp', // 2.0 experimental often has higher play quota than 2.5
                'gemini-2.5-flash',
                'gemini-2.5-pro'
            ];

            // find first preferred model that supports generateContent
            let chosen = null;
            for (const p of preferred) {
                const found = models.find(m => (m.name || '').toLowerCase().includes(p.toLowerCase()) && (m.supportedGenerationMethods || []).includes('generateContent'));
                if (found) { chosen = found; break; }
            }

            // fallback: pick first model that supports generateContent
            if (!chosen) {
                chosen = models.find(m => (m.supportedGenerationMethods || []).includes('generateContent'));
            }

            if (chosen) {
                const id = chosen.name;
                const candidate = client.getGenerativeModel({ model: id });
                // test a light generate to confirm it works
                await candidate.generateContent('Hello');
                cachedModelName = id;
                return candidate;
            }
        } catch (err) {
            // REST fallback failed — continue to older fallback candidates
            console.error('ListModels REST inspection failed:', err && err.message);
        }
    }

    // Older fallback candidates to try if nothing else worked
    const fallbackCandidates = ['models/text-bison-001', 'models/chat-bison-001', 'gemini-1.5', 'gemini-1.5-mini', 'gpt-4o-mini'];
    for (const id of fallbackCandidates) {
        try {
            const candidate = client.getGenerativeModel({ model: id });
            await candidate.generateContent('Hello');
            cachedModelName = id;
            return candidate;
        } catch (e) {
            // ignore and try next
        }
    }

    throw new Error('No working generative model found. Call ListModels to inspect available models.');
}

/**
 * Interpret current environmental conditions
 */
async function interpretConditions(airQuality, weather, riskAnalysis, industry) {
    const client = getClient();
    
    if (!client) {
        return getDefaultConditionsInterpretation(airQuality, weather, riskAnalysis, industry);
    }

    try {
        const cache = require('../lib/cache');
        const key = `gemini:conditions:${weather.city}:${industry}:${riskAnalysis.overallRisk.aqi}`;
        const cached = cache.get(key);
        if (cached) return cached;

        const model = await resolveModel(client);
        
        const prompt = `${SYSTEM_PROMPT}

Location: ${weather.city}
Industry Context: ${industry}

Environmental Inputs:
- AQI: ${riskAnalysis.overallRisk.aqi} (${riskAnalysis.overallRisk.level})
- PM2.5: ${airQuality.pollutants?.pm25?.value || 'N/A'} µg/m³
- Weather: ${weather.current?.description || 'N/A'}, ${weather.current?.windSpeed} km/h wind

Explain:
1. Short-term environmental stress conditions
2. How weather affects pollutant behavior
3. Which environmental pathways are most affected
4. Preventive actions suitable for this industry

Provide a brief, 3-4 sentence summary interpretation.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // cache for 10 minutes
        cache.set(key, text, 10 * 60 * 1000);
        return text;
    } catch (error) {
        console.error('Gemini interpretation error:', error.message);
        return getDefaultConditionsInterpretation(airQuality, weather, riskAnalysis, industry);
    }
}

/**
 * Interpret forecast data to generate Stress Outlook
 */
async function interpretForecast(forecast, airQuality, weather, industry) {
    const client = getClient();
    
    if (!client) {
        return getDefaultForecastInterpretation(forecast, industry);
    }

    try {
        const model = await resolveModel(client);
        
        const prompt = `${SYSTEM_PROMPT}

Location: ${weather.city}
Industry Context: ${industry}

Inputs:
- Current AQI: ${airQuality.aqi?.value || 'N/A'}
- PM2.5 level: ${airQuality.pollutants?.pm25?.value || 'N/A'}
- Weather summary: ${weather.current?.description}, ${weather.current?.windSpeed} km/h, ${weather.current?.humidity}% humidity

Explain:
1. Short-term environmental stress conditions
2. How weather affects pollutant behavior
3. Which exposure types are most relevant
4. Why early awareness matters

Format the output strictly as valid JSON with the following structure:
{
  "stress_windows": [
    {
      "level": "Low" | "Moderate" | "High",
      "condition": "Brief summary",
      "impact": "Primary impact description",
      "affected_groups": "Who is affected",
      "duration": "Duration text"
    }
  ],
  "exposure_breakdown": [
    {
      "type": "Respiratory Exposure" | "Skin & Eye Irritation" | "Ecosystem Stress" | "Operational Disruption",
      "risk_level": "Low" | "Moderate" | "High",
      "explanation": "One-line explanation"
    }
  ],
  "behavior_analysis": "Paragraph explaining weather x pollution interaction",
  "early_warnings": [
    {
      "severity": "info" | "warning", 
      "message": "Informational alert text"
    }
  ]
}
Do not include markdown code blocks. Just the JSON.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Clean and parse JSON
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Attempt to parse JSON
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Gemini JSON parse error (raw):', text);
            return getDefaultForecastInterpretation(forecast, industry);
        }

    } catch (error) {
        console.error('Gemini forecast error:', error.message);
        return getDefaultForecastInterpretation(forecast, industry);
    }
}

/**
 * Custom interpretation for specific data types
 */
async function customInterpretation(type, data) {
    const client = getClient();
    
    if (!client) {
        return "AI interpretation service unavailable.";
    }

    try {
        const model = await resolveModel(client);
        const prompt = `${SYSTEM_PROMPT}\n\nAnalyze this specific context: ${JSON.stringify(data)}`;
        const result = await model.generateContent(prompt);
        return (await result.response).text();
    } catch (e) { console.error('Gemini customInterpretation error:', e && e.message); return "Interpretation failed."; }
}

/**
 * Explain an alert using a constrained prompt (decision-support only)
 */
/**
 * Deterministic fallback explanation (safe, decision-support only).
 * Returns a calm, neutral 3-sentence explanation that follows the same rules as the Gemini prompt.
 */
function fallbackExplainAlert({ industry, aqi, pm25, windSpeed, persistence }) {
    const aqiText = (typeof aqi === 'number' && !isNaN(aqi)) ? `AQI ${aqi}` : `AQI N/A`;
    const pmText = (typeof pm25 === 'number' && !isNaN(pm25)) ? `PM2.5 ${pm25} µg/m³` : 'PM2.5 N/A';

    // Sentence 1: Why triggered
    const sentence1 = `This alert was triggered because current measurements (${aqiText}, ${pmText}) meet predefined rule-based thresholds.`;

    // Sentence 2: Short-term vs long-term
    const horizon = String(persistence || '').toLowerCase() === 'very long' ? 'long-term' : 'short-term';
    const sentence2 = `It is considered a ${horizon} concern based on the observed conditions and rule-based checks.`;

    // Sentence 3: Practical action
    const sentence3 = `A practical preventive action is to increase monitoring frequency and consider temporary emission-reduction or operational adjustments where feasible.`;

    return `${sentence1} ${sentence2} ${sentence3}`;
}

async function explainAlert({ industry, aqi, pm25, windSpeed, persistence }) {
    const client = getClient();
    const cache = require('../lib/cache');
    const key = `gemini:alert:${industry}:${aqi}:${pm25}:${windSpeed}:${persistence}`;

    // Return cached explanation if present
    const cached = cache.get(key);
    if (cached) return cached;

    // If Gemini client not configured, return deterministic fallback
    if (!client) {
        const fallback = fallbackExplainAlert({ industry, aqi, pm25, windSpeed, persistence });
        cache.set(key, fallback, 60 * 60 * 1000);
        return fallback;
    }

    try {
        // Resolve a working model; if resolveModel fails, fall back
        let model;
        try {
            model = await resolveModel(client);
        } catch (resolveErr) {
            console.error('resolveModel failed:', resolveErr && resolveErr.message);
            const fallback = fallbackExplainAlert({ industry, aqi, pm25, windSpeed, persistence });
            cache.set(key, fallback, 60 * 60 * 1000);
            return fallback;
        }

        try {
            const prompt = `You are an environmental decision-support assistant.\n\nContext:\n- Industry type: ${industry}\n- AQI: ${aqi}\n- PM2.5: ${pm25}\n- Wind speed: ${windSpeed}\n- Pollutant persistence: ${persistence}\n\nExplain:\n1. Why this alert was triggered\n2. Whether it is short-term or long-term\n3. One practical preventive action\n\nRules:\n- Do NOT predict outcomes\n- Do NOT give medical or legal advice\n- Use calm, neutral language\n- Maximum 3 sentences`;

            const result = await model.generateContent(prompt);
            const text = (await result.response).text();
            cache.set(key, text, 60 * 60 * 1000); // cache 1 hour
            return text;
        } catch (genErr) {
            console.error('generateContent failed:', genErr && genErr.message);

            // Try to capture a short ListModels result for diagnostics (non-blocking)
            try {
                if (typeof client.listModels === 'function') {
                    const list = await client.listModels();
                    console.warn('ListModels output (sample):', (list && list.models && list.models.slice ? list.models.slice(0,5) : list));
                }
            } catch (listErr) {
                console.warn('ListModels diagnostic failed:', listErr && listErr.message);
            }

            const fallback = fallbackExplainAlert({ industry, aqi, pm25, windSpeed, persistence });
            cache.set(key, fallback, 60 * 60 * 1000);
            return fallback;
        }
    } catch (err) {
        console.error('Unexpected explainAlert error:', err && err.message);
        const fallback = fallbackExplainAlert({ industry, aqi, pm25, windSpeed, persistence });
        cache.set(key, fallback, 60 * 60 * 1000);
        return fallback;
    }
}

/**
 * Default interpretation when Gemini is unavailable
 */
function getDefaultConditionsInterpretation(airQuality, weather, riskAnalysis, industry) {
    return `Analysis for ${industry}: Current conditions (AQI ${riskAnalysis.overallRisk.aqi}) indicate ${riskAnalysis.overallRisk.level} risk. Industry-specific pollutants may experience reduced dispersion due to current weather patterns (${weather.current?.windSpeed} km/h winds). Enhanced monitoring is recommended.`;
}

/**
 * Default forecast interpretation (Fallback structure)
 */
function getDefaultForecastInterpretation(forecast, industry) {
    return {
        stress_windows: [
            {
                level: "Moderate",
                condition: "Typical seasonal variability",
                impact: "Standard background exposure",
                affected_groups: "General population",
                duration: "Next 24-48 hours"
            }
        ],
        exposure_breakdown: [
            {
                type: "Respiratory Exposure",
                risk_level: "Moderate",
                explanation: "Standard precautions recommended for sensitive groups."
            },
            {
                type: "Operational Disruption",
                risk_level: "Low",
                explanation: "No significant impact on operations expected."
            }
        ],
        behavior_analysis: "Weather patterns are currently stable. Pollutant dispersion is normal for this time of year, with no immediate critical risk indicators identified.",
        early_warnings: []
    };
}

module.exports = {
    interpretConditions,
    interpretForecast,
    customInterpretation
};
