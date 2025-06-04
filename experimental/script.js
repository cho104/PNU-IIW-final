import { initQuiz } from './quiz.js';
import { initLocator, toggleLocatorView as locatorModuleToggleView } from './locator.js';
document.addEventListener('DOMContentLoaded', () => {
	const topNavItems = document.querySelectorAll('.main-navigation .nav-item');
	const sidebarToggle = document.getElementById('sidebarToggle');
	const leftSidebar = document.getElementById('leftSidebar');
	const sidebarSections = document.querySelectorAll('.sidebar-nav .sidebar-section');
	const rightSidebar = document.getElementById('rightSidebar');
	const closeRightSidebarBtn = document.getElementById('closeRightSidebar');
	const leftSidebarItems = document.querySelectorAll('.left-sidebar .sidebar-item');
	const mapListViewToggleBtn = document.getElementById('mapListViewToggle');
	const polygonSearchItem = document.getElementById('polygonSearchItem');
	const welcomeMessage = document.getElementById('welcomeMessage');
	const locatorContent = document.getElementById('locatorContent');
	const statisticsContent = document.getElementById('statisticsContent');
	const petQuizContentDiv = document.getElementById('petQuizContent');
	const aboutContent = document.getElementById('aboutContent');
	const allContentSections = document.querySelectorAll('.content-section');
	let currentTopTab = 'locator';
	let isLeftSidebarExpanded = false;
	let isMapViewActive = true;

	topNavItems.forEach(item => {
		item.addEventListener('click', (e) => {
			e.preventDefault();
			const newTab = item.dataset.tab;
			if (newTab !== currentTopTab) {
				activateTopTab(newTab);
				updateLeftSidebarContent(newTab);
				updateMainDisplayArea(newTab, 'default');
				hideRightSidebar();
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
			const parentSection = item.closest('.sidebar-section');
			if (parentSection) {
				parentSection.querySelectorAll('.sidebar-item').forEach(si => si.classList.remove('active-sub-item'));
			}
			item.classList.add('active-sub-item');
			if (searchType) {
				showRightSidebar(searchType);
			} else if (action === 'toggle-view') {
				handleMapViewToggle();
			} else if (action === 'take-quiz') {
				hideRightSidebar();
				updateMainDisplayArea(currentTopTab, action);
				initQuiz();
			} else if (action) {
				hideRightSidebar();
				updateMainDisplayArea(currentTopTab, action);
			}
		});
	});

	if (closeRightSidebarBtn) {
		closeRightSidebarBtn.addEventListener('click', hideRightSidebar);
	}

	function activateTopTab(tabName) {
		topNavItems.forEach(nav => nav.classList.toggle('active', nav.dataset.tab === tabName));
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
		}
	}

	function handleMapViewToggle() {
		isMapViewActive = !isMapViewActive;
		updateSidebarMapListButton();
		locatorModuleToggleView(isMapViewActive);
		if (mapListViewToggleBtn) {
			mapListViewToggleBtn.classList.add('active-sub-item');
		}
	}

	function updateSidebarMapListButton() {
		if (!mapListViewToggleBtn || !polygonSearchItem) return;
		const iconElement = mapListViewToggleBtn.querySelector('.icon');
		const textElement = mapListViewToggleBtn.querySelector('.text');
		if (!iconElement || !textElement) return;
		if (isMapViewActive) {
			iconElement.textContent = 'map';
			textElement.textContent = 'Map View';
			polygonSearchItem.classList.remove('hidden');
		} else {
			iconElement.textContent = 'list';
			textElement.textContent = 'List View';
			polygonSearchItem.classList.add('hidden');
		}
	}

	function updateMainDisplayArea(tab, subAction = 'default', customMessage = '') {
		allContentSections.forEach(sec => {
			if (sec) sec.classList.add('hidden');
		});
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
					statisticsContent.querySelectorAll('.sub-content').forEach(sc => {
						if (sc) sc.classList.add('hidden');
					});

					if (subAction === 'view-stats-overview' || subAction === 'default') {
						const statsOverview = document.getElementById('statsOverviewContent');
						if (statsOverview) statsOverview.classList.remove('hidden');
					} else if (subAction === 'take-quiz') {
						if (petQuizContentDiv) petQuizContentDiv.classList.remove('hidden');

					}
				}
				break;
			case 'about':
				if (aboutContent) {
					aboutContent.classList.remove('hidden');
					aboutContent.querySelectorAll('.sub-content').forEach(sc => {
						if (sc) sc.classList.add('hidden');
					});
					if (subAction === 'project-intro' || subAction === 'default') {
						const projectIntro = document.getElementById('projectIntroContent');
						if (projectIntro) projectIntro.classList.remove('hidden');
					} else if (subAction === 'team-intro') {
						const teamIntro = document.getElementById('teamIntroContent');
						if (teamIntro) teamIntro.classList.remove('hidden');
					}
				}
				break;
			default:
				if (welcomeMessage) welcomeMessage.classList.remove('hidden');
		}
	}

	function showRightSidebar(searchType) {
		if (!rightSidebar) return;
		const rightSidebarContent = document.getElementById('rightSidebarContent');
		if (!rightSidebarContent) return;
		rightSidebarContent.innerHTML = `<h3>${searchType.replace(/-/g, ' ')} Search Options</h3>
                                         <p>Configure your ${searchType.replace(/-/g, ' ')} search.</p>
                                         <!-- Placeholder for actual search form elements -->`;
		rightSidebar.classList.add('visible');
	}

	function hideRightSidebar() {
		if (rightSidebar) rightSidebar.classList.remove('visible');
	}

	function initializeApp() {
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