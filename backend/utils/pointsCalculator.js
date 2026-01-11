/**
 * Points and Coin Distribution Calculator
 * Calculates shower points and coin rewards based on optimal range
 */

/**
 * Calculate points for a shower (100 total: 80 for time, 20 for temperature)
 * @param {number} actualTime - Actual shower duration in seconds
 * @param {number} actualTemp - Actual shower temperature in Celsius
 * @param {Object} idealRange - { min: number, max: number } optimal time range in seconds
 * @param {number} idealTemp - Optimal temperature in Celsius
 * @returns {number} Points out of 100
 */
export function calculateShowerPoints(actualTime, actualTemp, idealRange, idealTemp) {
  // Time points (80 points max)
  const timePoints = calculateTimePoints(actualTime, idealRange);
  
  // Temperature points (20 points max)
  const tempPoints = calculateTemperaturePoints(actualTemp, idealTemp);
  
  return Math.round(timePoints + tempPoints);
}

/**
 * Calculate time-based points (0-80 points)
 * @param {number} actualTime - Actual shower duration in seconds
 * @param {Object} idealRange - { min: number, max: number } optimal range
 * @returns {number} Points from 0-80
 */
function calculateTimePoints(actualTime, idealRange) {
  const { min, max } = idealRange;
  const midPoint = (min + max) / 2;
  const range = max - min;
  
  // Perfect score if within optimal range
  if (actualTime >= min && actualTime <= max) {
    // Calculate how close to center (perfect = 80, edges = slightly less)
    const distanceFromCenter = Math.abs(actualTime - midPoint);
    const maxDistance = range / 2;
    // Linear scale: center = 80, edges = 70
    return 80 - (distanceFromCenter / maxDistance) * 10;
  }
  
  // Outside optimal range - calculate penalty
  if (actualTime < min) {
    // Below minimum
    const distanceBelow = min - actualTime;
    const penaltyRatio = distanceBelow / min; // How far below as ratio
    // Max 50 points if just below, 0 points if 30% or more below
    if (penaltyRatio >= 0.3) return 0; // 30% below = 0 points
    return Math.max(0, 50 - (penaltyRatio / 0.3) * 50);
  } else {
    // Above maximum
    const distanceAbove = actualTime - max;
    const penaltyRatio = distanceAbove / max; // How far above as ratio
    // Max 50 points if just above, 0 points if 70% or more above (170% total)
    if (penaltyRatio >= 0.7) return 0; // 70% above = 0 points (170% total)
    return Math.max(0, 50 - (penaltyRatio / 0.7) * 50);
  }
}

/**
 * Calculate temperature-based points (0-20 points)
 * @param {number} actualTemp - Actual temperature in Celsius
 * @param {number} idealTemp - Optimal temperature in Celsius (38°C = 90-100°F)
 * @returns {number} Points from 0-20
 */
function calculateTemperaturePoints(actualTemp, idealTemp) {
  const tempRange = 2; // ±2°C tolerance (roughly ±3-4°F)
  const distance = Math.abs(actualTemp - idealTemp);
  
  if (distance <= tempRange) {
    // Within optimal range
    return 20 - (distance / tempRange) * 5; // Perfect = 20, at edge = 15
  } else {
    // Outside optimal range - penalty
    const excessDistance = distance - tempRange;
    return Math.max(0, 15 - excessDistance * 2); // Decrease by 2 points per degree
  }
}

/**
 * Calculate CleanEnv (Environmental) coin rewards
 * Rules (in order of priority):
 * - 30% below optimal (below 70% of min): 0 coins
 * - 170% above optimal (above 170% of max): 0 coins
 * - Over limit (above max): 0 coins (environmental protection)
 * - Within optimal range (min to max): 2 coins (best performance)
 * - Optimal + 10% or less (within 110% of max, but already disqualified if above max): 1 coin
 * 
 * Note: "Over the limit" (above max) means 0 environmental coins for conservation.
 * However, we check "optimal + 10% or less" first to allow 1 coin if within tolerance.
 * 
 * @param {number} actualTime - Actual shower duration in seconds
 * @param {Object} idealRange - { min: number, max: number } optimal range
 * @returns {number} Number of CleanEnv coins (0, 1, or 2)
 */
