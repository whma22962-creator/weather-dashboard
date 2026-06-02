// 天气 API 配置
const API_CONFIG = {
    // Open-Meteo 地理编码 API
    GEOCODING_API: 'https://geocoding-api.open-meteo.com/v1/search',
    // Open-Meteo 天气预报 API
    WEATHER_API: 'https://api.open-meteo.com/v1/forecast',
};

// 天气描述映射
const WEATHER_CODES = {
    0: { desc: '晴朗', icon: '☀️' },
    1: { desc: '基本晴朗', icon: '🌤️' },
    2: { desc: '局部多云', icon: '⛅' },
    3: { desc: '多云', icon: '☁️' },
    45: { desc: '有雾', icon: '🌫️' },
    48: { desc: '结冰雾', icon: '❄️' },
    51: { desc: '小雨', icon: '🌧️' },
    53: { desc: '中等雨', icon: '🌧️' },
    55: { desc: '大雨', icon: '⛈️' },
    61: { desc: '小雨', icon: '🌧️' },
    63: { desc: '中等雨', icon: '🌧️' },
    65: { desc: '大雨', icon: '⛈️' },
    71: { desc: '小雪', icon: '🌨️' },
    73: { desc: '中等雪', icon: '❄️' },
    75: { desc: '大雪', icon: '❄️' },
    77: { desc: '雪粒', icon: '❄️' },
    80: { desc: '阵雨', icon: '🌧️' },
    81: { desc: '阵雨', icon: '⛈️' },
    82: { desc: '暴雨', icon: '⛈️' },
    85: { desc: '阵雪', icon: '🌨️' },
    86: { desc: '暴雪', icon: '❄️' },
    95: { desc: '雷暴', icon: '⛈️' },
    96: { desc: '冰雹雷暴', icon: '⛈️' },
    99: { desc: '冰雹雷暴', icon: '⛈️' },
};

// DOM 元素
const elements = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    currentWeather: document.getElementById('currentWeather'),
    forecastSection: document.getElementById('forecastSection'),
    errorMessage: document.getElementById('errorMessage'),
    statusMessage: document.getElementById('statusMessage'),
    themeToggle: document.getElementById('themeToggle'),
    cityName: document.getElementById('cityName'),
    updateTime: document.getElementById('updateTime'),
    tempValue: document.getElementById('tempValue'),
    weatherDesc: document.getElementById('weatherDesc'),
    weatherIcon: document.getElementById('weatherIcon'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    pressure: document.getElementById('pressure'),
    forecastContainer: document.getElementById('forecastContainer'),
};

// 初始化
function init() {
    setupThemeToggle();
    setupEventListeners();
    loadSavedTheme();
    // 默认加载北京天气
    searchWeather('北京');
}

// 设置主题切换
function setupThemeToggle() {
    elements.themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const isDarkMode = html.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        updateThemeIcon(isDarkMode);
    });
}

// 更新主题图标
function updateThemeIcon(isDarkMode) {
    elements.themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
}

// 加载保存的主题
function loadSavedTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        updateThemeIcon(true);
    }
}

// 设置事件监听
function setupEventListeners() {
    elements.searchBtn.addEventListener('click', () => {
        const city = elements.cityInput.value.trim();
        if (city) {
            searchWeather(city);
        }
    });

    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = elements.cityInput.value.trim();
            if (city) {
                searchWeather(city);
            }
        }
    });
}

// 搜索天气
async function searchWeather(city) {
    clearMessages();
    showLoading(true);
    hideWeatherData();

    try {
        // 第一步：通过城市名称获取坐标
        const coordinates = await geocodeCity(city);
        if (!coordinates) {
            showError('❌ 城市不存在，请检查城市名称或重试');
            showLoading(false);
            return;
        }

        // 第二步：获取天气数据
        const weatherData = await fetchWeatherData(coordinates);
        if (!weatherData) {
            showError('❌ 获取天气数据失败，请稍后重试');
            showLoading(false);
            return;
        }

        // 第三步：显示天气数据
        displayWeatherData(weatherData, coordinates);
        updateStatusMessage(`✅ 已更新 ${coordinates.name} 的天气信息`);
        elements.cityInput.value = '';
    } catch (error) {
        console.error('Error:', error);
        showError('❌ 查询失败，请检查网络连接或稍后重试');
    } finally {
        showLoading(false);
    }
}

