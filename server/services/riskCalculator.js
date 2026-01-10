/**
 * Risk Calculator Service
 * Calculates environmental risk scores based on normalized data
 */

const INDUSTRY_PROFILES = require('../data/industryProfiles');

/**
 * Calculate overall environmental risk from air quality and weather data
 */
function calculateOverallRisk(airQuality, weather, industry = 'Generic Industrial Zone') {
    const pollutants = airQuality?.pollutants || {};
    const current = weather?.current || {};
    const profile = INDUSTRY_PROFILES[industry] || INDUSTRY_PROFILES['Generic Industrial Zone'];

    // Calculate individual impact scores
    const healthImpact = calculateHealthImpact(pollutants, profile);
    const ecosystemImpact = calculateEcosystemImpact(pollutants, current, profile);
    const environmentImpact = calculateEnvironmentImpact(pollutants, current, profile);
    const socioEconomicImpact = calculateSocioEconomicImpact(pollutants, healthImpact, profile);

    // Calculate weighted overall risk
    const overallScore = (
        healthImpact.score * 0.35 +
        ecosystemImpact.score * 0.20 +
        environmentImpact.score * 0.25 +
        socioEconomicImpact.score * 0.20
    );

    const riskLevel = getRiskLevel(overallScore);
    const aqi = airQuality?.aqi?.value || Math.round(overallScore * 5);

    return {
        overallRisk: {
            score: Math.round(overallScore),
            level: riskLevel,
            aqi: aqi,
            category: airQuality?.aqi?.category || getAQICategory(aqi),
            color: getRiskColor(riskLevel)
        },
        impacts: {
            humanHealth: healthImpact,
            ecosystems: ecosystemImpact,
            environment: environmentImpact,
            socioEconomic: socioEconomicImpact
        },
        primaryConcerns: identifyPrimaryConcerns(pollutants, current, profile),
        environmentalFactors: weather?.environmentalFactors || {},
        industryContext: profile
    };
}

/**
 * Generate forecast risk analysis
 */
function generateForecast(airQuality, weatherForecast, industry = 'Generic Industrial Zone') {
    const profile = INDUSTRY_PROFILES[industry] || INDUSTRY_PROFILES['Generic Industrial Zone'];
    
    const shortTerm = generateShortTermForecast(airQuality, weatherForecast, profile);
    const longTerm = generateLongTermForecast(airQuality, profile);
    const riskDrivers = identifyRiskDrivers(airQuality, profile);
    const earlyWarnings = generateEarlyWarnings(airQuality, weatherForecast, profile);
    const actions = generatePreventiveActions(airQuality, weatherForecast, profile);

    // Determine overall forecast risk based on current conditions
    // Apply an industry vulnerability multiplier to make risk industry-aware
    const baseRiskScore = airQuality?.aqi?.value ? Math.min(100, airQuality.aqi.value / 3) : 50;
    const multiplier = profile.vulnerabilityMultiplier || 1.0;
    const adjustedRiskScore = Math.min(100, baseRiskScore * multiplier);
    const overallLevel = getRiskLevel(adjustedRiskScore);

    return {
        overallRisk: {
            level: overallLevel,
            score: Math.round(adjustedRiskScore),
            rawScore: Math.round(baseRiskScore),
            multiplier: multiplier,
            primaryConcern: getPrimaryConcern(airQuality, profile),
            timeHorizon: 'Short-term focus recommended'
        },
        shortTerm: [], // Numeric forecast removed
        longTerm: longTerm,
        riskDrivers: riskDrivers,
        earlyWarnings: earlyWarnings,
        preventiveActions: actions,
        industryContext: profile
    };
}

/**
 * Calculate health impact score
 */
function calculateHealthImpact(pollutants, profile) {
    const pm25 = pollutants.pm25?.value || 0;
    const pm10 = pollutants.pm10?.value || 0;
    const no2 = pollutants.no2?.value || 0;
    const o3 = pollutants.o3?.value || 0;

    // Adjust weights based on industry profile primary pollutants
    let weights = { pm25: 40, pm10: 25, no2: 20, o3: 15 };
    
    if (profile.primary_pollutants.includes('PM2.5')) weights.pm25 += 10;
    if (profile.primary_pollutants.includes('NOx')) weights.no2 += 10;
    
    // Normalize weights
    const totalWeight = Object.values(weights).reduce((a,b) => a+b, 0);
    
    // Weighted health impact calculation
    const score = Math.min(100, (
        (pm25 / 15) * (weights.pm25 / totalWeight * 100) +
        (pm10 / 45) * (weights.pm10 / totalWeight * 100) +
        (no2 / 25) * (weights.no2 / totalWeight * 100) +
        (o3 / 100) * (weights.o3 / totalWeight * 100)
    ));

    const level = getRiskLevel(score);

    return {
        score: Math.round(score),
        level: level,
        color: getRiskColor(level),
        description: `${profile.health_focus} risks assessed based on current levels.`,
        primaryPollutant: pm25 > pm10 * 0.4 ? 'PM2.5' : 'PM10',
        concerns: getHealthConcerns(score)
    };
}

