// backend/index.js
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// ✅ Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ERROR: OPENAI_API_KEY not set in environment");
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors({ origin: "*" })); // adjust in production
app.use(express.json());

// Helper function to format numbers
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

// Main API endpoint
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
Generate the report with four sections (Geospatial Risk, Deflection Strategy, Tiered Response, Long-Term Planning). 
Use plain text only, no markdown. Keep under 500 words.
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
    });

    let recommendations = completion.choices[0].message.content;

    // Remove markdown symbols
    recommendations = recommendations
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/#+\s/g, "");

    res.json({ success: true, data: { asteroidReport: recommendations.trim() } });
  } catch (error) {
    console.error("❌ Error calling OpenAI API:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate recommendations",
      details: error.message,
    });
  }
});

// Start server on all interfaces
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Backend running at http://0.0.0.0:${port}`);
  console.log(`🌐 API endpoint: http://<VM_PUBLIC_IP>:${port}/api/generate-recommendations`);
});
