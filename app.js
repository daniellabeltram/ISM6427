const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

// WMO weather codes -> [label, day icon, night icon]
const CODES = {
  0: ["Clear", "☀️", "🌙"],
  1: ["Mostly Clear", "🌤️", "🌙"],
  2: ["Partly Cloudy", "⛅", "☁️"],
  3: ["Cloudy", "☁️", "☁️"],
  45: ["Fog", "🌫️", "🌫️"],
  48: ["Fog", "🌫️", "🌫️"],
  51: ["Light Drizzle", "🌦️", "🌧️"],
  53: ["Drizzle", "🌦️", "🌧️"],
  55: ["Heavy Drizzle", "🌧️", "🌧️"],
  61: ["Light Rain", "🌦️", "🌧️"],
  63: ["Rain", "🌧️", "🌧️"],
  65: ["Heavy Rain", "🌧️", "🌧️"],
  71: ["Light Snow", "🌨️", "🌨️"],
  73: ["Snow", "🌨️", "🌨️"],
  75: ["Heavy Snow", "❄️", "❄️"],
  80: ["Showers", "🌦️", "🌧️"],
  81: ["Showers", "🌧️", "🌧️"],
  82: ["Heavy Showers", "🌧️", "🌧️"],
  95: ["Thunderstorm", "⛈️", "⛈️"],
  96: ["Thunderstorm", "⛈️", "⛈️"],
  99: ["Thunderstorm", "⛈️", "⛈️"],
};

const $ = (id) => document.getElementById(id);
const info = (code, isDay = 1) => {
  const c = CODES[code] || ["—", "🌡️", "🌡️"];
  return { label: c[0], icon: isDay ? c[1] : c[2] };
};
const round = (n) => Math.round(n);

async function loadWeather({ name, lat, lon }) {
  $("place").textContent = name;
  $("condition").textContent = "Loading…";

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    hourly: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: 7,
  });

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    render(await res.json());
  } catch (err) {
    $("condition").textContent = "Couldn't load weather";
    console.error(err);
  }
}

function render(data) {
  const { current: cur, hourly, daily } = data;
  const now = info(cur.weather_code, cur.is_day);

  document.body.classList.toggle("night", !cur.is_day);
  $("temp").textContent = `${round(cur.temperature_2m)}°`;
  $("condition").textContent = now.label;
  $("hilo").textContent = `H:${round(daily.temperature_2m_max[0])}°  L:${round(daily.temperature_2m_min[0])}°`;
  $("feels").textContent = `${round(cur.apparent_temperature)}°`;
  $("humidity").textContent = `${cur.relative_humidity_2m}%`;
  $("wind").textContent = `${round(cur.wind_speed_10m)} mph`;
  $("uv").textContent = round(daily.uv_index_max[0]);

  // Next 24 hours starting from the current hour
  const start = hourly.time.findIndex((t) => t >= cur.time.slice(0, 13));
  $("hourly").innerHTML = hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const j = start + i;
      const hour = new Date(t).getHours();
      const label = i === 0 ? "Now" : `${hour % 12 || 12}${hour < 12 ? "AM" : "PM"}`;
      return `<div class="hour">
        <span>${label}</span>
        <span class="icon">${info(hourly.weather_code[j], hourly.is_day[j]).icon}</span>
        <span>${round(hourly.temperature_2m[j])}°</span>
      </div>`;
    })
    .join("");

  const min = Math.min(...daily.temperature_2m_min);
  const max = Math.max(...daily.temperature_2m_max);
  const span = max - min || 1;
  $("daily").innerHTML = daily.time
    .map((t, i) => {
      const lo = daily.temperature_2m_min[i];
      const hi = daily.temperature_2m_max[i];
      const day = i === 0 ? "Today" : new Date(t + "T00:00").toLocaleDateString("en-US", { weekday: "short" });
      return `<div class="day">
        <span>${day}</span>
        <span class="icon">${info(daily.weather_code[i]).icon}</span>
        <div class="range">
          <span class="lo">${round(lo)}°</span>
          <div class="bar"><span style="left:${((lo - min) / span) * 100}%;right:${((max - hi) / span) * 100}%"></span></div>
          <span class="hi">${round(hi)}°</span>
        </div>
      </div>`;
    })
    .join("");
}

// City search via Open-Meteo geocoding
let timer;
$("query").addEventListener("input", (e) => {
  clearTimeout(timer);
  const q = e.target.value.trim();
  if (q.length < 2) return ($("results").hidden = true);
  timer = setTimeout(() => search(q), 300);
});

async function search(q) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5`);
  const { results = [] } = await res.json();
  const list = $("results");
  list.innerHTML = "";
  results.forEach((r) => {
    const li = document.createElement("li");
    const sub = document.createElement("small");
    sub.textContent = [r.admin1, r.country].filter(Boolean).join(", ");
    li.append(`${r.name} `, sub);
    li.onclick = () => {
      list.hidden = true;
      $("query").value = "";
      loadWeather({ name: r.name, lat: r.latitude, lon: r.longitude });
    };
    list.appendChild(li);
  });
  list.hidden = results.length === 0;
}

$("search").addEventListener("submit", (e) => {
  e.preventDefault();
  $("results").querySelector("li")?.click();
});

loadWeather(DEFAULT);