/**
 * Calculate ecosystem impact score
 */
function calculateEcosystemImpact(pollutants, weather, profile) {
    const no2 = pollutants.no2?.value || 0;
    const so2 = pollutants.so2?.value || 0;
    const o3 = pollutants.o3?.value || 0;
    const humidity = weather.humidity || 50;

    // Ecosystem impact considers acid rain precursors and ozone
    const score = Math.min(100, (
        (no2 / 25) * 30 +
        (so2 / 40) * 35 +
        (o3 / 100) * 25 +
        (humidity < 30 ? 10 : 0)  // Low humidity stress
    ));

    const level = getRiskLevel(score);

    return {
        score: Math.round(score),
        level: level,
        color: getRiskColor(level),
        description: `${profile.main_pathways.join(', ')} pathways analyzed for ecosystem stress.`,
        concerns: getEcosystemConcerns(pollutants)
    };
}

/**
 * Calculate environmental (air/water/soil) impact score
 */
function calculateEnvironmentImpact(pollutants, weather, profile) {
    const pm25 = pollutants.pm25?.value || 0;
    const pm10 = pollutants.pm10?.value || 0;
    const visibility = weather.visibility || 10;
    const windSpeed = weather.windSpeed || 10;

    // Consider deposition and accumulation potential
    const dispersionFactor = windSpeed > 15 ? 0.7 : windSpeed > 8 ? 0.85 : 1.0;
    
    const score = Math.min(100, (
        (pm25 / 15) * 35 * dispersionFactor +
        (pm10 / 45) * 30 * dispersionFactor +
        (10 - Math.min(visibility, 10)) * 3.5
    ));

    const level = getRiskLevel(score);

    return {
        score: Math.round(score),
        level: level,
        color: getRiskColor(level),
        description: `Risk analysis for ${profile.main_pathways.join('/')} environments.`,
        components: {
            air: getRiskLevel((pm25 / 15 + pm10 / 45) * 25),
            water: profile.main_pathways.includes('Water') ? 'Monitoring' : 'Stable',
            soil: profile.main_pathways.includes('Soil') ? 'Attention' : 'Stable'
        }
    };
}

/**
 * Calculate socio-economic impact score
 */
function calculateSocioEconomicImpact(pollutants, healthImpact, profile) {
    const pm25 = pollutants.pm25?.value || 0;
    
    // Economic impact correlates with health impact and visibility
    const score = Math.min(100, (
        healthImpact.score * 0.5 +
        (pm25 / 15) * 25 +
        (pm25 > 100 ? 15 : 0)  // Productivity impact threshold
    ));

    const level = getRiskLevel(score);

    return {
        score: Math.round(score),
        level: level,
        color: getRiskColor(level),
        description: getSocioEconomicDescription(score),
        concerns: getSocioEconomicConcerns(score)
    };
}

/**
 * Generate short-term forecast (Qualitative only)
 * NOTE: Numeric predictions removed to align with non-prediction policy.
 * Logic moved to AI interpretation for condition-based outlook.
 */
function generateShortTermForecast(airQuality, weatherForecast, profile) {
    return [];
}

/**
 * Generate long-term risk assessment based on industry
 */
