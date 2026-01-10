/**
 * Google Gemini AI Service (Vercel-compatible ES Module)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

/* ================= SYSTEM PROMPT ================= */

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

/* ================= CLIENT ================= */

let genAI = null;
let cachedModelName = null;

function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/* ================= MODEL RESOLUTION ================= */

async function resolveModel(client) {
  if (cachedModelName) {
    return client.getGenerativeModel({ model: cachedModelName });
  }

  const candidates = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp"
  ];

  for (const model of candidates) {
    try {
      const instance = client.getGenerativeModel({ model });
      await instance.generateContent("ping");
      cachedModelName = model;
      return instance;
    } catch {}
  }

  throw new Error("No working Gemini model found");
}

/* ================= MAIN INTERPRETATION ================= */

export async function interpretConditions(airQuality, weather, riskAnalysis, industry) {
  const client = getClient();
  if (!client) return defaultConditions(airQuality, weather, riskAnalysis, industry);

  try {
    const model = await resolveModel(client);

    const prompt = `${SYSTEM_PROMPT}

Location: ${weather.city}
Industry Context: ${industry}

Environmental Inputs:
- AQI: ${riskAnalysis.overallRisk.aqi}
- PM2.5: ${airQuality.pollutants?.pm25?.value || "N/A"}
- Weather: ${weather.current?.description}, ${weather.current?.windSpeed} km/h wind

Explain in 3–4 sentences.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return defaultConditions(airQuality, weather, riskAnalysis, industry);
  }
}

/* ================= FORECAST ================= */

export async function interpretForecast(forecast, airQuality, weather, industry) {
  const client = getClient();
  if (!client) return defaultForecast();

  try {
    const model = await resolveModel(client);

    const prompt = `${SYSTEM_PROMPT}

Explain forecast risks as structured JSON only.
No markdown.`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch {
    return defaultForecast();
  }
}

/* ================= HELPERS ================= */

function defaultConditions(airQuality, weather, riskAnalysis, industry) {
  return `Environmental stress is ${riskAnalysis.overallRisk.level}. Weather conditions may limit pollutant dispersion. Preventive monitoring is advised for ${industry}.`;
}

function defaultForecast() {
  return {
    stress_windows: [],
    exposure_breakdown: [],
    behavior_analysis: "Stable conditions",
    early_warnings: []
  };
}
