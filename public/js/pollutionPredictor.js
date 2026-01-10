/* Pollution Predictor Module
 * Adds a Pollution Predictor UI and simple local analysis to the Risk Forecast page.
 * Uses local database fallback for chemical impact data (no external AI calls).
 */

const PollutionPredictor = {
    selectedIndustry: null,
    selectedChemicals: [],
    isAnalyzing: false,

    industries: [
        { id: 'agriculture', name: 'Agriculture', icon: '🌾' },
        { id: 'fishing', name: 'Fishing', icon: '🦞' },
        { id: 'forestry', name: 'Forestry', icon: '🌲' },
        { id: 'mining', name: 'Mining', icon: '⛏️' },
        { id: 'oil-drilling', name: 'Oil Drilling', icon: '🛢️' },
        { id: 'automobile', name: 'Automobile', icon: '🚗' }
    ],

    chemicalDatabase: {
        urea: {
            pollutionType: ['Water Pollution', 'Soil Pollution'],
            environmentalImpact: ['Eutrophication', 'Ammonia Emissions', 'Groundwater Contamination'],
            riskLevel: 'Medium',
            impactScores: [ { subject: 'Air', score: 30 }, { subject: 'Water', score: 80 }, { subject: 'Soil', score: 70 }, { subject: 'Health', score: 40 }, { subject: 'Wildlife', score: 50 } ],
            details: 'Urea: excessive use leads to eutrophication and ammonia release.'
        },
        malathion: {
            pollutionType: ['Water Pollution', 'Air Pollution'],
            environmentalImpact: ['Neurotoxicity to Wildlife', 'Aquatic Ecosystem Damage'],
            riskLevel: 'High',
            impactScores: [ { subject: 'Air', score: 50 }, { subject: 'Water', score: 90 }, { subject: 'Soil', score: 40 }, { subject: 'Health', score: 85 }, { subject: 'Wildlife', score: 95 } ],
            details: 'Malathion is highly toxic to bees and aquatic organisms.'
        },
        glyphosate: {
            pollutionType: ['Soil Pollution', 'Water Pollution'],
            environmentalImpact: ['Biodiversity Loss', 'Soil Microbiome Disruption'],
            riskLevel: 'High',
            impactScores: [ { subject: 'Air', score: 20 }, { subject: 'Water', score: 75 }, { subject: 'Soil', score: 85 }, { subject: 'Health', score: 70 }, { subject: 'Wildlife', score: 80 } ],
            details: 'Glyphosate: concerns over soil health and persistence.'
        },
        mercury: {
            pollutionType: ['Water Pollution', 'Soil Pollution'],
            environmentalImpact: ['Bioaccumulation', 'Neurological Damage', 'Aquatic Toxicity'],
            riskLevel: 'High',
            impactScores: [ { subject: 'Air', score: 40 }, { subject: 'Water', score: 95 }, { subject: 'Soil', score: 85 }, { subject: 'Health', score: 100 }, { subject: 'Wildlife', score: 90 } ],
            details: 'Mercury bioaccumulates and is highly toxic.'
        }
    },

    industryChemicals: {
        agriculture: ['Urea', 'Malathion', 'Glyphosate'],
        fishing: ['Diesel fuel', 'Marine oil', 'Plastic waste', 'Lead'],
        forestry: ['Diesel fuel', 'Chainsaw oil', 'Herbicides'],
        mining: ['Mercury', 'Lead', 'Arsenic'],
        'oil-drilling': ['Crude oil', 'Benzene', 'Methane'],
        automobile: ['VOCs', 'Lead paint', 'Chromium']
    },

    init() {
        // Bind analyze button and other controls when DOM is ready
        this.cache = {
            container: document.getElementById('pollutionPredictor'),
            industryContainer: document.getElementById('ppIndustryList'),
            chemicalsContainer: document.getElementById('ppChemicals'),
            customInput: document.getElementById('ppCustomChemical'),
            addBtn: document.getElementById('ppAddChemical'),
            analyzeBtn: document.getElementById('ppAnalyzeBtn'),
            resultsContainer: document.getElementById('ppResults')
        };

        if (!this.cache.container) return; // not on page

        this.renderIndustryList();
        this.bindEvents();
    },

    bindEvents() {
        const { addBtn, analyzeBtn, customInput } = this.cache;
        if (addBtn) addBtn.addEventListener('click', () => this.addCustomChemical());
        if (analyzeBtn) analyzeBtn.addEventListener('click', () => this.analyze());
        if (customInput) customInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addCustomChemical(); } });
    },

    renderIndustryList() {
        const container = this.cache.industryContainer;
        if (!container) return;
        container.innerHTML = this.industries.map(ind => `
            <button class="pp-industry-btn" data-id="${ind.id}">${ind.icon} ${ind.name}</button>
        `).join('');

        container.querySelectorAll('.pp-industry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.selectIndustry(id);
            });
        });
    },

    selectIndustry(id) {
        this.selectedIndustry = id;
        this.selectedChemicals = [];
        // UI highlight
        this.cache.industryContainer.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.id === id));
        this.renderChemicals();
        this.cache.resultsContainer.innerHTML = '';
    },

    renderChemicals() {
        const container = this.cache.chemicalsContainer;
        if (!container) return;
        const list = this.industryChemicals[this.selectedIndustry] || [];
        container.innerHTML = list.map(c => `
            <button class="pp-chem-btn" data-name="${c}">${c}</button>
        `).join('');

        container.querySelectorAll('.pp-chem-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.dataset.name;
                this.toggleChemical(name, e.currentTarget);
            });
        });
    },

    toggleChemical(name, btnEl) {
        const i = this.selectedChemicals.indexOf(name);
        if (i === -1) {
            this.selectedChemicals.push(name);
            btnEl.classList.add('selected');
        } else {
            this.selectedChemicals.splice(i, 1);
            btnEl.classList.remove('selected');
        }
    },

    addCustomChemical() {
        const val = (this.cache.customInput.value || '').trim();
        if (!val) return;
        if (!this.selectedChemicals.includes(val)) {
            this.selectedChemicals.push(val);
            const btn = document.createElement('button');
            btn.className = 'pp-chem-btn selected';
            btn.dataset.name = val;
            btn.textContent = val;
            btn.addEventListener('click', (e) => { this.toggleChemical(val, e.currentTarget); });
            this.cache.chemicalsContainer.appendChild(btn);
            this.cache.customInput.value = '';
        }
    },

    analyze() {
        if (this.isAnalyzing) return;
        if (!this.selectedIndustry || this.selectedChemicals.length === 0) {
            alert('Select an industry and at least one chemical to analyze.');
            return;
        }

        this.isAnalyzing = true;
        this.cache.analyzeBtn.classList.add('loading');
        this.cache.resultsContainer.innerHTML = '<p class="muted">Analyzing...</p>';

        // Simulate async analysis and produce local fallback results
        setTimeout(() => {
            const results = this.selectedChemicals.map(name => this.localAnalyze(name));
            this.renderResults(results);
            this.isAnalyzing = false;
            this.cache.analyzeBtn.classList.remove('loading');
        }, 600);
    },

    localAnalyze(name) {
        const key = name.toLowerCase().trim();
        const db = this.chemicalDatabase[key];
        if (db) return Object.assign({ chemical: name }, db);

        // generate deterministic fallback
        const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const base = 30 + (hash % 50);
        const impactScores = [
            { subject: 'Air', score: Math.min(100, base + (hash % 20)) },
            { subject: 'Water', score: Math.min(100, base + ((hash * 2) % 30)) },
            { subject: 'Soil', score: Math.min(100, base + ((hash * 3) % 40)) },
            { subject: 'Health', score: Math.min(100, base + ((hash * 4) % 25)) },
            { subject: 'Wildlife', score: Math.min(100, base + ((hash * 5) % 35)) }
        ];

        return {
            chemical: name,
            pollutionType: [`General ${this.selectedIndustry} pollution`],
            environmentalImpact: [`Preliminary: potential environmental stress from ${name}`],
            riskLevel: (hash % 3 === 0) ? 'High' : ((hash % 3 === 1) ? 'Medium' : 'Low'),
            impactScores,
            details: `Preliminary local assessment for ${name} in ${this.selectedIndustry}. Use with caution.`
        };
    },

    renderResults(results) {
        const container = this.cache.resultsContainer;
        if (!container) return;
        container.innerHTML = results.map(r => `
            <div class="pp-result-card">
                <div class="pp-result-header">
                    <strong>${r.chemical}</strong>
                    <span class="pp-risk ${r.riskLevel.toLowerCase()}">${r.riskLevel}</span>
                </div>
                <div class="pp-result-body">
                    <div class="pp-impact-list">
                        <h5>Pollution Type</h5>
                        <p>${r.pollutionType.join(', ')}</p>
                        <h5>Environmental Impact</h5>
                        <ul>${r.environmentalImpact.map(i => `<li>${i}</li>`).join('')}</ul>
                    </div>
                    <div class="pp-bar-chart">
                        ${r.impactScores.map(s => `
                            <div class="pp-bar-row">
                                <span class="pp-bar-label">${s.subject}</span>
                                <div class="pp-bar-outer"><div class="pp-bar-inner" style="width:${s.score}%"></div></div>
                                <span class="pp-bar-value">${s.score}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="pp-details">${r.details}</div>
            </div>
        `).join('');

        // Scroll into view
        container.scrollIntoView({ behavior: 'smooth' });
    },

    load(city, industry) {
        // could tailor behavior by city/industry in future
        // for now ensure module is initialized
        if (!this.cache) this.init();
    }
};

// Expose globally
window.PollutionPredictor = PollutionPredictor;
