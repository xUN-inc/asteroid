const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const port = 3001;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

const safeNum = (val, digits = 0) =>
  typeof val === "number"
    ? val.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "N/A";

app.post("/api/generate-recommendations", async (req, res) => {
  const { diameterM, speedKms, angleDeg, kpisBase, kpisMit, strategy } = req.body;

  const prompt = `
Generate a concise, three-part asteroid impact mitigation report for decision-makers.

**Asteroid Parameters:**
- Diameter: ${safeNum(diameterM)} meters
- Speed: ${safeNum(speedKms)} km/s
- Impact Angle: ${safeNum(angleDeg)} degrees

**Impact Analysis (No Mitigation):**
- Population in Severe Damage Radius: ${safeNum(kpisBase?.pop)}
- Estimated Fatalities: ${safeNum(kpisBase?.deaths)}
- Severe Damage Radius: ${safeNum(kpisBase?.severe, 2)} km
- Major Damage Radius: ${safeNum(kpisBase?.major, 2)} km
- Light Damage Radius: ${safeNum(kpisBase?.light, 2)} km

**Proposed Mitigation Strategy:**
- Strategy: ${strategy}
- Population in Severe Damage Radius (Mitigated): ${safeNum(kpisMit?.pop)}
- Estimated Fatalities (Mitigated): ${safeNum(kpisMit?.deaths)}

**Instructions:**
Based on the data above, generate a report with the following three sections:
1. **Immediate Response Actions:** What are the top 3-4 most critical, immediate actions for emergency services? (e.g., evacuation zones, tsunami/earthquake warnings, industrial safety protocols). Be specific.
2. **Mitigation Strategy Analysis:** Briefly analyze the effectiveness of the proposed '${strategy}' strategy. Is it sufficient? What are the key considerations or trade-offs?
3. **Long-Term Considerations:** What are 2-3 key long-term (1-5 years) recovery and infrastructure challenges to anticipate? (e.g., supply chain disruption, environmental impact, economic rebuilding).

Keep the entire response under 300 words.
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini", // cheaper & faster
    });

    const recommendations = completion.choices[0].message.content;
    res.json({
      success: true,
      data: {
        asteroidReport: recommendations,
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
