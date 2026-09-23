import $ from "jquery";

import { getWeatherDescription } from "../constants/weather-codes";

// * Local imports
// - Fovorite management
import {
  addFavorite,
  createFavoriteId,
  isFavorite,
  loadFavorites,
  removeFavoriteById,
} from "./favorites";
// - Geolocation and place search
import { getGeolocation } from "./geolocation";
import {
  SEARCH_RESULT_OPTION_CLASS,
  SEARCH_RESULT_SUBTITLE_CLASS,
} from "./search-list";
import { bindSearchBar, hideSearchResults } from "./search-bar";
import type { RecentSearchCity } from "./search-bar";
// - Weather fetching and formatting
import {
  FALLBACK_CITY,
  GEO_LOCATION_LABEL,
  getTodayMinMax,
} from "./weather-display";
import { mapHourly, mapDailyForecast, mapHourlyRange } from "./weather-mapper";
// - Types
import { getWeatherInfo } from "./weather";
import type { FavoriteCity } from "../types/favorite-city";
import type {
  WeatherData,
  DailyForecast,
  HourlyForecast,
} from "../types/weather";

type SelectedCity = {
  displayName: string;
  subtitle: string;
  latitude: number;
  longitude: number;
};

let selectedCity: SelectedCity = { ...FALLBACK_CITY };
let favoritesCache: FavoriteCity[] = loadFavorites();
// Application state for layout mappings
let allHourlyData: HourlyForecast[] = [];
// Current local time of the selected city (YYYY-MM-DDTHH:MM), used to highlight the current 3-hour slot
let currentLocalTime = "";

// Active layout context (e.g., desktop vs mobile) for dynamic UI updates; initialized on DOM ready
let $activeLayoutContext: JQuery<HTMLElement>;

export function getContext(): JQuery<HTMLElement> {
  return $activeLayoutContext || $("body"); // Si no se ha inicializado, recurre al body por seguridad
}

function getActiveLayout(): void {
  if (window.matchMedia("(min-width: 768px)").matches) {
    $activeLayoutContext = $("#desktop-layout");
  } else {
    $activeLayoutContext = $("#mobile-layout");
  }
}

/**
 * @function showLoading
 * @description Displays the global loading screen by removing opacity and pointer event restrictions.
 */
function showLoading(): void {
  const $loader = $("#global-loading-screen");
  $loader.removeClass("hidden opacity-0").addClass("flex opacity-100");
}

/**
 * @function hideLoading
 * @description Hides the global loading screen by adding opacity and pointer event restrictions
 * for a smooth transition.
 */
function hideLoading(): void {
  const $loader = $("#global-loading-screen");
  $loader.removeClass("opacity-100").addClass("opacity-0");

  setTimeout(() => {
    $loader.removeClass("flex").addClass("hidden");
  }, 500);
}

/**
 * @function updateHourlyUI
 * @param {string} targetDate - The date string (YYYY-MM-DD) to filter hourly data for
 * @description Dynamically updates the pre-rendered HoursCard elements with filtered data
 */
