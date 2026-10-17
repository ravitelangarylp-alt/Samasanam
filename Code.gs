function doPost(e) {
  var requestData;
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid JSON payload" })).setMimeType(ContentService.MimeType.JSON);
  }

  var action = requestData.action;
  var payload = requestData.payload;

  var result;
  if (action === "Combine") {
    result = handleGeminiRequest("combine", payload);
  } else if (action === "Split") {
    result = handleGeminiRequest("split", payload);
  } else {
    result = { error: "Unknown action: " + action };
  }

  return ContentService.createTextOutput(JSON.stringify({ result: result })).setMimeType(ContentService.MimeType.JSON);
}

function handleGeminiRequest(type, payload) {
  var geminiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!geminiKey) {
    return "ERROR: GEMINI_API_KEY not configured in Script Properties.";
  }

  var systemPrompt = getPaninianSystemPrompt();
  var userPrompt = buildUserPrompt(type, payload);

  var prompt = systemPrompt + "\n\n" + userPrompt;

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey;
  var options = {
    method: "post",
    headers: {
      "Content-Type": "application/json"
    },
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 }
    }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var responseBody = response.getContentText();

  if (responseCode !== 200) {
    return "ERROR: API request failed with status " + responseCode + ": " + responseBody;
  }

  return extractGeminiText(responseBody);
}

function extractGeminiText(responseBody) {
  try {
    var parsed = JSON.parse(responseBody);
    if (parsed.candidates && parsed.candidates.length > 0 &&
        parsed.candidates[0].content && parsed.candidates[0].content.parts &&
        parsed.candidates[0].content.parts.length > 0 && parsed.candidates[0].content.parts[0].text) {
      return parsed.candidates[0].content.parts[0].text;
    }
    return "ERROR: Unexpected response format from Gemini API";
  } catch (err) {
    return "ERROR: Failed to parse Gemini response: " + err.message;
  }
}

function getPaninianSystemPrompt() {
  return "You are a deterministic Paninian grammar engine. You must output the step-by-step Prakriya in BOTH Sanskrit and English.
   You must return ONLY a raw JSON object with two keys: 'sanskrit_html' and 'english_html'.
   The values MUST be HTML strings using this exact structure for EVERY step:
   <div class='step-row'><span class='arrow'>→</span> <span class='prakriya-word'>राजन् + ङस् + पुरुष + सुँ</span> <span class='sutra-box'>[<span class='sutra-name'>षष्ठी</span> <span class='sutra-num'>२.२.८</span>]</span></div>
   Do NOT use markdown (###, **). Return ONLY valid JSON.";
}

function buildUserPrompt(type, payload) {
  if (type === "combine") {
    var purva = payload.purva || "";
    var uttara = payload.uttara || "";
    var vivaksha = payload.vivaksha || "";
    return "COMBINE (Samāsa Generation):\nPūrvapada: " + purva + "\nUttarapada: " + uttara + "\nVivakṣā (Speaker's Intention): " + (vivaksha || "Not specified") + "\n\nAnalyze whether these two words can form a valid Tatpuruṣa compound per Pāṇinian rules. Identify the applicable Sūtra, verify all conditions (including Vibhakti, lexical match, and semantic Vivakṣā), apply Sandhi and Sup-luk, and provide the final Samasta-pada. If compounding is not permitted, explain exactly which rule fails and why.";
  } else if (type === "split") {
    var word = payload.word || "";
    var vivaksha = payload.vivaksha || "";
    return "SPLIT (Vigraha Analysis):\nSamasta-pada: " + word + "\nVivakṣā (Context): " + (vivaksha || "Not specified") + "\n\nDecompose this compound word into its Pūrvapada and Uttarapada. Identify the Pāṇinian Sūtra that licenses this compound, reconstruct the Vigraha-vākya (analytical phrase) with correct Vibhakti endings, explain the Sandhi/Pāda-operations that occurred, and verify the semantic condition (Vivakṣā). If multiple valid Vigrahas exist, list all with their respective Sūtras.";
  }
  return "";
}