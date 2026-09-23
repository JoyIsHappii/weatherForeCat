import type { HourlyWeather, WeatherData, DailyForecast, HourlyForecast } from "../types/weather";

/**
 * @function mapHourly
 * @description Maps the hourly weather data to a more usable format, filtering to every 3 hours.
 * @param {WeatherData["hourly"]} hourly - The hourly weather data from the API response.
 * @returns {HourlyWeather[]} An array of hourly weather data, filtered to every 3 hours.
 */
export function mapHourly(hourly: WeatherData["hourly"]) {
  return hourly.time
    .map((time, index) => ({
      time,
      temperature: hourly.temperature_2m[index],
      rain: hourly.rain[index],
      snowfall: hourly.snowfall[index],
      weatherCode: hourly.weather_code[index],
    }))
    .filter((_, index) => index % 3 === 0);
}

/**
 * @function mapDailyForecast
 * @description Maps raw daily data into a simplified format for the 5-day forecast UI.
 * @param {WeatherData["daily"]} daily - The daily data from API response.
 * @returns {DailyForecast[]} Array of daily items with max/min temps and weather codes.
 */
export function mapDailyForecast(daily: WeatherData["daily"]): DailyForecast[] {
  return daily.time.map((time, index) => ({
    date: time,
    maxTemp: Math.round(daily.temperature_2m_max[index]),
    minTemp: Math.round(daily.temperature_2m_min[index]),
    weatherCode: daily.weather_code[index],
    sunrise: daily.sunrise[index],
    sunset: daily.sunset[index],
  }));
}

/**
 * @function mapHourlyRange
 * @description Maps hourly data to 3-hour intervals, specifically limited to the first 8 slots (24h).
 * @param {WeatherData["hourly"]} hourly - The hourly data from API response.
 * @returns {HourlyForecast[]} Filtered array of 8 hourly items.
 */
export function mapHourlyRange(hourly: WeatherData["hourly"]): HourlyForecast[] {
  return hourly.time
    .map((time, index) => ({
      time,
      temperature: Math.round(hourly.temperature_2m[index]),
      weatherCode: hourly.weather_code[index],
    }))
    .filter((_, index) => index % 3 === 0)
    .slice(0, 8);
}