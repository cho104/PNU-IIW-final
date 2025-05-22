var container = document.getElementById("map");
var options = {
    center: new kakao.maps.LatLng(33.450701, 126.570667),
    level: 2
};

var map = new kakao.maps.Map(container, options);

// HTML5의 geolocation으로 사용할 수 있는지 확인합니다
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
    const scale = container.clientWidth / iframe.clientWidth; // 비율 계산
    iframe.style.transform = `scale(${scale})`;
    iframe.style.transformOrigin = "0 0";
}

// JSON 파일에서 데이터를 가져와 마커 생성
fetch("positions.json")
    .then(response => response.json())
    .then(data => {
        var commonSettings = data.commonSettings; // 공통 설정 가져오기
        var positions = data.positions; // 위치 데이터 가져오기

        positions.forEach(position => {
            var marker = new kakao.maps.Marker({
                map: map,
                clickable: true,
                position: new kakao.maps.LatLng(position.latlng[0], position.latlng[1])
            });

            var infowindow = new kakao.maps.InfoWindow({
                content: position.content
            });

            var iframeHTML = `<div class="iframe-container"><iframe width='${commonSettings.width}' height='${commonSettings.height}' transform='${commonSettings.transform}' transformOrigin='${commonSettings.transformOrigin}' src='${position.src}' frameborder='${commonSettings.frameborder}'></iframe></div>`;
            var clickinfo = new kakao.maps.InfoWindow({
                content: iframeHTML // 공유 설정 적용
            });

            kakao.maps.event.addListener(marker, "mouseover", makeOverListener(map, marker, infowindow));
            kakao.maps.event.addListener(marker, "mouseout", makeOutListener(infowindow));
            kakao.maps.event.addListener(marker, "click", makeClickListener(map, marker, infowindow, clickinfo));
            kakao.maps.event.addListener(map, "click", makeOutListener(clickinfo));
        });
    })
    .catch(error => console.error("JSON 데이터를 불러오는 중 오류 발생:", error));

// 창 크기 변경 시 `iframe` 크기 재조정
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

function makeClickListener(map, marker, infowindow, clickinfo) {
    return function() {
        infowindow.close();
        clickinfo.open(map, marker);
    };
}

function makeOutListener(infowindow) {
    return function() {
        infowindow.close();
    };
}

// 검색 기능
function searchPage() {
    var search = document.getElementById("searchInput").value;
    var url = "search.html?query=" + encodeURIComponent(search);
    window.open(url, "_blank");
}