function generateLongTermForecast(airQuality, profile) {
    const pm25 = airQuality?.pollutants?.pm25?.value || 100;
    const aqi = airQuality?.aqi?.value || 150;

    const riskLevelData = {
        level: profile.persistence_type === 'Very Long' ? 'High' : 
               (profile.persistence_type === 'Long' || (profile.persistence_type === 'Medium' && aqi > 200)) ? 'Moderate' : 'Low'
    };

    return {
        chemicalAccumulation: {
            level: riskLevelData.level,
            description: `Potential for accumulation of ${profile.primary_pollutants.join(', ')} based on ${profile.persistence_type.toLowerCase()} persistence type.`,
            timeframe: 'Years to decades'
        },
        groundwaterRisk: {
            level: profile.main_pathways.includes('Water') ? 'Moderate' : 'Low',
            description: profile.main_pathways.includes('Water') 
                ? 'Groundwater contamination risk requires monitoring due to industry effluents.'
                : 'Lower risk pathway for this industry type.',
            timeframe: 'Decades'
        },
        soilContamination: {
            level: profile.main_pathways.includes('Soil') ? 'Moderate' : 'Low',
            description: profile.main_pathways.includes('Soil')
                ? 'Soil loading possible from atmospheric deposition and operations.'
                : 'Indirect risk via atmospheric deposition.',
            timeframe: 'Years to decades'
        }
    };
}

/**
 * Identify risk drivers based on industry
 */
function identifyRiskDrivers(airQuality, profile) {
    const drivers = [];
    const pollutants = airQuality?.pollutants || {};

    // Industry-specific drivers
    profile.primary_pollutants.forEach(pollutant => {
        let valueStr = "N/A";
        let severity = "Moderate";
        
        if (pollutant === "PM2.5" && pollutants.pm25) {
            valueStr = pollutants.pm25.value;
            severity = pollutants.pm25.value > 60 ? "High" : "Moderate";
        }
        else if (pollutant === "PM10" && pollutants.pm10) {
            valueStr = pollutants.pm10.value;
            severity = pollutants.pm10.value > 100 ? "High" : "Moderate";
        }
        else if (pollutant === "NOx" && pollutants.no2) {
             valueStr = pollutants.no2.value;
             severity = pollutants.no2.value > 40 ? "High" : "Moderate";
        }
        else if (pollutant === "SO2" && pollutants.so2) {
             valueStr = pollutants.so2.value;
             severity = pollutants.so2.value > 40 ? "High" : "Moderate";
        }
        else {
             // For non-measured pollutants in the profile (e.g. PFAS, Heavy Metals), use industry inherent risk
             severity = "Potential";
        }

        drivers.push({
            factor: pollutant,
            severity: severity,
            description: `Primary pollutant for this sector.`,
            persistence: profile.persistence_type
        });
    });
    
    // Add Chemical Persistence driver if relevant
    if (profile.persistence_type === 'Long' || profile.persistence_type === 'Very Long') {
         drivers.push({
            factor: 'Chemical Persistence',
            severity: 'High',
            description: `${profile.primary_pollutants[0]} associated with this industry resist degradation and can accumulate in ${profile.main_pathways.join(' and ')}.`,
            persistence: profile.persistence_type
        });
    }

    return drivers;
}

/**
 * Generate early warning indicators
 */
function generateEarlyWarnings(airQuality, weatherForecast, profile) {
    const warnings = [];
    const aqi = airQuality?.aqi?.value || 100;
    const trends = weatherForecast?.trends || {};

    if (aqi > 200) {
        warnings.push({
            type: 'air_quality',
            severity: 'attention',
            message: 'Air quality critically elevated. Immediate reduction in dust-generating activities advised.',
            icon: '🌫️'
        });
    }

    if (trends.windTrend === 'decreasing' && profile.primary_pollutants.includes('PM2.5')) {
        warnings.push({
            type: 'weather',
            severity: 'attention',
            message: 'Dispersion Limited: Stagnant conditions likely to trap industrial emissions.',
            icon: '⛔'
        });
    }
    
    if (profile.persistence_type === 'Very Long' || profile.persistence_type === 'Long') {
         warnings.push({
            type: 'accumulation',
            severity: 'attention',
            message: 'Long-Term Accumulation Likely: Persistent contaminants require strict containment.',
            icon: '⏳'
        });
    } else if (aqi > 150) {
        warnings.push({
            type: 'accumulation',
            severity: 'info',
            message: 'Persistent Risk Detected: Sustained high levels may lead to environmental loading.',
            icon: '🚨'
        });
    }

    if (warnings.length === 0) {
        warnings.push({
            type: 'status',
            severity: 'normal',
            message: 'Conditions within manageable limits.',
            icon: '✓'
        });
    }

    return warnings;
}

/**
 * Generate preventive actions
 */
