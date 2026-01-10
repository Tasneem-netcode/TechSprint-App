const svc = require('../../services/gemini');
export const interpretConditions = svc.interpretConditions;
export const interpretForecast = svc.interpretForecast;
export const customInterpretation = svc.customInterpretation;
export default svc;
module.exports = svc;