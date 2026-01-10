/**
 * EcoSphere AI - Main Application
 * Handles authentication, navigation, and app initialization
 */

const App = {
    currentPage: 'dashboard',
    currentCity: 'Delhi',
    currentIndustry: 'Generic Industrial Zone',
    isAuthenticated: false,
    user: null,

    /**
     * Initialize the application
     */
    // init() {
    //     this.bindEvents();
    //     this.checkAuth();
    //     Dashboard.init();
    //     Forecast.init();
    //     if (window.PollutionPredictor) {
    //         PollutionPredictor.init();
    //     }
    // },

    init() {
    this.bindEvents();

    // 🔥 DEMO MODE: bypass auth
    this.isAuthenticated = true;
    this.user = { name: 'Demo User', email: 'demo@ecosphere.ai' };
    this.hideLogin();

    Dashboard.init();
    Forecast.init();

    if (window.PollutionPredictor) {
        PollutionPredictor.init();
    }

    this.loadCurrentPage();
},


    /**
     * Bind event listeners
     */
    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Google login button
        const googleBtn = document.getElementById('googleLoginBtn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // City selector
        const citySelect = document.getElementById('citySelect');
        if (citySelect) {
            citySelect.addEventListener('change', (e) => this.handleCityChange(e));
        }

        // Industry selector
        const industrySelect = document.getElementById('industrySelect');
        if (industrySelect) {
            industrySelect.addEventListener('change', (e) => this.handleIndustryChange(e));
        }

        // Debounce loadCurrentPage to avoid spamming API when multiple inputs change quickly
        this._loadTimer = null;
        this._debounceMs = 600;
    },

    /**
     * Check if user is authenticated
     */
    // async checkAuth() {
    //     const sessionId = localStorage.getItem('sessionId');
        
    //     if (!sessionId) {
    //         this.showLogin();
    //         return;
    //     }

    //     try {
    //         const response = await API.auth.verify();
    //         if (response.success) {
    //             this.setAuthenticated(response.user);
    //         } else {
    //             this.showLogin();
    //         }
    //     } catch (error) {
    //         console.error('Auth check failed:', error);
    //         this.showLogin();
    //     }
    // },

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }

        try {
            const response = await API.auth.login(email, password);
            
            if (response.success) {
                localStorage.setItem('sessionId', response.sessionId);
                this.setAuthenticated(response.user);
            } else {
                alert(response.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    },

    /**
     * Handle Google login (demo mode)
     */
    handleGoogleLogin() {
        // For demo purposes, simulate Google login
        const demoUser = {
            email: 'demo@ecosphere.ai',
            name: 'Demo User'
        };
        
        localStorage.setItem('sessionId', 'demo_session_' + Date.now());
        this.setAuthenticated(demoUser);
    },

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await API.auth.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }

        localStorage.removeItem('sessionId');
        this.isAuthenticated = false;
        this.user = null;
        this.showLogin();
    },

    /**
     * Set authenticated state
     */
    setAuthenticated(user) {
        this.isAuthenticated = true;
        this.user = user;

        // Update UI
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const adminNav = document.getElementById('adminNav');
        
        if (userName) {
            userName.textContent = user.name || user.email.split('@')[0];
        }
        
        if (userAvatar) {
            userAvatar.textContent = (user.name || user.email)[0].toUpperCase();
        }

        // Show admin nav only for admin users
        if (adminNav) adminNav.style.display = (user.role === 'admin') ? 'block' : 'none';

        this.hideLogin();
        this.loadCurrentPage();
    },

    /**
     * Show login modal
     */
    showLogin() {
        const modal = document.getElementById('loginModal');
        const app = document.getElementById('app');
        
        if (modal) modal.classList.remove('hidden');
        if (app) app.classList.add('hidden');
    },

    /**
     * Hide login modal
     */
    hideLogin() {
        const modal = document.getElementById('loginModal');
        const app = document.getElementById('app');
        
        if (modal) modal.classList.add('hidden');
        if (app) app.classList.remove('hidden');
    },

    /**
     * Handle navigation
     */
    handleNavigation(e) {
        e.preventDefault();

        const item = e.currentTarget;
        const page = item.dataset.page;

        if (!page || page === this.currentPage) return;

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
        item.classList.add('active');

        // Switch page
        this.switchPage(page);
    },


    /**
     * Switch to a different page
     */
    switchPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        this.currentPage = page;
        this.loadCurrentPage();
    },

    /**
     * Handle city change
     */
    handleCityChange(e) {
        this.currentCity = e.target.value;
        this.loadCurrentPage();
    },

    /**
     * Handle industry change
     */
    handleIndustryChange(e) {
        this.currentIndustry = e.target.value;
        this.loadCurrentPage();
    },

    /**
     * Load data for current page
     */
    async loadCurrentPage() {
        if (!this.isAuthenticated) return;

        // Debounce to remove repeated fast calls
        if (this._loadTimer) clearTimeout(this._loadTimer);
        this._loadTimer = setTimeout(async () => {
            if (this.currentPage === 'dashboard') {
                await Dashboard.load(this.currentCity, this.currentIndustry);
            } else if (this.currentPage === 'forecast') {
                await Forecast.load(this.currentCity, this.currentIndustry);
            } else if (this.currentPage === 'pollution') {
                if (window.PollutionPredictor) {
                    await PollutionPredictor.load(this.currentCity, this.currentIndustry);
                }
            } else if (this.currentPage === 'report') {
                if (window.ReportIncident) {
                    await ReportIncident.load(this.currentCity, this.currentIndustry);
                }
            } else if (this.currentPage === 'admin') {
                if (window.Admin) {
                    Admin.init();
                }
            }
        }, this._debounceMs);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for potential use
window.App = App;
