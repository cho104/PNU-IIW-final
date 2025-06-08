let animalStatusPieChartInstance = null;
let animalStatusBarChartInstance = null;
let regionalAdoptionRateChartInstance = null;

async function fetchStatisticsData() {
    try {
        const response = await fetch('/api/content/statistics');
        if (!response.ok) throw new Error(`Failed to fetch statistics: ${response.statusText}`);
        const data = await response.json();
        if (data.error) throw new Error(`Error from statistics API: ${data.error}`);
        return data;
    } catch (error) {
        console.error("Error fetching statistics data:", error);
        const statsOverviewDiv = document.getElementById('statsOverviewContent');
        if (statsOverviewDiv) statsOverviewDiv.innerHTML = `<p style="color:red;text-align:center;">Could not load stats. ${error.message}</p>`;
        return null;
    }
}

function formatDataPeriod(beginStr, endStr) {
    if (!beginStr || !endStr || beginStr.length !== 8 || endStr.length !== 8) return "N/A";
    const format = (s) => `${s.substring(0,4)}년 ${s.substring(4,6)}월 ${s.substring(6,8)}일`;
    return `${format(beginStr)} ~ ${format(endStr)}`;
}

function createAnimalStatusPieChart(chart1Data) {
    const ctx = document.getElementById('animalStatusPieChart')?.getContext('2d');
    if (!ctx) { console.error("Pie chart canvas not found."); return; }
    if (animalStatusPieChartInstance) animalStatusPieChartInstance.destroy();
    const sortedPieData = [...chart1Data].sort((a, b) => b.total - a.total);
    const labels = sortedPieData.map(item => item.processName);
    const dataValues = sortedPieData.map(item => item.total);
    const totalSum = dataValues.reduce((sum, val) => sum + val, 0);
    const pieChartTotalCountEl = document.getElementById('pieChartTotalCount');
    if (pieChartTotalCountEl) {
        pieChartTotalCountEl.innerHTML = `전체<br><strong>${totalSum.toLocaleString()}</strong><br>마리`;
    }
    const colorMap = {
        "입양": 'rgba(75, 192, 192, 0.8)',
        "보호중": 'rgba(54, 162, 235, 0.8)',
        "반환": 'rgba(153, 102, 255, 0.8)',
        "안락사": 'rgba(255, 99, 132, 0.8)',
        "자연사": 'rgba(255, 159, 64, 0.8)',
        "방사": 'rgba(255, 206, 86, 0.8)',
        "기증": 'rgba(201, 203, 207, 0.8)'
    };
    const dynamicBackgroundColors = sortedPieData.map(item => colorMap[item.processName] || 'rgba(128,128,128,0.8)'); 
    const dynamicBorderColors = dynamicBackgroundColors.map(color => color.replace('0.8', '1'));
    animalStatusPieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: '처리 현황',
                data: dataValues,
                backgroundColor: dynamicBackgroundColors,
                borderColor: dynamicBorderColors,
                borderWidth: 1,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            cutout: '65%',
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 20, padding: 15, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                                label += context.parsed.toLocaleString() + '마리';
                                if (totalSum > 0) {
                                    const percentage = ((context.parsed / totalSum) * 100).toFixed(1);
                                    label += ` (${percentage}%)`;
                                }
                            }
                            return label;
                        }
                    }
                },
                title: { display: false }
            }
        }
    });
}

