(() => {
  const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=7.89&longitude=-67.47&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FCaracas&forecast_days=1';
  const WEATHER_FALLBACK_URL = 'https://wttr.in/San+Fernando+de+Apure?format=j1';
  const WEATHER_ICONS = {
    clear: 'fa-sun',
    partlyCloudy: 'fa-cloud-sun',
    cloudy: 'fa-cloud',
    fog: 'fa-smog',
    rain: 'fa-cloud-rain',
    showers: 'fa-cloud-showers-heavy',
    snow: 'fa-snowflake',
    thunderstorm: 'fa-cloud-bolt'
  };
  const weatherDescription = code => {
    if (code === 0) return { text: 'Despejado', icon: WEATHER_ICONS.clear };
    if (code <= 2) return { text: 'Parcialmente nublado', icon: WEATHER_ICONS.partlyCloudy };
    if (code === 3) return { text: 'Nublado', icon: WEATHER_ICONS.cloudy };
    if (code === 45 || code === 48) return { text: 'Neblina', icon: WEATHER_ICONS.fog };
    if (code >= 51 && code <= 57) return { text: 'Llovizna', icon: WEATHER_ICONS.rain };
    if (code >= 61 && code <= 67) return { text: 'Lluvia', icon: WEATHER_ICONS.rain };
    if (code >= 71 && code <= 77) return { text: 'Nieve', icon: WEATHER_ICONS.snow };
    if (code >= 80 && code <= 82) return { text: 'Chubascos', icon: WEATHER_ICONS.showers };
    if (code === 85 || code === 86) return { text: 'Chubascos de nieve', icon: WEATHER_ICONS.snow };
    if (code >= 95 && code <= 99) return { text: 'Tormenta', icon: WEATHER_ICONS.thunderstorm };
    throw new Error(`Código meteorológico no reconocido: ${code}`);
  };
  const fallbackWeatherDescription = code => {
    if (code === 113) return { text: 'Despejado', icon: WEATHER_ICONS.clear };
    if (code === 116) return { text: 'Parcialmente nublado', icon: WEATHER_ICONS.partlyCloudy };
    if (code === 119 || code === 122) return { text: 'Nublado', icon: WEATHER_ICONS.cloudy };
    if ([143, 248, 260].includes(code)) return { text: 'Neblina', icon: WEATHER_ICONS.fog };
    if ([200, 386, 389, 392, 395].includes(code)) return { text: 'Tormenta', icon: WEATHER_ICONS.thunderstorm };
    if ([179, 182, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) {
      return { text: 'Precipitación', icon: WEATHER_ICONS.snow };
    }
    if ([353, 356, 359].includes(code)) return { text: 'Chubascos', icon: WEATHER_ICONS.showers };
    if ([176, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314].includes(code)) {
      return { text: 'Lluvia', icon: WEATHER_ICONS.rain };
    }
    throw new Error(`Código meteorológico de respaldo no reconocido: ${code}`);
  };
  const header = document.querySelector('.navbar, .simple-header');
  if (!header || header.querySelector('.weather-widget')) return;

  const widget = document.createElement('div');
  widget.className = 'weather-widget';
  widget.setAttribute('role', 'status');
  widget.setAttribute('aria-live', 'polite');
  widget.setAttribute('aria-label', 'Pronóstico del clima en San Fernando de Apure');
  widget.innerHTML = `
    <i class="fa-solid fa-cloud-sun weather-widget-icon" aria-hidden="true"></i>
    <span class="weather-widget-copy">
      <span class="weather-widget-location">San Fernando de Apure</span>
      <span class="weather-widget-condition">Cargando pronóstico...</span>
      <span class="weather-widget-temperatures"></span>
    </span>
  `;
  const brand = header.querySelector('.brand-logo, .simple-brand');
  if (brand) brand.after(widget);
  else header.prepend(widget);

  const condition = widget.querySelector('.weather-widget-condition');
  const temperatures = widget.querySelector('.weather-widget-temperatures');
  const icon = widget.querySelector('.weather-widget-icon');
  const fetchForecast = async url => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`El servicio meteorológico respondió HTTP ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
  };
  const getOpenMeteoForecast = async () => {
    const forecast = await fetchForecast(WEATHER_URL);
    const currentTemperature = forecast.current?.temperature_2m;
    const weatherCode = forecast.current?.weather_code;
    const maximum = forecast.daily?.temperature_2m_max?.[0];
    const minimum = forecast.daily?.temperature_2m_min?.[0];
    if (![currentTemperature, weatherCode, maximum, minimum].every(Number.isFinite)) {
      throw new Error('La respuesta de Open-Meteo está incompleta.');
    }
    return { currentTemperature, weather: weatherDescription(weatherCode), maximum, minimum };
  };
  const getFallbackForecast = async () => {
    const forecast = await fetchForecast(WEATHER_FALLBACK_URL);
    const current = forecast.current_condition?.[0];
    const today = forecast.weather?.[0];
    const currentTemperature = Number(current?.temp_C);
    const weatherCode = Number(current?.weatherCode);
    const maximum = Number(today?.maxtempC);
    const minimum = Number(today?.mintempC);
    if (![currentTemperature, weatherCode, maximum, minimum].every(Number.isFinite)) {
      throw new Error('La respuesta del servicio meteorológico alternativo está incompleta.');
    }
    return { currentTemperature, weather: fallbackWeatherDescription(weatherCode), maximum, minimum };
  };
  const loadForecast = async () => {
    try {
      let data;
      try {
        data = await getOpenMeteoForecast();
      } catch (error) {
        console.warn('Open-Meteo no respondió; se intentará el servicio alternativo.', error);
        data = await getFallbackForecast();
      }

      icon.className = `fa-solid ${data.weather.icon} weather-widget-icon`;
      condition.textContent = `${data.weather.text} · ${Math.round(data.currentTemperature)}°C`;
      temperatures.textContent = `Máx. ${Math.round(data.maximum)}° · mín. ${Math.round(data.minimum)}°`;
      widget.title = `Pronóstico de hoy para San Fernando de Apure: ${data.weather.text}, ${Math.round(data.currentTemperature)}°C. Máxima ${Math.round(data.maximum)}°, mínima ${Math.round(data.minimum)}°.`;
    } catch (error) {
      console.error('No se pudo cargar el pronóstico del clima:', error);
      condition.textContent = 'Pronóstico no disponible';
      temperatures.textContent = 'Inténtalo más tarde';
    }
  };

  loadForecast();
  window.setInterval(loadForecast, 30 * 60 * 1000);
})();
