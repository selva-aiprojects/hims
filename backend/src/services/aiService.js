const { GoogleGenerativeAI } = require('@google/genai');
const fs = require('fs');

// Note: @google/genai uses process.env.GEMINI_API_KEY by default if not passed.
const ai = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' 
  ? new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY }) 
  : null;

/**
 * Helper to upload a local file to Gemini's File API for processing
 */
async function uploadToGemini(filePath, mimeType) {
  if (!ai) return null;
  // Upload the file to Gemini using the File API
  // Using the REST approach for @google/genai, or just pass base64 for small images.
  // For robustness across PDFs and images, let's use the base64 inline data format for now.
  // Note: Large PDFs (>20MB) require the File API, but base64 is fine for standard records.
  
  const fileBuffer = fs.readFileSync(filePath);
  return {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType: mimeType
    }
  };
}

/**
 * Generate Patient History Summary from uploaded documents
 */
async function generatePatientHistorySummary(filePaths) {
  if (!ai) return "AI Summary unavailable: GEMINI_API_KEY not configured.";

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Prepare files as parts
    const fileParts = [];
    for (const file of filePaths) {
      let mimeType = 'application/pdf';
      if (file.endsWith('.jpg') || file.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (file.endsWith('.png')) mimeType = 'image/png';
      
      const part = await uploadToGemini(file, mimeType);
      if (part) fileParts.push(part);
    }

    const prompt = `
    You are an expert clinical AI assistant. Review the attached historical patient medical records (prescriptions, discharge summaries, lab reports).
    Extract and summarize the following in a highly concise, professional medical format:
    1. Past Medical History (PMH)
    2. Surgical History
    3. Chronic Medications
    4. Allergies
    5. Notable Family History or Risk Factors
    
    Keep it extremely brief, bulleted, and ready to be displayed at the top of a doctor's chart. Do not include a greeting.
    `;

    const result = await model.generateContent([prompt, ...fileParts]);
    return result.response.text();
  } catch (error) {
    console.error("[AI] Error generating history summary:", error);
    return "Error generating AI summary.";
  }
}

/**
 * Generate IPD Discharge Summary from clinical notes and admission data
 */
async function generateDischargeSummary(patientData, admissionData, notes, labs) {
  if (!ai) return "AI Summary unavailable: GEMINI_API_KEY not configured.";

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
    You are an expert attending physician. Draft a structured Hospital Discharge Summary based on the following raw data.
    
    Patient: ${patientData.name}, Age: ${patientData.age}, Gender: ${patientData.gender}, MRN: ${patientData.mrn}
    Admission Reason: ${admissionData.admission_reason}
    Admitted At: ${admissionData.admitted_at}
    Discharged At: ${new Date().toISOString()}
    
    Clinical Notes (Chronological):
    ${notes.map(n => `[${n.created_at}] (${n.note_type}) - ${n.note_text}`).join('\n')}
    
    Format the summary with the following clear headers:
    1. Primary Diagnosis
    2. Brief History of Presenting Illness
    3. Hospital Course (Summarize the clinical notes)
    4. Condition on Discharge
    5. Discharge Medications
    6. Follow-up Instructions
    
    Keep it professional, medically accurate, and concise. Do not hallucinate any medications or findings not present in the notes.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("[AI] Error generating discharge summary:", error);
    return "Error generating AI Discharge Summary.";
  }
}

/**
 * Parse an external lab report (PDF/Image) using Gemini Vision/OCR.
 * Extracts structured lab results and identifies abnormal findings.
 */
async function parseExternalLabReport(filePath) {
  if (!ai) return { error: "AI Summary unavailable: GEMINI_API_KEY not configured." };

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });

    let mimeType = 'application/pdf';
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (filePath.endsWith('.png')) mimeType = 'image/png';
    
    const filePart = await uploadToGemini(filePath, mimeType);
    if (!filePart) return { error: "Failed to read file." };

    const prompt = `
    You are an expert clinical pathologist and AI extraction tool. 
    Review the attached external lab report and extract the structured data.
    
    Return ONLY a valid JSON object with the following schema:
    {
      "test_date": "YYYY-MM-DD (if found, else null)",
      "lab_name": "Name of the external lab (if found)",
      "results": [
        {
          "test_name": "e.g., Hemoglobin",
          "value": "e.g., 11.2",
          "unit": "e.g., g/dL",
          "reference_range": "e.g., 12.0-15.5",
          "is_abnormal": true/false (based on the reference range and value)
        }
      ],
      "clinical_interpretation": "A 1-2 sentence clinical summary of the findings, highlighting any critical abnormals."
    }
    
    Ensure the output is raw JSON without any markdown formatting like \`\`\`json.
    `;

    const result = await model.generateContent([prompt, filePart]);
    const rawText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      return JSON.parse(rawText);
    } catch (e) {
      console.error("[AI] Failed to parse JSON from Gemini:", rawText);
      return { error: "AI returned invalid JSON format." };
    }
  } catch (error) {
    console.error("[AI] Error parsing lab report:", error);
    return { error: "Error parsing lab report with AI." };
  }
}

module.exports = {
  generatePatientHistorySummary,
  generateDischargeSummary,
  parseExternalLabReport
};
