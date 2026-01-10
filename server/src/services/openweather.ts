const svc = require('../../services/openweather');
export const getCurrentWeather = svc.getCurrentWeather;
export const getWeatherForecast = svc.getWeatherForecast;
export default svc;
module.exports = svc;