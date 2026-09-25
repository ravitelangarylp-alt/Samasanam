// ============================================================================
// PĀṆINIAN SAMĀSA ENGINE - PROTOTYPE v0.1 (Dvitiya, Tritiya, Chaturthi)
// ============================================================================

let lexiconData = [];
let rulesData = [];
let formIndex = new Map(); // ವೇಗವಾಗಿ ಪದಗಳನ್ನು ಹುಡುಕಲು Inverted Index
let pendingEvaluation = null;

// ಕಾಲವಾಚಕ ಪದಗಳ ಪಟ್ಟಿ (2.1.28 & 2.1.29 ಸೂತ್ರಗಳಿಗಾಗಿ)
const KALAVACHAKA_WORDS = new Set([
  "मास", "संवत्सर", "अहर्", "अहन्", "रात्रि", "दिवस", "मुहूर्त", "क्षण", "काल", "सप्ताह", "पक्ष", "ऋतु", "कल्प", "युग"
]);

// ಕ್ತ-ಪ್ರತ್ಯಯಾಂತ ಪದಗಳನ್ನು ಗುರುತಿಸಲು ಸಹಾಯಕ ಪಟ್ಟಿ ಮತ್ತು ಪ್ರತ್ಯಯಗಳು
const KNOWN_KTA_WORDS = new Set([
  "कृत", "आरूढ", "प्रमित", "भुक्त", "पीत", "गत", "आगत", "श्रित", "पतित", "अतीत", "प्राप्त", "आपन्न", "भिन्न", "हत", "दत्त", "उक्त", "बद्ध", "लब्ध"
]);

const SUP_PRATYAYA = {
  1: ["सु", "औ", "जस्"],
  2: ["अम्", "औट्", "शस्"],
  3: ["टा", "भ्याम्", "भिस्"],
  4: ["ङे", "भ्याम्", "भ्यस्"],
  5: ["ङसि", "भ्याम्", "भ्यस्"],
  6: ["ङस्", "ओस्", "आम्"],
  7: ["ङि", "ओस्", "सुप्"]
};

// 1. ಡೇಟಾಬೇಸ್ ಲೋಡ್ ಮಾಡುವುದು ಮತ್ತು ಇಂಡೆಕ್ಸ್ ನಿರ್ಮಿಸುವುದು
async function initEngine() {
  const statusEl = document.getElementById("engineStatus");
  try {
    statusEl.innerHTML = "⏳ `sanskrit_lexicon.json` ಮತ್ತು `samasa_rules.json` ಲೋಡ್ ಆಗುತ್ತಿದೆ...";
    
    const [lexRes, rulesRes] = await Promise.all([
      fetch("./data/sanskrit_lexicon.json"),
      fetch("./data/samasa_rules.json")
    ]);

    if (!lexRes.ok || !rulesRes.ok) {
      throw new Error("JSON ಫೈಲ್‌ಗಳು ಸಿಗುತ್ತಿಲ್ಲ. Path ಸರಿಯಾಗಿದೆಯೇ ಪರಿಶೀಲಿಸಿ.");
    }

    lexiconData = await lexRes.json();
    rulesData = await rulesRes.json();

    buildFormIndex();
    statusEl.innerHTML = `✅ ಎಂಜಿನ್ ಸಿದ್ಧವಾಗಿದೆ! (\({lexiconData.length.toLocaleString()} ಶಬ್ದಗಳು ಹಾಗೂ\){rulesData.length} ಸೂತ್ರಗಳು ಲೋಡ್ ಆಗಿವೆ)`;
    statusEl.className = "status-badge ready";
  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `⚠️ ಡೇಟಾಬೇಸ್ ಲೋಡ್ ಮಾಡುವಲ್ಲಿ ದೋಷ: ${err.message} (Built-in Fallback Lexicon ಬಳಸಲಾಗುತ್ತಿದೆ)`;
    statusEl.className = "status-badge warning";
    loadFallbackData();
  }
}

