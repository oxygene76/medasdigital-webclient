// ====================================
// SWIPE NAVIGATION FIX
// Ersetzt problematische Teile in mobile-navigation.js
// ====================================

// PROBLEM: Tab-Erkennung und Switching funktioniert nicht richtig
// LÖSUNG: Verbesserte Tab-Detection und Switch-Logik

class MobileNavigationManager {
    constructor() {
        this.currentTab = 0;
        this.tabs = [];
        this.tabContents = [];
        this.isBottomNav = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.swipeThreshold = 50;
        this.isInitialized = false;
        
        this.init();
    }

    init() {
        // Warten bis DOM ready ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.setupTabs();
        this.setupSwipeGestures();
        this.setupNavigationToggle();
        this.loadNavigationPreference();
        this.isInitialized = true;
        
        console.log('📱 Mobile Navigation initialized with', this.tabs.length, 'tabs');
        console.log('📋 Current tab:', this.currentTab, this.tabs[this.currentTab]?.dataset.tab);
    }

    setupTabs() {
        // VERBESSERTE Tab-Erkennung
        this.tabs = Array.from(document.querySelectorAll('.tab-button[data-tab]'));
        this.tabContents = Array.from(document.querySelectorAll('.tab-content[id$="-tab"]'));
        
        console.log('🔍 Found tabs:', this.tabs.map(tab => tab.dataset.tab));
        console.log('🔍 Found tab contents:', this.tabContents.map(content => content.id));
        
        // Finde aktiven Tab
        this.currentTab = this.tabs.findIndex(tab => tab.classList.contains('active'));
        if (this.currentTab === -1) {
            this.currentTab = 0;
            // Setze ersten Tab als aktiv falls keiner aktiv ist
            if (this.tabs.length > 0) {
                this.tabs[0].classList.add('active');
                const firstContent = document.querySelector(`#${this.tabs[0].dataset.tab}-tab`);
                if (firstContent) {
                    firstContent.classList.add('active');
                }
            }
        }
        
        // Event Listeners für Tabs
        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToTab(index, 'click');
            });
            
            tab.addEventListener('touchstart', (e) => {
                this.triggerHapticFeedback('light');
            });
        });
    }

    setupSwipeGestures() {
        // Swipe auf dem Haupt-Content-Bereich
        const swipeTargets = [
            '.communication-display',
            '.tab-content.active',
            '.content-area'
        ];
        
        let swipeZone = null;
        for (const selector of swipeTargets) {
            swipeZone = document.querySelector(selector);
            if (swipeZone) break;
        }
        
        if (!swipeZone) {
            console.warn('⚠️ No swipe zone found');
            return;
        }
        
        console.log('👆 Swipe zone:', swipeZone.className);
        
        swipeZone.classList.add('swipe-zone');
        
        // Touch Events
        swipeZone.addEventListener('touchstart', (e) => this.handleSwipeStart(e), { passive: true });
        swipeZone.addEventListener('touchmove', (e) => this.handleSwipeMove(e), { passive: false });
        swipeZone.addEventListener('touchend', (e) => this.handleSwipeEnd(e), { passive: true });
    }

    handleSwipeStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        console.log('👆 Swipe start:', this.touchStartX, this.touchStartY);
    }

    handleSwipeMove(e) {
        if (!e.touches[0]) return;
        
        this.touchEndX = e.touches[0].clientX;
        this.touchEndY = e.touches[0].clientY;
        
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = Math.abs(this.touchEndY - this.touchStartY);
        
        // Horizontal swipe detection
        if (Math.abs(deltaX) > 30 && deltaY < 50) {
            e.preventDefault(); // Prevent scrolling during horizontal swipe
            this.showSwipeIndicator(deltaX > 0 ? 'right' : 'left');
        }
    }

    handleSwipeEnd(e) {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = Math.abs(this.touchEndY - this.touchStartY);
        
        console.log('👆 Swipe end - deltaX:', deltaX, 'deltaY:', deltaY);
        
        this.hideSwipeIndicators();
        
        // Check if it's a horizontal swipe
        if (Math.abs(deltaX) > this.swipeThreshold && deltaY < 100) {
            if (deltaX > 0) {
                // Swipe right - go to previous tab
                console.log('👉 Swipe right detected');
                this.goToPreviousTab();
            } else {
                // Swipe left - go to next tab
                console.log('👈 Swipe left detected');
                this.goToNextTab();
            }
        }
    }

    goToPreviousTab() {
        const newIndex = this.currentTab - 1;
        if (newIndex >= 0) {
            console.log('⬅️ Going to previous tab:', newIndex);
            this.switchToTab(newIndex, 'swipe-right');
        } else {
            console.log('⬅️ Already at first tab');
            this.triggerHapticFeedback('medium'); // Feedback for "can't go further"
        }
    }

    goToNextTab() {
        const newIndex = this.currentTab + 1;
        if (newIndex < this.tabs.length) {
            console.log('➡️ Going to next tab:', newIndex);
            this.switchToTab(newIndex, 'swipe-left');
        } else {
            console.log('➡️ Already at last tab');
            this.triggerHapticFeedback('medium'); // Feedback for "can't go further"
        }
    }

    switchToTab(index, source = 'unknown') {
        if (index < 0 || index >= this.tabs.length || index === this.currentTab) {
            console.log('❌ Invalid tab switch:', index, 'current:', this.currentTab);
            return false;
        }
        
        console.log(`🔄 Switching tab: ${this.currentTab} → ${index} (${source})`);
        
        const oldTab = this.tabs[this.currentTab];
        const newTab = this.tabs[index];
        const oldContent = document.querySelector(`#${oldTab.dataset.tab}-tab`);
        const newContent = document.querySelector(`#${newTab.dataset.tab}-tab`);
        
        if (!newContent) {
            console.error('❌ Tab content not found:', `#${newTab.dataset.tab}-tab`);
            return false;
        }
        
        // Update tab buttons
        oldTab.classList.remove('active');
        newTab.classList.add('active');
        
        // Update tab contents
        if (oldContent) {
            oldContent.classList.remove('active');
        }
        newContent.classList.add('active');
        
        // Update current tab
        this.currentTab = index;
        
        // Haptic feedback
        this.triggerHapticFeedback('light');
        
        // Trigger custom event for other components
        const event = new CustomEvent('tabChanged', {
            detail: { 
                index: this.currentTab, 
                tabName: newTab.dataset.tab,
                source: source,
                oldTab: oldTab.dataset.tab
            }
        });
        window.dispatchEvent(event);
        
        console.log('✅ Tab switched successfully to:', newTab.dataset.tab);
        return true;
    }

    showSwipeIndicator(direction) {
        this.hideSwipeIndicators();
        
        const indicator = document.createElement('div');
        indicator.className = `swipe-indicator ${direction} show`;
        
        if (direction === 'left') {
            indicator.textContent = '◀';
            indicator.style.left = '20px';
        } else {
            indicator.textContent = '▶';
            indicator.style.right = '20px';
        }
        
        indicator.style.position = 'fixed';
        indicator.style.top = '50%';
        indicator.style.transform = 'translateY(-50%)';
        indicator.style.fontSize = '32px';
        indicator.style.color = 'rgba(0, 255, 255, 0.8)';
        indicator.style.textShadow = '0 0 10px #00ffff';
        indicator.style.zIndex = '999';
        indicator.style.pointerEvents = 'none';
        indicator.style.transition = 'opacity 0.2s ease';
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 300);
    }

    hideSwipeIndicators() {
        const indicators = document.querySelectorAll('.swipe-indicator');
        indicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
    }

    triggerHapticFeedback(intensity = 'light') {
        if (!('vibrate' in navigator)) return;
        
        try {
            let duration;
            switch (intensity) {
                case 'light': duration = 10; break;
                case 'medium': duration = 20; break;
                case 'heavy': duration = 40; break;
                default: duration = 10;
            }
            navigator.vibrate(duration);
        } catch (error) {
            // Ignore vibration errors
        }
    }

    setupNavigationToggle() {
        const existingToggle = document.querySelector('.nav-toggle');
        if (existingToggle) return;
        
        const toggleButton = document.createElement('button');
        toggleButton.className = 'nav-toggle';
        toggleButton.innerHTML = '⬇️';
        toggleButton.style.cssText = `
            position: fixed;
            top: 60px;
            right: 10px;
            width: 40px;
            height: 40px;
            background: rgba(0, 255, 255, 0.1);
            border: 1px solid #00ffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #00ffff;
            cursor: pointer;
            z-index: 1001;
            transition: all 0.3s ease;
        `;
        
        toggleButton.addEventListener('click', () => this.toggleNavigationPosition());
        document.body.appendChild(toggleButton);
    }

    toggleNavigationPosition() {
        this.isBottomNav = !this.isBottomNav;
        
        const tabNavigation = document.querySelector('.terminal-tabs');
        const mainContent = document.querySelector('.communication-display');
        const toggleButton = document.querySelector('.nav-toggle');
        
        if (this.isBottomNav) {
            if (tabNavigation) tabNavigation.classList.add('bottom-nav');
            if (mainContent) mainContent.classList.add('bottom-nav-active');
            if (toggleButton) {
                toggleButton.innerHTML = '⬆️';
                toggleButton.classList.add('bottom-active');
            }
        } else {
            if (tabNavigation) tabNavigation.classList.remove('bottom-nav');
            if (mainContent) mainContent.classList.remove('bottom-nav-active');
            if (toggleButton) {
                toggleButton.innerHTML = '⬇️';
                toggleButton.classList.remove('bottom-active');
            }
        }
        
        localStorage.setItem('mobile-nav-position', this.isBottomNav ? 'bottom' : 'top');
        this.triggerHapticFeedback('medium');
        
        console.log(`📱 Navigation moved to ${this.isBottomNav ? 'bottom' : 'top'}`);
    }

    loadNavigationPreference() {
        const savedPosition = localStorage.getItem('mobile-nav-position');
        if (savedPosition === 'bottom') {
            this.toggleNavigationPosition();
        }
    }

    // Debug methods
    getCurrentTabInfo() {
        return {
            index: this.currentTab,
            tab: this.tabs[this.currentTab]?.dataset.tab,
            totalTabs: this.tabs.length,
            isInitialized: this.isInitialized
        };
    }

    // Cleanup
    destroy() {
        const toggleButton = document.querySelector('.nav-toggle');
        if (toggleButton && toggleButton.parentNode) {
            toggleButton.parentNode.removeChild(toggleButton);
        }
        this.hideSwipeIndicators();
    }
}

// VERBESSERTE Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            window.mobileNav = new MobileNavigationManager();
            
            // Debug info
            console.log('📱 Mobile Navigation Debug Info:');
            console.log(window.mobileNav.getCurrentTabInfo());
        }, 100); // Kleine Verzögerung für DOM-Stabilität
    }
});

// Resize Handler
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !window.mobileNav) {
        window.mobileNav = new MobileNavigationManager();
    } else if (window.innerWidth > 768 && window.mobileNav) {
        window.mobileNav.destroy();
        window.mobileNav = null;
    }
});
