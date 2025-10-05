const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const port = 3001;

// Assuming OPENAI_API_KEY is correctly set in your .env file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Helper function to format numbers cleanly
const safeNum = (val, digits = 0) =>
  typeof val === "number"
    ? val.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "N/A";

app.post("/api/generate-recommendations", async (req, res) => {
  const { diameterM, speedKms, angleDeg, kpisBase, kpisMit, strategy, impact } = req.body;

  // Safety check for impact location
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
DO NOT use Markdown formatting (no asterisks, underscores, or hashes). 
Write section titles as plain text followed by a colon. 
Use simple sentences and line breaks for readability.

1. Geospatial & Industrial Risk Assessment:
    - Specific Location: State the inferred Country, City, and the provided Lat/Lng.
    - Industry List: Based on the location, list 3-4 specific industrial sectors (e.g., Oil Refinery, Major International Airport, Chemical Storage Facility) within the damage radius. If possible, list a plausible major company/entity that operates in that area.
    - Secondary Hazard: Analyze how damage to these industries could intensify the crisis (e.g., secondary fire, toxic plume).
    - Preventive Measures: List 3 immediate, specific preventive measures for these industries.

2. Deflection Strategy & Targeting:
    - Optimal Deflection Direction: Recommend an optimal deflection direction (e.g., North, South, East, West) and a safe target zone (e.g., Mid-Pacific, Siberian Tundra, Sahara Desert).
    - Justification: Explain the chosen target area based on maximizing ocean/uninhabited land impact and minimizing population risk.
    - Technical Challenge: Provide a high-level comment on the technical challenge (low/medium/high difficulty) of the required delta-V to achieve this deflection.

3. Tiered Response by Damage Radius:
    - Severe Radius (${safeNum(kpisBase?.severe, 1)} km): Top 3-4 actions focused on evacuation and survival.
    - Major Radius (${safeNum(kpisBase?.major, 1)} km): Top 3-4 actions focused on emergency services mobilization and critical infrastructure securing.
    - Light Radius (${safeNum(kpisBase?.light, 1)} km): Top 3-4 actions focused on public health alerts, communication, and resource staging.

4. Long-Term Strategic Planning:
    - What are the top 2 actions if we have Long Lead Time (> 5 years)? (Focus on planetary defense investment and large-scale fragmentation/deflection).
    - What are the top 2 actions if we have Short Lead Time (< 6 months)? (Focus on mass casualty prep and maximizing self-evacuation).
    - If the size were >1 km (a Mega-Impactor), what is the single most critical global action? (Focus on civilizational preservation).

Keep the entire response under 500 words.
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini", // fast and cost-effective
    });

    let recommendations = completion.choices[0].message.content;

    // 🔑 Post-processing: remove all markdown-style symbols for clean text
    recommendations = recommendations
      .replace(/\*\*(.*?)\*\*/g, "$1") // remove bold **
      .replace(/\*(.*?)\*/g, "$1")     // remove italic *
      .replace(/_(.*?)_/g, "$1")       // remove underscores
      .replace(/#+\s/g, "");           // remove markdown headers

    res.json({
      success: true,
      data: {
        asteroidReport: recommendations.trim(),
      },
    });
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    res.status(500).json({ success: false, error: "Failed to generate recommendations" });
  }
});

app.listen(port, () => {
  console.log(`✅ Backend running at http://localhost:${port}`);
});
