const KAKAO_API_KEY = "3ecd626688acd45e537ce0e9661a03fb";
const ANIMAL_DATA_SERVICE_KEY = "kiAqpFideFu9xtkSE7%2Fl33OF9EhqqzmFBMtu8PMLToVqIfRk6DcPqEFPsd1GfyA%2B6hbyLxwcznjM5NOTrIL92Q%3D%3D";
let mapInstance = null;
let geocoder = null;
let uniqueSheltersCache = {};
let currentShelterAnimalsCache = {};
let allAnimalsForListCache = [];
let markersOnMap = {};
let mapContainerElement = null;
let listContainerElement = null;
let isLocatorInitialized = false;
const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&autoload=false`;

function loadKakaoMapsSDK() {
    return new Promise((resolve, reject) => {
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
            window.kakao.maps.load(() => resolve()); return;
        }
        if (window.kakao && window.kakao.maps && !window.kakao.maps.services) {
            window.kakao.maps.load(() => { setTimeout(() => { window.kakao.maps.services ? resolve() : reject("Services not ready after load+delay."); }, 100); }); return;
        }
        const script = document.createElement("script");
        script.src = KAKAO_SDK_URL; script.async = true; document.head.appendChild(script);
        script.onload = () => {
            if (window.kakao && window.kakao.maps) {
                window.kakao.maps.load(() => { setTimeout(() => { (window.kakao.maps.services && window.kakao.maps.services.Geocoder) ? resolve() : reject("Geocoder not ready after load+delay."); }, 100); });
            } else { reject("kakao.maps not found after script load."); }
        };
        script.onerror = () => reject("Failed to load Kakao SDK script tag.");
    });
}
async function initializeMapAndDiscoverShelters() {
    if (!mapContainerElement) { return; }
    if (!window.kakao || !window.kakao.maps || !geocoder) {
        mapContainerElement.innerHTML = ` < p style = "color:red;text-align:center;" > Map dependencies missing. < /p>`; return;
    }

    const defaultCenter = new window.kakao.maps.LatLng(37.566826, 126.9786567);
    mapInstance = new window.kakao.maps.Map(mapContainerElement, {
        center: defaultCenter,
        level: 10
    });
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(p => mapInstance.setCenter(new window.kakao.maps.LatLng(p.coords.latitude, p.coords.longitude)), null, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 0
        });
    }

    if (listContainerElement) listContainerElement.innerHTML = '<p style="text-align:center;padding:20px;">Discovering shelters & animals...</p>';
    const initialAnimals = await fetchInitialAnimalBatch();
    allAnimalsForListCache = initialAnimals;
    if (initialAnimals.length === 0) {
        if (listContainerElement) listContainerElement.innerHTML = '<p>No animal data found.</p>';
        return;
    }

    await processAnimalsToFindAndMarkShelters(initialAnimals);
}

async function fetchInitialAnimalBatch(page = 10, rows = 1000) {
	const baseUrl = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
	const endDate = new Date();
	const beginDate = new Date();
	beginDate.setDate(endDate.getDate() - 14);
	const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
	const params = new URLSearchParams({
		serviceKey: decodeURIComponent(ANIMAL_DATA_SERVICE_KEY),
		pageNo: page,
		numOfRows: rows,
		_type: "json",
	});
	try {
		const r = await fetch(`${baseUrl}?${params.toString()}`);
		if (!r.ok) throw new Error(`Initial animal fetch HTTP error: ${r.status}`);
		const d = await r.json();
		return d.response?.body?.items?.item ? (Array.isArray(d.response.body.items.item) ? d.response.body.items.item : [d.response.body.items.item]) : [];
	} catch (e) {
		return [];
	}
}

async function processAnimalsToFindAndMarkShelters(animals) {
	const sheltersToProcess = new Map();
	animals.forEach(animal => {
		if (animal.careRegNo && animal.careAddr && animal.careNm) {
			if (!sheltersToProcess.has(animal.careRegNo)) {
				sheltersToProcess.set(animal.careRegNo, {
					name: animal.careNm,
					address: animal.careAddr,
					initialAnimals: []
				});
			}
			sheltersToProcess.get(animal.careRegNo).initialAnimals.push(animal);
		}
	});
	for (const [careRegNo, shelterApiData] of sheltersToProcess) {
		currentShelterAnimalsCache[careRegNo] = shelterApiData.initialAnimals;
		if (uniqueSheltersCache[careRegNo]?.latlng) {
			placeShelterMarker(careRegNo, uniqueSheltersCache[careRegNo]);
			continue;
		}
		try {
			const coords = await geocodeAddress(shelterApiData.address);
			if (coords) {
				const geocodedShelterInfo = {
					name: shelterApiData.name,
					address: shelterApiData.address,
					latlng: coords,
					careRegNo: careRegNo
				};
				uniqueSheltersCache[careRegNo] = geocodedShelterInfo;
				placeShelterMarker(careRegNo, geocodedShelterInfo);
			}
		} catch (error) {}
	}
}

function geocodeAddress(address) {
	return new Promise((resolve) => {
		if (!geocoder) {
			resolve(null);
			return;
		}
		geocoder.addressSearch(address, (result, status) => {
			if (status === window.kakao.maps.services.Status.OK && result[0]) {
				resolve(new window.kakao.maps.LatLng(result[0].y, result[0].x));
			} else {
				resolve(null);
			}
		});
	});
}

function placeShelterMarker(careRegNo, shelterDataWithLatLng) {
	if (!mapInstance || !shelterDataWithLatLng.latlng || markersOnMap[careRegNo]) return;
	const marker = new window.kakao.maps.Marker({
		map: mapInstance,
		position: shelterDataWithLatLng.latlng,
		title: shelterDataWithLatLng.name,
		clickable: true
	});
	markersOnMap[careRegNo] = marker;
	const simpleInfoWindow = new window.kakao.maps.InfoWindow({
        content: `<div class="mouseover-infowindow-content">${shelterDataWithLatLng.name}</div>`,
        removable: true
    });
	const detailInfoWindowContentId = `animal-map-infowindow-${careRegNo}`;
	const detailHTML = `<div class="animal-info-display" id="${detailInfoWindowContentId}" style="width:350px;height:400px;padding:5px;overflow-y:auto;box-sizing:border-box;"><h4>${shelterDataWithLatLng.name}</h4><div id="animal-container-${careRegNo}"><p style="text-align:center;padding:20px;">Loading...</p></div></div>`;
	const detailClickInfoWindow = new window.kakao.maps.InfoWindow({
		content: detailHTML,
		removable: true
	});
	window.kakao.maps.event.addListener(marker, "mouseover", makeOverListener(marker, simpleInfoWindow));
	window.kakao.maps.event.addListener(marker, "mouseout", makeOutListener(simpleInfoWindow));
	window.kakao.maps.event.addListener(marker, "click", makeClickListener(marker, simpleInfoWindow, detailClickInfoWindow, careRegNo));
	window.kakao.maps.event.addListener(mapInstance, 'click', () => {
		if (detailClickInfoWindow.getMap()) detailClickInfoWindow.close();
	});
}

function makeOverListener(marker, infowindow) {
	return () => {
		if (mapInstance) infowindow.open(mapInstance, marker);
	};
}

function makeOutListener(infowindow) {
	return () => infowindow.close();
}

function makeClickListener(marker, simpleInfowindow, detailClickInfoWindow, careRegNo) {
	return async () => {
		if (mapInstance) {
			simpleInfowindow.close();
			detailClickInfoWindow.open(mapInstance, marker);
			const contentTargetDivId = `animal-container-${careRegNo}`;
			const loadingContainer = document.getElementById(contentTargetDivId);
			if (currentShelterAnimalsCache[careRegNo]?.length > 0) {
				showAnimalListInInfoWindow(currentShelterAnimalsCache[careRegNo], careRegNo, contentTargetDivId);
			} else {
				if (loadingContainer) loadingContainer.innerHTML = '<p style="text-align:center;padding:20px;">Fetching animals for shelter...</p>';
				const items = await fetchAnimalsForShelterAPI(careRegNo);
				currentShelterAnimalsCache[careRegNo] = items;
				showAnimalListInInfoWindow(items, careRegNo, contentTargetDivId);
			}
		}
	};
}

async function fetchAnimalsForShelterAPI(careRegNo) {
	const baseUrl = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
	const params = new URLSearchParams({
		serviceKey: decodeURIComponent(ANIMAL_DATA_SERVICE_KEY),
		care_reg_no: careRegNo,
		state: 'notice',
		pageNo: 1,
		numOfRows: 12,
		_type: "json"
	});
	try {
		const r = await fetch(`${baseUrl}?${params.toString()}`);
		if (!r.ok) throw new Error(`Shelter API HTTP error: ${r.status}`);
		const d = await r.json();
		return d.response?.body?.items?.item ? (Array.isArray(d.response.body.items.item) ? d.response.body.items.item : [d.response.body.items.item]) : [];
	} catch (e) {
		return [];
	}
}

function showAnimalListInInfoWindow(items, careRegNo, contentTargetDivId) {
	const container = document.getElementById(contentTargetDivId);
	if (!container) {
		return;
	}
	container.innerHTML = '';
	container.style.display = 'flex';
	container.style.flexWrap = 'wrap';
	container.style.justifyContent = 'flex-start';
	container.style.gap = '8px';
	if (!items || items.length === 0) {
		container.innerHTML = '<p style="width:100%;text-align:center;padding:10px;">No current animals found.</p>';
		return;
	}
	items.forEach(animal => {
		const card = document.createElement("div");
		card.className = "animal-card infowindow-card";
		const imgUrl = animal.popfile || animal.popfile1 || './res/pets.png';
		card.innerHTML = `<img src="${imgUrl}" alt="${animal.kindNm || 'N/A'}" onerror="this.src='./res/pets.png';"><div class="animal-card-info"><p class="animal-kind"><strong>${animal.kindNm || 'N/A'}</strong> (${animal.sexCd === "F" ? "♀" : (animal.sexCd === "M" ? "♂" : "N/A")})</p><p class="animal-age">Age: ${animal.age ? animal.age : 'N/A'}</p></div>`;
		card.addEventListener('click', () => showAnimalDetailInInfoWindow(animal, careRegNo, contentTargetDivId));
		container.appendChild(card);
	});
}

function showAnimalDetailInInfoWindow(animalData, careRegNo, contentTargetDivId) {
	const container = document.getElementById(contentTargetDivId);
	if (!container) return;
	container.innerHTML = '';
	container.style.display = 'block';
	const imgUrl = animalData.popfile || animalData.popfile1 || './res/pets.png';
	const detailHTML = `<button class="back-to-shelter-list-button" data-care-reg-no="${careRegNo}" data-target-div-id="${contentTargetDivId}">Back</button><div class="animal-detail-content"><img src="${imgUrl}" alt="${animalData.kindNm}" onerror="this.src='./res/pets.png';"><h3>${animalData.kindNm || 'N/A'} (${animalData.sexCd === "F" ? "♀" : (animalData.sexCd === "M" ? "♂" : "N/A")})</h3><p><strong>Age:</strong> ${animalData.age ? animalData.age : 'N/A'}</p><p><strong>Weight:</strong> ${animalData.weight||'N/A'}</p><p><strong>Found:</strong> ${animalData.happenPlace||'N/A'}</p><p><strong>Details:</strong> ${animalData.specialMark||'None'}</p><hr><p><strong>Shelter:</strong> ${animalData.careNm||'N/A'}</p><p><strong>Tel:</strong> <a href="tel:${animalData.careTel}">${animalData.careTel||'N/A'}</a></p></div>`;
	container.innerHTML = detailHTML;
	const backBtn = container.querySelector('.back-to-shelter-list-button');
	if (backBtn) backBtn.addEventListener('click', async () => {
		if (currentShelterAnimalsCache[careRegNo]) {
			showAnimalListInInfoWindow(currentShelterAnimalsCache[careRegNo], careRegNo, contentTargetDivId);
		} else {
			const items = await fetchAnimalsForShelterAPI(careRegNo);
			currentShelterAnimalsCache[careRegNo] = items;
			showAnimalListInInfoWindow(items, careRegNo, contentTargetDivId);
		}
	});
}

function renderAnimalsInListView(animalsToRender) {
	if (!listContainerElement || listContainerElement.classList.contains('animal-detail-view-container-list')) return;
	listContainerElement.innerHTML = '';
	listContainerElement.className = 'animal-list-view-container';
	listContainerElement.style.display = 'block';
	if (!animalsToRender || animalsToRender.length === 0) {
		listContainerElement.innerHTML = '<p style="text-align:center;padding:20px;">No animals found.</p>';
		return;
	}
	animalsToRender.forEach(animal => {
		const item = document.createElement("div");
		item.className = "animal-card list-view-item";
		const imgUrl = animal.popfile || animal.popfile1 || './res/pets.png';
		item.innerHTML = `<img src="${imgUrl}" alt="${animal.kindNm||'N/A'}" onerror="this.src='./res/pets.png';"><div class="animal-card-info"><p class="animal-kind"><strong>${animal.kindNm||'N/A'}</strong> (${animal.sexCd === "F" ? "♀" : (animal.sexCd === "M" ? "♂" : "N/A")})</p><p class="animal-age">Age: ${animal.age ? animal.age : 'N/A'}</p><p class="animal-location">Found: ${animal.happenPlace||'N/A'}</p><p class="animal-shelter">Shelter: ${animal.careNm||'N/A'}</p></div>`;
		item.addEventListener('click', () => showAnimalDetailInListView(animal));
		listContainerElement.appendChild(item);
	});
}

function showAnimalDetailInListView(animalData) {
	if (!listContainerElement) return;
	listContainerElement.innerHTML = '';
	listContainerElement.className = 'animal-detail-view-container-list';
	listContainerElement.style.display = 'block';
	const imgUrl = animalData.popfile || animalData.popfile1 || './res/pets.png';
	const detailHTML = `<button class="back-to-full-list-button">Back to Full List</button><div class="animal-detail-content"><img src="${imgUrl}" alt="${animalData.kindNm}" onerror="this.src='./res/pets.png';"><h3>${animalData.kindNm || 'N/A'} (${animalData.sexCd === "F" ? "♀" : (animalData.sexCd === "M" ? "♂" : "N/A")})</h3><p><strong>Age:</strong> ${animalData.age ? animalData.age : 'N/A'}</p><p><strong>Weight:</strong> ${animalData.weight||'N/A'}</p><p><strong>Found:</strong> ${animalData.happenPlace||'N/A'}</p><p><strong>Details:</strong> ${animalData.specialMark||'None'}</p><hr><p><strong>Shelter:</strong> ${animalData.careNm||'N/A'}</p><p><strong>Tel:</strong> <a href="tel:${animalData.careTel}">${animalData.careTel||'N/A'}</a></p><p><strong>Address:</strong> ${animalData.careAddr||'N/A'}</p></div>`;
	listContainerElement.innerHTML = detailHTML;
	const backBtn = listContainerElement.querySelector('.back-to-full-list-button');
	if (backBtn) backBtn.addEventListener('click', () => {
		listContainerElement.className = 'animal-list-view-container';
		renderAnimalsInListView(allAnimalsForListCache);
	});
}

function setupSearchAndFilters() {
	const searchInput = document.getElementById("searchInput");
	const searchButton = document.getElementById("searchButton");
	const filterOptionsContainer = document.getElementById("filterOptionsContainer");
	if (filterOptionsContainer) createFilterOptions(filterOptionsContainer);
	if (searchInput) searchInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter") executeSearch();
	});
	if (searchButton) searchButton.addEventListener("click", executeSearch);
	if (filterOptionsContainer) {
		filterOptionsContainer.addEventListener('change', (e) => {
			if (e.target.tagName === 'SELECT' && e.target.classList.contains('filter-select')) executeSearch();
		});
	}
}
async function createFilterOptions(container) {
	if (!container || container.children.length > 0) return;
	try {
		const response = await fetch('options.json');
		if (!response.ok) throw new Error(`Failed options.json: ${response.statusText}`);
		const filterData = await response.json();
		for (const key in filterData) {
			const selectWrapper = document.createElement('div');
			selectWrapper.className = 'filter-group';
			const label = document.createElement('label');
			label.htmlFor = `filter-${key}`;
			label.textContent = key.charAt(0).toUpperCase() + key.slice(1) + ':';
			const selectEl = createSelectElement(key, filterData[key]);
			selectWrapper.appendChild(label);
			selectWrapper.appendChild(selectEl);
			container.appendChild(selectWrapper);
		}
	} catch (error) {
	}
}

function createSelectElement(idKey, optionsData) {
	const select = document.createElement("select");
	select.id = `filter-${idKey}`;
	select.classList.add("filter-select");
	select.name = idKey;
	optionsData.forEach(optionPair => {
		const option = document.createElement("option");
		option.value = optionPair[1] === undefined ? optionPair[0] : optionPair[1];
		option.textContent = optionPair[0];
		select.appendChild(option);
	});
	return select;
}

function executeSearch() {
	if (!listContainerElement) return;
	const searchInputVal = document.getElementById("searchInput")?.value.toLowerCase() || "";
	const regionVal = document.getElementById("filter-region")?.value || "";
	const upkindVal = document.getElementById("filter-upkind")?.value || "";
	const sexVal = document.getElementById("filter-sex")?.value || "";
	const filteredAnimals = allAnimalsForListCache.filter(animal => {
		const textMatch = searchInputVal ? (
			(animal.kindNm?.toLowerCase().includes(searchInputVal)) ||
			(animal.happenPlace?.toLowerCase().includes(searchInputVal)) ||
			(animal.specialMark?.toLowerCase().includes(searchInputVal)) ||
			(animal.careNm?.toLowerCase().includes(searchInputVal))
		) : true;
		const regionMatch = regionVal ? (animal.orgNm?.includes(regionVal)) : true;
		const typeMatch = upkindVal ? (animal.upkindCd === upkindVal) : true;
		const sexMatch = sexVal ? (animal.sexCd === sexVal) : true;
		return textMatch && regionMatch && typeMatch && sexMatch;
	});
	renderAnimalsInListView(filteredAnimals);
}

export async function initLocator(mapElementId, listElementId) {
	mapContainerElement = document.getElementById(mapElementId);
	listContainerElement = document.getElementById(listElementId);
	if (!mapContainerElement) {
		return;
	}
	if (!listContainerElement) {
		return;
	}
	if (isLocatorInitialized) {
		if (mapInstance && mapContainerElement.style.display !== 'none') mapInstance.relayout();
		return;
	}
	try {
		await loadKakaoMapsSDK();
		if (window.kakao?.maps?.services?.Geocoder) {
			geocoder = new window.kakao.maps.services.Geocoder();
		} else {
			throw new Error("Kakao Geocoder service unavailable after SDK load.");
		}
		await initializeMapAndDiscoverShelters();
		setupSearchAndFilters();
		isLocatorInitialized = true;
	} catch (error) {
		if (mapContainerElement) mapContainerElement.innerHTML = `<p style="color:red;text-align:center;">Map Error: ${error.message||error}</p>`;
		if (listContainerElement) listContainerElement.innerHTML = `<p style="color:red;text-align:center;">List Error: ${error.message||error}</p>`;
	}
}

export function toggleLocatorView(isMapView) {
	if (!mapContainerElement || !listContainerElement) {
		return;
	}
	if (!isLocatorInitialized && !isMapView) {
		renderAnimalsInListView(allAnimalsForListCache);
	}
	if (isMapView) {
		mapContainerElement.style.display = 'block';
		listContainerElement.style.display = 'none';
		if (mapInstance) {
			mapInstance.relayout();
		}
	} else {
		mapContainerElement.style.display = 'none';
		listContainerElement.style.display = 'block';
		renderAnimalsInListView(allAnimalsForListCache);
	}
}