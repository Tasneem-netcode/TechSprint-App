const rc = require('../../services/riskCalculator');

export const calculateOverallRisk = rc.calculateOverallRisk;
export const generateForecast = rc.generateForecast;
export default rc;
// CommonJS compatibility
module.exports = rc;