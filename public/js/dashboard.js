/**
 * EcoSphere AI - Dashboard Module
 * Handles the Current Environmental Conditions page
 */

const Dashboard = {
    data: null,
    isLoading: false,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    },

    async load(city = 'Delhi', industry = 'Generic Industrial Zone') {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(true);

        try {
            // 🔥 NEW: parallel API calls
            const [environment, pollution, risk] = await Promise.all([
                API.environmental.getEnvironment(city),
                API.environmental.getPollution(city),
                API.environmental.getRisk(city, industry)
            ]);

            // 🔁 Reconstruct old response shape (so UI doesn’t break)
            const response = {
    success: true,
    city,
    industry,
    timestamp: new Date().toISOString(),
    data: {
        weather: environment.weather,
        airQuality: pollution,
        riskAnalysis: risk.riskAnalysis || risk.risk || risk,
        aiInsights: risk.aiInsights || ''
    }
};


            this.data = response.data;
            this.render(response);

        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showError('Failed to load environmental data. Please try again.');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    },

    async refresh() {
        const city = document.getElementById('citySelect')?.value || 'Delhi';
        const industry = document.getElementById('industrySelect')?.value || 'Generic Industrial Zone';
        await this.load(city, industry);
    },

    render(response) {
        const { data, timestamp, city } = response;

        this.updateElement('dashboardCity', city);
        this.updateLastUpdated(timestamp);

        this.renderHeroSnapshot(data.riskAnalysis, data.aiInsights);
        this.renderPriorityCards(data.riskAnalysis.impacts);
        this.renderAIAnalysis(data.aiInsights);
        this.renderDispersionConditions(data.weather);

        try {
            const alerts = this.generateSmartAlerts(response);
            this.renderSmartAlerts(alerts, response);
        } catch (err) {
            console.error('Smart Alerts error:', err);
        }

        this.initCollapsible();
    },

    renderHeroSnapshot(riskAnalysis, aiInsights) {
        const heroSnapshot = document.getElementById('heroSnapshot');
        const badge = document.getElementById('heroRiskBadge');
        const explanation = document.getElementById('heroExplanation');

        const { overallRisk, primaryConcerns } = riskAnalysis;
        const level = (overallRisk.level || 'Moderate').toLowerCase();

        heroSnapshot.className = `hero-snapshot risk-${level}`;

        if (badge) {
            badge.textContent = `${overallRisk.level} Risk`;
            badge.className = 'risk-badge';
        }

        let explanationText = primaryConcerns?.[0] || 'Environmental conditions are stable.';

        if (typeof aiInsights === 'string') {
            const firstSentence = aiInsights.split('.')[0];
            if (firstSentence.length > 10) explanationText = `${firstSentence}.`;
        }

        if (explanation) explanation.textContent = explanationText;
    },

    renderPriorityCards(impacts) {
        const renderCard = (id, data) => {
            const badge = document.getElementById(`${id}Badge`);
            const desc = document.getElementById(`${id}Description`);
            if (badge) badge.textContent = data.level;
            if (desc) desc.textContent = data.description;
        };

        renderCard('health', impacts.humanHealth);
        renderCard('ecosystem', impacts.ecosystems);
        renderCard('environment', impacts.environment);
        renderCard('socioEconomic', impacts.socioEconomic);
    },

    renderAIAnalysis(insights) {
        const el = document.getElementById('aiInsightText');
        if (!el) return;

        if (typeof insights === 'string') el.textContent = insights;
        else if (insights?.behavior_analysis) el.textContent = insights.behavior_analysis;
        else el.textContent = 'AI analysis unavailable.';
    },

    renderDispersionConditions(weather) {
        if (!weather?.current) return;
        const c = weather.current;

        this.updateElement('weatherTemp', `${c.temperature}°C`);
        this.updateElement('weatherHumidity', `${c.humidity}%`);
        this.updateElement('weatherWind', `${c.windSpeed} km/h`);
        this.updateElement('weatherVisibility', `${c.visibility} km`);
    },

    generateSmartAlerts(response) {
        const alerts = [];
        const { airQuality, weather, riskAnalysis } = response.data;

        const aqi = riskAnalysis.overallRisk?.aqi || airQuality?.aqi?.value || 0;
        const pm25 = airQuality?.pollutants?.pm25?.value || 0;
        const windSpeed = weather?.current?.windSpeed || 0;
        const persistence = riskAnalysis?.industryContext?.persistence || 'Short';

        if (aqi > 300 && windSpeed < 10) {
            alerts.push({
                id: 'limited_dispersion',
                severity: 'CRITICAL',
                title: 'High pollution with low dispersion',
                short: 'High AQI combined with low wind may trap pollutants.',
                industry: response.industry,
                aqi,
                pm25,
                windSpeed,
                persistence
            });
        }

        return alerts;
    },

    async renderSmartAlerts(alerts) {
        const container = document.getElementById('alertsList');
        if (!container) return;

        container.innerHTML = '';

        if (!alerts.length) {
            container.innerHTML = `
              <div class="alert-card">
                <div class="alert-row">
                  <div class="alert-icon">✅</div>
                  <div>No active alerts</div>
                </div>
              </div>`;
            return;
        }

        for (const alert of alerts) {
            const card = document.createElement('div');
            card.className = 'alert-card';
            card.textContent = alert.title;
            container.appendChild(card);
        }
    },

    initCollapsible() {
        const btn = document.getElementById('aiCollapseBtn');
        const content = document.getElementById('aiContent');
        if (!btn || !content) return;

        btn.onclick = () => content.classList.toggle('collapsed');
    },

    updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    },

    updateLastUpdated(ts) {
        const el = document.getElementById('lastUpdated');
        if (!el) return;
        el.textContent = `Last updated: ${new Date(ts).toLocaleString('en-IN')}`;
    },

    showLoading(show) {
        document.getElementById('loadingOverlay')
            ?.classList.toggle('hidden', !show);
    },

    showError(msg) {
        console.error(msg);
    }
};

window.Dashboard = Dashboard;
