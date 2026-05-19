// WeatherApp.jsx
import React, { useState } from 'react';

function WeatherApp() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);

  function getWeather() {
    // Mock weather data
    const mockWeather = {
      main: { temp: 22 },
      weather: [{ description: 'clear sky' }]
    };
    setWeather(mockWeather);
  }

  return (
    <div>
      <h2>Weather App (Demo)</h2>
      <input
        type="text"
        value={city}
        onChange={e => setCity(e.target.value)}
        placeholder="Enter city"
      />
      <button onClick={getWeather}>Get Weather</button>
      {weather && (
        <div>
          <p>Temperature: {weather.main.temp}°C</p>
          <p>Condition: {weather.weather[0].description}</p>
        </div>
      )}
    </div>
  );
}

export default WeatherApp;