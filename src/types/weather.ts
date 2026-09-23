export type WeatherData = {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;

  current_units: CurrentUnits;
  current: CurrentData;

  hourly_units: HourlyUnits;
  hourly: HourlyData;

  daily_units: DailyUnits;
  daily: DailyData;
};

export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
}

export type HourlyWeather = {
  time: string;
  temperature: number;
  rain: number;
  snowfall: number;
  weather_code: number;
};

interface CurrentUnits {
  time: string;
  interval: string;
  temperature_2m: string;
  weather_code: string;
}

interface CurrentData {
  time: string;
  interval: number;
  temperature_2m: number;
  weather_code: number;
  apparent_temperature: number;
  wind_speed_10m: number;
  rain: number;
  relative_humidity_2m: number;
  uv_index: number;
  precipitation: number;
  snowfall: number;
}

interface HourlyUnits {
  time: string;
  temperature_2m: string;
  rain: string;
  weather_code: string;
  snowfall:number;
}

interface HourlyData {
  time: string[];
  temperature_2m: number[];
  rain: number[];
  snowfall: number[];
  weather_code: number[];
  precipitation_probability: number[]; 
}

interface DailyUnits {
  time: string;
  sunrise: string;
  sunset: string;
  weather_code: string;
  temperature_2m_max: string;
  temperature_2m_min: string;
}

interface DailyData {
  time: string[];
  sunrise: string[];
  sunset: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}