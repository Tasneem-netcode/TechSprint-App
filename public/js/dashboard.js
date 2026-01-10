/**
 * EcoSphere AI - Dashboard Module
 * Handles the Current Environmental Conditions page
 */

const Dashboard = {
    data: null,
    isLoading: false,

    /**
     * Initialize dashboard
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    },

    /**
     * Load dashboard data
     */
    async load(city, industry) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);

        try {
            const response = await API.environmental.getData(city, industry);
            
            if (response.success) {
                this.data = response.data;
                this.render(response);
            } else {
                throw new Error(response.error || 'Failed to load data');
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showError('Failed to load environmental data. Please try again.');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    },

    /**
     * Refresh dashboard data
     */
    async refresh() {
        const city = document.getElementById('citySelect')?.value || 'Delhi';
        const industry = document.getElementById('industrySelect')?.value || 'Generic Industrial Zone';
        await this.load(city, industry);
    },

    /**
     * Render dashboard with data
     */
    render(response) {
        const { data, timestamp, city } = response;
        
        // Update city display
        this.updateElement('dashboardCity', city);
        
        // Update last updated
        this.updateLastUpdated(timestamp);

        // Render Hero Snapshot (Primary Focus)
        this.renderHeroSnapshot(data.riskAnalysis, data.aiInsights);


        // Render Impact Priority Cards
        this.renderPriorityCards(data.riskAnalysis.impacts);

        // Render Smart Environmental Alerts (rule-based)
        try {
            const alerts = this.generateSmartAlerts(response);
            this.renderSmartAlerts(alerts, response);
        } catch (err) {
            console.error('Smart Alerts error:', err);
        }

        // Render AI Interpretation (Collapsible)
        this.renderAIAnalysis(data.aiInsights);

        // Render Dispersion/Weather Section
        this.renderDispersionConditions(data.weather);
        
        // Initialize collapsible
        this.initCollapsible();
    },

    /**
     * 1. Render Hero Snapshot
     */
    renderHeroSnapshot(riskAnalysis, aiInsights) {
        const heroSnapshot = document.getElementById('heroSnapshot');
        const badge = document.getElementById('heroRiskBadge');
        const explanation = document.getElementById('heroExplanation');
        
        const { overallRisk, primaryConcerns } = riskAnalysis;
        const level = (overallRisk.level || 'Moderate').toLowerCase();

        // Update visual state
        heroSnapshot.className = `hero-snapshot risk-${level}`;
        
        if (badge) {
            badge.textContent = `${overallRisk.level} Risk`;
            badge.className = 'risk-badge';
        }

        // Construct one-line explanation
        let explanationText = "Environmental conditions are currently stable.";
        
        if (primaryConcerns && primaryConcerns.length > 0) {
            explanationText = primaryConcerns[0] + ".";
        }

        // AI override if available (first sentence)
        if (aiInsights && typeof aiInsights === 'string') {
            const firstSentence = aiInsights.split('.')[0];
            if (firstSentence.length > 10) explanationText = firstSentence + ".";
        }

        if (explanation) explanation.textContent = explanationText;
    },



    /**
     * 3. Render Impact Priority Cards
     */
    renderPriorityCards(impacts) {
        // Helper to render individual cards
        const renderCard = (id, data, priorityLabel) => {
            const badge = document.getElementById(`${id}Badge`);
            const desc = document.getElementById(`${id}Description`);
            
            if (badge) badge.textContent = data.level;
            if (desc) desc.textContent = data.description || `${data.level} impact detected based on current sensors.`;
        };

        renderCard('health', impacts.humanHealth, 'P1');
        renderCard('ecosystem', impacts.ecosystems, 'P2');
        renderCard('environment', impacts.environment, 'P3');
        renderCard('socioEconomic', impacts.socioEconomic, 'P4');
    },

    /**
     * 4. Render AI Analysis (Collapsible)
     */
    renderAIAnalysis(insights) {
        const textElement = document.getElementById('aiInsightText');
        if (textElement) {
             // Handle both string and object responses (forecast output vs dashboard output)
             let text = 'Detailed analysis is currently processing...';
             if (typeof insights === 'string') {
                 text = insights;
             } else if (insights && insights.behavior_analysis) {
                 text = insights.behavior_analysis;
             }
             textElement.textContent = text;
        }
    },

    /**
     * 5. Render Dispersion Conditions (Weather)
     */
    renderDispersionConditions(weather) {
        if (!weather?.current) return;
        const { current } = weather;

        this.updateElement('weatherTemp', `${current.temperature}°C`);
        this.updateElement('weatherHumidity', `${current.humidity}%`);
        this.updateElement('weatherWind', `${current.windSpeed} km/h`);
        this.updateElement('weatherVisibility', `${current.visibility} km`);
    },

    /**
     * Generate Smart Alerts from data (rule-based)
     * - Input: full API response object
     * - Returns: array of alerts (max 3)
     */
    generateSmartAlerts(response) {
        const alerts = [];
        const data = response.data || {};
        const air = data.airQuality || {};
        const weather = data.weather || {};
        const risk = data.riskAnalysis || {};

        const city = response.city || 'Unknown';
        const industry = document.getElementById('industrySelect')?.value || response.industry || 'Generic Industrial Zone';

        const aqi = (risk.overallRisk && risk.overallRisk.aqi) || (air.aqi && air.aqi.value) || 0;
        const pm25Obj = air.pollutants && air.pollutants.pm25 ? air.pollutants.pm25 : { value: 0 };
        const pm25 = pm25Obj.value || 0;
        const windSpeed = (weather.current && weather.current.windSpeed) || 0;
        const persistence = (risk.industryContext && (risk.industryContext.persistence_type || risk.industryContext.persistence)) || 'Short';

        // Rule 1: High pollution & limited dispersion -> CRITICAL
        if (aqi > 300 && windSpeed < 10) {
            alerts.push({ id: 'limited_dispersion', severity: 'CRITICAL', title: 'High pollution with limited dispersion', short: 'High pollution levels combined with low wind speed may concentrate pollutants near the source.', relevance: 'Current Conditions', industry, aqi, pm25, windSpeed, persistence });
        }

        // Rule 2: Sustained exposure if 24h average available and > WHO guideline -> WARNING
        const dailyAvg = pm25Obj.dailyAvg || pm25Obj.dailyAverage || pm25Obj.avg24h || pm25Obj['24hAvg'];
        const whoGuideline = pm25Obj.whoGuideline || 15;
        if (dailyAvg && dailyAvg > whoGuideline) {
            alerts.push({ id: 'sustained_exposure', severity: 'WARNING', title: 'Sustained exposure risk', short: 'PM2.5 levels have been above recommended limits for the past 24 hours.', relevance: 'Ongoing', industry, aqi, pm25: dailyAvg, windSpeed, persistence });
        }

        // Rule 3: Long-term accumulation risk for persistent pollutants -> INFO
        if (String(persistence).toLowerCase() === 'very long') {
            alerts.push({ id: 'long_term_accumulation', severity: 'INFO', title: 'Long-term accumulation risk', short: 'Industry pollutant persistence indicates potential for long-term accumulation; monitoring advised.', relevance: 'Long-term', industry, aqi, pm25, windSpeed, persistence });
        }

        // Limit to maximum 3 alerts
        return alerts.slice(0, 3);
    },

    /**
     * Render Smart Alerts UI
     */
    async renderSmartAlerts(alerts, response) {
        const container = document.getElementById('alertsList');
        if (!container) return;

        container.innerHTML = '';
        // Keep an in-memory cache to avoid duplicate Gemini calls per session
        this._alertCache = this._alertCache || {};

        for (const alert of alerts) {
            const card = document.createElement('div');
            card.className = 'alert-card';

            const row = document.createElement('div');
            row.className = 'alert-row';

            const icon = document.createElement('div');
            icon.className = 'alert-icon';
            icon.textContent = alert.severity === 'CRITICAL' ? '🔴' : (alert.severity === 'WARNING' ? '🟡' : '🟢');

            const title = document.createElement('div');
            title.className = 'alert-title';
            title.textContent = alert.title;

            const badge = document.createElement('span');
            badge.className = `alert-badge ${alert.severity}`;
            badge.textContent = alert.severity;

            row.appendChild(icon);
            const textWrap = document.createElement('div');
            textWrap.style.flex = '1';
            textWrap.appendChild(title);

            const meta = document.createElement('div');
            meta.className = 'alert-meta';
            meta.textContent = `${alert.relevance} · ${alert.severity}`;

            const short = document.createElement('div');
            short.className = 'alert-text';
            short.textContent = alert.short;

            textWrap.appendChild(short);
            textWrap.appendChild(meta);

            row.appendChild(textWrap);
            row.appendChild(badge);

            card.appendChild(row);

            // AI Explanation placeholder
            const aiDiv = document.createElement('div');
            aiDiv.className = 'alert-ai';
            aiDiv.innerHTML = `<strong>🧠 AI Explanation</strong><div class="ai-text" id="ai-${alert.id}">Loading...</div>`;
            card.appendChild(aiDiv);

            // Data transparency label (per-alert)
            const transparency = document.createElement('div');
            transparency.className = 'data-transparency';
            transparency.textContent = 'Based on public environmental data + rule-based analysis';
            card.appendChild(transparency);

            container.appendChild(card);

            // Fetch AI explanation if not cached
            const cacheKey = `${alert.id}:${response.city || ''}:${response.industry || ''}`;
            if (this._alertCache[cacheKey]) {
                const el = document.getElementById(`ai-${alert.id}`);
                if (el) el.textContent = this._alertCache[cacheKey];
            } else {
                // Request explanation but don't block rendering
                (async () => {
                    try {
                        const payload = { industry: alert.industry, aqi: alert.aqi, pm25: alert.pm25, windSpeed: alert.windSpeed, persistence: alert.persistence };
                        const aiResp = await API.alerts.explain(payload);
                        const explanation = (aiResp && aiResp.success && aiResp.explanation) ? aiResp.explanation : 'AI explanation unavailable.';
                        this._alertCache[cacheKey] = explanation;
                        const el = document.getElementById(`ai-${alert.id}`);
                        if (el) el.textContent = explanation;
                    } catch (e) {
                        console.error('Alert AI fetch failed:', e);
                        const el = document.getElementById(`ai-${alert.id}`);
                        if (el) el.textContent = 'AI explanation unavailable.';
                    }
                })();
            }
        }

        // If no alerts, show a friendly informational card
        if (alerts.length === 0) {
            const info = document.createElement('div');
            info.className = 'alert-card';
            info.innerHTML = `<div class="alert-row"><div class="alert-icon">✅</div><div style="flex:1"><div class="alert-title">No active alerts</div><div class="alert-text">Conditions are within routine monitoring thresholds. Continue regular monitoring.</div></div><span class="alert-badge INFO">INFO</span></div>`;
            container.appendChild(info);
        }
    },

    /**
     * Initialize Collapsible Logic
     */
    initCollapsible() {
        const btn = document.getElementById('aiCollapseBtn');
        const content = document.getElementById('aiContent');
        const icon = btn?.querySelector('.collapse-icon');

        if (btn && content) {
            // Remove old listeners to prevent duplicates
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', () => {
                const isCollapsed = content.classList.contains('collapsed');
                if (isCollapsed) {
                    content.classList.remove('collapsed');
                    if (icon) icon.style.transform = 'rotate(180deg)';
                } else {
                    content.classList.add('collapsed');
                    if (icon) icon.style.transform = 'rotate(0deg)';
                }
            });
        }
    },

    /**
     * Update element text content
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    },

    /**
     * Update last updated timestamp
     */
    updateLastUpdated(timestamp) {
        const element = document.getElementById('lastUpdated');
        if (element && timestamp) {
            const date = new Date(timestamp);
            const formatted = date.toLocaleString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                day: 'numeric',
                month: 'short'
            });
            element.textContent = `Last updated: ${formatted}`;
        }
    },

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // Optional: Replace with toast notification
    }
};

// Export for use in app.js
window.Dashboard = Dashboard;
