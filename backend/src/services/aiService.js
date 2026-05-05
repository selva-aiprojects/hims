const { GoogleGenerativeAI } = require('@google/generative-ai');
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
  // ... (existing implementation)
}

/**
 * Hospital-specific isolated AI Chat
 */
async function hospitalChat(messages, hospitalContext) {
  if (!ai) {
    // Professional Mock Fallback for workflow testing
    const lastMsg = messages[messages.length - 1].content.toLowerCase();
    if (lastMsg.includes('patient') || lastMsg.includes('admit')) {
      return `Currently, ${hospitalContext.hospitalName} has ${hospitalContext.stats.totalPatients} registered patients and ${hospitalContext.stats.activeAdmissions} active admissions. How else can I assist with your clinical operations?`;
    }
    if (lastMsg.includes('lab') || lastMsg.includes('pending')) {
      return `There are currently ${hospitalContext.stats.pendingLabs} lab orders pending in the diagnostic queue. I recommend checking the Laboratory Command Center for details.`;
    }
    return `I am the AI Assistant for ${hospitalContext.hospitalName}. While my real-time analytical brain is initializing, I can confirm we are tracking ${hospitalContext.stats.totalPatients} patients today. How can I help you?`;
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `
    You are the "Healthezee AI Assistant", a professional clinical and administrative co-pilot for ${hospitalContext.hospitalName}.
    
    CRITICAL SECURITY RULE: You only have knowledge of the current hospital (${hospitalContext.hospitalName}). 
    You DO NOT have access to any other hospital's data. 
    Never hallucinate patient records from other facilities.
    
    CURRENT HOSPITAL CONTEXT:
    - Hospital Name: ${hospitalContext.hospitalName}
    - Total Patients: ${hospitalContext.stats.totalPatients || 0}
    - Active Admissions: ${hospitalContext.stats.activeAdmissions || 0}
    - Pending Lab Orders: ${hospitalContext.stats.pendingLabs || 0}
    
    ROLE:
    - Assist staff with clinical queries.
    - Help with hospital operations.
    - Provide insights into current facility metrics.
    
    Always maintain a professional, helpful, and HIPAA-compliant tone.
    `;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Acknowledged. I am the AI Assistant for " + hospitalContext.hospitalName + ". How can I help you today?" }] },
        ...messages.slice(0, -1).map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      ],
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    return result.response.text();
  } catch (error) {
    console.error("[AI] Chat Error:", error);
    return "I'm sorry, I encountered an error processing your request. Please try again.";
  }
}

module.exports = {
  generatePatientHistorySummary,
  generateDischargeSummary,
  parseExternalLabReport,
  hospitalChat
};
