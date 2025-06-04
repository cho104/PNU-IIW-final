import config from "./apikeys.js";

const kakaoApiKey = config.kakaoMapKey;
const animaldataServiceKey = config.animaldataServiceKey;

const script = document.createElement("script");
script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&autoload=false`;
document.head.appendChild(script);

script.onload = () => {
    if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
            setTimeout(() => {
                initializeMapAndMarkers();
            }, 100);
        });
    } else {
        console.error("Kakao Maps SDK가 로드되지 않았거나 kakao.maps 객체가 준비되지 않았습니다.");
    }
};

function initializeMapAndMarkers() {
    // Kakao 맵 초기화
    var container = document.getElementById("map");
    var options = {
        center: new kakao.maps.LatLng(33.450701, 126.570667),
        level: 2
    };
    var map = new kakao.maps.Map(container, options);

    // HTML5의 geolocation으로 현위치 표시
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude,
                lon = position.coords.longitude;

            var locPosition = new kakao.maps.LatLng(lat, lon),
                message = "<div style='padding:5px;'>현위치</div>";

            displayMarker(map, locPosition, message);
        });
    } else {
        var locPosition = new kakao.maps.LatLng(33.450701, 126.570667),
            message = "geolocation을 사용할 수 없어요..";

        displayMarker(map, locPosition, message);
    }

    fetch("positions.json")
        .then(response => response.json())
        .then(data => {
            var commonSettings = data.commonSettings;
            var positions = data.positions;

            positions.forEach(position => {
                var marker = new kakao.maps.Marker({
                    map: map,
                    clickable: true,
                    position: new kakao.maps.LatLng(position.latlng[0], position.latlng[1])
                });

                var infowindow = new kakao.maps.InfoWindow({
                    content: position.content
                });

                var divHTML = `
                <div class="animal-info-display" id="animal-container-${position.shelno}">
                    <p style="text-align: center; width: 100%; padding: 20px;">정보를 불러오는 중...</p>
                </div>
                `;

                var clickinfo = new kakao.maps.InfoWindow({
                    content: divHTML,
                });

                kakao.maps.event.addListener(marker, "mouseover", makeOverListener(map, marker, infowindow));
                kakao.maps.event.addListener(marker, "mouseout", makeOutListener(infowindow));
                kakao.maps.event.addListener(marker, "click", makeClickListener(map, marker, infowindow, clickinfo, position.shelno));
                kakao.maps.event.addListener(map, "click", function(mouseEvent) {
                    clickinfo.close();
                });
            });
        })
        .catch(error => console.error("JSON 데이터를 불러오는 중 오류 발생:", error));
}

function displayMarker(mapInstance, locPosition, message) {
    var marker = new kakao.maps.Marker({
        map: mapInstance,
        position: locPosition
    });

    var infowindow = new kakao.maps.InfoWindow({
        content: message,
        removable: true
    });

    infowindow.open(mapInstance, marker);
    mapInstance.setCenter(locPosition);
}

function makeOutListener(infowindow) {
    return function() {
        infowindow.close();
    };
}

function makeOverListener(mapInstance, marker, infowindow) {
    return function() {
        infowindow.open(mapInstance, marker);
    };
}

function makeClickListener(mapInstance, marker, infowindow, clickinfo, shelno) {
    return function() {
        infowindow.close();
        clickinfo.open(mapInstance, marker);

        if (currentShelterAnimals[shelno]) {
            showAnimalListInCardContainer(currentShelterAnimals[shelno], shelno);
        } else {
            fetchAnimalData(shelno);
        }
    };
}

let currentShelterAnimals = {};

// 유기동물 정보
async function fetchAnimalData(careRegNo) {
    const url = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
    const serviceKey = config.animaldataServiceKey;

    const params = new URLSearchParams({
        serviceKey: serviceKey,
        care_reg_no: careRegNo,
        numOfRows: 12,
        pageNo: 1,
        _type: "json"
    });

    try {
        const response = await fetch(url + "?" + params.toString());
        const data = await response.json();

        if (data.response && data.response.body && data.response.body.items && data.response.body.items.item) {
            const items = Array.isArray(data.response.body.items.item) ? data.response.body.items.item : [data.response.body.items.item];
            currentShelterAnimals[careRegNo] = items;

            showAnimalListInCardContainer(items, careRegNo);
        } else {
            const container = document.getElementById(`animal-container-${careRegNo}`);
            if (container) {
                container.innerHTML = '<p style="text-align: center; width: 100%; padding: 20px;">유기동물 정보를 가져오는 데 문제가 발생했습니다.</p>';
            }
        }

    } catch (error) {
        console.error("데이터를 가져오는 중 오류 발생:", error);
        const container = document.getElementById(`animal-container-${careRegNo}`);
        if (container) {
            container.innerHTML = '<p style="text-align: center; width: 100%; padding: 20px; color: red;">유기동물 정보를 불러오는 데 실패했습니다.</p>';
        }
    }
}

// 유기동물 목록
function showAnimalListInCardContainer(items, careRegNo) {
    const container = document.getElementById(`animal-container-${careRegNo}`);

    if (!container) {
        console.error(`animal-container-${careRegNo} 엘리먼트를 찾을 수 없습니다.`);
        return;
    }

    container.innerHTML = '';
    container.style.display = 'flex';

    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; width: 100%; padding: 20px;">해당 보호소에 유기동물 정보가 없습니다.</p>';
        return;
    }

    items.forEach(animal => {
        const animalDiv = document.createElement("div");
        animalDiv.classList.add("animal-card");

        animalDiv.addEventListener('click', () => showAnimalDetailInCardContainer(animal, careRegNo));

        animalDiv.innerHTML = `
            <img src="${animal.popfile1}" alt="유기동물 사진">
            <p><strong>${animal.kindNm} (${animal.sexCd === "F" ? "♀" : "♂"})</strong></p>
            <p>나이: ${animal.age}</p>
            <p>연락처: ${animal.careTel}</p>
        `;
        container.appendChild(animalDiv);
    });
}


// 카드 클릭 시 상세 정보
function showAnimalDetailInCardContainer(animalData, careRegNo) {
    const container = document.getElementById(`animal-container-${careRegNo}`);

    if (!container) {
        console.error(`animal-container-${careRegNo} 엘리먼트를 찾을 수 없습니다.`);
        return;
    }

    container.innerHTML = '';
    container.style.display = 'block';
    container.style.padding = '15px';
    container.style.overflowY = 'auto';

    const detailHTML = `
        <button class="back-to-list-button" data-care-reg-no="${careRegNo}">&lt; 목록으로 돌아가기</button>
        <div class="animal-detail-content">
            <img src="${animalData.popfile1}" alt="이미지를 불러올 수 없습니다.">
            <h3>${animalData.kindNm} (${animalData.sexCd === "F" ? "♀" : "♂"})</h3>
            <p><strong>나이:</strong> ${animalData.age}</p>
            <p><strong>몸무게:</strong> ${animalData.weight}</p>
            <p><strong>색상:</strong> ${animalData.colorCd}</p>
            <p><strong>발견 장소:</strong> ${animalData.happenPlace}</p>
            <p><strong>특이 사항:</strong> ${animalData.specialMark || '없음'}</p>
            <p><strong>공고 번호:</strong> ${animalData.noticeNo}</p>
            <p><strong>공고 기간:</strong> ${animalData.noticeSdt} ~ ${animalData.noticeEdt}</p>
            <p><strong>보호소:</strong> ${animalData.careNm}</p>
            <p><strong>보호소 주소:</strong> ${animalData.careAddr}</p>
            <p><strong>보호소 연락처:</strong> <a href="tel:${animalData.careTel}">${animalData.careTel}</a></p>
            <p><strong>담당자:</strong> ${animalData.chargeNm}</p>
            <p><strong>담당자 연락처:</strong> <a href="tel:${animalData.officetel}">${animalData.officetel}</a></p>
            <p><strong>접수일:</strong> ${animalData.happenDt}</p>
        </div>
    `;

    container.innerHTML = detailHTML;

    const backButton = container.querySelector('.back-to-list-button');
    if (backButton) {
        backButton.addEventListener('click', (event) => {
            const currentCareRegNo = event.target.dataset.careRegNo;
            if (currentShelterAnimals[currentCareRegNo]) {
                showAnimalListInCardContainer(currentShelterAnimals[currentCareRegNo], currentCareRegNo);
            } else {
                fetchAnimalData(currentCareRegNo);
            }
        });
    }
}

// 검색 기능
window.searchPage = function () {
    var search = document.getElementById("searchInput").value;
    var region = document.getElementById("region")?.value || "";
    var breed = document.getElementById("breed")?.value || "";
    var gender = document.getElementById("gender")?.value || "";

    var url = `search.html?query=${encodeURIComponent(search)}`;
    if (region && region !== "지역 선택") url += `&region=${encodeURIComponent(region)}`;
    if (breed && breed !== "품종 선택") url += `&breed=${encodeURIComponent(breed)}`;
    if (gender && gender !== "성별 선택") url += `&gender=${encodeURIComponent(gender)}`;

    window.open(url, "_self");
};

const searchInput = document.getElementById("searchInput");
const searchSection = document.getElementById("search");
const filterOptions = document.getElementById("filterOptions");
const searchButton = document.getElementById("searchButton");

document.getElementById("searchInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        searchPage();
    }
});

document.getElementById("searchInput").addEventListener("focus", function() {
    createFilterOptions();
    if (filterOptions) {
        filterOptions.style.display = "flex";
        searchSection.classList.add('expanded');
        searchSection.style.height = 'auto';
        if (searchButton) {
            searchButton.style.display = "block";
        }
    }
});

document.getElementById("search").addEventListener("focusout", function(event) {
    if (searchSection.contains(event.relatedTarget)) {
        return;
    }

    setTimeout(() => {
        if (filterOptions) {
            filterOptions.style.display = "none";
            searchSection.classList.remove('expanded');
            searchSection.style.height = '40px';
            if (searchButton) {
                searchButton.style.display = "none";
            }
        }
    }, 100);
});

const mapContainer = document.getElementById("mapContainer");
if (mapContainer) {
    mapContainer.addEventListener('click', () => {
        searchInput.blur();
    });
}

if (searchButton) {
    searchButton.addEventListener("click", searchPage);
}

// 필터 옵션
async function createFilterOptions() {
    if (!filterOptions) {
        console.error("ID가 'filterOptions'인 요소를 찾을 수 없습니다.");
        return;
    }
    // 필터 옵션이 이미 생성되었다면 다시 만들지 않습니다.
    if (filterOptions.children.length > 0) {
        return;
    }

    try {
        const response = await fetch('options.json');
        const filterData = await response.json();

        for (const key in filterData) {
            filterOptions.appendChild(createSelect(key, filterData[key]));
        }
    } catch (error) {
        console.error("JSON 데이터를 불러오는 데 실패했습니다:", error);
    }
}

// 드롭다운 필터 생성 함수
function createSelect(id, optionsData) {
    const select = document.createElement("select");
    select.id = id;
    select.classList.add("filter-select");
    select.name = id;

    optionsData.forEach(optionPair => {
        const optionText = optionPair[0];
        const optionValue = optionPair[1] === undefined ? optionText : optionPair[1];

        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionText;
        select.appendChild(option);
    });
    return select;
}