function updateHourlyUI(targetDate: string): void {
  const $hourlyTitle = $("#hourly-title", $activeLayoutContext);
  const titleDate = new Date(targetDate.replace(/-/g, "/"));
  // $hourlyTitle.text(
  //   `${titleDate.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })} Hourly Forecast`,
  // );

  const filteredHourly = allHourlyData.filter((item) =>
    item.time.startsWith(targetDate),
  );
  const $hourItems = $(".hour-item", $activeLayoutContext);

  // On today, the current slot is the last one that has already started
  const isToday = currentLocalTime.startsWith(targetDate);
  const currentSlotIndex = isToday
    ? filteredHourly.filter((item) => item.time <= currentLocalTime).length - 1
    : -1;

  $hourItems.each((index, element) => {
    const $item = $(element);
    const data = filteredHourly[index];

    if (data) {
      const timeLabel = new Date(data.time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const emoji = getWeatherEmoji(data.weatherCode);

      $item
        .find(".hour-time")
        .text(timeLabel)
        .toggleClass("text-[#57A0EE] font-bold", index === currentSlotIndex)
        .toggleClass("text-gray-600 font-medium", index !== currentSlotIndex);
      $item.find(".hour-emoji").html(emoji);
      $item.find(".hour-temp")
      .text(`${data.temperature}°`)
      .toggleClass("text-[#57A0EE] font-bold", index === currentSlotIndex)
      .toggleClass("text-gray-600 font-medium", index !== currentSlotIndex);
      
      $item.show();
    } else {
      $item.hide();
    }
  });
}

/**
 * @function updateSunUI
 * @param {DailyForecast} day - The day whose sunrise and sunset should be shown
 * @description Updates the Sunrise / Sunset cards for the selected day
 */
function updateSunUI(day: DailyForecast): void {
  const formatTime = (timeString: string) =>
    new Date(timeString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const formatDate = (timeString: string) =>
    new Date(timeString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  $("#hero-sunrise", $activeLayoutContext).text(formatTime(day.sunrise));
  $("#hero-sunset", $activeLayoutContext).text(formatTime(day.sunset));
  $("#hero-sunrise-date", $activeLayoutContext).text(formatDate(day.sunrise));
  $("#hero-sunset-date", $activeLayoutContext).text(formatDate(day.sunset));
}

/** Highlight the clicked day card; remove highlight from the others. */
function setActiveDayCard($activeCard: JQuery<HTMLElement>): void {
  const activeDayClasses = "bg-neutral-100 shadow-inner shadow-black/30";
  $(".day-card").removeClass(activeDayClasses);
  $activeCard.addClass(activeDayClasses);
}

/**
 * @function updateDailyUI
 * @param {DailyForecast[]} daily - Array of daily forecast data to map into the UI
 * @description Updates the pre-rendered DayCard components with real API data and attaches click events
 */
function updateDailyUI(daily: DailyForecast[]): void {
  const $dayCards = $(".day-card", $activeLayoutContext);

  $dayCards.each((index, element) => {
    const $card = $(element);
    const data = daily[index];

    if (data) {
      const dateObj = new Date(data.date.replace(/-/g, "/"));
      const dayName = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
      });
      const dateString = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      const emoji = getWeatherEmoji(data.weatherCode);

      // Map dynamic data into DayCard layout structure without breaking alignment
      $card.attr("data-date", data.date);

      $card.find(".day-name").html(`
        <span style="font-weight: bold; display: block;">${dayName}</span>
        <span style="font-size: 0.8rem; color: #888; font-weight: normal; display: block; margin-top: 2px;">${dateString}</span>
      `);

      $card
        .find(".weather-icon-temp")
        .html(`<span style="font-size: 1.5rem;">${emoji}</span>`);
      $card.find(".max-temp").text(`${data.maxTemp}°`);
      $card.find(".min-temp").text(`${data.minTemp}°`);

      $card.css("cursor", "pointer");

      $card.off("click").on("click", function () {
        const selectedDate = $(this).attr("data-date");
        if (selectedDate) {
          updateHourlyUI(selectedDate);
          updateSunUI(data);
          setActiveDayCard($(this));
        }
      });
    }
  });
}

/**
 * @function resolveInitialCity
 * @description Resolves the initial city based on the user's geolocation.
 * @returns {Promise<void>} A promise that resolves when the initial city is resolved.
 */
async function resolveInitialCity(): Promise<void> {
  try {
    const loc = await getGeolocation();
    selectedCity = {
      displayName: loc.city || GEO_LOCATION_LABEL,
      subtitle: "",
      latitude: loc.lat,
      longitude: loc.lng,
    };
  } catch {
    selectedCity = { ...FALLBACK_CITY };
  }
}

/**
 * @function hideFavoriteList
 * @description Hides the favorite cities dropdown list.
 * @returns {void}
 */
function hideFavoriteList(): void {
  $("#favorite-cities-list", $activeLayoutContext).addClass("hidden");
  $("#favorite-cities-trigger", $activeLayoutContext).attr(
    "aria-expanded",
    "false",
  );
}

/**
 * @function showFavoriteList
 * @description Shows the favorite cities dropdown list.
 * @returns {void}
 */
function showFavoriteList(): void {
  // if (!favoritesCache.length) return;
  $("#favorite-cities-list", $activeLayoutContext).removeClass("hidden");
  $("#favorite-cities-trigger", $activeLayoutContext).attr(
    "aria-expanded",
    "true",
  );
}

/**
 * @function renderFavoriteDropdown
 * @description Renders the favorite dropdown.
 * @returns {void}
 */
function renderFavoriteDropdown(): void {
  favoritesCache = loadFavorites();
  const $list = $("#favorite-cities-list", $activeLayoutContext);
  $list.empty();
  hideFavoriteList();
  if (!favoritesCache.length) {
    $list.append(
      $("<li>", {
        class: "px-4 py-2 text-sm text-slate-500",
        text: "No favorites yet",
      }),
    );
    return;
  }
  for (const fav of favoritesCache) {
    const $item = $("<li>", { role: "presentation" });
    const $btn = $("<button>", {
      type: "button",
      class: SEARCH_RESULT_OPTION_CLASS,
      role: "option",
      "data-id": fav.id,
    });
    $("<span>", { class: "block font-medium", text: fav.displayName }).appendTo(
      $btn,
    );
    if (fav.subtitle) {
      $("<span>", {
        class: SEARCH_RESULT_SUBTITLE_CLASS,
        text: fav.subtitle,
      }).appendTo($btn);
    }
    $item.append($btn);
    $list.append($item);
  }
}

function renderLocationSubtitle(): void {
  const $sub = $("#hero-location-subtitle", $activeLayoutContext);
  if (selectedCity.subtitle) {
    $sub.text(selectedCity.subtitle).removeClass("hidden");
  } else {
    $sub.text("").addClass("hidden");
  }
}

/**
 * @function refreshStarState
 * @description Refreshes the state of the favorite toggle button.
 * @returns {void}
 */
function refreshStarState(): void {
  const active = isFavorite(selectedCity.latitude, selectedCity.longitude);
  const $btn = $("#favorite-toggle", $activeLayoutContext);
  $btn.attr("aria-pressed", active ? "true" : "false");
  $btn.attr(
    "aria-label",
    active ? "Remove this city from favorites" : "Save this city to favorites",
  );
  if (active) {
    $("#fav-icon-default", $activeLayoutContext).addClass("hidden");
    $("#fav-icon-active", $activeLayoutContext).removeClass("hidden");
  } else {
    $("#fav-icon-active", $activeLayoutContext).addClass("hidden");
    $("#fav-icon-default", $activeLayoutContext).removeClass("hidden");
  }
}

/**
 * @function renderWeatherCard
 * @description Renders the weather card for the selected city.
 * @param {WeatherData} weather - The weather data to render.
 * @returns {void}
 */
function renderWeatherCard(weather: WeatherData): void {
  $("#hero-city-name", $activeLayoutContext).text(selectedCity.displayName);
  renderLocationSubtitle();

  const unit = weather.current_units.temperature_2m;
  $("#hero-temp-main", $activeLayoutContext).text(
    `${weather.current.temperature_2m}${unit}`,
  );
  $("#hero-feels-like", $activeLayoutContext).text(
    `${weather.current.apparent_temperature}`,
  );
  $("#hero-wind", $activeLayoutContext).text(
    `${weather.current.wind_speed_10m} km/h`,
  );
  $("#hero-humidity", $activeLayoutContext).text(
    `${weather.current.relative_humidity_2m} %`,
  );

  function getUvLevel(uv: number | null) {
    if (uv === null || uv === undefined) {
      return { label: "unknown", color: "text-gray-500" };
    }

    if (uv <= 2) {
      return { label: `low (${uv})`, color: "text-green-500" };
    }

    if (uv <= 5) {
      return { label: `moderate (${uv})`, color: "text-yellow-500" };
    }

    if (uv <= 7) {
      return { label: `high (${uv})`, color: "text-orange-500" };
    }

    if (uv <= 10) {
      return { label: `very-high (${uv})`, color: "text-red-500" };
    }

    return { label: `extreme (${uv})`, color: "text-red-700" };
  }

  function getAirQualityLevel(aqi: number | null) {
    if (aqi === null || aqi === undefined) {
      return { label: "unknown", color: "text-gray-500" };
    }

    if (aqi <= 20) return { label: `good (${aqi})`, color: "text-green-500" };
    if (aqi <= 40) return { label: `fair (${aqi})`, color: "text-lime-500" };
    if (aqi <= 60)
      return { label: `moderate (${aqi})`, color: "text-yellow-500" };
    if (aqi <= 80) return { label: `poor (${aqi})`, color: "text-orange-500" };
    if (aqi <= 100)
      return { label: `very poor (${aqi})`, color: "text-red-500" };

    return { label: `extremely poor (${aqi})`, color: "text-red-700" };
  }

  const airQuality = getAirQualityLevel(weather.current.european_aqi);

  $("#hero-air-quality", $activeLayoutContext)
    .text(airQuality.label)
    .removeClass(
      "text-green-500 text-green-400 text-yellow-500 text-red-500 text-red-600 text-red-700 text-gray-500",
    )
    .addClass(airQuality.color);

  const uvLevel = getUvLevel(weather.current.uv_index);

  $("#hero-uv", $activeLayoutContext)
    .text(uvLevel.label)
    .removeClass(
      "text-green-500 text-yellow-500 text-orange-500 text-red-500 text-red-700 text-gray-500",
    )
    .addClass(uvLevel.color);

  currentLocalTime = weather.current.time;
  const nowTime = new Date(weather.current.time).getTime();
  const sunriseTime = new Date(weather.daily.sunrise[0]).getTime();
  const sunsetTime = new Date(weather.daily.sunset[0]).getTime();
  const isDaytime = nowTime >= sunriseTime && nowTime < sunsetTime;

  $("#top-location-name", $activeLayoutContext).text(selectedCity.displayName);

  const topDateString = new Date(weather.current.time).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
  );
  const topTimeString = new Date(weather.current.time).toLocaleTimeString(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  );
  $("#top-date-time", $activeLayoutContext).text(
    `${topDateString}, ${topTimeString}`,
  );

  //Get the weather icon
  const iconFilename = getWeatherIconFilename(
    weather.current.weather_code,
    isDaytime,
  );
  $("#hero-weather", $activeLayoutContext).attr(
    "src",
    `/assets/weather-animated/${iconFilename}`,
  );

  // Get the cat mascot
  const catFilename = getWeatherCatFilename(weather.current.weather_code);
  $("#cat-mascot", $activeLayoutContext).attr(
    "src",
    `/assets/cats/${catFilename}`,
  );

  // get hero card bg and logo
  const bgFilename = getWeatherBgFilename(weather.current.weather_code);
  $("#hero-bg", $activeLayoutContext).attr(
    "src",
    `/assets/bg-laptop/${bgFilename}`,
  );

  const logoFilename = getWeatherLogoFilename(weather.current.weather_code);
  $("#footer-logo", $activeLayoutContext).attr(
    "src",
    `/assets/logo/${logoFilename}`,
  );

  // bg
  const globalBgFilename = isDaytime ? "Day.svg" : "Night.svg";
  console.log(isDaytime);
  console.log(globalBgFilename);
  $("body").css(
    "background-image",
    `url('/assets/bg-byTime/${globalBgFilename}')`,
  );

  const conditionText = getWeatherDescription(weather.current.weather_code);
  $("#hero-condition", $activeLayoutContext).text(conditionText);

  const range = getTodayMinMax(weather);
  if (range) {
    $("#hero-temp-range", $activeLayoutContext).text(
      `${range.min}${unit} - ${range.max}${unit}`,
    );
  } else {
    $("#hero-temp-range", $activeLayoutContext).text("—");
  }

  const precipProb = weather.hourly.precipitation_probability[0];
  const snowAmt = weather.hourly.snowfall[0];

  // rain / snow for current weather card
  $("#hero-precipitation", $activeLayoutContext).text(`${precipProb}%`);
  $("#hero-snowfall", $activeLayoutContext).text(`${snowAmt}mm`);

  const rain0 = weather.hourly.rain[0];
  const snow0 = weather.hourly.snowfall[0];
  $("#hero-rain-value", $activeLayoutContext).text(
    `${rain0} ${weather.hourly_units.rain}`,
  );
  $("#hero-snow-value", $activeLayoutContext).text(
    `${snow0} ${weather.hourly_units.snowfall}`,
  );

  $("#hero-status", $activeLayoutContext).addClass("hidden").text("");

  // --- Extended Layout Components Processing ---
  const dailyForecasts = mapDailyForecast(weather.daily);
  const hourlyRange = mapHourlyRange(weather.hourly);
  allHourlyData = mapHourly(weather.hourly);

  // Update Daily Cards
  updateDailyUI(dailyForecasts);

  // Initialize Hourly Panel state mapping
  if (dailyForecasts.length > 0) {
    updateHourlyUI(dailyForecasts[0].date);
    updateSunUI(dailyForecasts[0]);
    setActiveDayCard($(".day-card", $activeLayoutContext).first());
  }
}