function createAnimalStatusBarChart(chart1Data) {
    const ctx = document.getElementById('animalStatusBarChart')?.getContext('2d');
    if (!ctx) { console.error("Bar chart canvas not found."); return; }
    if (animalStatusBarChartInstance) animalStatusBarChartInstance.destroy();
    const sortedData = [...chart1Data].sort((a, b) => b.total - a.total);
    const labels = sortedData.map(item => item.processName);
    const dataValues = sortedData.map(item => item.total);
    const colorMap = { 
        "입양": 'rgba(75, 192, 192, 0.7)', "보호중": 'rgba(54, 162, 235, 0.7)',
        "반환": 'rgba(153, 102, 255, 0.7)', "안락사": 'rgba(255, 99, 132, 0.7)',
        "자연사": 'rgba(255, 159, 64, 0.7)', "방사": 'rgba(255, 206, 86, 0.7)',
        "기증": 'rgba(201, 203, 207, 0.7)'
    };
    const dynamicBackgroundColors = sortedData.map(item => colorMap[item.processName] || 'rgba(128,128,128,0.7)');
    const dynamicBorderColors = dynamicBackgroundColors.map(color => color.replace('0.7', '1'));
    animalStatusBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '마리 수', data: dataValues,
                backgroundColor: dynamicBackgroundColors, borderColor: dynamicBorderColors,
                borderWidth: 1, borderRadius: 5,
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, title: { display: true, text: '마리 수' }, grid: { color: 'rgba(0,0,0,0.05)' } }, y: { grid: { display: false } } },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ctx.raw.toLocaleString() + '마리' } },
                title: { display: false },
            }
        }
    });
}

function createRegionalAdoptionRateChart(chart2Data) {
    const ctx = document.getElementById('regionalAdoptionRateChart')?.getContext('2d');
    if (!ctx) { console.error("Regional chart canvas not found."); return; }
    if (regionalAdoptionRateChartInstance) regionalAdoptionRateChartInstance.destroy();
    const sortedData = [...chart2Data].sort((a, b) => b.percentage - a.percentage);
    const labels = sortedData.map(item => item.regionName);
    const dataValues = sortedData.map(item => item.percentage);
    regionalAdoptionRateChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '입양률 (%)', data: dataValues,
                backgroundColor: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1, borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, title: { display: true, text: '입양률 (%)' }, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(0,0,0,0.05)' } }, y: { grid: { display: false } } },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw.toFixed(1) + '%' } }, title: { display: false } }
        }
    });
}

export async function initStatisticsPage() {
    const data = await fetchStatisticsData();
    const dataPeriodEl = document.getElementById('statsDataPeriod');
    const lastUpdatedEl = document.getElementById('statsLastUpdated');
    if (data?.dataPeriod && dataPeriodEl) {
        dataPeriodEl.textContent = formatDataPeriod(data.dataPeriod.begin, data.dataPeriod.end);
    } else if (dataPeriodEl) { dataPeriodEl.textContent = "N/A"; }
    if (data?.lastUpdated && lastUpdatedEl) {
        lastUpdatedEl.textContent = new Date(data.lastUpdated).toLocaleString();
    } else if (lastUpdatedEl) { lastUpdatedEl.textContent = "N/A"; }
    const chart1Valid = data?.chart1Data?.length > 0;
    const chart2Valid = data?.chart2Data?.length > 0;
    const pieCanvasContainer = document.getElementById('animalStatusPieChart')?.parentElement;
    const barCanvasContainer = document.getElementById('animalStatusBarChart')?.parentElement;
    const regionalCanvasContainer = document.getElementById('regionalAdoptionRateChart')?.parentElement;
    if (chart1Valid) {
        createAnimalStatusPieChart(data.chart1Data);
        createAnimalStatusBarChart(data.chart1Data);
    } else {
        console.warn("No chart1Data for statistics.");
        if(pieCanvasContainer) pieCanvasContainer.innerHTML = "<p class='chart-nodata-msg'>처리 현황 데이터를 불러올 수 없습니다.</p>";
        if(barCanvasContainer) barCanvasContainer.innerHTML = "<p class='chart-nodata-msg'>처리 현황 데이터를 불러올 수 없습니다.</p>";
    }
    if (chart2Valid) {
        createRegionalAdoptionRateChart(data.chart2Data);
    } else {
        console.warn("No chart2Data for statistics.");
        if(regionalCanvasContainer) regionalCanvasContainer.innerHTML = "<p class='chart-nodata-msg'>지역별 데이터를 불러올 수 없습니다.</p>";
    }
}