/* Report Incident Module
 * Lightweight client-side form adapted from Nandu's React component.
 * Sends report via POST /api/report
 */

const ReportIncident = {
    cache: null,

    pollutantTypes: [
        'Air Pollution (PM2.5, Smog)',
        'Water Contamination',
        'Chemical Spill',
        'Industrial Emissions',
        'Heavy Metals',
        'Toxic Gases',
        'Noise Pollution',
        'Soil Contamination',
        'Radioactive Material',
        'Other'
    ],

    init() {
        this.cache = {
            container: document.getElementById('reportIncidentSection'),
        };
        if (!this.cache.container) return; // Not present on page

        this.renderForm();
        this.bindEvents();

        // Try to automatically obtain user's location on form load
        // This uses system/browser geolocation first, then falls back to IP-based lookup
        // If found, it will populate the Location field and coords display
        this.autoLocate();
    },

    renderForm() {
        const el = this.cache.container;
        el.innerHTML = `
            <div class="ri-card">
                <div class="ri-header">
                    <h3>Report Environmental Incident</h3>
                    <p class="muted">Help protect your community — submit non-emergency pollution reports.</p>
                </div>

                <form id="riForm" class="ri-form">
                    <div class="ri-row">
                        <label>Location *</label>
                        <div class="ri-location-row">
                            <input type="text" id="riLocation" required placeholder="Address or description" />
                            <button type="button" id="riGetLocation" class="btn small">GPS</button>
                        </div>
                        <div id="riLocationError" class="ri-error"></div>
                        <div id="riCoords" class="ri-coords muted"></div>
                    </div>

                    <div class="ri-row">
                        <label>Type of Pollution *</label>
                        <select id="riPollutantType" required>
                            <option value="">Select pollution type</option>
                            ${this.pollutantTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>

                    <div class="ri-row">
                        <label>Severity Level: <span id="riSeverityLabel">5</span>/10</label>
                        <input id="riSeverity" type="range" min="1" max="10" value="5" />
                        <div class="ri-severity-legend muted"><span>Minor</span><span>Moderate</span><span>Severe</span></div>
                    </div>

                    <div class="ri-row">
                        <label>Description *</label>
                        <textarea id="riDescription" rows="4" required placeholder="Describe what you observed"></textarea>
                    </div>

                    <div class="ri-row">
                        <label>Suspected Industry Source (Optional)</label>
                        <input type="text" id="riIndustrySource" placeholder="Nearby factory or facility" />
                    </div>

                    <div class="ri-row">
                        <label>Your Name or Contact *</label>
                        <input type="text" id="riReportedBy" required placeholder="Name or email" />
                    </div>

                    <div class="ri-row">
                        <button id="riSubmitBtn" class="btn btn-primary" type="submit">Submit Report</button>
                    </div>

                    <div id="riMessage" class="ri-message"></div>
                </form>
            </div>
        `;
    },

    bindEvents() {
        const form = document.getElementById('riForm');
        if (form) form.addEventListener('submit', (e) => this.handleSubmit(e));

        const gpsBtn = document.getElementById('riGetLocation');
        if (gpsBtn) gpsBtn.addEventListener('click', () => this.getCurrentLocation());

        const severity = document.getElementById('riSeverity');
        const sevLabel = document.getElementById('riSeverityLabel');
        if (severity && sevLabel) {
            severity.addEventListener('input', (e) => { sevLabel.textContent = e.target.value; });
        }
    },

    getCurrentLocation() {
        const errEl = document.getElementById('riLocationError');
        const coordsEl = document.getElementById('riCoords');
        if (errEl) errEl.textContent = '';
        if (!navigator.geolocation) {
            if (errEl) errEl.textContent = 'Geolocation is not supported by this browser.';
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude.toFixed(6);
            const lon = pos.coords.longitude.toFixed(6);
            if (coordsEl) coordsEl.textContent = `Coordinates: ${lat}, ${lon} (system)`;
            // store coords in object
            this._coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };

            // Attempt reverse geocode to obtain a human-readable location
            try {
                const addr = await this.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                if (addr) {
                    const locInput = document.getElementById('riLocation');
                    if (locInput && !locInput.value) locInput.value = addr;
                }
            } catch (e) {
                // ignore reverse geocode failures
            }
        }, () => {
            if (errEl) errEl.textContent = 'Unable to get location. Please enter manually.';
        }, { timeout: 8000 });
    },

    // Try to automatically get location on load. Uses geolocation first, then IP fallback.
    async autoLocate() {
        const errEl = document.getElementById('riLocationError');
        const coordsEl = document.getElementById('riCoords');
        if (!navigator.geolocation) {
            // fallback to IP-based (approximate)
            try {
                const ip = await fetch('https://ipapi.co/json/').then(r => r.json());
                if (ip && ip.latitude && ip.longitude) {
                    this._coords = { latitude: parseFloat(ip.latitude), longitude: parseFloat(ip.longitude) };
                    if (coordsEl) coordsEl.textContent = `Coordinates: ${this._coords.latitude.toFixed(6)}, ${this._coords.longitude.toFixed(6)} (ip)`;
                    const locInput = document.getElementById('riLocation');
                    if (locInput && !locInput.value) locInput.value = `${ip.city || ''} ${ip.region || ''} ${ip.country_name || ''}`.trim();
                }
            } catch (e) {
                // ignore
            }
            return;
        }

        // Ask for permission but don't block UI too long
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            this._coords = { latitude: lat, longitude: lon };
            if (coordsEl) coordsEl.textContent = `Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)} (system)`;

            // Attempt reverse geocode
            try {
                const addr = await this.reverseGeocode(lat, lon);
                const locInput = document.getElementById('riLocation');
                if (addr && locInput && !locInput.value) locInput.value = addr;
            } catch (e) {
                // ignore reverse geocode failure
            }
        }, async (err) => {
            // Permission denied or timed out - try IP fallback
            if (errEl) errEl.textContent = 'Location permission denied or timed out — using approximate location.';
            try {
                const ip = await fetch('https://ipapi.co/json/').then(r => r.json());
                if (ip && ip.latitude && ip.longitude) {
                    this._coords = { latitude: parseFloat(ip.latitude), longitude: parseFloat(ip.longitude) };
                    if (coordsEl) coordsEl.textContent = `Coordinates: ${this._coords.latitude.toFixed(6)}, ${this._coords.longitude.toFixed(6)} (ip)`;
                    const locInput = document.getElementById('riLocation');
                    if (locInput && !locInput.value) locInput.value = `${ip.city || ''} ${ip.region || ''} ${ip.country_name || ''}`.trim();
                }
            } catch (e) {
                if (errEl) errEl.textContent = 'Unable to determine approximate location.';
            }
        }, { timeout: 7000 });
    },

    // Reverse geocode using Nominatim (OpenStreetMap) - simple, no API key required (be mindful of rate limits)
    async reverseGeocode(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=en`;
            const res = await fetch(url, { headers: { 'User-Agent': 'EcoSphereAI/1.0 (+https://example.com)' } });
            if (!res.ok) return null;
            const json = await res.json();
            const display = json.display_name || (json.address && (json.address.city || json.address.town || json.address.village || json.address.state)) || null;
            return display;
        } catch (e) {
            return null;
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('riSubmitBtn');
        const message = document.getElementById('riMessage');

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
        if (message) { message.textContent = ''; message.className = 'ri-message'; }

        const payload = {
            location: document.getElementById('riLocation').value.trim(),
            latitude: this._coords ? this._coords.latitude : 0,
            longitude: this._coords ? this._coords.longitude : 0,
            pollutantType: document.getElementById('riPollutantType').value,
            severityLevel: parseInt(document.getElementById('riSeverity').value, 10),
            description: document.getElementById('riDescription').value.trim(),
            reportedBy: document.getElementById('riReportedBy').value.trim(),
            industrySource: document.getElementById('riIndustrySource').value.trim()
        };

        // Basic validation
        if (!payload.location || !payload.pollutantType || !payload.description || !payload.reportedBy) {
            if (message) { message.textContent = 'Please complete all required fields.'; message.classList.add('ri-error'); }
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Report'; }
            return;
        }

        try {
            const res = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit');

            if (message) { message.textContent = 'Report submitted — thank you. Our team will review it.'; message.classList.add('ri-success'); }

            // Reset form
            document.getElementById('riForm').reset();
            this._coords = null;
            const coordsEl = document.getElementById('riCoords'); if (coordsEl) coordsEl.textContent = '';

        } catch (err) {
            console.error('Submit error:', err);
            if (message) { message.textContent = 'Error submitting report. Please try again.'; message.classList.add('ri-error'); }
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Report'; }
        }
    },

    load(city, industry) {
        // nothing specific for now, just ensure form is rendered if needed
        if (!this.cache) this.init();
    }
};

window.ReportIncident = ReportIncident;
