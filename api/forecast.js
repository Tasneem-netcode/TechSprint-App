const INDUSTRY_PROFILES = require('../server/data/industryProfile');
const { getCurrentWeather } = require('./_services/openweather');
const { getPollution } = require('./_services/openaq');

module.exports = async function handler(req, res) {
    try {
        const city = req.query.city || 'Delhi';
        const industry = req.query.industry || 'Generic Industrial Zone';

        const industryProfile =
            INDUSTRY_PROFILES[industry] ||
            INDUSTRY_PROFILES['Generic Industrial Zone'];

        const [weather, pollution] = await Promise.all([
            getCurrentWeather(city),
            getPollution(city)
        ]);

        const pm25 = pollution?.pollutants?.pm25?.value || 0;
        const wind = weather?.current?.windSpeed || 0;

        let riskLevel = 'Low';
        if (pm25 > 60) riskLevel = 'Moderate';
        if (pm25 > 120 || wind < 5) riskLevel = 'High';

        const forecast = {
            overallRisk: {
                level: riskLevel,
                primaryConcern: industryProfile.health_focus,
                timeHorizon: 'Next 24–72 hours'
            },

            longTerm: {
                chemicalAccumulation: {
                    level: industryProfile.persistence_type.includes('Long')
                        ? 'High'
                        : 'Moderate',
                    description: industryProfile.long_term_risks.join(', ')
                }
            },

            riskDrivers: industryProfile.primary_pollutants.map(p => ({
                factor: p,
                severity: riskLevel,
                description: `Potential increase in ${p} due to ${industry}`,
                persistence: industryProfile.persistence_type
            })),

            earlyWarnings: riskLevel === 'High'
                ? [{
                    severity: 'high',
                    message: 'Adverse dispersion conditions may elevate exposure'
                }]
                : [],

            preventiveActions: [{
                priority: 'Immediate',
                action: industryProfile.preventive_focus,
                description: 'Apply standard mitigation practices',
                timeframe: 'Short-term',
                scalability: 'Local'
            }]
        };

        res.status(200).json({
            success: true,
            city,
            industry,
            forecast,
            aiInsights: null
        });

    } catch (err) {
        console.error('Forecast API error:', err);
        res.status(500).json({
            success: false,
            error: 'Forecast generation failed'
        });
    }
};
