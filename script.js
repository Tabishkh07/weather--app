/* ================= SELECT ELEMENTS ================= */
const form = document.querySelector(".search-form");
const input = document.querySelector(".search-input");

const cityEl = document.querySelector(".city");
const countryEl = document.querySelector(".country");
const tempEl = document.querySelector(".temperature");
const conditionEl = document.querySelector(".condition");
const feelsLikeEl = document.querySelector(".feels-like");
const iconEl = document.querySelector(".weather-icon");

const detailValues = document.querySelectorAll(".detail-value");
const toggleBtn = document.querySelector(".navbar-right i");

/* ================= SAFE TOGGLE ================= */
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("night");
  });
}

/* ================= LOADING STATE ================= */
function setLoading() {
  cityEl.textContent = "Fetching weather...";
  countryEl.textContent = "";
  tempEl.textContent = "--°C";
  conditionEl.textContent = "Please wait";
  feelsLikeEl.textContent = "";
  iconEl.src = "";
  detailValues.forEach((d) => (d.textContent = "—"));
}

/* ================= SEARCH ================= */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (city) fetchByCity(city);
  input.value = "";
});

/* ================= FETCH BY CITY ================= */
async function fetchByCity(city) {
  try {
    setLoading();

    // 1️⃣ Geocoding
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1`
    );
    const geoData = await geoRes.json();
    if (!geoData.results) throw new Error("City not found");

    const { latitude, longitude, name, country } = geoData.results[0];

    // 2️⃣ Weather (FULL DATA)
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast
      ?latitude=${latitude}
      &longitude=${longitude}
      &current_weather=true
      &hourly=relative_humidity_2m,pressure_msl,visibility
      &daily=sunrise,sunset
      &timezone=auto`
        .replace(/\s+/g, "")
    );

    const data = await weatherRes.json();
    updateUI(data, name, country);
  } catch (err) {
    cityEl.textContent = "City not found";
    conditionEl.textContent = "Try another city";
  }
}

/* ================= FETCH BY LOCATION ================= */
function fetchByLocation() {
  if (!navigator.geolocation) return;

  setLoading();

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast
        ?latitude=${latitude}
        &longitude=${longitude}
        &current_weather=true
        &hourly=relative_humidity_2m,pressure_msl,visibility
        &daily=sunrise,sunset
        &timezone=auto`
          .replace(/\s+/g, "")
      );

      const data = await res.json();
      updateUI(data, "Your Location", "");
    },
    () => {
      cityEl.textContent = "Location denied";
      conditionEl.textContent = "Search city manually";
    }
  );
}

/* ================= UPDATE UI ================= */
function updateUI(data, city, country) {
  const current = data.current_weather;

  cityEl.textContent = city;
  countryEl.textContent = country;
  tempEl.textContent = `${Math.round(current.temperature)}°C`;
  feelsLikeEl.textContent = `Feels like ${Math.round(
    current.temperature
  )}°C`;

  // 🌍 Correct local day/night detection
  const now = new Date(current.time).getTime();
  const sunrise = new Date(data.daily.sunrise[0]).getTime();
  const sunset = new Date(data.daily.sunset[0]).getTime();
  const isDay = now >= sunrise && now < sunset;

  const condition = mapWeatherCode(current.weathercode, isDay);
  conditionEl.textContent = condition.text;
  iconEl.src = condition.icon;

  // Details (hourly → current index)
  detailValues[0].textContent = `${data.hourly.relative_humidity_2m[0]}%`;
  detailValues[1].textContent = `${current.windspeed} km/h`;
  detailValues[2].textContent = `${data.hourly.pressure_msl[0]} hPa`;
  detailValues[3].textContent = `${(
    data.hourly.visibility[0] / 1000
  ).toFixed(1)} km`;

  setTheme(condition.type);
}

/* ================= WEATHER CODE → ICON ================= */
function mapWeatherCode(code, isDay) {
  const suffix = isDay ? "d" : "n";

  if (code === 0)
    return {
      text: "Clear",
      icon: `https://openweathermap.org/img/wn/01${suffix}@2x.png`,
      type: isDay ? "sunny" : "night",
    };

  if (code <= 3)
    return {
      text: "Cloudy",
      icon: `https://openweathermap.org/img/wn/03${suffix}@2x.png`,
      type: "cloudy",
    };

  if (code >= 51 && code <= 67)
    return {
      text: "Rain",
      icon: `https://openweathermap.org/img/wn/09${suffix}@2x.png`,
      type: "rainy",
    };

  return {
    text: "Night",
    icon: "https://openweathermap.org/img/wn/01n@2x.png",
    type: "night",
  };
}

/* ================= THEME ================= */
function setTheme(type) {
  document.body.classList.remove("sunny", "cloudy", "rainy", "night");
  document.body.classList.add(type);
}

/* ================= INIT ================= */
fetchByLocation();