/**
 * @function loadWeatherForSelected
 * @description Loads the weather for the selected city.
 * @returns {Promise<void>} A promise that resolves when the weather is loaded.
 */
async function loadWeatherForSelected(): Promise<void> {
  const $status = $("#hero-status", $activeLayoutContext);
  $status.removeClass("hidden").text("Loading forecast…");

  try {
    const weather = await getWeatherInfo(
      selectedCity.longitude,
      selectedCity.latitude,
    );
    renderWeatherCard(weather);
    refreshStarState();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load weather.";
    $status.removeClass("hidden").text(message);
    $("#hero-temp-main", $activeLayoutContext).text("—");
    $("#hero-temp-range", $activeLayoutContext).text("—");
    $("#hero-rain-value", $activeLayoutContext).text("—");
    $("#hero-snow-value", $activeLayoutContext).text("—");
    renderLocationSubtitle();
    refreshStarState();
  }
}

/**
 * @function bindFavoriteToggle
 * @description Binds a click event to the favorite toggle button to add or remove the current city from the favorites.
 * @returns {void}
 */
function bindFavoriteToggle(): void {
  $("#favorite-toggle", $activeLayoutContext).on("click", () => {
    const id = createFavoriteId(selectedCity.latitude, selectedCity.longitude);
    if (isFavorite(selectedCity.latitude, selectedCity.longitude)) {
      removeFavoriteById(id);
    } else {
      addFavorite({
        displayName: selectedCity.displayName,
        subtitle: selectedCity.subtitle || undefined,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
      });
    }
    renderFavoriteDropdown();
    refreshStarState();
  });
}

