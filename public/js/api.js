/**
 * EcoSphere AI - API Client
 * Handles all API communication with the backend
 */

const API = {
    baseUrl: '',  // Same origin

    // Simple client-side cache: key -> { value, expires }
    _cache: new Map(),
    _cacheTTL: 2 * 60 * 1000, // 2 minutes

    /**
     * Generic fetch wrapper with error handling and client-side caching
     */
    async request(endpoint, options = {}, useCache = false) {
        const url = `${this.baseUrl}${endpoint}`;
        const cacheKey = `req:${url}:${JSON.stringify(options || {})}`;

        if (useCache) {
            const entry = API._cache.get(cacheKey);
            if (entry && Date.now() < entry.expires) {
                entry.fromCache = true;
                return entry.value;
            }
        }

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': localStorage.getItem('sessionId') || ''
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            if (useCache) {
                API._cache.set(cacheKey, { value: data, expires: Date.now() + API._cacheTTL });
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    /**
     * Authentication endpoints
     */
    auth: {
        async login(email, password) {
            return API.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
        },

        async register(email, password, name) {
            return API.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, name })
            });
        },

        async logout() {
            const sessionId = localStorage.getItem('sessionId');
            return API.request('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ sessionId })
            });
        },

        async verify() {
            return API.request('/auth/verify');
        }
    },

    /**
     * Environmental data endpoints
     */
    environmental: {
        async getData(city = 'Delhi', industry = 'Generic Industrial Zone') {
            return API.request(`/api/environmental-data?city=${encodeURIComponent(city)}&industry=${encodeURIComponent(industry)}`);
        },

        async getForecast(city = 'Delhi', industry = 'Generic Industrial Zone') {
            return API.request(`/api/forecast?city=${encodeURIComponent(city)}&industry=${encodeURIComponent(industry)}`);
        },

        async getAIInterpretation(type, data) {
            return API.request('/api/ai-interpret', {
                method: 'POST',
                body: JSON.stringify({ type, data })
            });
        },

        async getCities() {
            return API.request('/api/cities');
        }
    },

    /**
     * Alert-related endpoints
     */
    alerts: {
        async explain(alert) {
            return API.request('/api/alert-explain', {
                method: 'POST',
                body: JSON.stringify(alert)
            });
        }
    }
};

// Export for use in other modules
window.API = API;