export function calculateCleanEnvCoins(actualTime, idealRange) {
  const { min, max } = idealRange;
  
  // 30% below optimal (below 70% of min): 0 coins
  const minThreshold = min * 0.7;
  if (actualTime < minThreshold) {
    return 0;
  }
  
  // 170% above optimal (above 170% of max): 0 coins
  const maxThreshold = max * 1.7;
  if (actualTime > maxThreshold) {
    return 0;
  }
  
  // Within optimal range (min to max): 2 coins (best performance)
  if (actualTime >= min && actualTime <= max) {
    return 2;
  }
  
  // Optimal + 10% or less (within 110% of max): 1 coin
  // This allows some tolerance above max for environmental coins
  if (actualTime > max && actualTime <= max * 1.1) {
    return 1;
  }
  
  // Over limit (above 110% of max but below 170% threshold): 0 coins
  // This enforces the "over the limit = no environmental coins" rule
  if (actualTime > max * 1.1) {
    return 0;
  }
  
  // Otherwise (between min threshold and min, but not in optimal range): 0 coins
  return 0;
}

/**
 * Calculate SoapToken (Shower) coin rewards
 * Rules:
 * - Over limit (above max): 0 coins
 * - Within 20% range of optimal (min*0.8 to max*1.2): 2 coins
 * - Optimal + 10% or less (within 110% of max): 1 coin
 * - 30% below optimal (below 70% of min): 0 coins
 * - 170% above optimal (above 170% of max): 0 coins
 * 
 * @param {number} actualTime - Actual shower duration in seconds
 * @param {Object} idealRange - { min: number, max: number } optimal range
 * @returns {number} Number of SoapToken coins (0, 1, or 2)
 */
export function calculateSoapTokenCoins(actualTime, idealRange) {
  const { min, max } = idealRange;
  
  // Over limit (above max): 0 coins
  if (actualTime > max) {
    return 0;
  }
  
  // 30% below optimal (below 70% of min): 0 coins
  const minThreshold = min * 0.7;
  if (actualTime < minThreshold) {
    return 0;
  }
  
  // 170% above optimal (above 170% of max): 0 coins
  const maxThreshold = max * 1.7;
  if (actualTime > maxThreshold) {
    return 0;
  }
  
  // Within 20% range of optimal (80% to 120% of range): 2 coins
  // This means: min*0.8 to max*1.2
  const rangeLowerBound = min * 0.8;
  const rangeUpperBound = max * 1.2;
  
  if (actualTime >= rangeLowerBound && actualTime <= rangeUpperBound) {
    return 2;
  }
  
  // Optimal + 10% or less (max to 110% of max): 1 coin
  if (actualTime > max && actualTime <= max * 1.1) {
    return 1;
  }
  
  // Otherwise (between thresholds but not in ranges above): 0 coins
  return 0;
}

/**
 * Calculate all shower metrics (points and coins)
 * @param {number} actualTime - Actual shower duration in seconds
 * @param {number} actualTemp - Actual shower temperature in Celsius
 * @param {Object} idealRange - { min: number, max: number } optimal range
 * @param {number} idealTemp - Optimal temperature in Celsius
 * @returns {Object} { points, cleanEnvCoins, soapTokenCoins }
 */
export function calculateShowerMetrics(actualTime, actualTemp, idealRange, idealTemp) {
  const points = calculateShowerPoints(actualTime, actualTemp, idealRange, idealTemp);
  const cleanEnvCoins = calculateCleanEnvCoins(actualTime, idealRange);
  const soapTokenCoins = calculateSoapTokenCoins(actualTime, idealRange);
  
  return {
    points,
    cleanEnvCoins,
    soapTokenCoins,
  };
}