/**
 * @function bindFavoriteDropdown
 * @description Binds the favorite cities trigger and list to toggle and select a city.
 * @returns {void}
 */
function bindFavoriteDropdown(): void {
  $("#favorite-cities-trigger", $activeLayoutContext).on("click", () => {
    const $list = $("#favorite-cities-list", $activeLayoutContext);
    if ($list.hasClass("hidden")) showFavoriteList();
    else hideFavoriteList();
  });

  $("#favorite-cities-list", $activeLayoutContext).on(
    "click",
    'button[role="option"]',
    function (this: HTMLButtonElement) {
      favoritesCache = loadFavorites();
      const id = String($(this).data("id"));
      const fav = favoritesCache.find((f) => f.id === id);
      hideFavoriteList();
      if (!fav) return;
      selectedCity = {
        displayName: fav.displayName,
        subtitle: fav.subtitle ?? "",
        latitude: fav.latitude,
        longitude: fav.longitude,
      };
      void loadWeatherForSelected();
    },
  );

  $("#favorite-cities-trigger", $activeLayoutContext).on("keydown", (e) => {
    if (e.key === "Escape") hideFavoriteList();
  });
}

/**
 * @function bindClickOutsideDropdowns
 * @description Hides open dropdowns when clicking outside their containers.
 * @returns {void}
 */
