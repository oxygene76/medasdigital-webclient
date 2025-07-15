// ====================================
// MOBILE NAVIGATION MANAGER
// Add to assets/js/mobile-navigation.js
// ====================================

class MobileNavigationManager {
    constructor() {
        this.currentTab = 0;
        this.tabs = [];
        this.isBottomNav = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.swipeThreshold = 50;
        this.longPressTimer = null;
        this.longPressDelay = 800;
        this.hapticSupported = 'vibrate' in navigator;
        
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupSwipeGestures();
        this.setupNavigationToggle();
        this.setupHapticFeedback();
        this.setupLongPress();
        this.loadNavigationPreference();
        
        console.log('📱 Mobile Navigation Manager initialized');
    }

    setupTabs() {
        this.tabs = Array.from(document.querySelectorAll('.tab-button'));
        this.currentTab = this.tabs.findIndex(tab => tab.classList.contains('active'));
        
        if (this.currentTab === -1) this.currentTab = 0;
        
        // Add touch event listeners to tabs
        this.tabs.forEach((tab, index) => {
            tab.addEventListener('touchstart', (e) => this.handleTabTouchStart(e, index));
            tab.addEventListener('touchend', (e) => this.handleTabTouchEnd(e, index));
            tab.addEventListener('click', (e) => this.handleTabClick(e, index));
        });
    }

