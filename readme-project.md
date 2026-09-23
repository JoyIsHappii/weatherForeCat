# Weather Forecat — Project README

## Authors

Jamie, Joy, Mako, Guil, Alex
(See our work process here: ([🙀 STR Cats](https://www.notion.so/STR-Cats-36188ed7265480d58c73d5f509534744?source=copy_link)))

**Your purr-fect daily forecast companion, powered by dynamic cat mascots.**  
Built with Astro, Tailwind, TypeScript & jQuery.

---

## Link to project
[Weather Forecat](https://weather-forecats.netlify.app/)

---

## Project Structure

```
weather-forecat/
├── astro.config.mjs                 # Astro configuration file
├── Conventions.md                   # Project team guidelines & commit protocols
├── package-lock.json
├── package.json
├── tsconfig.json
├── Readme.md
│
├── public/                          # RAW STATIC ASSETS (Directly copied to build output)
│   ├── favicon.ico
│   ├── favicon.svg
│   │
│   └── assets/                      # Global static assets accessed via absolute string URLs (e.g., /assets/cats/...)
│       ├── cats/                    # Unoptimized heavy raster images (.png) for dynamic cat states
│       │   ├── cloudy.png
│       │   ├── rainy.png
│       │   ├── snowy.png
│       │   └── sunny.png
│       ├── icon-history.png
│       ├── icon-search.svg
│       └── icon-star.svg
│
└── src/                             # APPLICATION SOURCE CODE (Processed by the bundler)
    ├── assets/                      # BUNDLED & OPTIMIZED ASSETS (Imported directly into Astro/TS files)
    │   ├── bg-byTime/               # Moved here to handle time-based CSS or inline background vectors
    │   │   ├── Day.svg
    │   │   └── Night.svg
    │   ├── bg-laptop/               # Kept here for UI layout processing; remove duplicate from public/
    │   │   ├── Property 1=cloudy.svg
    │   │   ├── Property 1=Default.svg
    │   │   ├── Property 1=rainy.svg
    │   │   └── Property 1=sunny.svg
    │   ├── bg-mobile/               # Kept here for UI responsive layouts; remove duplicate from public/
    │   │   ├── Property 1=cloudy.svg
    │   │   ├── Property 1=rainy.svg
    │   │   ├── Property 1=snowy.svg
    │   │   └── Property 1=sunny.svg
    │   ├── logo/                    # Moved here to treat brand marks as component-level local assets
    │   │   ├── logo=cat.svg
    │   │   ├── logo=long-black.svg
    │   │   ├── logo=long-white.svg
    │   │   └── logo=short.svg
    │   ├── icons/                   # Central UI vector kit; remove duplicate from public/
    │   │   └── [All UI vectors: close.svg, umbrella.svg, wind.svg, etc.]
    │   ├── weather-static/          # Fixed, non-moving fallback weather condition vectors
    │   │   └── [0-day.svg, 0-night.svg, etc.]
    │   └── weather-animated/        # Grouped here next to static vectors to centralize all dynamic weather icons
    │       └── [0-day.svg, 45,48.svg, etc.]
    │
    ├── components/                  # REUSABLE INTERFACE UI COMPONENTS
    │   ├── CurrentWeather.astro     # Main current conditions card
    │   ├── DayCard.astro            # Daily forecast item card
    │   ├── FavCitiesDropdown.astro  # Saved locations manager overlay
    │   ├── HoursCard.astro          # Hourly breakdown timeline element
    │   ├── SearchBar.astro          # Input tracking module
    │   ├── SunRiseSet.astro         # Astro component mapping day/night shifts
    │   └── WeatherDetails.astro     # Extra metrics display (humidity, wind, UV, etc.)
    │
    ├── constants/                   # IMMUTABLE DATA ARRAYS AND MAPPINGS
    │   ├── countries.ts             # Global country/region key pairs
    │   └── weather-codes.ts         # WMO code to cat-state matching dictionary
    │
    ├── lib/                         # UTILS, SCRIPTS, AND API SERVICE CORE
    │   ├── favorites.ts             # LocalStorage city bookmarks controller
    │   ├── geolocation.ts           # Browser Geolocation API interface
    │   ├── init-weather-app.ts      # Client-side bootstrap entry point
    │   ├── location-format.ts       # City name parser & text sanitizer
    │   ├── placekit.ts              # Autocomplete address API configuration
    │   ├── recent-searches.ts       # History stack state machine
    │   ├── search-bar.ts            # Client-side input lifecycle manager
    │   ├── search-list.ts           # Dynamic dropdown renderer logic
    │   ├── weather-display.ts       # DOM UI injector updates
    │   ├── weather-mapper.ts        # API JSON converter to local models
    │   └── weather.ts               # Open-Meteo fetching core engine
    │
    ├── pages/                       # FILE-BASED ROUTING ENDPOINTS
    │   └── index.astro              # Single Page Application main dashboard
    │
    ├── styles/                      # APPLICATION-WIDE STYLESHEETS
    │   └── global.css               # Global baseline typography, variables, and resets
    │
    ├── types/                       # GLOBAL TYPESCRIPT INTERFACES & DOMAIN TYPES
    │   ├── favorite-city.ts         # Model schema for bookmarked location structures
    │   ├── location.ts              # Geocoding coordinate boundary rules
    │   └── weather.ts               # Structured weather data typing
    │
    └── env.d.ts                     # Astro global ambient type definitions
```

---

## Running the Project

### Requirements

- A modern browser (Chrome, Firefox, Safari, Edge)
- Node.js installed on your machine
- An API key from **Placekit** configured in a `.env` file in the root directory under the variable name:
```env
PUBLIC_PLACEKIT_API_KEY=your_api_key_here
```

### Steps

1. Open the project folder in VS Code or your preferred code editor. 
2. Open your integrated terminal and install the project dependencies: 
```bash 
   npm install
```
3. Launch the local Astro development server:
```bash
npm run dev
```
4. Open your browser and navigate to the local URL provided by the terminal (typically `http://localhost:4321/`).

> ⚠️ **Note:** Do not try to open files directly from the `src/pages/` or `public/` directories using extensions like "Live Server". Astro components must be processed by the local development server pipeline to render properly.

### Netlify deployment

Netlify should use the repository root as the base directory. The included `netlify.toml` configures:

- Build command: `npm run build`
- Publish directory: `dist`
- Node.js: `22.12.0`

In Netlify, open **Site configuration → Environment variables** and add
`PUBLIC_PLACEKIT_API_KEY` with the key from PlaceKit. Use the `Production` scope
and trigger a new deploy after saving it. The variable must be present during
the build because Astro embeds `PUBLIC_` variables in the browser bundle.

---
### Responsive Design
The site is responsive, adapting to desktop and mobile layouts

- **768px (Tablet / Desktop Shift)**: The main layout transitions from the desktop `bg-laptop` background vectors to the responsive mobile layouts. Components like `CurrentWeather`, the search modules, and the horizontal `HoursCard` timeline adjust to stack efficiently for smaller screens.
- **480px (Mobile)**: Optimized grid configurations for the weekly `DayCard` layout, spacing downsized for smaller viewing screens, and activation of the `bg-mobile` weather state background vectors.
> ⚠️ **Note:** Data appear only on page load.
### Browser Support
The core application utilizes modern web APIs—including native Geolocation for tracking coordinates, LocalStorage for managing bookmarked `favorite-city` entries, and the fetch API to communicate with Open-Meteo and Placekit.
Tested and supported on:
- **Chrome 110+**
- **Firefox 110+**
- **Safari 15+**
- **Edge 110+**