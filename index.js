// Weather API configuration
const GEO_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

// Add search functionality
const searchForm = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const errorMessage = document.getElementById('errorMessage');

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    try {
      errorMessage.style.display = 'none';
      await fetchWeather(city);
      cityInput.value = '';
    } catch (error) {
      showError(error.message || 'Failed to fetch weather data');
    }
  }
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 3000);
}

async function fetchWeather(city = 'Chennai') {
  try {
    // Step 1: Get coordinates
    const geoResponse = await fetch(`${GEO_API_URL}?name=${encodeURIComponent(city)}&count=1&format=json`);
    const geoData = await geoResponse.json();
    
    if (!geoData.results || !geoData.results.length) {
      throw new Error(`City '${city}' not found`);
    }
    
    const lat = geoData.results[0].latitude;
    const lon = geoData.results[0].longitude;
    
    // Step 2: Fetch weather data
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current_weather: 'true',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,sunrise,sunset',
      hourly: 'relative_humidity_2m',
      timezone: 'auto'
    });
    
    const weatherResponse = await fetch(`${WEATHER_API_URL}?${params}`);
    const weatherData = await weatherResponse.json();
    
    if (!weatherData.current_weather || !weatherData.daily) {
      throw new Error('Invalid weather data received');
    }
    
    // Process data
    const processedData = processWeatherData(city, weatherData);
    updateUI(processedData);
    
  } catch (error) {
    console.error('Weather fetch error:', error);
    showError(error.message);
  }
}

function processWeatherData(city, weatherData) {
  const current = weatherData.current_weather;
  const daily = weatherData.daily;
  const hourly = weatherData.hourly || {};
  
  const humidity = hourly.relative_humidity_2m ? hourly.relative_humidity_2m[0] : null;
  
  const result = {
    city: city,
    current: {
      temperature: current.temperature || 'N/A',
      windspeed: current.windspeed || 'N/A',
      weathercode: current.weathercode || 'N/A',
      time: current.time || 'N/A',
      humidity: humidity !== null ? humidity : 'Data not available',
      pressure: 'N/A' // Open-Meteo doesn't provide pressure in free tier
    },
    forecast: []
  };
  
  // Process forecast data
  for (let i = 0; i < daily.time.length; i++) {
    result.forecast.push({
      date: daily.time[i],
      max_temp: daily.temperature_2m_max[i],
      min_temp: daily.temperature_2m_min[i],
      precipitation: daily.precipitation_sum[i],
      uv_index: daily.uv_index_max[i],
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i]
    });
  }
  
  return result;
}

// Rest of your existing UI update functions remain the same
function updateUI(data) {
  const current = data.current;
  const forecast = data.forecast;

  document.getElementById('city').textContent = data.city;
  document.getElementById('current-temp').textContent = `${current.temperature}°C`;
  document.getElementById('wind').textContent = `${current.windspeed} kmph`;
  document.getElementById('humidity').textContent = `${current.humidity}%`;
  document.getElementById('pressure').textContent = `${current.pressure || 'N/A'} hPa`;
  document.getElementById('air-quality').textContent = 'N/A'; // Not available in free tier
  document.getElementById('condition').textContent = getWeatherCondition(current.weathercode);

  const time = new Date(current.time);
  document.getElementById('current-time').textContent = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sunriseTime = new Date(forecast[0].sunrise);
  const sunsetTime = new Date(forecast[0].sunset);
  document.getElementById('sunrise').textContent = sunriseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('sunset').textContent = sunsetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 7-day forecast
  const weeklyContainer = document.getElementById('weekly-forecast');
  weeklyContainer.innerHTML = forecast.map(day => `
    <div class="day-row">
      <div>${new Date(day.date).toLocaleDateString('en', { day:"2-digit", weekday: 'short' })}</div>
      <div>${Math.round(day.min_temp)}° / ${Math.round(day.max_temp)}°</div>
      <div style="font-size: 0.8rem;">UV: ${day.uv_index.toFixed(1)}</div>
    </div>
  `).join('');
}

function getWeatherCondition(code) {
  const codes = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return codes[code] || "Unknown";
}

// Initial load
fetchWeather();