// 地理编码 - 获取城市坐标
async function geocodeCity(city) {
    try {
        const response = await fetch(
            `${API_CONFIG.GEOCODING_API}?name=${encodeURIComponent(city)}&language=zh&count=1`
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return null;
        }

        const result = data.results[0];
        return {
            name: result.name,
            country: result.country || '',
            admin1: result.admin1 || '',
            latitude: result.latitude,
            longitude: result.longitude,
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// 获取天气数据
async function fetchWeatherData(coordinates) {
    try {
        const params = new URLSearchParams({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            current: 'temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation,wind_speed_10m_max',
            timezone: 'Asia/Shanghai',
            language: 'zh',
        });

        const response = await fetch(
            `${API_CONFIG.WEATHER_API}?${params.toString()}`
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Weather API error:', error);
        return null;
    }
}

// 显示天气数据
function displayWeatherData(data, coordinates) {
    const current = data.current;
    const daily = data.daily;

    // 更新位置信息
    elements.cityName.textContent = coordinates.admin1 
        ? `${coordinates.name}, ${coordinates.admin1}` 
        : coordinates.name;
    elements.updateTime.textContent = formatUpdateTime(current.time);

    // 更新当前天气
    const weatherInfo = WEATHER_CODES[current.weather_code] || { desc: '未知', icon: '🌤️' };
    elements.weatherIcon.textContent = weatherInfo.icon;
    elements.tempValue.textContent = Math.round(current.temperature_2m);
    elements.weatherDesc.textContent = weatherInfo.desc;
    elements.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;
    elements.humidity.textContent = `${current.relative_humidity_2m}%`;
    elements.windSpeed.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    elements.pressure.textContent = `${Math.round(current.pressure_msl)} hPa`;

    // 显示天气卡片
    elements.currentWeather.style.display = 'block';

    // 显示预报
    displayForecast(daily);
    elements.forecastSection.style.display = 'block';
}

// 显示7天预报
function displayForecast(daily) {
    elements.forecastContainer.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
        const weatherCode = daily.weather_code[i];
        const weatherInfo = WEATHER_CODES[weatherCode] || { desc: '未知', icon: '🌤️' };
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);

        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="forecast-date">${formatDate(date)}</div>
            <div class="forecast-icon">${weatherInfo.icon}</div>
            <div class="forecast-temp">
                <div class="forecast-temp-max">${maxTemp}°C</div>
                <div class="forecast-temp-min">${minTemp}°C</div>
            </div>
            <div class="forecast-desc">${weatherInfo.desc}</div>
        `;

        elements.forecastContainer.appendChild(forecastCard);
    }
}

// 工具函数 - 格式化日期
function formatDate(date) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return '今天';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return '明天';
    } else {
        return `${date.getMonth() + 1}月${date.getDate()}日 ${days[date.getDay()]}`;
    }
}

// 工具函数 - 格式化更新时间
function formatUpdateTime(timeString) {
    const date = new Date(timeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 显示/隐藏加载状态
function showLoading(show) {
    elements.loadingSpinner.style.display = show ? 'flex' : 'none';
}

// 隐藏天气数据
function hideWeatherData() {
    elements.currentWeather.style.display = 'none';
    elements.forecastSection.style.display = 'none';
}

// 显示错误信息
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
}

// 显示状态信息
function updateStatusMessage(message) {
    elements.statusMessage.textContent = message;
}

// 清除消息
function clearMessages() {
    elements.errorMessage.style.display = 'none';
    elements.statusMessage.textContent = '';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);