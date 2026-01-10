/**
 * Industry Risk Profiles
 * Knowledge layer for EcoSphere AI
 */

const INDUSTRY_PROFILES = {
    "Generic Industrial Zone": {
        primary_pollutants: ["PM2.5", "PM10", "NOx", "VOCs"],
        long_term_risks: ["General Air Quality Degradation", "Urban Heat Island Effect"],
        persistence_type: "Short to Medium",
        main_pathways: ["Air"],
        health_focus: "Respiratory Health",
        preventive_focus: "General emission reduction"
    },
    "Thermal Power Plant": {
        primary_pollutants: ["PM2.5", "SO2", "NOx"],
        long_term_risks: ["Fly ash deposition", "Groundwater contamination", "Acid deposition"],
        persistence_type: "Medium to Long",
        main_pathways: ["Air", "Soil", "Water"],
        health_focus: "Respiratory & cardiovascular",
        preventive_focus: "Stack monitoring & ash management"
    },
    "Cement Manufacturing": {
        primary_pollutants: ["PM10", "PM2.5", "NOx", "SO2"],
        long_term_risks: ["Soil alkalization", "Heavy metal accumulation"],
        persistence_type: "Medium",
        main_pathways: ["Air", "Soil"],
        health_focus: "Respiratory (Silicosis risk)",
        preventive_focus: "Fugitive dust control"
    },
    "Textile & Dyeing": {
        primary_pollutants: ["VOCs", "Suspended Solids", "Chlorine"],
        long_term_risks: ["Water table contamination", "Soil toxicity"],
        persistence_type: "Long",
        main_pathways: ["Water", "Soil"],
        health_focus: "Dermatological & internal toxicity",
        preventive_focus: "Effluent treatment & recycling"
    },
    "Chemical / Petrochemical": {
        primary_pollutants: ["VOCs", "PFAS", "Hazardous effluents"],
        long_term_risks: ["Chemical persistence", "Bioaccumulation"],
        persistence_type: "Very Long",
        main_pathways: ["Water", "Soil", "Air"],
        health_focus: "Chronic toxicity & endocrine disruption",
        preventive_focus: "Leak detection & containment"
    },
    "Steel & Metallurgy": {
        primary_pollutants: ["PM2.5", "Heavy Metals", "CO", "SO2"],
        long_term_risks: ["Heavy metal deposition", "Slag accumulation"],
        persistence_type: "Very Long",
        main_pathways: ["Air", "Soil"],
        health_focus: "Neurological & respiratory",
        preventive_focus: "Emission capture & waste recycling",
        vulnerabilityMultiplier: 1.15
    },

    /* Additional industry profiles added for Tasneem UI */
    "Agriculture": {
        primary_pollutants: ["Ammonia", "Pesticides", "Methane"],
        long_term_risks: ["Nitrate leaching", "Eutrophication"],
        persistence_type: "Medium",
        main_pathways: ["Water", "Soil", "Air"],
        health_focus: "Respiratory & waterborne exposure",
        preventive_focus: "Nutrient management & pesticide controls",
        vulnerabilityMultiplier: 1.0
    },

    "Fishing": {
        primary_pollutants: ["Marine oil", "Diesel", "Plastic Waste"],
        long_term_risks: ["Marine contamination", "Bioaccumulation"],
        persistence_type: "Medium",
        main_pathways: ["Water"],
        health_focus: "Food chain contamination",
        preventive_focus: "Waste control & spill response",
        vulnerabilityMultiplier: 0.9
    },

    "Forestry": {
        primary_pollutants: ["Diesel", "Herbicides"],
        long_term_risks: ["Habitat loss", "Soil erosion"],
        persistence_type: "Medium",
        main_pathways: ["Soil", "Air"],
        health_focus: "Ecosystem health",
        preventive_focus: "Sustainable harvesting and erosion control",
        vulnerabilityMultiplier: 0.85
    },

    "Mining": {
        primary_pollutants: ["Mercury", "Lead", "Particulates"],
        long_term_risks: ["Heavy metal contamination", "Acid mine drainage"],
        persistence_type: "Very Long",
        main_pathways: ["Soil", "Water", "Air"],
        health_focus: "Neurological & chronic exposure",
        preventive_focus: "Tailings management & containment",
        vulnerabilityMultiplier: 1.25
    },

    "Oil Drilling": {
        primary_pollutants: ["Methane", "VOCs", "Hydrocarbons"],
        long_term_risks: ["Hydrocarbon contamination", "Climate contribution"],
        persistence_type: "Long",
        main_pathways: ["Air", "Water"],
        health_focus: "Respiratory & long-term toxicity",
        preventive_focus: "Spill prevention & gas reduction",
        vulnerabilityMultiplier: 1.25
    },

    "Automobile Manufacturing": {
        primary_pollutants: ["VOCs", "Solvents", "PM2.5"],
        long_term_risks: ["VOCs emissions", "Heavy metal residues"],
        persistence_type: "Medium",
        main_pathways: ["Air", "Soil"],
        health_focus: "Respiratory & dermal exposure",
        preventive_focus: "VOCs capture & paint process controls",
        vulnerabilityMultiplier: 1.05
    },

    "Textile Production": {
        primary_pollutants: ["Dyes", "VOCs", "Suspended Solids"],
        long_term_risks: ["Water contamination", "Soil toxicity"],
        persistence_type: "Long",
        main_pathways: ["Water", "Soil"],
        health_focus: "Dermatological and systemic exposure",
        preventive_focus: "Effluent treatment and process optimization",
        vulnerabilityMultiplier: 1.0
    },

    "Construction": {
        primary_pollutants: ["PM10", "PM2.5", "NOx"],
        long_term_risks: ["Dust deposition", "Soil disturbance"],
        persistence_type: "Short",
        main_pathways: ["Air", "Soil"],
        health_focus: "Respiratory impacts",
        preventive_focus: "Dust suppression and site controls",
        vulnerabilityMultiplier: 1.0
    },

    "Food Processing": {
        primary_pollutants: ["Organic waste", "Odors", "PM"],
        long_term_risks: ["Localized contamination", "Effluent loading"],
        persistence_type: "Short",
        main_pathways: ["Water", "Soil"],
        health_focus: "Food safety and water quality",
        preventive_focus: "Wastewater treatment and hygienic controls",
        vulnerabilityMultiplier: 0.9
    }
};

module.exports = INDUSTRY_PROFILES;
