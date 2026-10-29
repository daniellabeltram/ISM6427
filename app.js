const DEFAULT_LOCATION = { name: "Boca Raton", latitude: 26.3683, longitude: -80.1289 };

const WEATHER_CODES = {
  0: ["Clear", "☀️"],
  1: ["Mainly Clear", "🌤️"],
  2: ["Partly Cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy Drizzle", "🌦️"],
  61: ["Light Rain", "🌧️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy Rain", "🌧️"],
  71: ["Light Snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy Snow", "❄️"],
  80: ["Showers", "🌦️"],
  81: ["Showers", "🌧️"],
  82: ["Heavy Showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm", "⛈️"],
  99: ["Thunderstorm", "⛈️"],
};

const describe = (code) => WEATHER_CODES[code] || ["Unknown", "🌡️"];
const $ = (id) => document.getElementById(id);

async function getWeather({ name, latitude, longitude }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code",
    hourly: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: 7,
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("Could not load weather data.");
  render(name, await res.json());
}

function render(name, data) {
  const { current, hourly, daily } = data;
  const [label] = describe(current.weather_code);

  $("city").textContent = name;
  $("temp").textContent = `${Math.round(current.temperature_2m)}°`;
  $("condition").textContent = label;
  $("hilo").textContent = `H:${Math.round(daily.temperature_2m_max[0])}°  L:${Math.round(daily.temperature_2m_min[0])}°`;
  $("feels").textContent = `${Math.round(current.apparent_temperature)}°`;
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(current.wind_speed_10m)} mph`;
  $("precip").textContent = `${current.precipitation} in`;

  // Next 24 hours starting from the current hour
  const start = Math.max(0, hourly.time.findIndex((t) => t >= current.time.slice(0, 13)));
  $("hourly").innerHTML = hourly.time.slice(start, start + 24).map((t, i) => {
    const idx = start + i;
    const hour = i === 0 ? "Now" : new Date(t).toLocaleTimeString([], { hour: "numeric" });
    return `<div class="hour">
      <span>${hour}</span>
      <span class="icon">${describe(hourly.weather_code[idx])[1]}</span>
      <strong>${Math.round(hourly.temperature_2m[idx])}°</strong>
    </div>`;
  }).join("");

  $("daily").innerHTML = daily.time.map((d, i) => {
    const day = i === 0 ? "Today" : new Date(`${d}T00:00`).toLocaleDateString([], { weekday: "short" });
    return `<li>
      <span>${day}</span>
      <span class="icon">${describe(daily.weather_code[i])[1]}</span>
      <span class="range"><span class="low">${Math.round(daily.temperature_2m_min[i])}°</span>${Math.round(daily.temperature_2m_max[i])}°</span>
    </li>`;
  }).join("");
}

async function searchCity(query) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
  const data = await res.json();
  if (!data.results || !data.results.length) throw new Error(`No results for "${query}".`);
  const { name, admin1, latitude, longitude } = data.results[0];
  return { name: admin1 ? `${name}, ${admin1}` : name, latitude, longitude };
}

function showError(message) {
  $("error").textContent = message;
  $("error").hidden = !message;
}

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = $("query").value.trim();
  if (!query) return;
  try {
    showError("");
    await getWeather(await searchCity(query));
    $("query").value = "";
  } catch (err) {
    showError(err.message);
  }
});

getWeather(DEFAULT_LOCATION).catch((err) => showError(err.message));