// 2. 1.66 ಲಕ್ಷ ಸಾಲುಗಳ JSON ನಿಂದ ವೇಗವಾಗಿ ಹುಡುಕಲು Index ತಯಾರಿ
function buildFormIndex() {
  formIndex.clear();
  lexiconData.forEach((entry) => {
    if (!entry.forms || !entry.word) return;
    const formsArr = entry.forms.split(";");
    
    formsArr.forEach((rawForm, idx) => {
      if (idx >= 21) return; // ಸಂಬೋಧನ ವಿಭಕ್ತಿಯನ್ನು ಬಿಡಲಾಗಿದೆ
      const vibhakti = Math.floor(idx / 3) + 1;
      const vachana = (idx % 3) + 1;

      // ಒಂದೇ ಸ್ಥಾನದಲ್ಲಿ '/' ಅಥವಾ ',' ಮೂಲಕ ಎರಡು ರೂಪಗಳಿದ್ದರೆ ಅವುಗಳನ್ನೂ ಬೇರ್ಪಡಿಸುವುದು
      const subForms = rawForm.split(/[\/,]/).map(s => s.trim()).filter(Boolean);
      
      subForms.forEach(cleanForm => {
        if (!formIndex.has(cleanForm)) {
          formIndex.set(cleanForm, []);
        }
        formIndex.get(cleanForm).push({
          pratipadika: entry.word.trim(),
          linga: entry.linga || "",
          artha: entry.artha || "",
          vibhakti: vibhakti,
          vachana: vachana,
          prathamaEkavachana: formsArr[0] ? formsArr[0].trim() : entry.word.trim()
        });
      });
    });
  });
}

// 3. ಪದದ ರೂಪ ವಿಶ್ಲೇಷಣೆ (Morphological Analyzer)
function analyzeWord(surfaceWord) {
  const clean = surfaceWord.trim();
  let analyses = [];

  // ಅವ್ಯಯಗಳ ತಪಾಸಣೆ (स्वयम्, सामि)
  if (clean === "स्वयम्" || clean === "स्वयं") {
    analyses.push({ surface: "स्वयम्", pratipadika: "स्वयम्", vibhakti: 0, vachana: 1, isAvyaya: true, artha: "आत्मना (ತನ್ನಿಂದ ತಾನೇ)" });
  }
  if (clean === "सामि") {
    analyses.push({ surface: "सामि", pratipadika: "सामि", vibhakti: 0, vachana: 1, isAvyaya: true, artha: "अर्धम् (ಅರ್ಧ)" });
  }

  // Lexicon Index ನಲ್ಲಿ ಹುಡುಕಾಟ
  if (formIndex.has(clean)) {
    analyses.push(...formIndex.get(clean).map(item => ({ ...item, surface: clean })));
  }

  // ಒಂದು ವೇಳೆ Lexicon ನಲ್ಲಿ ಇಲ್ಲದಿದ್ದರೆ ಪ್ರತ್ಯಯಗಳ ಆಧಾರದ ಮೇಲೆ ಗುರುತಿಸುವ Fallback (Heuristic)
  if (analyses.length === 0) {
    analyses.push(...guessMorphology(clean));
  }

  return analyses;
}

