let CLIENT_SIDE_KAKAO_JS_KEY = null;
let mapInstance = null;
let markerClusterer = null;
let allAnimalsDataFromServer = [];
let currentShelterAnimalsForInfoWindow = {};
let markersOnMap = {};
let mapContainerElement = null;
let listContainerElement = null;
let isLocatorInitialized = false;
let keywordSearchInputRight;
let filterAgeMinSlider, filterAgeMaxSlider, ageMinOutputEl, ageMaxOutputEl;
let filterWeightMinSlider, filterWeightMaxSlider, weightMinOutputEl, weightMaxOutputEl;
const filterSexRadioGroupName = "filterSexRight";
const filterNeuterRadioGroupName = "filterNeuterRight";
let filterProvinceDropdown;
let filterAnimalTypeDropdown;
let filterDateStartInput, filterDateEndInput;
let rightSidebarTitleEl;
let searchFilterFormContainerEl;
let applySearchFiltersBtnEl;
let resetSearchFiltersBtnEl;
let KAKAO_SDK_URL_CLIENT = '';

async function fetchKakaoJsApiKey() {
    if (CLIENT_SIDE_KAKAO_JS_KEY) return CLIENT_SIDE_KAKAO_JS_KEY;
    try {
        const response = await fetch('/api/config/maps-js-key');
        if (!response.ok) {
            throw new Error(`Failed to fetch Kakao JS API Key: ${response.statusText}`);
        }
        const config = await response.json();
        if (config.apiKey) {
            CLIENT_SIDE_KAKAO_JS_KEY = config.apiKey;
            KAKAO_SDK_URL_CLIENT = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${CLIENT_SIDE_KAKAO_JS_KEY}&autoload=false&libraries=services,clusterer`;
            return CLIENT_SIDE_KAKAO_JS_KEY;
        } else {
            throw new Error("Kakao JS API Key not found in server response.");
        }
    } catch (error) {
        console.error("Locator_Client: Error fetching Kakao JS API Key:", error);
        throw error;
    }
}

function loadKakaoMapsSDKClient() {
    return new Promise((resolve, reject) => {
        if (!KAKAO_SDK_URL_CLIENT) {
            reject("Locator_Client: Kakao SDK URL not configured (API Key not fetched).");
            return;
        }
        if (window.kakao && window.kakao.maps && window.kakao.maps.MarkerClusterer && window.kakao.maps.services) {
            window.kakao.maps.load(() => resolve());
            return;
        }
        const script = document.createElement("script");
        script.src = KAKAO_SDK_URL_CLIENT;
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => {
            if (window.kakao && window.kakao.maps) {
                window.kakao.maps.load(() => {
                    setTimeout(() => {
                        if (window.kakao.maps.MarkerClusterer && window.kakao.maps.services && window.kakao.maps.services.Geocoder) {
                            resolve();
                        } else {
                            reject("Kakao MarkerClusterer or Geocoder service not ready.");
                        }
                    }, 150);
                });
            } else {
                reject("Locator_Client: kakao.maps not found after script load.");
            }
        };
        script.onerror = () => reject("Locator_Client: Failed to load Kakao SDK script tag.");
    });
}

async function initializeClientMapAndPlaceMarkers() {
    if (!mapContainerElement) { console.error("Locator_Client: Map container not set."); return; }
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.MarkerClusterer) {
        mapContainerElement.innerHTML = `<p style="color:red;text-align:center;">Map dependencies (SDK/Clusterer) missing.</p>`;
        return;
    }
    const defaultCenter = new window.kakao.maps.LatLng(37.566826, 126.9786567);
    mapInstance = new window.kakao.maps.Map(mapContainerElement, { center: defaultCenter, level: 11 });
    markerClusterer = new window.kakao.maps.MarkerClusterer({
        map: mapInstance,
        averageCenter: true,
        minLevel: 9,
        minClusterSize: 2
    });
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            p => mapInstance.setCenter(new window.kakao.maps.LatLng(p.coords.latitude, p.coords.longitude)),
            null,
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
        );
    }
    if (listContainerElement) listContainerElement.innerHTML = '<p style="text-align:center;padding:20px;">Loading animal and shelter data...</p>';
    try {
        const response = await fetch('/api/animals');
        if (!response.ok) throw new Error(`Failed to fetch animals from server: ${response.statusText} (${response.status})`);
        allAnimalsDataFromServer = await response.json();
        if (listContainerElement) listContainerElement.innerHTML = '';
        if (!allAnimalsDataFromServer || allAnimalsDataFromServer.length === 0) {
            console.warn("Locator_Client: No animal data received from server.");
            if (listContainerElement) listContainerElement.innerHTML = '<p style="text-align:center;padding:20px;">No animal data currently available.</p>';
            return;
        }
        const sheltersForMap = new Map();
        allAnimalsDataFromServer.forEach(animal => {
            if (animal.careRegNo && animal.coords && animal.coords.lat && animal.coords.lng && !sheltersForMap.has(animal.careRegNo)) {
                sheltersForMap.set(animal.careRegNo, {
                    name: animal.careNm,
                    address: animal.careAddr,
                    latlng: new window.kakao.maps.LatLng(animal.coords.lat, animal.coords.lng),
                    careRegNo: animal.careRegNo,
                    tel: animal.careTel
                });
            }
        });
        markerClusterer.clear();
        markersOnMap = {};
        sheltersForMap.forEach(shelterData => {
            placeClientShelterMarker(shelterData.careRegNo, shelterData);
        });
        markerClusterer.redraw();
    } catch (error) {
        console.error("Locator_Client: Error fetching/processing data from server API:", error);
        if (mapContainerElement) mapContainerElement.innerHTML = `<p style="color:red;text-align:center;">Error loading map data: ${error.message}</p>`;
        if (listContainerElement) listContainerElement.innerHTML = `<p style="color:red;text-align:center;">Error loading list data: ${error.message}</p>`;
    }
}

function updateMapMarkers(animalsToDisplay) {
    if (!mapInstance || !markerClusterer) {
        console.warn("Locator_Client: Map or Clusterer not initialized, cannot update markers.");
        return;
    }
    markerClusterer.clear();
    Object.values(markersOnMap).forEach(entry => {
        if (entry.detailInfoWindow && entry.detailInfoWindow.getMap()) {
            entry.detailInfoWindow.close();
        }
    });
    markersOnMap = {};
    const sheltersToDisplayOnMap = new Map();
    animalsToDisplay.forEach(animal => {
        if (animal.careRegNo && animal.coords && typeof animal.coords.lat === 'number' && typeof animal.coords.lng === 'number' && !sheltersToDisplayOnMap.has(animal.careRegNo)) {
            sheltersToDisplayOnMap.set(animal.careRegNo, {
                name: animal.careNm,
                address: animal.careAddr,
                latlng: new window.kakao.maps.LatLng(animal.coords.lat, animal.coords.lng),
                careRegNo: animal.careRegNo,
                tel: animal.careTel
            });
        }
    });

    sheltersToDisplayOnMap.forEach(shelterData => {
        placeClientShelterMarker(shelterData.careRegNo, shelterData);
    });
    markerClusterer.redraw();
}

function placeClientShelterMarker(careRegNo, shelterDataWithCoords) {
    if (!mapInstance || !markerClusterer || !shelterDataWithCoords.latlng || markersOnMap[careRegNo]) {
        return;
    }
    const marker = new window.kakao.maps.Marker({
        position: shelterDataWithCoords.latlng,
        title: shelterDataWithCoords.name,
        clickable: true
    });
    markersOnMap[careRegNo] = { marker: marker, detailInfoWindow: null };
    const simpleInfoWindow = new window.kakao.maps.InfoWindow({
        content: `<div class="mouseover-infowindow-content">${shelterDataWithCoords.name}</div>`,
        removable: true
    });
    const detailInfoWindowContentId = `animal-map-infowindow-${careRegNo}`;
    const detailHTML = `<div class="animal-info-display" id="${detailInfoWindowContentId}" style="width:350px;height:400px;padding:5px;overflow-y:auto;box-sizing:border-box;"><h4>${shelterDataWithCoords.name}</h4><div id="animal-container-${careRegNo}"><p style="text-align:center;padding:20px;">Loading...</p></div></div>`;
    window.kakao.maps.event.addListener(marker, "mouseover", () => {
        if (markersOnMap[careRegNo] && markersOnMap[careRegNo].detailInfoWindow && markersOnMap[careRegNo].detailInfoWindow.getMap()) {
            return;
        }
        if (mapInstance) simpleInfoWindow.open(mapInstance, marker);
    });
    window.kakao.maps.event.addListener(marker, "mouseout", () => simpleInfoWindow.close());
    window.kakao.maps.event.addListener(marker, "click", () => {
        if (mapInstance) {
            simpleInfoWindow.close();
            Object.values(markersOnMap).forEach(entry => {
                if (entry.detailInfoWindow && entry.detailInfoWindow.getMap() && entry.marker !== marker) {
                    entry.detailInfoWindow.close();
                }
            });
            if (!markersOnMap[careRegNo].detailInfoWindow) {
                markersOnMap[careRegNo].detailInfoWindow = new window.kakao.maps.InfoWindow({
                    content: detailHTML,
                    removable: true,
                    zIndex: 15
                });
            }
            const detailClickInfoWindow = markersOnMap[careRegNo].detailInfoWindow;
            detailClickInfoWindow.open(mapInstance, marker);
            const contentTargetDivId = `animal-container-${careRegNo}`;
            const animalsForThisShelter = allAnimalsDataFromServer.filter(a => a.careRegNo === careRegNo);
            currentShelterAnimalsForInfoWindow[careRegNo] = animalsForThisShelter;
            showAnimalListInInfoWindow(animalsForThisShelter, careRegNo, contentTargetDivId);
        }
    });
    window.kakao.maps.event.addListener(mapInstance, 'click', () => {
         Object.values(markersOnMap).forEach(entry => {
            if (entry.detailInfoWindow && entry.detailInfoWindow.getMap()) {
                entry.detailInfoWindow.close();
            }
        });
    });
    markerClusterer.addMarker(marker);
}

function showAnimalListInInfoWindow(items, careRegNo, contentTargetDivId) {
    const container = document.getElementById(contentTargetDivId);
    if (!container) { console.error("Locator_Client: InfoWindow content div not found:", contentTargetDivId); return; }
    container.innerHTML = '';
    container.style.display = 'flex'; container.style.flexWrap = 'wrap';
    container.style.justifyContent = 'flex-start'; container.style.gap = '8px';
    if (!items || items.length === 0) {
        container.innerHTML = '<p style="width:100%;text-align:center;padding:10px;">No animals currently listed for this shelter.</p>';
        return;
    }
    items.forEach(animal => {
        const card = document.createElement("div"); card.className = "animal-card infowindow-card";
        const imgUrl = animal.popfile || './res/pets.png';
        card.innerHTML = `<img src="${imgUrl}" alt="${animal.kindNm || 'N/A'}" onerror="this.src='./res/pets.png';"><div class="animal-card-info"><p class="animal-kind"><strong>${animal.kindNm || 'N/A'}</strong> (${animal.sexCd === "F" ? "♀" : (animal.sexCd === "M" ? "♂" : "N/A")})</p><p class="animal-age">Age: ${animal.age ? animal.age : 'N/A'}</p></div>`;
        card.addEventListener('click', () => showAnimalDetailInInfoWindow(animal, careRegNo, contentTargetDivId));
        container.appendChild(card);
    });
}

function showAnimalDetailInInfoWindow(animalData, careRegNo, contentTargetDivId) {
    const container = document.getElementById(contentTargetDivId);
    if (!container) return;
    container.innerHTML = ''; container.style.display = 'block';
    const imgUrl = animalData.popfile || './res/pets.png';
    const detailHTML = `<button class="back-to-shelter-list-button" data-care-reg-no="${careRegNo}" data-target-div-id="${contentTargetDivId}">Back</button><div class="animal-detail-content"><img src="${imgUrl}" alt="${animalData.kindNm}" onerror="this.src='./res/pets.png';"><h3>${animalData.kindNm || 'N/A'} (${animalData.sexCd === "F" ? "♀" : (animalData.sexCd === "M" ? "♂" : "N/A")})</h3><p><strong>Age:</strong> ${animalData.age ? animalData.age : 'N/A'}</p><p><strong>Weight:</strong> ${animalData.weight||'N/A'}</p><p><strong>Found:</strong> ${animalData.happenPlace||'N/A'}</p><p><strong>Details:</strong> ${animalData.specialMark||'None'}</p><hr><p><strong>Shelter:</strong> ${animalData.careNm||'N/A'}</p><p><strong>Tel:</strong> <a href="tel:${animalData.careTel}">${animalData.careTel||'N/A'}</a></p><p><strong>Address:</strong> ${animalData.careAddr||'N/A'}</p></div>`;
    container.innerHTML = detailHTML;
    const backBtn = container.querySelector('.back-to-shelter-list-button');
    if (backBtn) backBtn.addEventListener('click', () => {
        if (currentShelterAnimalsForInfoWindow[careRegNo]) {
            showAnimalListInInfoWindow(currentShelterAnimalsForInfoWindow[careRegNo], careRegNo, contentTargetDivId);
        } else {
            container.innerHTML = "<p>Could not retrieve shelter animal list. Please close and reopen.</p>";
        }
    });
}

function renderAnimalsInListView(animalsToRender) {
    if (!listContainerElement) {
        console.error("Locator_Client: List container element not found for rendering.");
        return;
    }
    if (listContainerElement.classList.contains('animal-detail-view-container-list')) {
        return;
    }
    listContainerElement.innerHTML = '';
    listContainerElement.className = 'animal-list-view-container';
    listContainerElement.style.display = 'block';
    if (!animalsToRender || animalsToRender.length === 0) {
        listContainerElement.innerHTML = '<p style="text-align:center;padding:20px;">No animals found matching your criteria.</p>';
        return;
    }
    animalsToRender.forEach((animal, index) => {
        if (!animal) {
            console.warn(`Locator_Client: Undefined animal data at index ${index}. Skipping.`);
            return;
        }
        const item = document.createElement("div");
        item.className = "animal-card list-view-item";
        const placeholderImageUrl = '/res/pets.png';
        const imageUrl = animal.popfile || placeholderImageUrl;
        item.innerHTML = `
            <img src="${imageUrl}" alt="${animal.kindNm || 'Animal Photo'}" onerror="this.src='${placeholderImageUrl}'; this.alt='Image not available'; console.warn('Image load error for:', '${imageUrl}', 'Animal NoticeNo:', '${animal.noticeNo}');">
            <div class="animal-card-info">
                <p class="animal-kind"><strong>${animal.kindNm || 'N/A'}</strong> (${animal.sexCd === "F" ? "♀" : (animal.sexCd === "M" ? "♂" : "N/A")})</p>
                <p class="animal-age">Age: ${animal.age ? (animal.age.includes('(년생)') ? animal.age : animal.age) : 'N/A'}</p>
                <p class="animal-location">Found: ${animal.happenPlace || 'N/A'}</p>
                <p class="animal-shelter">Shelter: ${animal.careNm || 'N/A'}</p>
                <p class="animal-tel">Tel: ${animal.careTel || 'N/A'}</p>
            </div>`;

        item.addEventListener('click', () => showAnimalDetailInListView(animal));
        listContainerElement.appendChild(item);
    });
}

function showAnimalDetailInListView(animalData) {
    if (!listContainerElement) return;
    listContainerElement.innerHTML = '';
    listContainerElement.className = 'animal-detail-view-container-list';
    listContainerElement.style.display = 'block';
    const imgUrl = animalData.popfile || './res/pets.png';
    const detailHTML = `<button class="back-to-full-list-button">Back to Full List</button><div class="animal-detail-content"><img src="${imgUrl}" alt="${animalData.kindNm}" onerror="this.src='./res/pets.png';"><h3>${animalData.kindNm || 'N/A'} (${animalData.sexCd === "F" ? "♀" : (animalData.sexCd === "M" ? "♂" : "N/A")})</h3><p><strong>Age:</strong> ${animalData.age ? animalData.age : 'N/A'}</p><p><strong>Weight:</strong> ${animalData.weight||'N/A'}</p><p><strong>Color:</strong> ${animalData.colorCd || 'N/A'}</p><p><strong>Found:</strong> ${animalData.happenPlace||'N/A'}</p><p><strong>Details:</strong> ${animalData.specialMark||'None'}</p><hr><p><strong>Shelter:</strong> ${animalData.careNm||'N/A'}</p><p><strong>Tel:</strong> <a href="tel:${animalData.careTel}">${animalData.careTel||'N/A'}</a></p><p><strong>Address:</strong> ${animalData.careAddr||'N/A'}</p></div>`;
    listContainerElement.innerHTML = detailHTML;
    const backBtn = listContainerElement.querySelector('.back-to-full-list-button');
    if (backBtn) backBtn.addEventListener('click', () => {
        listContainerElement.className = 'animal-list-view-container';
        renderAnimalsInListView(allAnimalsDataFromServer);
    });
}

function buildKeywordSearchUI(container) {
    container.innerHTML = `
        <div class="filter-group">
            <label for="keywordSearchInputRight">Enter Keywords:</label>
            <input type="text" id="keywordSearchInputRight" class="sidebar-input" placeholder="e.g., 푸들, 갈색, 순함">
        </div>`;
    keywordSearchInputRight = document.getElementById("keywordSearchInputRight");
    if (keywordSearchInputRight) keywordSearchInputRight.addEventListener("keydown", (e) => { if (e.key === "Enter") executeClientSearch(); });
}

function buildAdvancedFiltersUI(container) {
    container.innerHTML = `
        <div class="filter-group dual-slider-group">
            <label>Age Range (Years): <span class="range-values"><output id="ageMinOutputRight">0</output> - <output id="ageMaxOutputRight">20</output></span></label>
            <div class="sliders-container">
                <input type="range" id="filterAgeMinRight" class="filter-slider min-slider" min="0" max="20" value="0" step="1">
                <input type="range" id="filterAgeMaxRight" class="filter-slider max-slider" min="0" max="20" value="20" step="1">
            </div>
        </div>
        <div class="filter-group dual-slider-group">
            <label>Weight Range (Kg): <span class="range-values"><output id="weightMinOutputRight">0.0</output> - <output id="weightMaxOutputRight">50.0</output></span></label>
            <div class="sliders-container">
                <input type="range" id="filterWeightMinRight" class="filter-slider min-slider" min="0" max="50" value="0" step="0.1">
                <input type="range" id="filterWeightMaxRight" class="filter-slider max-slider" min="0" max="50" value="50" step="0.1">
            </div>
        </div>
        <div class="filter-group radio-group">
            <span>Sex:</span>
            <input type="radio" id="sexMRight" name="${filterSexRadioGroupName}" value="M"><label for="sexMRight">Male</label>
            <input type="radio" id="sexFRight" name="${filterSexRadioGroupName}" value="F"><label for="sexFRight">Female</label>
        </div>
        <div class="filter-group radio-group">
            <span>Neutered:</span>
            <input type="radio" id="neuterYRight" name="${filterNeuterRadioGroupName}" value="Y"><label for="neuterYRight">Yes</label>
            <input type="radio" id="neuterNRight" name="${filterNeuterRadioGroupName}" value="N"><label for="neuterNRight">No</label>
        </div>
        <div class="filter-group">
            <label for="filterProvinceRight">Province (시도):</label>
            <select id="filterProvinceRight" class="filter-select"><option value="">All Provinces</option></select>
        </div>
        <div class="filter-group">
            <label for="filterAnimalTypeRight">Animal Type:</label>
            <select id="filterAnimalTypeRight" class="filter-select"><option value="">All Types</option></select>
        </div>
        <div class="filter-group">
            <label for="filterDateStartRight">Found Date (Start):</label>
            <input type="date" id="filterDateStartRight" class="sidebar-input">
        </div>
        <div class="filter-group">
            <label for="filterDateEndRight">Found Date (End):</label>
            <input type="date" id="filterDateEndRight" class="sidebar-input">
        </div>`;
    filterAgeMinSlider = document.getElementById("filterAgeMinRight");
    filterAgeMaxSlider = document.getElementById("filterAgeMaxRight");
    ageMinOutputEl = document.getElementById("ageMinOutputRight");
    ageMaxOutputEl = document.getElementById("ageMaxOutputRight");
    filterWeightMinSlider = document.getElementById("filterWeightMinRight");
    filterWeightMaxSlider = document.getElementById("filterWeightMaxRight");
    weightMinOutputEl = document.getElementById("weightMinOutputRight");
    weightMaxOutputEl = document.getElementById("weightMaxOutputRight");
    filterProvinceDropdown = document.getElementById("filterProvinceRight");
    filterAnimalTypeDropdown = document.getElementById("filterAnimalTypeRight");
    filterDateStartInput = document.getElementById("filterDateStartRight");
    filterDateEndInput = document.getElementById("filterDateEndRight");
    setupDualRangeSlider(filterAgeMinSlider, filterAgeMaxSlider, ageMinOutputEl, ageMaxOutputEl, false);
    setupDualRangeSlider(filterWeightMinSlider, filterWeightMaxSlider, weightMinOutputEl, weightMaxOutputEl, true);
    populateFilterDropdownsClient();
}

function setupDualRangeSlider(minSlider, maxSlider, minOutput, maxOutput, isFloat = false) {
    if (!minSlider || !maxSlider || !minOutput || !maxOutput) return;
    const update = () => {
        minOutput.value = isFloat ? parseFloat(minSlider.value).toFixed(1) : minSlider.value;
        maxOutput.value = isFloat ? parseFloat(maxSlider.value).toFixed(1) : maxSlider.value;
    };
    minSlider.addEventListener('input', () => {
        const minV = isFloat ? parseFloat(minSlider.value) : parseInt(minSlider.value);
        const maxV = isFloat ? parseFloat(maxSlider.value) : parseInt(maxSlider.value);
        if (minV > maxV) minSlider.value = maxSlider.value;
        update();
    });
    maxSlider.addEventListener('input', () => {
        const minV = isFloat ? parseFloat(minSlider.value) : parseInt(minSlider.value);
        const maxV = isFloat ? parseFloat(maxSlider.value) : parseInt(maxSlider.value);
        if (maxV < minV) maxSlider.value = minSlider.value;
        update();
    });
    update();
}

async function populateFilterDropdownsClient() {
    const animalTypes = [
        { text: "All Types", value: "" }, { text: "개", value: "개" },
        { text: "고양이", value: "고양이" }, { text: "기타", value: "기타" }
    ];
    if (filterAnimalTypeDropdown) {
        filterAnimalTypeDropdown.innerHTML = '';
        animalTypes.forEach(type => filterAnimalTypeDropdown.add(new Option(type.text, type.value)));
    }
    const provinces = [
        { text: "All Provinces", value: "" }, { text: "서울특별시", value: "서울" },
        { text: "부산광역시", value: "부산" }, { text: "대구광역시", value: "대구" },
        { text: "인천광역시", value: "인천" }, { text: "광주광역시", value: "광주" },
        { text: "대전광역시", value: "대전" }, { text: "울산광역시", value: "울산" },
        { text: "세종특별자치시", value: "세종" }, { text: "경기도", value: "경기" },
        { text: "강원특별자치도", value: "강원" }, { text: "충청북도", value: "충북" },
        { text: "충청남도", value: "충남" }, { text: "전북특별자치도", value: "전북" },
        { text: "전라남도", value: "전남" }, { text: "경상북도", value: "경북" },
        { text: "경상남도", value: "경남" }, { text: "제주특별자치도", value: "제주" }
    ];
    if (filterProvinceDropdown) {
        filterProvinceDropdown.innerHTML = '';
        provinces.forEach(province => filterProvinceDropdown.add(new Option(province.text, province.value)));
    }
}


function getSanitizedAgeYears(ageString) {
    if (!ageString) return null;
    const currentYear = new Date().getFullYear();
    if (ageString.includes("(년생)")) {
        const yearMatch = ageString.match(/(\d{4})/);
        if (yearMatch && yearMatch[1]) {
            const birthYear = parseInt(yearMatch[1], 10);
            const age = currentYear - birthYear;
            return age >= 0 ? age : 0;
        }
    }
    if (ageString.includes("개월") || ageString.includes("일")) {
        return 0;
    }
    const numMatch = ageString.match(/^(\d+)/);
    if (numMatch && numMatch[1]) {
        return parseInt(numMatch[1], 10);
    }
    return null;
}

function getSanitizedWeightKg(weightString) {
    if (!weightString) return null;
    const match = weightString.match(/([\d.]+)/);
    if (match && match[1]) return parseFloat(match[1]);
    return null;
}

export function prepareRightSidebarSearchUI(searchType) {
    if (!rightSidebarTitleEl || !searchFilterFormContainerEl) { return; }
    if (searchType === "keyword") {
        rightSidebarTitleEl.textContent = "Keyword Search";
        buildKeywordSearchUI(searchFilterFormContainerEl);
    } else if (searchType === "advanced") {
        rightSidebarTitleEl.textContent = "Advanced Filters";
        buildAdvancedFiltersUI(searchFilterFormContainerEl);
    } else {
        searchFilterFormContainerEl.innerHTML = '<p>Select a search type.</p>';
    }
}

function setupSearchAndFilters() {
    applySearchFiltersBtnEl = document.getElementById("applySearchFiltersBtn");
    resetSearchFiltersBtnEl = document.getElementById("resetSearchFiltersBtn");
    if (applySearchFiltersBtnEl) applySearchFiltersBtnEl.addEventListener("click", executeClientSearch);
    if (resetSearchFiltersBtnEl) resetSearchFiltersBtnEl.addEventListener("click", resetAllFiltersAndSearch);
}

function executeClientSearch() {
    if (!allAnimalsDataFromServer) { console.warn("No animal data loaded to filter."); return; }
    let isAdvancedUIActive = !!document.getElementById("filterAgeMinRight");
    const keywordTerms = (keywordSearchInputRight && keywordSearchInputRight.offsetParent !== null) ?
        (keywordSearchInputRight.value.trim().toLowerCase() || "").split(/\s+/).filter(term => term) : [];
    const ageMin = isAdvancedUIActive && filterAgeMinSlider ? parseInt(filterAgeMinSlider.value, 10) : 0;
    const ageMax = isAdvancedUIActive && filterAgeMaxSlider ? parseInt(filterAgeMaxSlider.value, 10) : 20;
    const weightMin = isAdvancedUIActive && filterWeightMinSlider ? parseFloat(filterWeightMinSlider.value) : 0;
    const weightMax = isAdvancedUIActive && filterWeightMaxSlider ? parseFloat(filterWeightMaxSlider.value) : 50;
    const selectedSex = isAdvancedUIActive ? (document.querySelector(`input[name="${filterSexRadioGroupName}"]:checked`)?.value || "") : "";
    const selectedNeuter = isAdvancedUIActive ? (document.querySelector(`input[name="${filterNeuterRadioGroupName}"]:checked`)?.value || "") : "";
    const selectedProvinceText = isAdvancedUIActive ? (filterProvinceDropdown?.value || "") : "";
    const selectedAnimalTypeCode = isAdvancedUIActive ? (filterAnimalTypeDropdown?.value || "") : "";
    const startDate = isAdvancedUIActive ? (filterDateStartInput?.value || "") : "";
    const endDate = isAdvancedUIActive ? (filterDateEndInput?.value || "") : "";

    const filteredAnimals = allAnimalsDataFromServer.filter(animal => {
        if (keywordTerms.length > 0) {
            const animalTextData = [
                animal.kindNm, animal.colorCd, animal.happenPlace, animal.specialMark,
                animal.careNm, animal.careAddr, animal.orgNm, animal.noticeNo, animal.desertionNo
            ].filter(Boolean).join(' ').toLowerCase();
            if (!keywordTerms.every(term => animalTextData.includes(term))) {
                return false;
            }
        }
        if (isAdvancedUIActive) {
            const animalAgeYears = getSanitizedAgeYears(animal.age);
            if (animalAgeYears !== null) {
                if (animalAgeYears < ageMin || animalAgeYears > ageMax) return false;
            } else if (ageMin > 0 || ageMax < 20) {
                return false;
            }
            const animalWeightKg = getSanitizedWeightKg(animal.weight);
            if (animalWeightKg !== null) {
                if (animalWeightKg < weightMin || animalWeightKg > weightMax) return false;
            } else if (weightMin > 0 || weightMax < 50) {
                return false;
            }
            if (selectedSex && animal.sexCd !== selectedSex) return false;
            if (selectedNeuter && animal.neuterYn !== selectedNeuter) return false;
            if (selectedProvinceText) {
                const regionTargetText = (animal.careAddr || "").toLowerCase() + " " + (animal.orgNm || "").toLowerCase();
                if (!regionTargetText.includes(selectedProvinceText.toLowerCase())) return false;
            }
            if (selectedAnimalTypeCode && !animal.upKindNm.includes(selectedAnimalTypeCode.toLowerCase())) return false;
            if (startDate && animal.happenDt) {
                if (parseInt(animal.happenDt, 10) < parseInt(startDate.replace(/-/g, ''), 10)) return false;
            }
            if (endDate && animal.happenDt) {
                if (parseInt(animal.happenDt, 10) > parseInt(endDate.replace(/-/g, ''), 10)) return false;
            }
        }
        return true;
    });
    updateMapMarkers(filteredAnimals);
	if (listContainerElement && listContainerElement.style.display === 'block') {
        renderAnimalsInListView(filteredAnimals);
    }
}

function resetAllFiltersAndSearch() {
    if (keywordSearchInputRight) keywordSearchInputRight.value = "";
    if (document.getElementById("filterAgeMinRight")) {
        if (filterAgeMinSlider) { filterAgeMinSlider.value = 0; if (ageMinOutputEl) ageMinOutputEl.value = "0"; }
        if (filterAgeMaxSlider) { filterAgeMaxSlider.value = 20; if (ageMaxOutputEl) ageMaxOutputEl.value = "20"; }
        if (filterWeightMinSlider) { filterWeightMinSlider.value = 0; if (weightMinOutputEl) weightMinOutputEl.value = "0.0"; }
        if (filterWeightMaxSlider) { filterWeightMaxSlider.value = 50; if (weightMaxOutputEl) weightMaxOutputEl.value = "50.0"; }
        document.getElementById("neuterYRight").checked = false;
		document.getElementById("neuterNRight").checked = false;
		document.getElementById("sexMRight").checked = false;
		document.getElementById("sexFRight").checked = false;
        if (filterProvinceDropdown) filterProvinceDropdown.value = "";
        if (filterAnimalTypeDropdown) filterAnimalTypeDropdown.value = "";
        if (filterDateStartInput) filterDateStartInput.value = "";
        if (filterDateEndInput) filterDateEndInput.value = "";
    }
    executeClientSearch();
}

export async function initLocator(mapElementId, listElementId) {
    mapContainerElement = document.getElementById(mapElementId);
    listContainerElement = document.getElementById(listElementId);
	rightSidebarTitleEl = document.getElementById("rightSidebarTitle");
    searchFilterFormContainerEl = document.getElementById("searchFilterFormContainer");

    if (isLocatorInitialized) {
        if (mapInstance && mapContainerElement.style.display !== 'none') mapInstance.relayout();
        return;
    }
    try {
        await fetchKakaoJsApiKey();
        await loadKakaoMapsSDKClient();
        await initializeClientMapAndPlaceMarkers();
        setupSearchAndFilters();
        isLocatorInitialized = true;
    } catch (error) {
        console.error("Locator_Client: Error during module initialization:", error.message || error);
        if(mapContainerElement) mapContainerElement.innerHTML = `<p style="color:red;text-align:center;">Map Error: ${error.message||error}</p>`;
        if(listContainerElement) listContainerElement.innerHTML = `<p style="color:red;text-align:center;">List Error: ${error.message||error}</p>`;
    }
}

export function toggleLocatorView(isCurrentlyMapView) {
    if (!mapContainerElement || !listContainerElement) {
        console.warn("Locator_Client: View elements not set for toggle."); return;
    }
    if (!isLocatorInitialized && !isCurrentlyMapView) {
        renderAnimalsInListView(allAnimalsDataFromServer);
        return;
    }
    if (isCurrentlyMapView) {
        mapContainerElement.style.display = 'block';
        listContainerElement.style.display = 'none';
        if (mapInstance) {
             mapInstance.relayout();
        }
    } else {
        mapContainerElement.style.display = 'none';
        listContainerElement.style.display = 'block';
        if (isLocatorInitialized) {
             executeClientSearch();
        } else {
            listContainerElement.innerHTML = '<p style="text-align:center;padding:20px;">Initializing data for list...</p>';
        }
    }
}