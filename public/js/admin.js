/* Admin Module - Review Reports with pagination and verification */

const Admin = {
    page: 1,
    limit: 10,
    total: 0,

    init() {
        this.container = document.getElementById('adminReports');
        this.pager = document.getElementById('adminPager');
        if (!this.container) return;
        this.bindEvents();
        this.load(this.page);
    },

    bindEvents() {
        if (!this.pager) return;
        this.pager.addEventListener('click', (e) => {
            const target = e.target;
            if (target.dataset.action === 'prev') this.gotoPage(this.page - 1);
            if (target.dataset.action === 'next') this.gotoPage(this.page + 1);
        });

        this.container.addEventListener('click', (e) => {
            const btn = e.target.closest('.verify-btn');
            if (btn) {
                const id = btn.dataset.id;
                this.verifyReport(id);
            }
        });
    },

    async load(page = 1) {
        this.page = page;
        this.container.innerHTML = '<p class="muted">Loading reports...</p>';

        try {
            const res = await fetch(`/api/reports?page=${this.page}&limit=${this.limit}`, { headers: { 'x-session-id': localStorage.getItem('sessionId') } });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load');

            this.total = data.total;
            this.renderReports(data.reports || []);
            this.renderPager();
        } catch (err) {
            console.error('Admin load error', err);
            this.container.innerHTML = '<p class="muted">Unable to load reports.</p>';
        }
    },

    renderReports(reports) {
        if (!reports || reports.length === 0) {
            this.container.innerHTML = '<p class="muted">No reports found.</p>';
            return;
        }

        this.container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Location</th>
                        <th>Type</th>
                        <th>Severity</th>
                        <th>Reported By</th>
                        <th>Verified</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.map(r => `
                        <tr>
                            <td>${new Date(r.timestamp).toLocaleString()}</td>
                            <td>${r.location}</td>
                            <td>${r.pollutantType}</td>
                            <td>${r.severityLevel}</td>
                            <td>${r.reportedBy}</td>
                            <td>${r.verified ? 'Yes' : 'No'}</td>
                            <td>${r.verified ? '' : `<button class="verify-btn" data-id="${r._id || r.id}">Verify</button>`}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderPager() {
        const totalPages = Math.max(1, Math.ceil(this.total / this.limit));
        this.pager.innerHTML = `
            <button data-action="prev" ${this.page <= 1 ? 'disabled' : ''} class="btn small">Prev</button>
            <span class="muted"> Page ${this.page} of ${totalPages} </span>
            <button data-action="next" ${this.page >= totalPages ? 'disabled' : ''} class="btn small">Next</button>
        `;
    },

    gotoPage(p) {
        const totalPages = Math.max(1, Math.ceil(this.total / this.limit));
        if (p < 1 || p > totalPages) return;
        this.load(p);
    },

    async verifyReport(id) {
        try {
            const res = await fetch(`/api/reports/${id}/verify`, { method: 'POST', headers: { 'x-session-id': localStorage.getItem('sessionId') } });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed');
            this.load(this.page);
        } catch (err) {
            console.error('Verify error', err);
            alert('Failed to verify report');
        }
    },

    loadPage() { this.load(1); }
};

window.Admin = Admin;