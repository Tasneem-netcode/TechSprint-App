/**
 * EcoSphere AI – Frontend API Client (Vercel compatible)
 */

const API = {
  baseUrl: "", // same origin

  async request(endpoint) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error("API error:", err);
      throw err;
    }
  },

  /**
   * Environmental data
   */
  environmental: {
    async getEnvironment(city = "Delhi") {
      return API.request(`/api/environment?city=${encodeURIComponent(city)}`);
    },

    async getPollution(city = "Delhi") {
      return API.request(`/api/pollution?city=${encodeURIComponent(city)}`);
    },

    async getRisk(city = "Delhi") {
      return API.request(`/api/risk?city=${encodeURIComponent(city)}`);
    },
    async getForecast(city, industry) {
        return API.request(`/api/forecast?city=${encodeURIComponent(city)}&industry=${encodeURIComponent(industry)}`);
    }
  }
};

window.API = API;
