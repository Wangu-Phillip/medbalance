/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Define the Gemini API secret parameter
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Initialize CORS
const corsHandler = cors({ origin: true });

/**
 * Cloud Function: generateStockAnalysis
 * Generates AI-powered stock predictions, forecasts, and recommendations using Gemini
 * POST /generateStockAnalysis
 * 
 * Request body:
 * {
 *   districtId: string,
 *   districtName: string,
 *   medicines: Array<{name, quantity, unit, expiryDate, allocatedQuantity}>,
 *   facilities: Array<{name, id}>,
 *   allocations: Array<{medicineName, facilityName, amount}>
 * }
 */
exports.generateStockAnalysis = onRequest(
  {
    secrets: [geminiApiKey],
    maxInstances: 10,
    timeoutSeconds: 60,
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        const { districtId, districtName, medicines, facilities, allocations } = req.body;

        if (!medicines || medicines.length === 0) {
          return res.status(400).json({ error: "No medicines data provided" });
        }

        logger.info("Generating stock analysis for district:", { districtId, districtName });

        // Prepare data summary for Gemini including available quantities
        const medicinesSummary = medicines.map(m => {
          const available = m.quantity - (m.allocatedQuantity || 0);
          return `${m.name}: Total=${m.quantity} ${m.unit}, Allocated=${m.allocatedQuantity || 0} ${m.unit}, Available=${available} ${m.unit}, Expiry=${m.expiryDate}`;
        }).join("\n");

        const facilitiesSummary = facilities.map(f => f.name).join("\n");

        const allocationsSummary = allocations.length > 0
          ? allocations.map(a => `${a.medicineName} → ${a.facilityName}: ${a.amount}`).join("\n")
          : "No allocations yet";

        // Create the prompt for Gemini - CRITICAL: emphasize using ACTUAL data only
        const prompt = `
You are a healthcare supply chain analyst. Analyze the following ACTUAL medicine inventory data and provide recommendations BASED SOLELY ON THE PROVIDED DATA.

CRITICAL INSTRUCTION: Use ONLY the provided real data from the database. DO NOT make assumptions, assume generic values, or invent monthly demand figures. All analysis MUST be derived from the actual inventory and allocation data provided.

DISTRICT: ${districtName}

CURRENT ACTUAL INVENTORY (real data from database):
${medicinesSummary}

ACTIVE FACILITIES:
${facilitiesSummary}

CURRENT ALLOCATIONS (actual records from database):
${allocationsSummary}

Use the above ACTUAL DATA to forecast the next 6 months. Base all recommendations on what you see in the current stock levels and allocation patterns. Respond with ONLY valid JSON (no markdown, no explanation):
{
  "demandForecast": [
    {"month": "Apr", "demand": number, "forecast": number},
    {"month": "May", "demand": number, "forecast": number},
    {"month": "Jun", "demand": number, "forecast": number},
    {"month": "Jul", "demand": number, "forecast": number},
    {"month": "Aug", "demand": number, "forecast": number},
    {"month": "Sep", "demand": number, "forecast": number}
  ],
  "stockLevels": [
    {"medicine": "name", "current": current_stock_from_data, "predicted": predicted_stock_level, "recommended": recommended_minimum},
    (Must include one entry for each medicine listed above in CURRENT ACTUAL INVENTORY)
  ],
  "allocationRecommendations": [
    {"medicine": "name", "currentStock": actual_current_quantity, "predictedDemand": projected_demand, "recommendedAllocation": quantity_to_allocate, "urgency": "critical|high|medium|low", "reason": "reason based on actual data provided"},
    (Must include one entry for each medicine listed above)
  ],
  "comparisonData": [
    {"medicine": "name", "demand": projected_demand, "supply": current_stock, "gap": projected_demand_minus_current_stock},
    (Must include one entry for each medicine)
  ],
  "insights": [
    "Specific insight about the actual stock levels provided",
    "Insight about allocation patterns based on actual data",
    "Recommendation based on the real inventory situation"
  ]
}
`;

        // Initialize Gemini with the secret API key
        const genAI = new GoogleGenerativeAI(geminiApiKey.value());
        // Using gemini-1.5-flash: faster, cheaper, and actively maintained
        // Alternatives: gemini-1.5-pro (more capable), gemini-2.0-flash (latest)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse the JSON response
        let analysisData;
        try {
          // Extract JSON from the response (in case there's extra text)
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error("No JSON found in response");
          }
          analysisData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          logger.error("Failed to parse Gemini response:", { error: parseError.message, response: responseText });
          return res.status(500).json({ 
            error: "Failed to parse AI analysis", 
            details: parseError.message 
          });
        }

        logger.info("Stock analysis generated successfully");
        return res.status(200).json({
          success: true,
          data: analysisData,
          generatedAt: new Date().toISOString()
        });

      } catch (error) {
        logger.error("Error in generateStockAnalysis:", { error: error.message });
        return res.status(500).json({ 
          error: "Failed to generate analysis",
          details: error.message 
        });
      }
    });
  }
);

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