// Lexicon ನಲ್ಲಿ ಇಲ್ಲದ ಪದಗಳಿಗಾಗಿ ಸ್ಮಾರ್ಟ್ Fallback
function guessMorphology(word) {
  const guesses = [];
  // ದ್ವಿತೀಯಾ ಏಕವಚನ (ಮ್)
  if (word.endsWith("म्") || word.endsWith("ं")) {
    const stem = word.replace(/(म्|ं)$/, "");
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 2, vachana: 1, artha: "(ಊಹಿಸಿದ ರೂಪ)" });
    if (stem.endsWith("ा")) {
      guesses.push({ surface: word, pratipadika: stem, vibhakti: 2, vachana: 1, linga: "S", artha: "(ಸ್ತ್ರೀಲಿಂಗ ದ್ವಿತೀಯಾ)" });
    }
  }
  // ತೃತೀಯಾ ಏಕವಚನ (ೇನ / ಣಾ / ಯಾ)
  if (word.endsWith("ेन") || word.endsWith("ेण")) {
    const stem = word.replace(/(ेन|ेण)\(/, "अ").replace(/अ\)/, "");
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 3, vachana: 1, artha: "(ತೃತೀಯಾ ವಿಭಕ್ತಿ)" });
  }
  if (word.endsWith("या")) {
    const stem = word.slice(0, -2) + "ा";
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 3, vachana: 1, linga: "S", artha: "(ತೃತೀಯಾ ವಿಭಕ್ತಿ)" });
  }
  if (word.endsWith("ना") || word.endsWith("णा")) {
    const stem = word.slice(0, -2);
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 3, vachana: 1, artha: "(ತೃತೀಯಾ ವಿಭಕ್ತಿ)" });
  }
  // ಚತುರ್ಥೀ ಏಕವಚನ (ಾಯ / ಯೈ)
  if (word.endsWith("ाय")) {
    const stem = word.slice(0, -2);
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 4, vachana: 1, artha: "(ಚತುರ್ಥೀ ವಿಭಕ್ತಿ)" });
  }
  // ಪಂಚಮೀ ಏಕವಚನ (ಾತ್) - Negative Testing ಗಾಗಿ
  if (word.endsWith("ात्")) {
    const stem = word.slice(0, -2);
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 5, vachana: 1, artha: "(ಪಂಚಮೀ ವಿಭಕ್ತಿ)" });
  }
  // ಪ್ರಥಮಾ ಏಕವಚನ (ಃ / ಮ್)
  if (word.endsWith("ः")) {
    const stem = word.slice(0, -1);
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 1, vachana: 1, prathamaEkavachana: word, artha: "(ಪ್ರಥಮಾ ವಿಭಕ್ತಿ)" });
  }
  if (guesses.length === 0) {
    guesses.push({ surface: word, pratipadika: word, vibhakti: 1, vachana: 1, prathamaEkavachana: word, artha: "" });
  }
  return guesses;
}

// ಕ್ತ-ಪ್ರತ್ಯಯಾಂತ ಪದವೇ ಎಂದು ಪರಿಶೀಲಿಸುವ ಫಂಕ್ಷನ್
function isKtaAnta(pratipadika) {
  if (KNOWN_KTA_WORDS.has(pratipadika)) return true;
  return /(ित|ूत|ात|ृत|प्त|न्न|द्ध|ब्ध|ढ|ष्ट|क्त)$/.test(pratipadika);
}

// ಕಾಲವಾಚಕ ಪದವೇ ಎಂದು ಪರಿಶೀಲಿಸುವ ಫಂಕ್ಷನ್
function isKalavachaka(analysis) {
  if (KALAVACHAKA_WORDS.has(analysis.pratipadika)) return true;
  if (analysis.artha && /(काल|समयः|मास|दिवस|रात्रि|क्षण)/.test(analysis.artha)) return true;
  return false;
}

