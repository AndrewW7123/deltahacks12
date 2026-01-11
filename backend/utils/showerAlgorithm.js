/**
 * Calculates optimal shower goals based on user profile data
 * @param {Object} profile - User profile with physical characteristics
 * @param {number} profile.heightFeet - Height in feet
 * @param {number} profile.heightInches - Additional height in inches
 * @param {number} profile.weightLbs - Weight in pounds
 * @param {string} profile.hairLength - 'BALD', 'SHORT', 'MEDIUM', or 'LONG'
 * @param {string} profile.hairType - 'STRAIGHT' or 'CURLY'
 * @returns {Object} - { idealTimeRange: { min: number, max: number }, idealTemp: number }
 */
export function calculateShowerGoals(profile) {
  const { heightFeet = 0, heightInches = 0, weightLbs = 0, hairLength, hairType } = profile;

  // 1. Body Category Logic
  // Convert height to total inches
  const totalHeightInches = heightFeet * 12 + heightInches;

  let bodyRange;
  if (totalHeightInches < 64 && weightLbs < 120) {
    // Small: < 64" AND < 120lbs -> Range: [300, 420] seconds (5-7 min)
    bodyRange = { min: 300, max: 420 };
  } else if (totalHeightInches > 70 || weightLbs > 180) {
    // Large: > 70" OR > 180lbs -> Range: [420, 600] seconds (7-10 min)
    bodyRange = { min: 420, max: 600 };
  } else {
    // Average: Everyone else -> Range: [360, 540] seconds (6-9 min)
    bodyRange = { min: 360, max: 540 };
  }

  // 2. Hair Category Logic
  let hairRange;

  if (hairLength === "BALD") {
    // Bald/Very Short -> Range: [240, 360] seconds (4-6 min)
    hairRange = { min: 240, max: 360 };
  } else if (hairLength === "SHORT") {
    // Short (Ear-length) -> Range: [300, 420] seconds (5-7 min)
    hairRange = { min: 300, max: 420 };
  } else if (hairLength === "MEDIUM") {
    // Medium (Shoulder) -> Range: [360, 540] seconds (6-9 min)
    hairRange = { min: 360, max: 540 };
  } else if (hairLength === "LONG" || hairType === "CURLY") {
    // Long OR Curly -> Range: [480, 720] seconds (8-12 min)
    hairRange = { min: 480, max: 720 };
  } else {
    // Default fallback (shouldn't happen with proper enum validation)
    hairRange = { min: 300, max: 420 };
  }

  // 3. Final Calculation: Take MAX of Body Min vs Hair Min, and Body Max vs Hair Max
  const finalRange = {
    min: Math.max(bodyRange.min, hairRange.min),
    max: Math.max(bodyRange.max, hairRange.max),
  };

  // 4. Temperature: Set to 38 Celsius (optimal 90-100°F range)
  const idealTemp = 38;

  return {
    idealTimeRange: finalRange,
    idealTemp: idealTemp,
  };
}