function generatePreventiveActions(airQuality, weatherForecast, profile) {
    const actions = [];
    
    // Base action
    actions.push({
        priority: 1,
        action: 'Enhanced Environmental Monitoring',
        description: `Increase monitoring frequency for ${profile.primary_pollutants.join(', ')}.`,
        timeframe: 'Immediate',
        scalability: 'All scales'
    });

    // Profile specific actions
    if (profile.preventive_focus) {
        actions.push({
            priority: 2,
            action: profile.preventive_focus,
            description: 'Implement specific control measures aligned with industry best practices.',
            timeframe: 'Ongoing',
            scalability: 'Operational'
        });
    }

    if (profile.main_pathways.includes('Water')) {
         actions.push({
            priority: 3,
            action: 'Effluent & Groundwater Management',
            description: 'Monitor groundwater near disposal zones and strengthen containment systems.',
            timeframe: 'Continuous',
            scalability: 'Site-specific'
        });
    }
    
    if (profile.persistence_type === 'Very Long') {
         actions.push({
            priority: 4,
            action: 'Review Persistent Waste Handling',
            description: 'Audit disposal practices for persistent chemicals to prevent long-term bioaccumulation.',
            timeframe: 'Quarterly',
            scalability: 'Medium to Large'
        });
    } else {
         actions.push({
            priority: 4,
            action: 'Stakeholder Communication',
            description: 'Inform workforce about current conditions and necessary precautions.',
            timeframe: 'Daily',
            scalability: 'All scales'
        });
    }

    return actions.slice(0, 4);
}

/**
 * Helper functions
 */
function getRiskLevel(score) {
    if (score <= 33) return 'Low';
    if (score <= 66) return 'Moderate';
    return 'High';
}

function getRiskColor(level) {
    const colors = {
        'Low': '#22c55e',
        'Moderate': '#f59e0b',
        'High': '#ef4444'
    };
    return colors[level] || '#6b7280';
}

function getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
}

function getExposureLevel(aqi) {
    if (aqi <= 50) return 'Minimal';
    if (aqi <= 100) return 'Low';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'High';
    return 'Very High';
}

function getHealthConcerns(score) {
    if (score <= 33) return ['No significant concerns', 'Standard precautions sufficient'];
    if (score <= 66) return ['Sensitive individuals may be affected', 'Respiratory symptoms possible for some'];
    return ['General population may experience effects', 'Outdoor activities should be limited', 'Protective measures recommended'];
}

function getEcosystemConcerns(pollutants) {
    const concerns = [];
    if (pollutants.so2?.value > 20) concerns.push('Acid deposition potential');
    if (pollutants.o3?.value > 60) concerns.push('Vegetation ozone damage');
    if (pollutants.no2?.value > 30) concerns.push('Nitrogen loading in ecosystems');
    return concerns.length > 0 ? concerns : ['No significant ecosystem concerns'];
}

function getSocioEconomicDescription(score) {
    if (score <= 33) return 'Environmental conditions support normal economic activity.';
    if (score <= 66) return 'Some productivity impacts possible. Planning adjustments may be needed.';
    return 'Significant economic implications. Proactive measures recommended.';
}

function getSocioEconomicConcerns(score) {
    if (score <= 33) return ['Normal operations', 'Standard planning'];
    if (score <= 66) return ['Minor productivity considerations', 'Community health awareness'];
    return ['Potential productivity impacts', 'Healthcare demand increase', 'Regulatory attention possible'];
}

function identifyPrimaryConcerns(pollutants, weather, profile) {
    const concerns = [];
    const pm25 = pollutants.pm25?.value || 0;
    
    if (pm25 > 100) {
        if (profile.primary_pollutants.includes('PM2.5')) {
            concerns.push('High PM2.5 levels combined with combustion-based industry increase respiratory exposure risk.');
        } else {
            concerns.push('Elevated ambient PM2.5 requires monitoring.');
        }
    }
    
    if (profile.primary_pollutants.includes('VOCs') && weather.current?.temperature > 30) {
        concerns.push('High temperatures may increase VOC volatilization risk.');
    }
    
    if (concerns.length === 0) concerns.push('Routine environmental monitoring active.');
    
    return concerns;
}

function getPrimaryConcern(airQuality, profile) {
    const pm25 = airQuality?.pollutants?.pm25?.value || 0;
    if (pm25 > 150) return `High Particulate Matter (${profile.health_focus})`;
    return `Routine ${profile.primary_pollutants[0]} monitoring`;
}

module.exports = {
    calculateOverallRisk,
    generateForecast
};
