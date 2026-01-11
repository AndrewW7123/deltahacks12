import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generate a weekly schedule graph description using Gemini AI
 * @param {Array} weeklyData - Array of daily shower data for the past 7 days
 * @returns {Promise<string>} - Graph description or "not enough data" message
 */
export async function generateWeeklyScheduleGraph(weeklyData) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not set");
    }

    // Check if we have enough data (at least 3 days with data)
    const daysWithData = weeklyData.filter((day) => day.showerCount > 0).length;
    if (daysWithData < 3) {
      return "not enough data";
    }

    // Prepare data for Gemini
    const dataSummary = weeklyData.map((day) => ({
      date: day.date,
      showerCount: day.showerCount,
      totalPoints: day.totalPoints,
      avgDuration: day.showers.length > 0
        ? Math.round(
            day.showers.reduce((sum, s) => sum + s.time, 0) / day.showers.length / 60
          )
        : 0,
      avgTemp: day.showers.length > 0
        ? Math.round(
            (day.showers.reduce((sum, s) => sum + s.temperature, 0) / day.showers.length) * 10
          ) / 10
        : 0,
    }));

    // Consistent prompt for Gemini
    const prompt = `You are a data visualization expert. Based on the following weekly shower schedule data, create a concise text description of the user's weekly shower patterns in the style of a graph/chart summary.

Weekly Shower Data:
${JSON.stringify(dataSummary, null, 2)}

Please provide a brief, informative description (2-3 sentences) that summarizes:
- The pattern of shower frequency throughout the week
- Average duration and temperature trends
- Any notable patterns or insights

Format the response as plain text, suitable for display in a user interface. Do not use markdown formatting or special characters.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt }
      ],
      config: {
        responseMimeType: "text/plain",
      }
    });

    const graphDescription = response.text?.trim() || "not enough data";

    return graphDescription;
  } catch (error) {
    console.error("Error generating weekly schedule graph:", error);
    return "not enough data";
  }
}