// 4. ಸಮಸ್ತಪದ ಸಂಧಿ ಮತ್ತು ಪ್ರಾತಿಪದಿಕ ಜೋಡಣೆ (Compound Sandhi Joiner)
function formSamastaPada(purvaPratipadika, uttaraSurface) {
  let p = purvaPratipadika;
  let u = uttaraSurface;

  // ಅವ್ಯಯಗಳಾದ 'स्वयम्' -> 'स्वयं'
  if (p === "स्वयम्") return "स्वयं" + u;

  // 'न लोपः प्रातिपदिकान्तस्य' (8.2.7) - ರಾಜನ್ -> ರಾಜ, ಅಹನ್ -> ಅಹ
  if (p.endsWith("न्") && p !== "अहन्") {
    p = p.slice(0, -2);
  }
  // ವಾಚ್ + ಕಲಹಃ -> ವಾಕ್ಕಲಹಃ (ಜಶ್ತ್ವ-ಚರ್ತ್ವ)
  if (p === "वाच्") p = "वाक्";

  // ಸ್ವರ ಸಂಧಿ ನಿಯಮಗಳು (ಉತ್ತರಪದವು ಸ್ವರದಿಂದ ಆರಂಭವಾದರೆ)
  const vowelMap = {
    "अ": "", "आ": "ा", "इ": "ि", "ई": "ी", "उ": "ु", "ऊ": "ू", "ऋ": "ृ", "ए": "े", "ऐ": "ै", "ओ": "ो", "औ": "ौ"
  };

  const firstChar = u.charAt(0);
  if (vowelMap.hasOwnProperty(firstChar)) {
    const restUttara = u.slice(1);
    
    // ಯಣ್ ಸಂಧಿ: इ/ई + असवर्ण स्वर (ಉದಾ: दधि + ओदनः -> दध्योदनः)
    if ((p.endsWith("ि") || p.endsWith("ी")) && firstChar !== "इ" && firstChar !== "ई") {
      const base = p.slice(0, -1);
      return base + "्य" + vowelMap[firstChar] + restUttara;
    }
    // ಸವರ್ಣದೀರ್ಘ ಸಂಧಿ: अ/आ + अ/आ -> आ (ಉದಾ: खट्वा + आरूढः -> खट्वारूढः, धन + अर्थः -> धनार्थः)
    if (firstChar === "अ" || firstChar === "आ") {
      const base = p.endsWith("ा") ? p.slice(0, -1) : p;
      return base + "ा" + restUttara;
    }
    // ಗುಣ ಸಂಧಿ: अ/आ + इ/ई -> ए, उ/ऊ -> ओ
    if (firstChar === "इ" || firstChar === "ई") {
      const base = p.endsWith("ा") ? p.slice(0, -1) : p;
      return base + "े" + restUttara;
    }
    if (firstChar === "उ" || firstChar === "ऊ") {
      const base = p.endsWith("ा") ? p.slice(0, -1) : p;
      return base + "ो" + restUttara;
    }
    // ವೃದ್ಧಿ ಸಂಧಿ: अ/आ + ओ/औ -> औ (ಉದಾ: गुड + ओदनः -> गुडौदनः)
    if (firstChar === "ओ" || firstChar === "औ") {
      const base = p.endsWith("ा") ? p.slice(0, -1) : p;
      return base + "ौ" + restUttara;
    }
  }

  return p + u;
}

