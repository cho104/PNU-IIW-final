import { initQuiz } from './quiz.js';
import { initLocator, toggleLocatorView as locatorModuleToggleView, prepareRightSidebarSearchUI } from './locator.js';
import { initStatisticsPage } from './statistics.js';
import { initAboutPage } from './about.js';

document.addEventListener('DOMContentLoaded', () => {
    const topNavItems = document.querySelectorAll('.main-navigation .nav-item');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const leftSidebar = document.getElementById('leftSidebar');
    const sidebarSections = document.querySelectorAll('.sidebar-nav .sidebar-section');
    const rightSidebar = document.getElementById('rightSidebar'); 
    const closeRightSidebarBtn = document.getElementById('closeRightSidebar');
    const leftSidebarItems = document.querySelectorAll('.left-sidebar .sidebar-item');
    const mapListViewToggleBtn = document.getElementById('mapListViewToggle');
    const welcomeMessage = document.getElementById('welcomeMessage'); 
    const locatorContent = document.getElementById('locatorContent');
    const statisticsContent = document.getElementById('statisticsContent');
    const petQuizContentDiv = document.getElementById('petQuizContent');
    const aboutContent = document.getElementById('aboutContent');
    const allContentSections = document.querySelectorAll('.content-section');
    let currentTopTab = 'locator'; 
    let isLeftSidebarExpanded = false;
    let isMapViewActive = true; 
    let isAboutPageInitialized = false; 
	let isStatisticsPageInitialized = false; 
    
    topNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const newTab = item.dataset.tab;
            const subAction = item.dataset.subAction || 'default'; 
            if (newTab !== currentTopTab || (newTab === 'about' && item.dataset.subAction)) {
                activateTopTab(newTab, item); 
                updateLeftSidebarContent(newTab);
                updateMainDisplayArea(newTab, subAction);
                hideRightSidebar(); 
            } else if (newTab === currentTopTab && newTab !== 'about') {
                updateMainDisplayArea(newTab, 'default');
            }
        });
    });
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (leftSidebar) {
                leftSidebar.classList.toggle('expanded');
                isLeftSidebarExpanded = leftSidebar.classList.contains('expanded');
                const toggleIcon = sidebarToggle.querySelector('.icon');
                if (toggleIcon) {
                    toggleIcon.textContent = isLeftSidebarExpanded ? 'menu_open' : 'menu';
                }
            }
        });
    }

    leftSidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const action = item.dataset.action;
            const searchType = item.dataset.searchType; 
            const parentTab = item.closest('.sidebar-section')?.dataset.navSection;
            const parentSection = item.closest('.sidebar-section');
            if (parentSection) {
                parentSection.querySelectorAll('.sidebar-item').forEach(si => si.classList.remove('active-sub-item'));
            }
            item.classList.add('active-sub-item');
            if (parentTab && parentTab !== currentTopTab) {
                const topNavItemToActivate = document.querySelector(`.main-navigation .nav-item[data-tab="${parentTab}"]`);
                if (topNavItemToActivate) activateTopTab(parentTab, topNavItemToActivate);
                updateLeftSidebarContent(parentTab); 
            }
            if (searchType && currentTopTab === 'locator') {
                if (typeof prepareRightSidebarSearchUI === 'function') {
                    prepareRightSidebarSearchUI(searchType); 
                } else {
                    console.error("prepareRightSidebarSearchUI function not imported from locator.js");
                }
                if (rightSidebar) rightSidebar.classList.add('visible'); 
            } else if (action === 'toggle-advanced-search' && currentTopTab === 'locator') { 
                if (typeof prepareRightSidebarSearchUI === 'function') {
                    prepareRightSidebarSearchUI('advanced');
                }
                if (rightSidebar) rightSidebar.classList.toggle('visible');
            } else if (action === 'toggle-view') {
                if (currentTopTab === 'locator') handleMapViewToggle();
            } else if (action === 'take-quiz') {
                if (currentTopTab === 'statistics') {
                    hideRightSidebar();
                    updateMainDisplayArea('statistics', 'take-quiz'); 
                    initQuiz(); 
                }
            } else if (action === 'project-intro' || action === 'team-intro') {
                if (currentTopTab === 'about') {
                    hideRightSidebar();
                    updateMainDisplayArea('about', action); 
                }
            } else if (action === 'view-stats-overview') { 
                 if (currentTopTab === 'statistics') {
                    hideRightSidebar();
                    updateMainDisplayArea('statistics', 'default'); 
                }
            } else if (action) { 
                hideRightSidebar();
                updateMainDisplayArea(currentTopTab, action);
            }
        });
    });
    if (closeRightSidebarBtn) {
        closeRightSidebarBtn.addEventListener('click', hideRightSidebar);
    }

    function activateTopTab(tabName, clickedTopNavItem = null) {
        topNavItems.forEach(nav => {
            nav.classList.remove('active');
            if (clickedTopNavItem && nav === clickedTopNavItem) {
                nav.classList.add('active');
            } else if (!clickedTopNavItem && nav.dataset.tab === tabName) {
                nav.classList.add('active');
            }
        });
        currentTopTab = tabName;
    }

    function updateLeftSidebarContent(activeTabName) {
        sidebarSections.forEach(section => {
            section.classList.toggle('active-section', section.dataset.navSection === activeTabName);
        });
        leftSidebarItems.forEach(si => si.classList.remove('active-sub-item'));
        if (activeTabName === 'locator') {
            isMapViewActive = true; 
            if (mapListViewToggleBtn) mapListViewToggleBtn.classList.add('active-sub-item'); 
            updateSidebarMapListButton(); 
        } else if (activeTabName === 'about') {
            const projectIntroLink = document.querySelector('.sidebar-item[data-nav-section="about"][data-action="project-intro"]');
            if (projectIntroLink) projectIntroLink.classList.add('active-sub-item');
        } else if (activeTabName === 'statistics') {
            const statsOverviewLink = document.querySelector('.sidebar-item[data-nav-section="statistics"][data-action="view-stats-overview"]');
            if(statsOverviewLink) statsOverviewLink.classList.add('active-sub-item');
        }
    }

    function handleMapViewToggle() {
        isMapViewActive = !isMapViewActive; 
        updateSidebarMapListButton();       
        locatorModuleToggleView(isMapViewActive); 
        if (mapListViewToggleBtn) mapListViewToggleBtn.classList.add('active-sub-item');
    }

    function updateSidebarMapListButton() {
        if (!mapListViewToggleBtn) return;
        const iconElement = mapListViewToggleBtn.querySelector('.icon');
        const textElement = mapListViewToggleBtn.querySelector('.text');
        if (!iconElement || !textElement) return;
        if (isMapViewActive) {
            iconElement.textContent = 'map'; textElement.textContent = 'Map View';
        } else {
            iconElement.textContent = 'list_alt'; 
            textElement.textContent = 'List View';
        }
    }

    function showAboutSubContent(subAction) {
        const projectIntroDiv = document.getElementById('projectIntroContent');
        const teamIntroDiv = document.getElementById('teamIntroContent');
        if (projectIntroDiv) projectIntroDiv.classList.add('hidden');
        if (teamIntroDiv) teamIntroDiv.classList.add('hidden');
        if (subAction === 'project-intro' || subAction === 'default') {
            if (projectIntroDiv) projectIntroDiv.classList.remove('hidden');
        } else if (subAction === 'team-intro') {
            if (teamIntroDiv) teamIntroDiv.classList.remove('hidden');
        }
    }

    function updateMainDisplayArea(tab, subAction = 'default', customMessage = '') {
        allContentSections.forEach(sec => { if (sec) sec.classList.add('hidden'); });
        switch (tab) {
            case 'locator':
                if (locatorContent) {
                    locatorContent.classList.remove('hidden');
                    initLocator('map', 'listDisplayArea'); 
                    locatorModuleToggleView(isMapViewActive); 
                }
                break;
            case 'statistics':
                if (statisticsContent) {
                    statisticsContent.classList.remove('hidden');
                    statisticsContent.querySelectorAll('.sub-content').forEach(sc => { if (sc) sc.classList.add('hidden'); });
                    if (subAction === 'take-quiz') {
                        if (petQuizContentDiv) petQuizContentDiv.classList.remove('hidden');
                        initQuiz(); 
                    } else { 
                        const statsOverviewDiv = document.getElementById('statsOverviewContent');
                        if (statsOverviewDiv) statsOverviewDiv.classList.remove('hidden');
                        if (!isStatisticsPageInitialized) {
                            initStatisticsPage().then(() => { 
                                isStatisticsPageInitialized = true;
                            }).catch(err => {
                                console.error("Failed to initialize Statistics Page:", err);
                                if (statsOverviewDiv) statsOverviewDiv.innerHTML = `<p style="color:red;text-align:center;">Could not load statistics.</p>`;
                            });
                        }
                    }
                }
                break;
            case 'about':
                if (aboutContent) {
                    aboutContent.classList.remove('hidden');
                    if (!isAboutPageInitialized) {
                        initAboutPage().then(() => { 
                            isAboutPageInitialized = true;
                            showAboutSubContent(subAction);
                        }).catch(err => {
                            console.error("Failed to initialize About Page on first load:", err);
                            if(aboutContent) aboutContent.innerHTML = `<p style="color:red;text-align:center;">Could not load About information.</p>`;
                        });
                    } else {
                        showAboutSubContent(subAction); 
                    }
                }
                break;
            default:
                if (welcomeMessage) welcomeMessage.classList.remove('hidden');
        }
    }

	function hideRightSidebar() {
		if (rightSidebar) {
			rightSidebar.classList.remove('visible');
		}
	}

    function initializeApp() {
        if (!sidebarToggle || !leftSidebar) {
            console.error("Essential sidebar elements not found during initialization.");
            return;
        }
        activateTopTab(currentTopTab);
        updateLeftSidebarContent(currentTopTab);
        updateMainDisplayArea(currentTopTab, 'default');
        const initialToggleIcon = sidebarToggle.querySelector('.icon');
        if (initialToggleIcon) {
            if (leftSidebar.classList.contains('expanded')) {
                isLeftSidebarExpanded = true;
                initialToggleIcon.textContent = 'menu_open';
            } else {
                isLeftSidebarExpanded = false;
                initialToggleIcon.textContent = 'menu';
            }
        }
    }
    initializeApp();
});