function bindClickOutsideDropdowns(): void {
  $(document).on("click", (e) => {
    const target = e.target as Node;
    const $searchWrap = $("#search-city-input", $activeLayoutContext).parent();
    if ($searchWrap.length && !$searchWrap[0]?.contains(target)) {
      hideSearchResults();
    }
    const $favWrap = $(
      "#favorite-cities-trigger",
      $activeLayoutContext,
    ).parent();
    if ($favWrap.length && !$favWrap[0]?.contains(target)) {
      hideFavoriteList();
    }
  });
}

/**
 * @function getWeatherEmoji
 * @param {number} code - WMO weather interpretation code
 * @description Converts WMO interpretation codes into dynamic weather SVG image elements using default src folder paths
 */
export function getWeatherEmoji(code: number): string {
  let assetName = "0-day.svg";

  if (code === 0) assetName = "0-day.svg";
  else if ([1, 2, 3].includes(code)) assetName = "1,2,3-day.svg";
  else if ([45, 48].includes(code)) assetName = "45,48.svg";
  else if ([51, 53, 55].includes(code)) assetName = "51,53,55.svg";
  else if ([56, 57].includes(code)) assetName = "56,57.svg";
  else if ([61, 63, 65].includes(code)) assetName = "61,63,65.svg";
  else if ([66, 67].includes(code)) assetName = "66,67.svg";
  else if ([71, 73, 75].includes(code)) assetName = "71,73,75.svg";
  else if (code === 77) assetName = "77.svg";
  else if ([80, 81, 82].includes(code)) assetName = "80,81,82.svg";
  else if ([85, 86].includes(code)) assetName = "85,86.svg";
  else if (code >= 95) assetName = "95,96,99.svg";

  return `<img src="/assets/weather-static/${assetName}" alt="Weather Icon" class="w-14 h-14 object-contain object-center" />`;
}