// 5. ಮುಖ್ಯ ಸಮಾಸ ಪರೀಕ್ಷಾ ಫಂಕ್ಷನ್ (Main Analyzer Function)
function runSamasaEngine() {
  const purvaInput = document.getElementById("purvaInput").value.trim();
  const uttaraInput = document.getElementById("uttaraInput").value.trim();

  if (!purvaInput || !uttaraInput) {
    alert("ದಯವಿಟ್ಟು ಪೂರ್ವಪದ ಮತ್ತು ಉತ್ತರಪದ ಎರಡನ್ನೂ ನಮೂದಿಸಿ.");
    return;
  }

  const purvaAnalyses = analyzeWord(purvaInput);
  const uttaraAnalyses = analyzeWord(uttaraInput);

  let evaluationLog = [];
  let matchedCandidates = [];

  // ಪ್ರತಿಯೊಂದು ಸೂತ್ರವನ್ನೂ ಕ್ರಮವಾಗಿ ಪರೀಕ್ಷಿಸುವುದು
  for (const rule of rulesData) {
    let ruleMatched = false;
    let matchDetails = null;

    for (const pAna of purvaAnalyses) {
      for (const uAna of uttaraAnalyses) {
        const check = evaluateRuleOnPair(rule, pAna, uAna);
        if (check.isMatch) {
          ruleMatched = true;
          matchDetails = { rule, pAna, uAna, check };
          break;
        }
      }
      if (ruleMatched) break;
    }

    if (ruleMatched) {
      matchedCandidates.push(matchDetails);
      evaluationLog.push({
        sutra: `\({rule.rule_id} -\){rule.sutra}`,
        samasa_type: rule.samasa_type,
        status: "MATCHED",
        reason: matchDetails.check.reason
      });
    } else {
      evaluationLog.push({
        sutra: `\({rule.rule_id} -\){rule.sutra}`,
        samasa_type: rule.samasa_type,
        status: "REJECTED",
        reason: getRejectionReason(rule, purvaAnalyses[0], uttaraAnalyses[0])
      });
    }
  }

  // ಯಾವುದೇ ಸೂತ್ರ ಹೊಂದಿಕೆಯಾಗದಿದ್ದರೆ -> Negative Result ತೋರಿಸುವುದು
  if (matchedCandidates.length === 0) {
    renderFinalOutput({
      success: false,
      purvaInput,
      uttaraInput,
      purvaAnalyses,
      uttaraAnalyses,
      evaluationLog,
      message: "ಯಾವುದೇ ತತ್ಪುರುಷ ಸಮಾಸದ ಸೂತ್ರವು ಈ ಪದಗಳಿಗೆ ಅನ್ವಯಿಸುವುದಿಲ್ಲ (❌ समासः न भवति)."
    });
    return;
  }

  // ಮೊದಲ ಹೊಂದಿಕೆಯಾದ ಸೂತ್ರವನ್ನು ತೆಗೆದುಕೊಳ್ಳುವುದು (ಅಥವಾ Semantic Check ಕೇಳುವುದು)
  const primaryMatch = matchedCandidates[0];
  if (primaryMatch.check.needsModal) {
    pendingEvaluation = {
      primaryMatch,
      purvaInput,
      uttaraInput,
      purvaAnalyses,
      uttaraAnalyses,
      evaluationLog
    };
    openSemanticModal(primaryMatch);
  } else {
    renderFinalOutput({
      success: true,
      purvaInput,
      uttaraInput,
      purvaAnalyses,
      uttaraAnalyses,
      evaluationLog,
      appliedRule: primaryMatch.rule,
      pAna: primaryMatch.pAna,
      uAna: primaryMatch.uAna,
      semanticNote: "ನೇರ ಶಬ್ದ/ರೂಪ ಹೊಂದಾಣಿಕೆ (Exact Rule Match - ವಿವಕ್ಷೆಯ ಪ್ರಶ್ನೆ ಇಲ್ಲ)"
    });
  }
}

