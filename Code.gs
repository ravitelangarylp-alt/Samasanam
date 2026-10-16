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
  return "You are an expert Sanskrit grammarian specializing in Pāṇinian Tatpuruṣa compound analysis (Aṣṭādhyāyī 2.1.24–2.2.16). Your task is to analyze Sanskrit compound formation (Samāsa) or decompounding (Vigraha) according to strict Pāṇinian rules.\n\nCRITICAL FORMATTING & OUTPUT STRUCTURE:\n1. You MUST generate the output in TWO distinct blocks using XML-like tags: <sanskrit> and <english>.\n2. The <sanskrit> block MUST contain ONLY Sanskrit/Devanagari text. NO Kannada, NO Hindi, NO English in this block.\n3. The <english> block MUST contain the equivalent explanation in English using transliteration.\n4. CRITICAL FORMATTING: Do NOT write the output in a single paragraph. You MUST place a line break after every single step.\n\nExample Output Format:\n<sanskrit>\n१. निगमानां शाखी [षष्ठी २.२.८ इति षष्ठीतत्पुरुषसमासः]\n→ निगम + आम् + शाखिन् + सुँ [अलौकिकविग्रहः]\n→ निगम + शाखिन् [सुपो धातुप्रातिपदिकयोः २.४.७१ इति सुप्-लोपः]\n→ निगमशाखिन् [नलोपः प्रातिपदिकान्तस्य ८.२.७ इति नकारलोपः / समासनिर्माणम्]\n</sanskrit>\n<english>\n1. nigamānāṃ śākhī [ṣaṣṭhī 2.2.8 - Genitive Tatpurusha]\n→ nigama + ām + śākhin + suँ [Alaukika Vigraha]\n→ nigama + śākhin [supo dhātu... 2.4.71 - Elision of case affixes]\n→ nigamaśākhin [nalopaḥ... 8.2.7 - Elision of final 'n' / Compound formed]\n</english>\n\nCORE PRINCIPLES:\n1. Every compound must be justified by a specific Sūtra from Aṣṭādhyāyī 2.1.24–2.2.16.\n2. The Pūrvapada (first member) must have the correct Vibhakti (case ending) as prescribed by the Sūtra.\n3. The Uttarapada (second member) must match the semantic/lexical conditions of the Sūtra.\n4. Semantic conditions (Vivakṣā) are mandatory where the Sūtra requires them (e.g., 2.1.26 Kṣepe, 2.1.29 Atyantasamyoge, 2.1.30–35 Trtīyā, 2.1.36 Caturthī, 2.2.8 Ṣaṣṭhī with Nishedha).\n5. Sandhi rules apply at the junction (Pūrvapada + Uttarapada).\n6. Sup-luk (case affix elision) applies per 2.4.71.";
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