    setupSwipeGestures() {
        const swipeZone = document.querySelector('.tab-content.active') || document.querySelector('.main-content');
        
        if (!swipeZone) return;
        
        swipeZone.classList.add('swipe-zone');
        
        // Touch events for swipe detection
        swipeZone.addEventListener('touchstart', (e) => this.handleSwipeStart(e), { passive: true });
        swipeZone.addEventListener('touchmove', (e) => this.handleSwipeMove(e), { passive: false });
        swipeZone.addEventListener('touchend', (e) => this.handleSwipeEnd(e), { passive: true });
        
        // Prevent default scroll behavior for horizontal swipes
        swipeZone.addEventListener('touchmove', (e) => {
            const deltaX = Math.abs(this.touchEndX - this.touchStartX);
            const deltaY = Math.abs(this.touchEndY - this.touchStartY);
            
            // If horizontal swipe is more significant than vertical
            if (deltaX > deltaY && deltaX > 20) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    handleSwipeStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleSwipeMove(e) {
        this.touchEndX = e.touches[0].clientX;
        this.touchEndY = e.touches[0].clientY;
        
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = Math.abs(this.touchEndY - this.touchStartY);
        
        // Show swipe indicator if horizontal movement is significant
        if (Math.abs(deltaX) > 20 && deltaY < 50) {
            this.showSwipeIndicator(deltaX > 0 ? 'right' : 'left');
        }
    }

    handleSwipeEnd(e) {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = Math.abs(this.touchEndY - this.touchStartY);
        
        // Clear any existing swipe indicators
        this.hideSwipeIndicators();
        
        // Check if it's a horizontal swipe
        if (Math.abs(deltaX) > this.swipeThreshold && deltaY < 100) {
            if (deltaX > 0) {
                // Swipe right - go to previous tab
                this.goToPreviousTab();
            } else {
                // Swipe left - go to next tab
                this.goToNextTab();
            }
        }
    }

    showSwipeIndicator(direction) {
        // Remove existing indicators
        this.hideSwipeIndicators();
        
        const indicator = document.createElement('div');
        indicator.className = `swipe-indicator ${direction} show`;
        indicator.textContent = direction === 'left' ? '◀' : '▶';
        
        document.body.appendChild(indicator);
        
        // Auto-hide after animation
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 500);
    }

    hideSwipeIndicators() {
        const indicators = document.querySelectorAll('.swipe-indicator');
        indicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
    }

    goToPreviousTab() {
        if (this.currentTab > 0) {
            this.switchToTab(this.currentTab - 1, 'right');
            this.triggerHapticFeedback('light');
        }
    }

    goToNextTab() {
        if (this.currentTab < this.tabs.length - 1) {
            this.switchToTab(this.currentTab + 1, 'left');
            this.triggerHapticFeedback('light');
        }
    }

    switchToTab(index, direction = 'none') {
        if (index < 0 || index >= this.tabs.length || index === this.currentTab) {
            return;
        }
        
        const currentTabContent = document.querySelector('.tab-content.active');
        const newTab = this.tabs[index];
        const newTabContent = document.querySelector(`#${newTab.dataset.tab}-tab`);
        
        if (!newTabContent) return;
        
        // Add transition classes based on swipe direction
        if (direction !== 'none' && currentTabContent) {
            currentTabContent.classList.add(`swipe-out-${direction}`);
            newTabContent.classList.add(`swipe-in-${direction === 'left' ? 'right' : 'left'}`);
        }
        
        // Update tab states
        this.tabs[this.currentTab].classList.remove('active');
        newTab.classList.add('active');
        
        if (currentTabContent) {
            currentTabContent.classList.remove('active');
        }
        newTabContent.classList.add('active');
        
        // Clean up transition classes after animation
        setTimeout(() => {
            if (currentTabContent) {
                currentTabContent.classList.remove(`swipe-out-${direction}`);
            }
            newTabContent.classList.remove(`swipe-in-${direction === 'left' ? 'right' : 'left'}`);
        }, 300);
        
        this.currentTab = index;
        
        // Trigger custom event for other components
        window.dispatchEvent(new CustomEvent('tabChanged', {
            detail: { 
                index: this.currentTab, 
                tabName: newTab.dataset.tab,
                direction: direction
            }
        }));
    }

    setupNavigationToggle() {
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'nav-toggle';
        toggleButton.setAttribute('aria-label', 'Toggle Navigation Position');
        toggleButton.addEventListener('click', () => this.toggleNavigationPosition());
        
        document.body.appendChild(toggleButton);
    }

    toggleNavigationPosition() {
        this.isBottomNav = !this.isBottomNav;
        
        const tabNavigation = document.querySelector('.tab-navigation');
        const mainContent = document.querySelector('.main-content');
        const toggleButton = document.querySelector('.nav-toggle');
        
        if (this.isBottomNav) {
            tabNavigation.classList.add('bottom-nav');
            mainContent.classList.add('bottom-nav-active');
            toggleButton.classList.add('bottom-active');
        } else {
            tabNavigation.classList.remove('bottom-nav');
            mainContent.classList.remove('bottom-nav-active');
            toggleButton.classList.remove('bottom-active');
        }
        
        // Save preference
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

    setupHapticFeedback() {
        // Add haptic feedback to all interactive elements
        const interactiveElements = document.querySelectorAll('.tab-button, .terminal-button, .form-input, .form-select');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                this.triggerHapticFeedback('light');
            }, { passive: true });
        });
    }

    triggerHapticFeedback(intensity = 'light') {
        if (!this.hapticSupported) return;
        
        try {
            let duration;
            switch (intensity) {
                case 'light':
                    duration = 10;
                    break;
                case 'medium':
                    duration = 20;
                    break;
                case 'heavy':
                    duration = 40;
                    break;
                default:
                    duration = 10;
            }
            
            navigator.vibrate(duration);
        } catch (error) {
            console.warn('Haptic feedback not supported:', error);
        }
    }

    handleTabTouchStart(e, index) {
        // Start long press timer
        this.longPressTimer = setTimeout(() => {
            this.handleTabLongPress(index);
        }, this.longPressDelay);
        
        // Add visual feedback
        e.target.classList.add('haptic-feedback');
        setTimeout(() => {
            e.target.classList.remove('haptic-feedback');
        }, 100);
    }

    handleTabTouchEnd(e, index) {
        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    handleTabClick(e, index) {
        e.preventDefault();
        this.switchToTab(index);
        this.triggerHapticFeedback('light');
    }

    handleTabLongPress(index) {
        this.triggerHapticFeedback('heavy');
        
        // Show context menu for tab
        this.showTabContextMenu(index);
        
        console.log(`📱 Long press on tab ${index}`);
    }

    setupLongPress() {
        document.addEventListener('contextmenu', (e) => {
            // Prevent default context menu on mobile
            if (window.innerWidth <= 768) {
                e.preventDefault();
            }
        });
    }

    showTabContextMenu(tabIndex) {
        const tab = this.tabs[tabIndex];
        const tabRect = tab.getBoundingClientRect();
        
        const contextMenu = document.createElement('div');
        contextMenu.className = 'mobile-context-menu';
        
        const menuItems = [
            { icon: '📌', text: 'Pin Tab', action: () => this.pinTab(tabIndex) },
            { icon: '🔄', text: 'Refresh', action: () => this.refreshTab(tabIndex) },
            { icon: '⚙️', text: 'Settings', action: () => this.openTabSettings(tabIndex) }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('button');
            menuItem.className = 'mobile-context-menu-item';
            menuItem.innerHTML = `<span class="icon">${item.icon}</span>${item.text}`;
            menuItem.addEventListener('click', () => {
                item.action();
                this.hideContextMenu();
            });
            contextMenu.appendChild(menuItem);
        });
        
        // Position menu
        contextMenu.style.left = `${tabRect.left}px`;
        contextMenu.style.top = `${tabRect.bottom + 5}px`;
        
        document.body.appendChild(contextMenu);
        
        // Show with animation
        requestAnimationFrame(() => {
            contextMenu.classList.add('show');
        });
        
        // Auto-hide on touch outside
        const hideOnTouch = (e) => {
            if (!contextMenu.contains(e.target)) {
                this.hideContextMenu();
                document.removeEventListener('touchstart', hideOnTouch);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('touchstart', hideOnTouch);
        }, 100);
    }

    hideContextMenu() {
        const contextMenu = document.querySelector('.mobile-context-menu');
        if (contextMenu) {
            contextMenu.classList.remove('show');
            setTimeout(() => {
                if (contextMenu.parentNode) {
                    contextMenu.parentNode.removeChild(contextMenu);
                }
            }, 200);
        }
    }

    pinTab(index) {
        console.log(`📌 Pinning tab ${index}`);
        this.triggerHapticFeedback('medium');
        // Implement pin functionality
    }

    refreshTab(index) {
        console.log(`🔄 Refreshing tab ${index}`);
        this.triggerHapticFeedback('light');
        // Implement refresh functionality
        window.dispatchEvent(new CustomEvent('refreshTab', { detail: { index } }));
    }

    openTabSettings(index) {
        console.log(`⚙️ Opening settings for tab ${index}`);
        this.triggerHapticFeedback('medium');
        // Implement settings functionality
    }

    // Keyboard navigation support
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select')) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.goToPreviousTab();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.goToNextTab();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.switchToTab(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.switchToTab(this.tabs.length - 1);
                    break;
            }
        });
    }

    // Public API methods
    getCurrentTab() {
        return this.currentTab;
    }

    getTabCount() {
        return this.tabs.length;
    }

    isBottomNavigation() {
        return this.isBottomNav;
    }

    // Cleanup method
    destroy() {
        // Remove event listeners and clean up
        const toggleButton = document.querySelector('.nav-toggle');
        if (toggleButton && toggleButton.parentNode) {
            toggleButton.parentNode.removeChild(toggleButton);
        }
        
        this.hideSwipeIndicators();
        this.hideContextMenu();
        
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
        
        console.log('📱 Mobile Navigation Manager destroyed');
    }
}

// Initialize mobile navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on mobile devices
    if (window.innerWidth <= 768) {
        window.mobileNav = new MobileNavigationManager();
    }
});

// Re-initialize on window resize
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !window.mobileNav) {
        window.mobileNav = new MobileNavigationManager();
    } else if (window.innerWidth > 768 && window.mobileNav) {
        window.mobileNav.destroy();
        window.mobileNav = null;
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileNavigationManager;
}