// 6. ಪ್ರತಿಯೊಂದು ಸೂತ್ರದ ಷರತ್ತುಗಳನ್ನು ಪರೀಕ್ಷಿಸುವುದು
function evaluateRuleOnPair(rule, pAna, uAna) {
  // ಪೂರ್ವಪದ ಪರೀಕ್ಷೆ
  if (rule.purva.exact_word) {
    if (pAna.pratipadika !== rule.purva.exact_word && pAna.surface !== rule.purva.exact_word) {
      return { isMatch: false };
    }
  } else if (rule.purva.vibhakti && pAna.vibhakti !== rule.purva.vibhakti) {
    return { isMatch: false };
  }

  if (rule.purva.pratipadika && pAna.pratipadika !== rule.purva.pratipadika) {
    return { isMatch: false };
  }

  if (rule.purva.category === "kalavachaka" && !isKalavachaka(pAna)) {
    return { isMatch: false };
  }

  // ಉತ್ತರಪದ ಪರೀಕ್ಷೆ
  const uttaraType = rule.uttara.match_type;

  if (uttaraType === "exact_pratipadika") {
    if (rule.uttara.words.includes(uAna.pratipadika)) {
      return { isMatch: true, needsModal: false, reason: `ಉತ್ತರಪದ '${uAna.pratipadika}' ಸೂತ್ರದ ಪಟ್ಟಿಯಲ್ಲಿದೆ.` };
    }
    return { isMatch: false };
  }

  if (uttaraType === "kta_anta") {
    if (isKtaAnta(uAna.pratipadika)) {
      const needsModal = rule.semantic_check && rule.semantic_check.required;
      return { isMatch: true, needsModal, reason: `ಉತ್ತರಪದ '${uAna.pratipadika}' ಕ್ತ-ಪ್ರತ್ಯಯಾಂತವಾಗಿದೆ.` };
    }
    return { isMatch: false };
  }

  if (uttaraType === "any") {
    // 2.1.29 (अत्यन्तसंयोगे च) - ಉತ್ತರಪದ ಕ್ತಾಂತವಾಗಿರಬಾರದು (ಕ್ತಾಂತವಾಗಿದ್ದರೆ 2.1.28 ಸೂತ್ರವೇ ಹಿಡಿಯುತ್ತದೆ)
    if (!isKtaAnta(uAna.pratipadika)) {
      return { isMatch: true, needsModal: true, reason: `ಕಾಲವಾಚಕ ದ್ವಿತೀಯಾ + '${uAna.pratipadika}' (ಅತ್ಯಂತಸಂಯೋಗ ಪರೀಕ್ಷೆ ಅಗತ್ಯ).` };
    }
    return { isMatch: false };
  }

  if (uttaraType === "semantic_dependent") {
    return { isMatch: true, needsModal: true, reason: `ತೃತೀಯಾ ವಿಭಕ್ತಿ ಪೂರ್ವಪದವಿದೆ; ಉತ್ತರಪದದ ಅರ್ಥಸಂಬಂಧ ನಿರ್ಣಯವಾಗಬೇಕು.` };
  }

  if (uttaraType === "exact_or_semantic") {
    if (rule.uttara.exact_words.includes(uAna.pratipadika)) {
      return { isMatch: true, needsModal: false, reason: `ಉತ್ತರಪದ '${uAna.pratipadika}' ಚತುರ್ಥೀ ಸೂತ್ರದ ನೇರ ಪಟ್ಟಿಯಲ್ಲಿದೆ.` };
    }
    return { isMatch: true, needsModal: true, reason: `ಚತುರ್ಥೀ ವಿಭಕ್ತಿ ಇದೆ; ಪ್ರಕೃತಿ-ವಿಕೃತಿ ಭಾವದ ಪರೀಕ್ಷೆ ಅಗತ್ಯ.` };
  }

  return { isMatch: false };
}

function getRejectionReason(rule, pAna, uAna) {
  if (rule.purva.exact_word && pAna.surface !== rule.purva.exact_word) {
    return `ಪೂರ್ವಪದ '\({rule.purva.exact_word}' ಆಗಿರಬೇಕಿತ್ತು (ಇಲ್ಲಿ '\){pAna.surface}' ಇದೆ).`;
  }
  if (rule.purva.vibhakti && pAna.vibhakti !== rule.purva.vibhakti) {
    return `ಪೂರ್ವಪದವು \({rule.purva.vibhakti}ನೇ ವಿಭಕ್ತಿಯಲ್ಲಿರಬೇಕು (ಇಲ್ಲಿ\){pAna.vibhakti || 'ಅವ್ಯಯ'} ವಿಭಕ್ತಿ ಇದೆ).`;
  }
  if (rule.purva.pratipadika && pAna.pratipadika !== rule.purva.pratipadika) {
    return `ಪೂರ್ವಪದ '${rule.purva.pratipadika}' ಆಗಿರಬೇಕಿತ್ತು.`;
  }
  if (rule.purva.category === "kalavachaka" && !isKalavachaka(pAna)) {
    return `ಪೂರ್ವಪದ '${pAna.pratipadika}' ಕಾಲವಾಚಕ ಶಬ್ದವಲ್ಲ.`;
  }
  return `ಉತ್ತರಪದ '${uAna.pratipadika}' ಈ ಸೂತ್ರದ ಷರತ್ತಿಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.`;
}

// 7. ವಿವಕ್ಷೆ / Semantic Modals ನಿರ್ವಹಣೆ
function openSemanticModal(matchDetails) {
  const { rule, pAna, uAna } = matchDetails;
  const sem = rule.semantic_check;
  const modalContainer = document.getElementById("dynamicModalOverlay");
  const modalContent = document.getElementById("dynamicModalBox");

  let html = `
