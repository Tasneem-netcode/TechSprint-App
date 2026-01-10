/**
 * EcoSphere AI - Forecast Module
 * Handles the Environmental Risk Forecast page
 */

const Forecast = {
    data: null,
    isLoading: false,

    /**
     * Initialize forecast module
     */
    init() {
        // Add any forecast-specific initialization
    },

    /**
     * Load forecast data
     */
    async load(city = 'Delhi', industry = 'Generic Industrial Zone') {

        if (this.isLoading) return;
        
        this.isLoading = true;

        try {
            const response = await API.environmental.getForecast(city, industry);
            
            if (response.success) {
                this.data = response;
                this.render(response);
            } else {
                throw new Error(response.error || 'Failed to load forecast');
            }
        } catch (error) {
            console.error('Forecast load error:', error);
            this.showError('Failed to load forecast data.');
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Render forecast page with data
     */
    render(response) {
        try {
            console.log('Rendering forecast:', response);
            const { forecast, aiInsights, city } = response;

            if (!forecast || !forecast.overallRisk) {
                this.showError('Forecast unavailable');
                return;
            }

            // Update city display
            this.updateElement('forecastCity', city);

            // Render overall summary
            this.renderSummary(forecast.overallRisk, aiInsights, (response.industry || city));

            // Render short-term stress outlook (using AI insights)
            this.renderShortTerm(aiInsights);

            // Render long-term forecast
            this.renderLongTerm(forecast.longTerm);

            // Render risk drivers
            this.renderRiskDrivers(forecast.riskDrivers);

            // Render early warnings (merge calculated and AI warnings if available)
            const warnings = [...(forecast.earlyWarnings || [])];
            if (aiInsights && aiInsights.early_warnings) {
                aiInsights.early_warnings.forEach(w => {
                    warnings.push({
                        severity: w.severity === 'warning' ? 'high' : 'info',
                        message: w.message,
                        icon: w.severity === 'warning' ? '⚠️' : 'ℹ️'
                    });
                });
            }
            this.renderEarlyWarnings(warnings);

            // Render preventive actions
            this.renderPreventiveActions(forecast.preventiveActions);
        } catch (error) {
            console.error('Error rendering forecast:', error);
        }
    },

    /**
     * Render overall risk summary
     */
    renderSummary(overallRisk, aiInsights, industry) {
        // If overallRisk is missing, default to Moderate for clarity
        if (!overallRisk) {
            overallRisk = {
                level: 'Moderate',
                primaryConcern: industry || 'General monitoring',
                timeHorizon: 'Short-term focus'
            };
        }

        // Ensure a level is set
        overallRisk.level = overallRisk.level || 'Moderate';
        overallRisk.primaryConcern = overallRisk.primaryConcern || industry || 'General monitoring';
        overallRisk.timeHorizon = overallRisk.timeHorizon || 'Short-term focus';

        // Update summary badge
        const badge = document.getElementById('summaryBadge');
        if (badge) {
            const level = (overallRisk.level).toLowerCase();
            badge.textContent = overallRisk.level;
            badge.className = `summary-badge ${level}`;
        }

        // Update summary values
        this.updateElement('summaryRiskLevel', overallRisk.level);
        this.updateElement('summaryPrimaryConcern', overallRisk.primaryConcern);
        this.updateElement('summaryTimeHorizon', overallRisk.timeHorizon);

        // Update AI analysis
        let summaryText = 'Environmental forecast analysis indicates current conditions with projected trends.';
        
        if (aiInsights) {
            // Using behavior analysis as the summary if available, or a constructed string
            if (typeof aiInsights === 'string') {
                summaryText = aiInsights;
            } else if (aiInsights.behavior_analysis) {
                summaryText = aiInsights.behavior_analysis;
            } else if (aiInsights.summary) {
                summaryText = aiInsights.summary;
            } else if (aiInsights.stress_windows && aiInsights.stress_windows.length > 0) {
                const window = aiInsights.stress_windows[0];
                summaryText = `${window.level} stress conditions expected: ${window.condition}. ${window.impact}.`;
            }
        }
        
        this.updateElement('summaryAIText', summaryText);
    },

    /**
     * Render short-term environmental stress outlook
     */
    renderShortTerm(aiInsights) {
        // Stress Windows
        const windowsContainer = document.getElementById('stressWindows');
        if (windowsContainer) {
            if (aiInsights && aiInsights.stress_windows) {
                windowsContainer.innerHTML = aiInsights.stress_windows.map(window => {
                    const levelClass = (window.level || 'Moderate').toLowerCase();
                    return `
                        <div class="stress-window-card ${levelClass}">
                            <div class="window-header">
                                <span class="stress-level-badge ${levelClass}">${window.level} Stress</span>
                                <span class="window-duration">${window.duration}</span>
                            </div>
                            <div class="window-body">
                                <h5>${window.condition}</h5>
                                <p class="window-impact"><strong>Impact:</strong> ${window.impact}</p>
                                <p class="window-affected"><strong>Affected:</strong> ${window.affected_groups}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                windowsContainer.innerHTML = '<p class="no-data">Stress window analysis unavailable.</p>';
            }
        }

        // Behavior Analysis
        const behaviorText = document.getElementById('behaviorAnalysisText');
        if (behaviorText) {
            behaviorText.textContent = (aiInsights && aiInsights.behavior_analysis) 
                ? aiInsights.behavior_analysis 
                : 'Weather interaction analysis unavailable.';
        }

        // Exposure Breakdown
        const exposureContainer = document.getElementById('exposureBreakdown');
        if (exposureContainer) {
            if (aiInsights && aiInsights.exposure_breakdown) {
                exposureContainer.innerHTML = aiInsights.exposure_breakdown.map(item => {
                    const levelClass = (item.risk_level || 'Low').toLowerCase();
                    return `
                        <div class="exposure-card ${levelClass}">
                            <div class="exposure-header">
                                <h4>${item.type}</h4>
                                <span class="exposure-badge ${levelClass}">${item.risk_level}</span>
                            </div>
                            <p class="exposure-explanation">${item.explanation}</p>
                        </div>
                    `;
                }).join('');
            } else {
                exposureContainer.innerHTML = '<p class="no-data">Exposure breakdown unavailable.</p>';
            }
        }
    },

    /**
     * Render long-term forecast
     */
    renderLongTerm(longTerm) {
        if (!longTerm) return;

        // Chemical Accumulation
        this.renderLongTermCard('chemical', longTerm.chemicalAccumulation);

        // Groundwater Risk
        this.renderLongTermCard('groundwater', longTerm.groundwaterRisk);

        // Soil Contamination
        this.renderLongTermCard('soil', longTerm.soilContamination);
    },

    /**
     * Render a long-term forecast card
     */
    renderLongTermCard(id, data) {
        if (!data) return;

        const level = document.getElementById(`${id}Level`);
        if (level) {
            const levelClass = data.level.toLowerCase();
            level.textContent = data.level;
            level.className = `lt-level ${levelClass}`;
        }

        this.updateElement(`${id}Description`, data.description);
    },

    /**
     * Render risk drivers
     */
    renderRiskDrivers(drivers) {
        const container = document.getElementById('riskDrivers');
        if (!container) return;

        if (!drivers || drivers.length === 0) {
            container.innerHTML = '<p class="no-data">No significant risk drivers identified</p>';
            return;
        }

        container.innerHTML = drivers.map(driver => {
            const severityClass = driver.severity.toLowerCase();
            const icon = this.getDriverIcon(driver.factor);
            return `
                <div class="risk-driver">
                    <div class="driver-icon">${icon}</div>
                    <div class="driver-info">
                        <h4>${driver.factor}</h4>
                        <p>${driver.description}</p>
                        <small>Persistence: ${driver.persistence}</small>
                    </div>
                    <span class="driver-severity ${severityClass}">${driver.severity}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Render early warnings
     */
    renderEarlyWarnings(warnings) {
        const container = document.getElementById('earlyWarnings');
        if (!container) return;

        if (!warnings || warnings.length === 0) {
            container.innerHTML = '<p class="no-data">No current warnings</p>';
            return;
        }

        container.innerHTML = warnings.map(warning => `
            <div class="warning-item ${warning.severity}">
                <span class="warning-icon">${warning.icon || '⚠️'}</span>
                <span class="warning-message">${warning.message}</span>
            </div>
        `).join('');
    },

    /**
     * Render preventive actions
     */
    renderPreventiveActions(actions) {
        const container = document.getElementById('preventiveActions');
        if (!container) return;

        if (!actions || actions.length === 0) {
            container.innerHTML = '<p class="no-data">No specific actions recommended at this time</p>';
            return;
        }

        container.innerHTML = actions.map(action => `
            <div class="action-item">
                <div class="action-priority">${action.priority}</div>
                <div class="action-content">
                    <h4>${action.action}</h4>
                    <p>${action.description}</p>
                </div>
                <div class="action-meta">
                    <span class="action-timeframe">${action.timeframe}</span>
                    <span class="action-scale">${action.scalability}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Get icon for risk driver
     */
    getDriverIcon(factor) {
        const icons = {
            'Fine Particulate Matter': '🌫️',
            'PM2.5': '🌫️',
            'Nitrogen Dioxide': '🏭',
            'NO2': '🏭',
            'Sulfur Dioxide': '⚗️',
            'SO2': '⚗️',
            'Ozone': '☀️',
            'O3': '☀️',
            'Carbon Monoxide': '💨',
            'CO': '💨',
            'Chemical Persistence': '🧪'
        };

        for (const [key, icon] of Object.entries(icons)) {
            if (factor.includes(key)) return icon;
        }
        return '📊';
    },

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        
        try {
            // Handle Indian date format (DD/MM/YYYY)
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const date = new Date(parts[2], parts[1] - 1, parts[0]);
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                if (date.toDateString() === today.toDateString()) return 'Today';
                if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

                return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
            }
            return dateStr;
        } catch {
            return dateStr;
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
     * Show error message
     */
    showError(message) {
        console.error(message);
    }
};

// Export for use in app.js
window.Forecast = Forecast;
