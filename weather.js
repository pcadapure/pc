(() => {
  const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=7.89&longitude=-67.47&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FCaracas&forecast_days=1';
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
  const loadForecast = async () => {
    try {
      const response = await fetch(WEATHER_URL);
      if (!response.ok) throw new Error(`El servicio meteorológico respondió HTTP ${response.status}`);
      const forecast = await response.json();
      const currentTemperature = forecast.current?.temperature_2m;
      const weatherCode = forecast.current?.weather_code;
      const maximum = forecast.daily?.temperature_2m_max?.[0];
      const minimum = forecast.daily?.temperature_2m_min?.[0];
      if (![currentTemperature, weatherCode, maximum, minimum].every(Number.isFinite)) {
        throw new Error('La respuesta meteorológica está incompleta.');
      }

      const weather = weatherDescription(weatherCode);
      icon.className = `fa-solid ${weather.icon} weather-widget-icon`;
      condition.textContent = `${weather.text} · ${Math.round(currentTemperature)}°C`;
      temperatures.textContent = `Máx. ${Math.round(maximum)}° · mín. ${Math.round(minimum)}°`;
      widget.title = `Pronóstico de hoy para San Fernando de Apure: ${weather.text}, ${Math.round(currentTemperature)}°C. Máxima ${Math.round(maximum)}°, mínima ${Math.round(minimum)}°.`;
    } catch (error) {
      console.error('No se pudo cargar el pronóstico del clima:', error);
      condition.textContent = 'Pronóstico no disponible';
      temperatures.textContent = 'Inténtalo más tarde';
    }
  };

  loadForecast();
  window.setInterval(loadForecast, 30 * 60 * 1000);
})();