/**
 * Returns the corresponding image filename based on the weather code and day/night status.
 * @param code - The current weather code from the Open-Meteo API
 * @param isDay - Boolean indicating if it is currently daytime
 * @returns The filename of the SVG weather icon
 */
function getWeatherIconFilename(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? "0-day.svg" : "0-night.svg";
  if ([1, 2, 3].includes(code))
    return isDay ? "1,2,3-day.svg" : "1,2,3-night.svg";

  if ([45, 48].includes(code)) return "45,48.svg";
  if ([51, 53, 55].includes(code)) return "51,53,55.svg";
  if ([56, 57].includes(code)) return "56,57.svg";
  if ([61, 63, 65].includes(code)) return "61,63,65.svg";
  if ([66, 67].includes(code)) return "66,67.svg";
  if ([71, 73, 75].includes(code)) return "71,73,75.svg";
  if (code === 77) return "77.svg";
  if ([80, 81, 82].includes(code)) return "80,81,82.svg";
  if ([85, 86].includes(code)) return "85,86.svg";
  if ([95, 96, 99].includes(code)) return "95,96,99.svg";

  // Return clear sky as default if no match is found
  return isDay ? "0-day.svg" : "0-night.svg";
}

/**
 * Returns the corresponding cat mascot filename based on the weather code.
 * @param code - The current weather code from the Open-Meteo API
 * @returns The filename of the cat mascot image (assuming they are placed in public/assets/)
 */
function getWeatherCatFilename(code: number): string {
  // Sunny / Clear / slightly cloudy
  if ([0, 1].includes(code)) return "sunny.png";

  // Cloudy / Foggy
  if ([2, 3, 45, 48].includes(code)) return "cloudy.png";

  // Rainy / Showers / Thunderstorms / Wet Weather
  if (
    [
      51,
      53,
      55,
      56,
      57, // Drizzle
      61,
      63,
      65,
      66,
      67, // Rain
      80,
      81,
      82, // Rain showers
      95,
      96,
      99, // Thunderstorm
    ].includes(code)
  )
    return "rainy.png";

  // Snowy / Sleet / Freezing Weather
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy.png";

  // Default to Sunny cat
  return "sunny.png";
}

/**
 * Returns the corresponding background filename based on the weather code.
 * @param code - The current weather code from the Open-Meteo API
 * @returns The filename of the background SVG
 */
function getWeatherBgFilename(code: number): string {
  // Sunny
  if ([0, 1].includes(code)) return "Property 1=sunny.svg";
  // Cloudy
  if ([2, 3, 45, 48].includes(code)) return "Property 1=cloudy.svg";
  // Rainy
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
      code,
    )
  )
    return "Property 1=rainy.svg";
  // Snowy
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Property 1=Default.svg";

  return "Property 1=sunny.svg";
}

/**
 * Returns the corresponding logo filename based on the weather code.
 * @param code - The current weather code from the Open-Meteo API
 * @returns The filename of the logo SVG
 */
function getWeatherLogoFilename(code: number): string {
  // Sunny or Snowy -> Black Logo
  if ([0, 1, 71, 73, 75, 77, 85, 86].includes(code))
    return "logo=long-black.svg";
  // Cloudy or Rainy -> White Logo
  return "logo=long-white.svg";
}

/**
 * Wire StrCats Weather UI to PlaceKit, Open-Meteo, and favorites (localStorage).
 * Call once on DOM ready (see index.astro).
 */
export async function initWeatherApp(): Promise<void> {
  showLoading();

  try {
    getActiveLayout();
    await resolveInitialCity();

    renderFavoriteDropdown();
    refreshStarState();

    await loadWeatherForSelected();

    bindFavoriteToggle();
    bindFavoriteDropdown();
    bindClickOutsideDropdowns();

    bindSearchBar({
      onCitySelected: async (city: RecentSearchCity) => {
        selectedCity = city;
        showLoading();
        await loadWeatherForSelected();
        hideLoading();
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not initialize weather app.";
    $("#hero-status", $activeLayoutContext)
      .removeClass("hidden")
      .text(message);
  } finally {
    setTimeout(() => {
      hideLoading();
    }, 300);
  }
}
