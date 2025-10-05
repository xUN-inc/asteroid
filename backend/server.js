// backend/index.js
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Ensure the OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ERROR: OPENAI_API_KEY not set in environment");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors({ origin: "*" })); // adjust origins in production
app.use(express.json());

// Helper function to format numbers cleanly
const safeNum = (val, digits = 0) =>
  typeof val === "number"
    ? val.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "N/A";

// Input validation middleware
const validateInput = (req, res, next) => {
  const { diameterM, speedKms, angleDeg } = req.body;
  if (!diameterM || !speedKms || !angleDeg) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: diameterM, speedKms, angleDeg",
    });
  }
  next();
};

// Main API route
app.post("/api/generate-recommendations", validateInput, async (req, res) => {
  const { diameterM, speedKms, angleDeg, kpisBase, kpisMit, strategy, impact } = req.body;

  const lat = impact?.lat || "N/A";
  const lng = impact?.lng || "N/A";

  const prompt = `
Generate a highly specific, four-part strategic asteroid impact report tailored for decision-makers.

Impact Location Details:
- Predicted Impact Site (Lat/Lng): ${safeNum(lat, 4)}, ${safeNum(lng, 4)}
- INFERENCE REQUIRED: Based solely on these coordinates, what is the Country and nearest major City of the impact site?

Asteroid Parameters:
- Diameter: ${safeNum(diameterM)} meters
- Speed: ${safeNum(speedKms)} km/s
- Impact Angle: ${safeNum(angleDeg)} degrees

Impact Analysis (No Mitigation):
- Population in Severe Damage Radius: ${safeNum(kpisBase?.pop)}
- Estimated Fatalities: ${safeNum(kpisBase?.deaths)}
- Severe Damage Radius: ${safeNum(kpisBase?.severe, 2)} km
- Major Damage Radius: ${safeNum(kpisBase?.major, 2)} km

Proposed Mitigation Strategy:
- Strategy: ${strategy}
- Population in Severe Damage Radius (Mitigated): ${safeNum(kpisMit?.pop)}
- Estimated Fatalities (Mitigated): ${safeNum(kpisMit?.deaths)}

Instructions:
Based on the data and the inferred location, generate a detailed report with the following four sections. 
DO NOT use Markdown formatting. Write section titles as plain text followed by line breaks.

1. Geospatial & Industrial Risk Assessment:
    - Specific Location: State the inferred Country, City, and the provided Lat/Lng.
    - Industry List: 3-4 industrial sectors within the damage radius. Include plausible major companies/entities.
    - Secondary Hazard: Analyze how damage could intensify the crisis.
    - Preventive Measures: List 3 immediate measures.

2. Deflection Strategy & Targeting:
    - Optimal Deflection Direction: Recommend deflection direction and safe target zone.
    - Justification: Explain chosen target area based on minimizing population risk.
    - Technical Challenge: Comment on technical difficulty of required delta-V.

3. Tiered Response by Damage Radius:
    - Severe Radius (${safeNum(kpisBase?.severe, 1)} km): Top 3-4 actions for evacuation and survival.
    - Major Radius (${safeNum(kpisBase?.major, 1)} km): Top 3-4 actions for emergency services and infrastructure.
    - Light Radius (${safeNum(kpisBase?.light, 1)} km): Top 3-4 actions for public health alerts and communication.

4. Long-Term Strategic Planning:
    - Long Lead Time (>5 years): Top 2 actions for planetary defense.
    - Short Lead Time (<6 months): Top 2 actions for mass casualty prep.
    - Mega-Impactor (>1 km): Single most critical global action.

Keep the response under 500 words.
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
    });

    let recommendations = completion.choices[0].message.content;

    // Remove markdown symbols for clean text
    recommendations = recommendations
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/#+\s/g, "");

    res.json({
      success: true,
      data: {
        asteroidReport: recommendations.trim(),
      },
    });
  } catch (error) {
    console.error("❌ Error calling OpenAI API:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate recommendations",
      details: error.message,
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Backend running at http://localhost:${port}`);
  console.log(`🌐 API endpoint: http://localhost:${port}/api/generate-recommendations`);
});
