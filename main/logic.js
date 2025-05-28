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

        displayMarker(locPosition, message);
    });
} else {
    var locPosition = new kakao.maps.LatLng(33.450701, 126.570667),
        message = "geolocation을 사용할 수 없어요..";

    displayMarker(locPosition, message);
}

function displayMarker(locPosition, message) {
    var marker = new kakao.maps.Marker({
        map: map,
        position: locPosition
    });

    var infowindow = new kakao.maps.InfoWindow({
        content: message,
        removable: true
    });

    infowindow.open(map, marker);
    map.setCenter(locPosition);
}

function adjustIframeScale(iframe) {
    const container = iframe.parentElement;
    const scale = container.clientWidth / iframe.clientWidth;
    iframe.style.transform = `scale(${scale})`;
    iframe.style.transformOrigin = "0 0";
}

let currentShelterAnimals = {};

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

window.addEventListener("resize", function() {
    const iframe = document.querySelector(".responsive-iframe");
    if (iframe) {
        adjustIframeScale(iframe);
    }
});

function makeOutListener(infowindow) {
    return function() {
        infowindow.close();
    };
}

function makeOverListener(map, marker, infowindow) {
    return function() {
        infowindow.open(map, marker);
    };
}

function makeClickListener(map, marker, infowindow, clickinfo, shelno) {
    return function() {
        infowindow.close();
        clickinfo.open(map, marker);

        if (currentShelterAnimals[shelno]) {
            showAnimalListInCardContainer(currentShelterAnimals[shelno], shelno);
        } else {
            fetchAnimalData(shelno);
        }
    };
}

// 유기동물 정보
async function fetchAnimalData(careRegNo) {
    const url = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
    const serviceKey = "apidecodingkey";

    const params = new URLSearchParams({
        serviceKey: serviceKey,
        care_reg_no: careRegNo,
        numOfRows: 12, // 4x3 = 12개
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

    // 상세 정보 HTML 구성
    const detailHTML = `
        <button class="back-to-list-button" data-care-reg-no="${careRegNo}">&lt; 목록으로 돌아가기</button>
        <div class="animal-detail-content">
            <img src="${animalData.popfile1}" alt="유기동물 사진">
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

function searchPage() {
    var search = document.getElementById("searchInput").value;
    var url = "search.html?query=" + encodeURIComponent(search);
    window.open(url, "_blank");
}







/*
---------------------------------------------------------------
FFFFF RRRRR  OOOOO  N   N  TTTTT    EEEEE  N   N  DDDD    
F     R   R  O   O  NN  N    T      E      NN  N  D   D   
FFF   RRRR   O   O  N N N    T      EEEE   N N N  D   D   
F     R  R   O   O  N  NN    T      E      N  NN  D   D   
F     R   R  OOOOO  N   N    T      EEEEE  N   N  DDDD    
---------------------------------------------------------------
          RRRRR  EEEEE  AAAAA  L   L   YYYYY   
          R   R  E      A   A  L   L     Y    
          RRRR   EEEE   AAAAA  L   L     Y    
          R  R   E      A   A  L   L     Y    
          R   R  EEEEE  A   A  LLL LLL   Y    
---------------------------------------------------------------
       SSSSS  H   H  IIIII  TTTTT   
       S      H   H    I      T     
       SSSS   HHHHH    I      T     
           S  H   H    I      T     
       SSSSS  H   H  IIIII    T     
---------------------------------------------------------------
*/
