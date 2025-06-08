require('dotenv').config();
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const cron = require('node-cron');
const fs = require('fs').promises;
const app = express();
const PORT = 3000;
const KAKAO_JAVASCRIPT_API_KEY = process.env.KAKAO_JAVASCRIPT_API_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const ANIMAL_DATA_SERVICE_KEY = process.env.ANIMAL_DATA_SERVICE_KEY;
const ABOUT_FILE_PATH = path.join(__dirname, 'data', 'about.json');
const QUIZ_FILE_PATH = path.join(__dirname, 'data', 'quiz_questions.json');
const STATS_FILE_PATH = path.join(__dirname, 'data', 'statistics.json');
let animalsCache = new Map();
let sheltersCache = new Map();
const formatResponse = (date) => date.toISOString().slice(0, 10).replace(/-/g, "");

async function addressToCoords(address) {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    try {
        const response = await fetch(url, { headers: { 'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}` } });
        if (!response.ok) { console.error(`Kakao Geocoding API error for "${address}": ${response.status}`); return null; }
        const data = await response.json();
        if (data.documents && data.documents.length > 0) {
            const loc = data.documents[0].road_address || data.documents[0].address;
            if (loc && loc.y && loc.x) return { lat: parseFloat(loc.y), lng: parseFloat(loc.x) };
        }
    } catch (error) { console.error(`Error Kakao geocoding "${address}":`, error); return null; }
}

async function fetchAnimal() {
    const baseUrl = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
    const endDate = new Date();
    const beginDate = new Date(endDate);
    beginDate.setDate(endDate.getDate() - 7);
    const MAX_ROWS_PER_PAGE = 1000;
    const TOTAL_PAGES_TO_FETCH = 100;
    let allFetchedItems = [];
    let totalNewSheltersGeocodedThisRun = 0;
    let totalItemsSuccessfullyProcessed = 0;

    for (let pageNo = 1; pageNo <= TOTAL_PAGES_TO_FETCH; pageNo++) {
        const params = new URLSearchParams({
            serviceKey: ANIMAL_DATA_SERVICE_KEY,
            bgnde: formatResponse(beginDate),
            endde: formatResponse(endDate),
            pageNo: pageNo.toString(),
            numOfRows: MAX_ROWS_PER_PAGE.toString(),
            _type: "json",
        });
        try {
            const response = await fetch(`${baseUrl}?${params.toString()}`);
            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Animal API HTTP error on page ${pageNo}: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
                break;
            }

            const data = await response.json();

            if (data.response?.header?.resultCode !== "00") {
                console.warn(`Animal API returned non-success result code on page ${pageNo}: ${data.response.header.resultCode} - ${data.response.header.resultMsg}`);
                if (data.response.header.resultCode === "INFO-3" || data.response.header.resultMsg?.includes("데이터 없음")) { break; }
            }


            const items = data.response?.body?.items?.item ?
                (Array.isArray(data.response.body.items.item) ? data.response.body.items.item : [data.response.body.items.item])
                : [];
            if (items.length === 0 && pageNo > 1) { break; }
            allFetchedItems.push(...items);
            totalItemsSuccessfullyProcessed += items.length;
            for (const item of items) {
                if (!item.noticeNo || !item.careRegNo || !item.careAddr) { continue; }
                let coords = null;
                if (sheltersCache.has(item.careRegNo)) {
                    coords = sheltersCache.get(item.careRegNo).coords;
                } else if (item.careAddr) {
                    coords = await addressToCoords(item.careAddr);
                    if (coords) {
                        sheltersCache.set(item.careRegNo, {
                            name: item.careNm,
                            address: item.careAddr,
                            coords: coords,
                            tel: item.careTel
                        });
                        totalNewSheltersGeocodedThisRun++;
                    } else {}
                }
                const popfile = item.popfile || item.popfile1 || item.popfile2 || null;
                animalsCache.set(item.noticeNo, { ...item, popfile, coords });
            }
            if (items.length < MAX_ROWS_PER_PAGE) { break; }
            if (pageNo < TOTAL_PAGES_TO_FETCH) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (error) { console.error(`Error fetching or processing animal data on page ${pageNo}:`, error); }
    }
}

async function fetchStatistic() {
    const statsApiUrl = "https://apis.data.go.kr/1543061/rescueAnimalStatsService/rescueAnimalStats";
    const endDate = new Date();
    const beginDate = new Date(endDate);
    beginDate.setFullYear(endDate.getFullYear() - 1);
    const params = new URLSearchParams({
        serviceKey: ANIMAL_DATA_SERVICE_KEY,
        bgnde: formatResponse(beginDate),
        endde: formatResponse(endDate),
        numOfRows: 50,
        _type: "json"
    });
    try {
        const response = await fetch(`${statsApiUrl}?${params.toString()}`);
        if (!response.ok) { throw new Error(`Statistics API HTTP error: ${response.status} ${response.statusText}`); }
        const data = await response.json();
        if (data.response && data.response.body && data.response.body.items && data.response.body.items.item) {
            const items = Array.isArray(data.response.body.items.item) ? data.response.body.items.item : [data.response.body.items.item];
                const processedStats = {
                chart1Data: items.filter(item => item.se === "chart1" && item.rgn === "전체 지역")
                               .map(d => ({ processName: d.prcsNm, total: parseInt(d.tot, 10) })),
                chart2Data: items.filter(item => item.se === "chart2" && item.rgn === "전체 지역")
                               .map(d => ({ regionName: d.prcsNm, percentage: parseFloat(d.tot) })),
                lastUpdated: new Date().toISOString(),
                dataPeriod: {
                    begin: formatResponse(beginDate),
                    end: formatResponse(endDate)
                }
            };
            await fs.writeFile(STATS_FILE_PATH, JSON.stringify(processedStats, null, 2));
        } else {
            const errorStats = { error: "Failed to fetch statistics data.", lastUpdated: new Date().toISOString() };
            await fs.writeFile(STATS_FILE_PATH, JSON.stringify(errorStats, null, 2));
        }
    } catch (error) {
        try {
            const errorStats = { error: error.message || "Unknown error fetching statistics.", lastUpdated: new Date().toISOString() };
            await fs.writeFile(STATS_FILE_PATH, JSON.stringify(errorStats, null, 2));
        } catch (writeError) { console.error("Error writing error state to statistics file:", writeError); }
    }
}

async function initialStartup() {
    await fetchAnimal();
    await fetchStatistic();
    console.log("Server ready")
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config/maps-js-key', (req, res) => {
    if (KAKAO_JAVASCRIPT_API_KEY) {
        res.json({ apiKey: KAKAO_JAVASCRIPT_API_KEY });
    } else {
        console.error("SERVER ERROR: KAKAO_JAVASCRIPT_API_KEY is not defined in .env");
        res.status(500).json({ error: "Map configuration error on server." });
    }
});

app.get('/api/content/about', async (req, res) => {
    try {
        const data = await fs.readFile(ABOUT_FILE_PATH, 'utf-8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "Failed to load about content" });
    }
});

app.get('/api/content/quiz', async (req, res) => {
    try {
        const data = await fs.readFile(QUIZ_FILE_PATH, 'utf-8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "Failed to load quiz content" });
    }
});

app.get('/api/content/statistics', async (req, res) => {
    try {
        const data = await fs.readFile(STATS_FILE_PATH, 'utf-8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "Failed to load quiz content" });
    }
});

app.get('/api/animals', (req, res) => {
    const animalsArray = Array.from(animalsCache.values());
    res.json(animalsArray);
});

app.get('/api/shelters', (req, res) => {
    const sheltersArray = Array.from(sheltersCache.entries()).map(([careRegNo, shelterData]) => ({
        careRegNo: careRegNo,
        ...shelterData
    }));
    res.json(sheltersArray);
});

app.get('/{*any}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initialStartup();

cron.schedule('*/10 * * * *', () => {
    console.log('Scheduler: Fetching animal data...');
    fetchAnimal();
});

cron.schedule('0 12 * * *', () => {
    console.log('Scheduler: Fetching statistics data...');
    fetchStatistic();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});