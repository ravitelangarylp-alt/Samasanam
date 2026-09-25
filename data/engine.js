// ============================================================================
// PANINIAN SAMASA ENGINE - PROTOTYPE v0.1 (100% Pure DOM + Auto JSON Unwrapper)
// ============================================================================

var lexiconData = [];
var rulesData = [];
var formIndex = new Map();
var pendingEvaluation = null;

var KALAVACHAKA_WORDS = new Set([
  "मास", "संवत्सर", "अहर्", "अहन्", "रात्रि", "दिवस", "मुहूर्त", "क्षण", "काल", "सप्ताह", "पक्ष", "ऋतु", "कल्प", "युग"
]);

var KNOWN_KTA_WORDS = new Set([
  "कृत", "आरूढ", "प्रमित", "भुक्त", "पीत", "गत", "आगत", "श्रित", "पतित", "अतीत", "प्राप्त", "आपन्न", "भिन्न", "हत", "दत्त", "उक्त", "बद्ध", "लब्ध"
]);

var SUP_PRATYAYA = {
  1: ["सु", "औ", "जस्"],
  2: ["अम्", "औट्", "शस्"],
  3: ["टा", "भ्याम्", "भिस्"],
  4: ["ङे", "भ्याम्", "भ्यस्"],
  5: ["ङसि", "भ्याम्", "भ्यस्"],
  6: ["ङस्", "ओस्", "आम्"],
  7: ["ङि", "ओस्", "सुप्"]
};

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

// JSON ಒಳಗಿರುವ Array ಅನ್ನು ತಾನಾಗಿಯೇ ಹುಡುಕಿ ತೆಗೆಯುವ ಫಂಕ್ಷನ್
function extractArray(rawJson) {
  if (Array.isArray(rawJson)) return rawJson;
  if (rawJson && typeof rawJson === "object") {
    var keys = Object.keys(rawJson);
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(rawJson[keys[i]])) {
        return rawJson[keys[i]];
      }
    }
    return Object.values(rawJson);
  }
  return [];
}

function buildAppInterface() {
  document.title = "पाणिनीय-समास-यन्त्रम् | Samasa Engine Prototype v0.1";

  var styleNode = document.createElement("style");
  styleNode.textContent = [
    ":root { --bg: #FAF7F2; --card: #FFFFFF; --primary: #7C2D12; --accent: #D97706; --border: #E5DEC9; --text: #292524; --success: #15803D; --danger: #B91C1C; }",
    "* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Noto Sans Devanagari', 'Noto Sans Kannada', system-ui, sans-serif; }",
    "body { background: var(--bg); color: var(--text); padding: 24px; line-height: 1.6; }",
    ".container { max-width: 960px; margin: 0 auto; }",
    ".app-header { text-align: center; padding: 24px; background: linear-gradient(135deg, #7C2D12, #9A3412); color: #FFF; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(124,45,18,0.15); }",
    ".app-header h1 { font-size: 28px; margin-bottom: 6px; }",
    ".app-header p { font-size: 15px; opacity: 0.9; }",
    ".status-badge { display: inline-block; margin-top: 12px; padding: 6px 14px; border-radius: 20px; font-size: 13px; background: rgba(255,255,255,0.18); }",
    ".status-badge.ready { background: #166534; color: #DCFCE7; }",
    ".status-badge.warning { background: #92400E; color: #FEF3C7; }",
    ".card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }",
    ".card h2 { font-size: 19px; color: var(--primary); margin-bottom: 16px; border-bottom: 2px solid #F5EFE6; padding-bottom: 8px; }",
    ".input-grid { display: grid; grid-template-columns: 1fr auto 1fr auto; gap: 12px; align-items: end; }",
    ".field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #57534E; }",
    ".field input { width: 100%; padding: 12px 14px; font-size: 18px; border: 2px solid var(--border); border-radius: 8px; outline: none; }",
    ".field input:focus { border-color: var(--accent); }",
    ".plus-sign { font-size: 26px; font-weight: bold; color: var(--accent); padding-bottom: 8px; }",
    ".btn-analyze { background: var(--primary); color: #FFF; border: none; padding: 13px 26px; font-size: 16px; font-weight: 600; border-radius: 8px; cursor: pointer; }",
    ".btn-analyze:hover { background: #5B210B; }",
    ".test-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }",
    ".test-group { background: #FDFBF7; border: 1px solid var(--border); border-radius: 8px; padding: 12px; }",
    ".test-group h4 { font-size: 13px; color: var(--primary); margin-bottom: 8px; }",
    ".test-chip { display: block; width: 100%; text-align: left; background: #FFF; border: 1px solid #E7E0D0; padding: 7px 10px; margin-bottom: 6px; border-radius: 6px; font-size: 13px; cursor: pointer; }",
    ".test-chip:hover { background: #FEF3C7; border-color: var(--accent); }",
    ".result-card { border-radius: 12px; padding: 22px; margin-bottom: 20px; border: 2px solid; }",
    ".result-card.success { background: #F0FDF4; border-color: #86EFAC; }",
    ".result-card.failure { background: #FEF2F2; border-color: #FCA5A5; }",
    ".result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }",
    ".badge-success { background: var(--success); color: #FFF; padding: 5px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; }",
    ".badge-fail { background: var(--danger); color: #FFF; padding: 5px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; }",
    ".samasa-name { font-size: 18px; font-weight: 700; color: var(--primary); }",
    ".samasta-hero { display: flex; align-items: center; justify-content: center; gap: 18px; background: #FFF; padding: 18px; border-radius: 10px; margin-bottom: 18px; border: 1px solid rgba(0,0,0,0.08); }",
    ".vigraha-part { font-size: 22px; color: #44403C; }",
    ".arrow { font-size: 24px; color: var(--accent); }",
    ".samasta-word { font-size: 28px; font-weight: 800; color: var(--success); }",
    ".samasta-word.fail-text { font-size: 20px; color: var(--danger); }",
    ".prakriya-box { background: #FFF; padding: 16px 20px; border-radius: 8px; border: 1px solid #DCFCE7; }",
    ".prakriya-box h4 { margin-bottom: 10px; color: #166534; }",
    ".prakriya-steps { padding-left: 20px; }",
    ".prakriya-steps li { margin-bottom: 8px; font-size: 15px; }",
    ".sutra-highlight { background: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 4px; font-weight: 700; }",
    ".audit-log { background: #FFF; padding: 20px; border-radius: 12px; border: 1px solid var(--border); }",
    ".log-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }",
    ".log-table th, .log-table td { border: 1px solid var(--border); padding: 10px; text-align: left; }",
    ".log-table th { background: #F5EFE6; }",
    ".row-match { background: #F0FDF4; font-weight: 600; }",
    ".row-reject { color: #78716C; }",
    ".modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: none; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }",
    ".modal-box { background: #FFF; max-width: 520px; width: 100%; border-radius: 14px; padding: 24px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }",
    ".modal-badge { display: inline-block; background: #FEF3C7; color: #92400E; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; margin-bottom: 10px; }",
    ".modal-title-sa { font-size: 22px; color: var(--primary); margin-bottom: 6px; }",
    ".modal-title-kn { font-size: 15px; color: #57534E; margin-bottom: 14px; }",
    ".modal-word-preview { font-size: 20px; font-weight: 700; background: #FAF7F2; padding: 10px; border-radius: 8px; margin-bottom: 18px; border: 1px solid var(--border); }",
    ".modal-options-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }",
    ".modal-opt-btn { text-align: left; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: #FAF7F2; cursor: pointer; display: flex; flex-direction: column; }",
    ".modal-opt-btn:hover { background: #FEF3C7; border-color: var(--accent); }",
    ".modal-opt-sub { font-size: 12px; color: var(--primary); margin-top: 4px; }",
    ".modal-action-row { display: flex; gap: 12px; justify-content: center; }",
    ".modal-btn-yes { background: var(--success); color: #FFF; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }",
    ".modal-btn-no, .modal-btn-cancel { background: #E7E5E4; color: #292524; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }"
  ].join("\n");
  document.head.appendChild(styleNode);

  document.body.innerHTML = "";
  var container = el("div", "container");

  var header = el("div", "app-header");
  header.appendChild(el("h1", "", "पाणिनीय-समास-यन्त्रम् (Prototype v0.1)"));
  header.appendChild(el("p", "", "ದ್ವಿತೀಯಾ, ತೃತೀಯಾ ಮತ್ತು ಚತುರ್ಥೀ ತತ್ಪುರುಷ ಸಮಾಸಗಳ ಪರೀಕ್ಷಾ ಎಂಜಿನ್"));
  var statusBadge = el("div", "status-badge", "⏳ ಎಂಜಿನ್ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...");
  statusBadge.id = "engineStatus";
  header.appendChild(statusBadge);
  container.appendChild(header);

  var inputCard = el("div", "card");
  inputCard.appendChild(el("h2", "", "१. ಸಮಾಸ ನಿರ್ಮಾಣ ಮತ್ತು ಪರೀಕ್ಷೆ (Samasa Tester)"));
  var grid = el("div", "input-grid");

  var f1 = el("div", "field");
  f1.appendChild(el("label", "", "ಪೂರ್ವಪದ (First Word with Vibhakti)"));
  var inp1 = el("input");
  inp1.type = "text";
  inp1.id = "purvaInput";
  inp1.value = "कृष्णम्";
  f1.appendChild(inp1);

  var plus = el("div", "plus-sign", "+");

  var f2 = el("div", "field");
  f2.appendChild(el("label", "", "ಉತ್ತರಪದ (Second Word)"));
  var inp2 = el("input");
  inp2.type = "text";
  inp2.id = "uttaraInput";
  inp2.value = "श्रितः";
  f2.appendChild(inp2);

  var btnAnalyze = el("button", "btn-analyze", "ಪರೀಕ್ಷಿಸಿ (Analyze)");
  btnAnalyze.onclick = runSamasaEngine;

  grid.appendChild(f1);
  grid.appendChild(plus);
  grid.appendChild(f2);
  grid.appendChild(btnAnalyze);
  inputCard.appendChild(grid);
  container.appendChild(inputCard);

  var testCard = el("div", "card");
  testCard.appendChild(el("h2", "", "२. ನಾಲ್ಕು ಬಗೆಯ ಪರೀಕ್ಷಾ ಉದಾಹರಣೆಗಳು (1-Click Test Suite)"));
  var testGroups = el("div", "test-groups");

  var suiteData = [
    {
      title: "✅ ದ್ವಿತೀಯಾ ತತ್ಪುರುಷ (2.1.24 - 29)",
      items: [
        ["कृष्णम्", "श्रितः", "कृष्णम् + श्रितः (2.1.24 ನೇರ)"],
        ["स्वयम्", "कृतः", "स्वयम् + कृतः (2.1.25 ಅವ್ಯಯ)"],
        ["खट्वाम्", "आरूढः", "खट्वाम् + आरूढः (2.1.26 ಕ್ಷೇಪ Modal)"],
        ["मुहूर्तम्", "सुखम्", "मुहूर्तम् + सुखम् (2.1.29 ಕಾಲ Modal)"]
      ]
    },
    {
      title: "✅ ತೃತೀಯಾ ತತ್ಪುರುಷ (2.1.30 - 35)",
      items: [
        ["मासेन", "पूर्वः", "मासेन + पूर्वः (2.1.31 ನೇರ)"],
        ["ह्लादिन्या", "सदृशः", "ह्लादिन्या + सदृशः (Lexicon Test)"],
        ["अहिना", "हतः", "अहिना + हतः (2.1.32 Modal)"],
        ["दध्ना", "ओदनः", "दध्ना + ओदनः (2.1.34 ಆಹಾರ Modal)"]
      ]
    },
    {
      title: "✅ ಚತುರ್ಥೀ ತತ್ಪುರುಷ (2.1.36)",
      items: [
        ["द्विजाय", "अर्थः", "द्विजाय + अर्थः (2.1.36 ನೇರ)"],
        ["यूपाय", "दारु", "यूपाय + दारु (ಪ್ರಕೃತಿ-ವಿಕೃತಿ ✓)"],
        ["भूतेभ्यः", "बलिः", "भूतेभ्यः + बलिः (ಬಹುವಚನ)"]
      ]
    },
    {
      title: "❌ Negative Tests (ಸಮಾಸವಾಗದವು)",
      items: [
        ["रन्धनाय", "स्थाली", "रन्धनाय + स्थाली (ಚತುರ್ಥೀ ನಿಷೇಧ)"],
        ["ग्रामात्", "आगतः", "ग्रामात् + आगतः (ಪಂಚಮೀ - ಸೂತ್ರವಿಲ್ಲ)"],
        ["कृष्णम्", "पश्यति", "कृष्णम् + पश्यति (ತಿಗಂತ - ಸಮಾಸವಿಲ್ಲ)"]
      ]
    }
  ];

  suiteData.forEach(function(group) {
    var gBox = el("div", "test-group");
    gBox.appendChild(el("h4", "", group.title));
    group.items.forEach(function(item) {
      var chip = el("button", "test-chip", item[2]);
      chip.onclick = function() {
        loadQuickTest(item[0], item[1]);
      };
      gBox.appendChild(chip);
    });
    testGroups.appendChild(gBox);
  });

  testCard.appendChild(testGroups);
  container.appendChild(testCard);

  var resSec = el("div", "");
  resSec.id = "resultSection";
  resSec.style.display = "none";
  container.appendChild(resSec);

  document.body.appendChild(container);

  var modalOverlay = el("div", "modal-overlay");
  modalOverlay.id = "dynamicModalOverlay";
  var modalBox = el("div", "modal-box");
  modalBox.id = "dynamicModalBox";
  modalOverlay.appendChild(modalBox);
  document.body.appendChild(modalOverlay);
}

async function initEngine() {
  buildAppInterface();
  var statusEl = document.getElementById("engineStatus");
  try {
    statusEl.textContent = "⏳ sanskrit_lexicon.json ಮತ್ತು samasa_rules.json ಲೋಡ್ ಆಗುತ್ತಿದೆ...";
    
    var responses = await Promise.all([
      fetch("./data/sanskrit_lexicon.json"),
      fetch("./data/samasa_rules.json")
    ]);

    var lexRes = responses[0];
    var rulesRes = responses[1];

    if (!lexRes.ok || !rulesRes.ok) {
      throw new Error("JSON ಫೈಲ್‌ಗಳು ಸಿಗುತ್ತಿಲ್ಲ.");
    }

    var rawLex = await lexRes.json();
    var rawRules = await rulesRes.json();

    lexiconData = extractArray(rawLex);
    rulesData = extractArray(rawRules);

    if (!rulesData || rulesData.length === 0) {
      loadFallbackData();
    }

    buildFormIndex();
    statusEl.textContent = "✅ ಎಂಜಿನ್ ಸಿದ್ಧವಾಗಿದೆ! (" + lexiconData.length.toLocaleString() + " ಶಬ್ದಗಳು ಹಾಗೂ " + rulesData.length + " ಸೂತ್ರಗಳು ಲೋಡ್ ಆಗಿವೆ)";
    statusEl.className = "status-badge ready";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "⚠️ ಡೇಟಾಬೇಸ್ ಲೋಡ್ ದೋಷ: " + err.message + " (Fallback ಡೇಟಾ ಬಳಸಲಾಗುತ್ತಿದೆ)";
    statusEl.className = "status-badge warning";
    loadFallbackData();
  }
}

function buildFormIndex() {
  formIndex.clear();
  lexiconData.forEach(function(entry) {
    if (!entry || !entry.forms || !entry.word) return;
    var formsArr = String(entry.forms).split(";").slice(0, 21);
    
    formsArr.forEach(function(rawForm, idx) {
      var vibhakti = Math.floor(idx / 3) + 1;
      var vachana = (idx % 3) + 1;

      var subForms = rawForm.split(/[\/,]/).map(function(s) { return s.trim(); }).filter(Boolean);
      
      subForms.forEach(function(cleanForm) {
        if (!formIndex.has(cleanForm)) {
          formIndex.set(cleanForm, []);
        }
        formIndex.get(cleanForm).push({
          pratipadika: String(entry.word).trim(),
          linga: entry.linga || "",
          artha: entry.artha || "",
          vibhakti: vibhakti,
          vachana: vachana,
          prathamaEkavachana: formsArr[0] ? formsArr[0].trim() : String(entry.word).trim()
        });
      });
    });
  });
}

function analyzeWord(surfaceWord) {
  var clean = surfaceWord.trim();
  var analyses = [];

  if (clean === "स्वयम्" || clean === "स्वयं") {
    analyses.push({ surface: "स्वयम्", pratipadika: "स्वयम्", vibhakti: 0, vachana: 1, isAvyaya: true, artha: "आत्मना (ತನ್ನಿಂದ ತಾನೇ)" });
  }
  if (clean === "सामि") {
    analyses.push({ surface: "सामि", pratipadika: "सामि", vibhakti: 0, vachana: 1, isAvyaya: true, artha: "अर्धम् (ಅರ್ಧ)" });
  }

  if (formIndex.has(clean)) {
    formIndex.get(clean).forEach(function(item) {
      analyses.push(Object.assign({}, item, { surface: clean }));
    });
  }

  if (analyses.length === 0) {
    guessMorphology(clean).forEach(function(g) { analyses.push(g); });
  }

  return analyses;
}

function guessMorphology(word) {
  var guesses = [];
  if (word.endsWith("म्") || word.endsWith("ं")) {
    var stem = word.replace(/(म्|ं)$/, "");
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 2, vachana: 1, artha: "(ಊಹಿಸಿದ ರೂಪ)" });
  }
  if (word.endsWith("ेन") || word.endsWith("ेण")) {
    var stem3 = word.replace(/(ेन|ेण)$/, "");
    guesses.push({ surface: word, pratipadika: stem3, vibhakti: 3, vachana: 1, artha: "(ತೃತೀಯಾ ವಿಭಕ್ತಿ)" });
  }
  if (word.endsWith("या")) {
    var stemYa = word.slice(0, -2) + "ा";
    guesses.push({ surface: word, pratipadika: stemYa, vibhakti: 3, vachana: 1, linga: "S", artha: "(ತೃತೀಯಾ ವಿಭಕ್ತಿ)" });
  }
  if (word === "दध्ना") {
    guesses.push({ surface: word, pratipadika: "दधि", vibhakti: 3, vachana: 1, artha: "(ಮೊಸರಿನಿಂದ)" });
  }
  if (word.endsWith("ना") || word.endsWith("णा")) {
    var stemNa = word.slice(0, -2);
    guesses.push({ surface: word, pratipadika: stemNa, vibhakti: 3, vachana: 1, artha: "(ತೃತೀಯಾ ವಿಭಕ್ತಿ)" });
  }
  if (word.endsWith("ाय")) {
    var stem4 = word.slice(0, -2);
    guesses.push({ surface: word, pratipadika: stem4, vibhakti: 4, vachana: 1, artha: "(ಚತುರ್ಥೀ ವಿಭಕ್ತಿ)" });
  }
  if (word.endsWith("ेभ्यः")) {
    var stem4Pl = word.slice(0, -5);
    guesses.push({ surface: word, pratipadika: stem4Pl, vibhakti: 4, vachana: 3, artha: "(ಚತುರ್ಥೀ ಬಹುವಚನ)" });
  }
  if (word.endsWith("ात्")) {
    var stem5 = word.slice(0, -2);
    guesses.push({ surface: word, pratipadika: stem5, vibhakti: 5, vachana: 1, artha: "(ಪಂಚಮೀ ವಿಭಕ್ತಿ)" });
  }
  if (word.endsWith("ः")) {
    var stem1 = word.slice(0, -1);
    guesses.push({ surface: word, pratipadika: stem1, vibhakti: 1, vachana: 1, prathamaEkavachana: word, artha: "(ಪ್ರಥಮಾ ವಿಭಕ್ತಿ)" });
  }
  if (guesses.length === 0) {
    guesses.push({ surface: word, pratipadika: word, vibhakti: 1, vachana: 1, prathamaEkavachana: word, artha: "" });
  }
  return guesses;
}

function isKtaAnta(pratipadika) {
  if (KNOWN_KTA_WORDS.has(pratipadika)) return true;
  return /(ित|ूत|ात|ृत|प्त|न्न|द्ध|ब्ध|ढ|ष्ट|क्त)$/.test(pratipadika);
}

function isKalavachaka(analysis) {
  if (KALAVACHAKA_WORDS.has(analysis.pratipadika)) return true;
  if (analysis.artha && /(काल|समयः|मास|दिवस|रात्रि|क्षण)/.test(analysis.artha)) return true;
  return false;
}

function formSamastaPada(purvaPratipadika, uttaraSurface) {
  var p = purvaPratipadika;
  var u = uttaraSurface;

  if (p === "स्वयम्") return "स्वयं" + u;
  if (p.endsWith("न्") && p !== "अहन्") {
    p = p.slice(0, -2);
  }
  if (p === "वाच्") p = "वाक्";

  var vowelMap = {
    "अ": "", "आ": "ा", "इ": "ि", "ई": "ी", "उ": "ु", "ऊ": "ू", "ऋ": "ृ", "ए": "े", "ऐ": "ै", "ओ": "ो", "औ": "ौ"
  };

  var firstChar = u.charAt(0);
  if (Object.prototype.hasOwnProperty.call(vowelMap, firstChar)) {
    var restUttara = u.slice(1);
    if ((p.endsWith("ि") || p.endsWith("ी")) && firstChar !== "इ" && firstChar !== "ई") {
      return p.slice(0, -1) + "्य" + vowelMap[firstChar] + restUttara;
    }
    if (firstChar === "अ" || firstChar === "आ") {
      return (p.endsWith("ा") ? p.slice(0, -1) : p) + "ा" + restUttara;
    }
    if (firstChar === "इ" || firstChar === "ई") {
      return (p.endsWith("ा") ? p.slice(0, -1) : p) + "े" + restUttara;
    }
    if (firstChar === "उ" || firstChar === "ऊ") {
      return (p.endsWith("ा") ? p.slice(0, -1) : p) + "ो" + restUttara;
    }
    if (firstChar === "ओ" || firstChar === "औ") {
      return (p.endsWith("ा") ? p.slice(0, -1) : p) + "ौ" + restUttara;
    }
  }
  return p + u;
}

function runSamasaEngine() {
  var purvaInput = document.getElementById("purvaInput").value.trim();
  var uttaraInput = document.getElementById("uttaraInput").value.trim();

  if (!purvaInput || !uttaraInput) {
    alert("ದಯವಿಟ್ಟು ಪೂರ್ವಪದ ಮತ್ತು ಉತ್ತರಪದ ಎರಡನ್ನೂ ನಮೂದಿಸಿ.");
    return;
  }

  var purvaAnalyses = analyzeWord(purvaInput);
  var uttaraAnalyses = analyzeWord(uttaraInput);
  var evaluationLog = [];
  var matchedCandidates = [];

  rulesData.forEach(function(rule) {
    var ruleMatched = false;
    var matchDetails = null;

    purvaAnalyses.forEach(function(pAna) {
      if (ruleMatched) return;
      uttaraAnalyses.forEach(function(uAna) {
        if (ruleMatched) return;
        var check = evaluateRuleOnPair(rule, pAna, uAna);
        if (check.isMatch) {
          ruleMatched = true;
          matchDetails = { rule: rule, pAna: pAna, uAna: uAna, check: check };
        }
      });
    });

    if (ruleMatched) {
      matchedCandidates.push(matchDetails);
      evaluationLog.push({
        sutra: rule.rule_id + " - " + rule.sutra,
        samasa_type: rule.samasa_type,
        status: "MATCHED",
        reason: matchDetails.check.reason
      });
    } else {
      evaluationLog.push({
        sutra: rule.rule_id + " - " + rule.sutra,
        samasa_type: rule.samasa_type,
        status: "REJECTED",
        reason: getRejectionReason(rule, purvaAnalyses[0], uttaraAnalyses[0])
      });
    }
  });

  if (matchedCandidates.length === 0) {
    renderFinalOutput({
      success: false,
      purvaInput: purvaInput,
      uttaraInput: uttaraInput,
      purvaAnalyses: purvaAnalyses,
      uttaraAnalyses: uttaraAnalyses,
      evaluationLog: evaluationLog,
      message: "ಯಾವುದೇ ತತ್ಪುರುಷ ಸಮಾಸದ ಸೂತ್ರವು ಈ ಪದಗಳಿಗೆ ಅನ್ವಯಿಸುವುದಿಲ್ಲ (❌ समासः न भवति)."
    });
    return;
  }

  var primaryMatch = matchedCandidates[0];
  if (primaryMatch.check.needsModal) {
    pendingEvaluation = {
      primaryMatch: primaryMatch,
      purvaInput: purvaInput,
      uttaraInput: uttaraInput,
      purvaAnalyses: purvaAnalyses,
      uttaraAnalyses: uttaraAnalyses,
      evaluationLog: evaluationLog
    };
    openSemanticModal(primaryMatch);
  } else {
    renderFinalOutput({
      success: true,
      purvaInput: purvaInput,
      uttaraInput: uttaraInput,
      purvaAnalyses: purvaAnalyses,
      uttaraAnalyses: uttaraAnalyses,
      evaluationLog: evaluationLog,
      appliedRule: primaryMatch.rule,
      pAna: primaryMatch.pAna,
      uAna: primaryMatch.uAna,
      semanticNote: "ನೇರ ಶಬ್ದ/ರೂಪ ಹೊಂದಾಣಿಕೆ (Exact Rule Match)"
    });
  }
}

function evaluateRuleOnPair(rule, pAna, uAna) {
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

  var uttaraType = rule.uttara.match_type;

  if (uttaraType === "exact_pratipadika") {
    if (rule.uttara.words.indexOf(uAna.pratipadika) !== -1) {
      return { isMatch: true, needsModal: false, reason: "ಉತ್ತರಪದ '" + uAna.pratipadika + "' ಸೂತ್ರದ ಪಟ್ಟಿಯಲ್ಲಿದೆ." };
    }
    return { isMatch: false };
  }

  if (uttaraType === "kta_anta") {
    if (isKtaAnta(uAna.pratipadika)) {
      var needsModal = Boolean(rule.semantic_check && rule.semantic_check.required);
      return { isMatch: true, needsModal: needsModal, reason: "ಉತ್ತರಪದ '" + uAna.pratipadika + "' ಕ್ತ-ಪ್ರತ್ಯಯಾಂತವಾಗಿದೆ." };
    }
    return { isMatch: false };
  }

  if (uttaraType === "any") {
    if (!isKtaAnta(uAna.pratipadika)) {
      return { isMatch: true, needsModal: true, reason: "ಕಾಲವಾಚಕ ದ್ವಿತೀಯಾ + '" + uAna.pratipadika + "' (ಅತ್ಯಂತಸಂಯೋಗ ಪರೀಕ್ಷೆ ಅಗತ್ಯ)." };
    }
    return { isMatch: false };
  }

  if (uttaraType === "semantic_dependent") {
    return { isMatch: true, needsModal: true, reason: "ತೃತೀಯಾ ವಿಭಕ್ತಿ ಪೂರ್ವಪದವಿದೆ; ಉತ್ತರಪದದ ಅರ್ಥಸಂಬಂಧ ನಿರ್ಣಯವಾಗಬೇಕು." };
  }

  if (uttaraType === "exact_or_semantic") {
    if (rule.uttara.exact_words.indexOf(uAna.pratipadika) !== -1) {
      return { isMatch: true, needsModal: false, reason: "ಉತ್ತರಪದ '" + uAna.pratipadika + "' ಚತುರ್ಥೀ ಸೂತ್ರದ ನೇರ ಪಟ್ಟಿಯಲ್ಲಿದೆ." };
    }
    return { isMatch: true, needsModal: true, reason: "ಚತುರ್ಥೀ ವಿಭಕ್ತಿ ಇದೆ; ಪ್ರಕೃತಿ-ವಿಕೃತಿ ಭಾವದ ಪರೀಕ್ಷೆ ಅಗತ್ಯ." };
  }

  return { isMatch: false };
}

function getRejectionReason(rule, pAna, uAna) {
  if (rule.purva.exact_word && pAna.surface !== rule.purva.exact_word) {
    return "ಪೂರ್ವಪದ '" + rule.purva.exact_word + "' ಆಗಿರಬೇಕಿತ್ತು (ಇಲ್ಲಿ '" + pAna.surface + "' ಇದೆ).";
  }
  if (rule.purva.vibhakti && pAna.vibhakti !== rule.purva.vibhakti) {
    return "ಪೂರ್ವಪದವು " + rule.purva.vibhakti + "ನೇ ವಿಭಕ್ತಿಯಲ್ಲಿರಬೇಕು (ಇಲ್ಲಿ " + (pAna.vibhakti || "ಅವ್ಯಯ") + " ವಿಭಕ್ತಿ ಇದೆ).";
  }
  if (rule.purva.pratipadika && pAna.pratipadika !== rule.purva.pratipadika) {
    return "ಪೂರ್ವಪದ '" + rule.purva.pratipadika + "' ಆಗಿರಬೇಕಿತ್ತು.";
  }
  if (rule.purva.category === "kalavachaka" && !isKalavachaka(pAna)) {
    return "ಪೂರ್ವಪದ '" + pAna.pratipadika + "' ಕಾಲವಾಚಕ ಶಬ್ದವಲ್ಲ.";
  }
  return "ಉತ್ತರಪದ '" + uAna.pratipadika + "' ಈ ಸೂತ್ರದ ಷರತ್ತಿಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.";
}

function openSemanticModal(matchDetails) {
  var rule = matchDetails.rule;
  var pAna = matchDetails.pAna;
  var uAna = matchDetails.uAna;
  var sem = rule.semantic_check;
  var modalContainer = document.getElementById("dynamicModalOverlay");
  var modalContent = document.getElementById("dynamicModalBox");
  modalContent.innerHTML = "";

  modalContent.appendChild(el("div", "modal-badge", "ಸೂತ್ರ " + rule.rule_id + " — ವಿವಕ್ಷಾ ಪರೀಕ್ಷೆ (Semantic Check)"));
  modalContent.appendChild(el("h3", "modal-title-sa", sem.question_sa || "अर्थसम्बन्धं चिनुत"));
  modalContent.appendChild(el("p", "modal-title-kn", sem.question_kn || "ಕೆಳಗಿನವುಗಳಲ್ಲಿ ಸರಿಯಾದ ಅರ್ಥಸಂಬಂಧವನ್ನು ಆರಿಸಿ:"));
  modalContent.appendChild(el("div", "modal-word-preview", pAna.surface + " + " + uAna.surface));

  if (sem.options) {
    var optList = el("div", "modal-options-list");
    sem.options.forEach(function(opt) {
      var btn = el("button", "modal-opt-btn");
      btn.appendChild(el("strong", "", opt.label));
      btn.appendChild(el("span", "modal-opt-sub", "→ ಸೂತ್ರ: " + opt.sutra));
      btn.onclick = function() {
        resolveSemanticChoice(true, opt.sutra, opt.label);
      };
      optList.appendChild(btn);
    });
    modalContent.appendChild(optList);

    var cancelBtn = el("button", "modal-btn-cancel", "❌ ಇವುಗಳಲ್ಲಿ ಯಾವುದೂ ಅಲ್ಲ (असाधुः — ಸಮಾಸವಿಲ್ಲ)");
    cancelBtn.onclick = function() { resolveSemanticChoice(false); };
    modalContent.appendChild(cancelBtn);
  } else {
    var actionRow = el("div", "modal-action-row");
    var noBtn = el("button", "modal-btn-no", "नैव (ಇಲ್ಲ - No)");
    noBtn.onclick = function() { resolveSemanticChoice(false); };

    var yesBtn = el("button", "modal-btn-yes", "आम् (ಹೌದು - Yes)");
    var sutraText = rule.rule_id + " (" + rule.sutra + ")";
    yesBtn.onclick = function() { resolveSemanticChoice(true, sutraText, "ವಿವಕ್ಷೆ ದೃಢಪಟ್ಟಿದೆ"); };

    actionRow.appendChild(noBtn);
    actionRow.appendChild(yesBtn);
    modalContent.appendChild(actionRow);
  }

  modalContainer.style.display = "flex";
}

function resolveSemanticChoice(isApproved, customSutra, customNote) {
  document.getElementById("dynamicModalOverlay").style.display = "none";
  if (!pendingEvaluation) return;

  var pEval = pendingEvaluation;
  var primaryMatch = pEval.primaryMatch;

  if (isApproved) {
    var appliedRule = Object.assign({}, primaryMatch.rule);
    if (customSutra) appliedRule.sutra = customSutra;

    renderFinalOutput({
      success: true,
      purvaInput: pEval.purvaInput,
      uttaraInput: pEval.uttaraInput,
      purvaAnalyses: pEval.purvaAnalyses,
      uttaraAnalyses: pEval.uttaraAnalyses,
      evaluationLog: pEval.evaluationLog,
      appliedRule: appliedRule,
      pAna: primaryMatch.pAna,
      uAna: primaryMatch.uAna,
      semanticNote: customNote
    });
  } else {
    var failMsg = (primaryMatch.rule.semantic_check && primaryMatch.rule.semantic_check.if_false_msg)
      ? primaryMatch.rule.semantic_check.if_false_msg
      : "ವಿವಕ್ಷೆ ಇಲ್ಲದಿರುವುದರಿಂದ ಸಮಾಸವಾಗುವುದಿಲ್ಲ.";

    renderFinalOutput({
      success: false,
      purvaInput: pEval.purvaInput,
      uttaraInput: pEval.uttaraInput,
      purvaAnalyses: pEval.purvaAnalyses,
      uttaraAnalyses: pEval.uttaraAnalyses,
      evaluationLog: pEval.evaluationLog,
      message: failMsg
    });
  }
  pendingEvaluation = null;
}

function renderFinalOutput(data) {
  var resBox = document.getElementById("resultSection");
  resBox.innerHTML = "";
  resBox.style.display = "block";

  var pAna = data.pAna || data.purvaAnalyses[0];
  var uAna = data.uAna || data.uttaraAnalyses[0];

  if (data.success) {
    var samastaPada = formSamastaPada(pAna.pratipadika, uAna.surface);
    var purvaSup = pAna.isAvyaya ? "(अव्ययम्)" : ((SUP_PRATYAYA[pAna.vibhakti] && SUP_PRATYAYA[pAna.vibhakti][pAna.vachana - 1]) || "सुप्");
    var uttaraSup = (SUP_PRATYAYA[uAna.vibhakti] && SUP_PRATYAYA[uAna.vibhakti][uAna.vachana - 1]) || "सु";
    var pMorphInfo = pAna.isAvyaya ? "ಅವ್ಯಯ" : ("ವಿಭಕ್ತಿ: " + pAna.vibhakti + ", ವಚನ: " + pAna.vachana);

    var card = el("div", "result-card success");
    var hdr = el("div", "result-header");
    hdr.appendChild(el("span", "badge-success", "✓ ಸಮಾಸ ಸಿದ್ಧಿ (Valid Samāsa)"));
    hdr.appendChild(el("span", "samasa-name", data.appliedRule.samasa_type));
    card.appendChild(hdr);

    var hero = el("div", "samasta-hero");
    hero.appendChild(el("div", "vigraha-part", data.purvaInput + " + " + data.uttaraInput));
    hero.appendChild(el("div", "arrow", "➔"));
    hero.appendChild(el("div", "samasta-word", samastaPada));
    card.appendChild(hero);

    var pBox = el("div", "prakriya-box");
    pBox.appendChild(el("h4", "", "📜 ಪಾಣಿನೀಯ ಪ್ರಕ್ರಿಯಾ ಹಂತಗಳು (Step-by-Step Derivation):"));
    var ol = el("ol", "prakriya-steps");

    ol.appendChild(el("li", "", "ಲೌಕಿಕ ವಿಗ್ರಹವಾಕ್ಯ: " + data.purvaInput + " " + data.uttaraInput));
    ol.appendChild(el("li", "", "ಪದ ವಿಶ್ಲೇಷಣ: ಪೂರ್ವಪದ '" + pAna.pratipadika + "' (" + pMorphInfo + ") " + (pAna.artha ? "[" + pAna.artha + "]" : "") + " | ಉತ್ತರಪದ '" + uAna.pratipadika + "' (ವಿಭಕ್ತಿ: " + uAna.vibhakti + ")"));
    ol.appendChild(el("li", "", "ಅಲೌಕಿಕ ವಿಗ್ರಹವಾಕ್ಯ: " + pAna.pratipadika + " + " + purvaSup + " + " + uAna.pratipadika + " + " + uttaraSup));

    var liSutra = el("li", "", "ಸಮಾಸ ವಿಧಾಯಕ ಸೂತ್ರ: ");
    liSutra.appendChild(el("span", "sutra-highlight", data.appliedRule.sutra));
    liSutra.appendChild(el("span", "", " (" + data.semanticNote + ")"));
    ol.appendChild(liSutra);

    ol.appendChild(el("li", "", "ಸುಬ್ಳುಕ್ (ವಿಭಕ್ತಿ ಲೋಪ): 'सुपो धातुप्रातिपदिकयोः (2.4.71)' ಸೂತ್ರದಿಂದ ಪ್ರತ್ಯಯ ಲೋಪ ➔ " + pAna.pratipadika + " + " + uAna.pratipadika));
    ol.appendChild(el("li", "", "ಸಮಸ್ತಪದ ನಿಷ್ಪತ್ತಿ: ಸಂಧಿ ಮತ್ತು ಸುಬುತ್ಪತ್ತಿ ಸೇರಿ ➔ " + samastaPada));

    pBox.appendChild(ol);
    card.appendChild(pBox);
    resBox.appendChild(card);
  } else {
    var failCard = el("div", "result-card failure");
    var fHdr = el("div", "result-header");
    fHdr.appendChild(el("span", "badge-fail", "❌ समासः न भवति (ಸಮಾಸವಾಗುವುದಿಲ್ಲ)"));
    failCard.appendChild(fHdr);

    var fHero = el("div", "samasta-hero");
    fHero.appendChild(el("div", "vigraha-part", data.purvaInput + " + " + data.uttaraInput));
    fHero.appendChild(el("div", "arrow", "➔"));
    fHero.appendChild(el("div", "samasta-word fail-text", data.purvaInput + " " + data.uttaraInput + " (ವ್ಯಸ್ತಪದವಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ)"));
    failCard.appendChild(fHero);

    failCard.appendChild(el("p", "", "ಕಾರಣ: " + data.message));
    resBox.appendChild(failCard);
  }

  var logBox = el("div", "audit-log");
  logBox.appendChild(el("h4", "", "🔍 ಎಂಜಿನ್ ಪರೀಕ್ಷಿಸಿದ ಸೂತ್ರಗಳ ವಿವರ (Rule Verification Log):"));
  var tbl = el("table", "log-table");
  var thead = el("thead");
  var hRow = el("tr");
  ["ಸಮಾಸ ಪ್ರಕಾರ", "ಸೂತ್ರ", "ಫಲಿತಾಂಶ", "ವಿವರಣೆ"].forEach(function(hText) {
    hRow.appendChild(el("th", "", hText));
  });
  thead.appendChild(hRow);
  tbl.appendChild(thead);

  var tbody = el("tbody");
  data.evaluationLog.forEach(function(row) {
    var tr = el("tr", row.status === "MATCHED" ? "row-match" : "row-reject");
    tr.appendChild(el("td", "", row.samasa_type));
    tr.appendChild(el("td", "", row.sutra));
    tr.appendChild(el("td", "", row.status === "MATCHED" ? "✅ ಹೊಂದಿಕೆಯಾಗಿದೆ" : "✗ ಅನ್ವಯಿಸುವುದಿಲ್ಲ"));
    tr.appendChild(el("td", "", row.reason));
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  logBox.appendChild(tbl);
  resBox.appendChild(logBox);

  resBox.scrollIntoView({ behavior: "smooth" });
}

function loadQuickTest(purva, uttara) {
  document.getElementById("purvaInput").value = purva;
  document.getElementById("uttaraInput").value = uttara;
  runSamasaEngine();
}

function loadFallbackData() {
  rulesData = [
    { rule_id: "2.1.24", sutra: "द्वितीया श्रितातीतपतितगतात्यस्तप्राप्तापन्नैः", samasa_type: "द्वितीया-तत्पुरुषः", purva: { vibhakti: 2 }, uttara: { match_type: "exact_pratipadika", words: ["श्रित", "अतीत", "पतित", "गत", "अत्यस्त", "प्राप्त", "आपन्न"] }, semantic_check: { required: false } },
    { rule_id: "2.1.25", sutra: "स्वयं क्तेन", samasa_type: "द्वितीया-तत्पुरुषः", purva: { exact_word: "स्वयम्", type: "avyaya" }, uttara: { match_type: "kta_anta" }, semantic_check: { required: false } },
    { rule_id: "2.1.26", sutra: "खट्वा क्षेपे", samasa_type: "द्वितीया-तत्पुरुषः", purva: { vibhakti: 2, pratipadika: "खट्वा" }, uttara: { match_type: "kta_anta" }, semantic_check: { required: true, question_sa: "किम् अत्र क्षेपः (निन्दा) विवक्षितः?", question_kn: "ಇಲ್ಲಿ ನಿಂದೆ ಅಥವಾ ಅಪಹಾಸ್ಯದ ಉದ್ದೇಶವಿದೆಯೇ?", if_false_msg: "ನಿಂದೆಯ ಉದ್ದೇಶವಿಲ್ಲದಿದ್ದರೆ ಸಮಾಸವಾಗುವುದಿಲ್ಲ. 'खट्वाम् आरूढः' ಎಂದೇ ಪ್ರತ್ಯೇಕವಾಗಿ ಉಳಿಯುತ್ತದೆ." } },
    { rule_id: "2.1.29", sutra: "अत्यन्तसंयोगे च", samasa_type: "द्वितीया-तत्पुरुषः", purva: { vibhakti: 2, category: "kalavachaka" }, uttara: { match_type: "any" }, semantic_check: { required: true, question_sa: "अत्यन्तसंयोगः विवक्षितः?", question_kn: "ಕಾಲದ ನಿರಂತರ ಸಂಬಂಧ (ಅತ್ಯಂತಸಂಯೋಗ) ವಿವಕ್ಷಿತವೇ?", if_false_msg: "ಅತ್ಯಂತಸಂಯೋಗ ವಿವಕ್ಷಿತವಲ್ಲದಿದ್ದರೆ ಸಮಾಸವಾಗುವುದಿಲ್ಲ." } },
    { rule_id: "2.1.31", sutra: "पूर्वसदृशसमोनार्थकलहनिपुणमिश्रश्लक्ष्णैः", samasa_type: "तृतीया-तत्पुरुषः", purva: { vibhakti: 3 }, uttara: { match_type: "exact_pratipadika", words: ["पूर्व", "सदृश", "सम", "ऊन", "अर्थ", "कलह", "निपुण", "मिश्र", "श्लक्ष्ण", "अवर"] }, semantic_check: { required: false } },
    { rule_id: "2.1.30_35", sutra: "तृतीया तत्कृतार्थेन... (2.1.30, 32, 33, 34, 35)", samasa_type: "तृतीया-तत्पुरुषः", purva: { vibhakti: 3 }, uttara: { match_type: "semantic_dependent" }, semantic_check: { required: true, options: [ { key: "guna", sutra: "2.1.30 (तृतीया तत्कृतार्थेन गुणवचनेन)", label: "ತತ್ಕೃತ ಗುಣವಾಚಕ (Quality caused by Purvapada)" }, { key: "kridanta", sutra: "2.1.32 (कर्तृकरणे कृता बहुलम्)", label: "ಕರ್ತೃ/ಕರಣ + ಕೃದಂತ (Agent/Instrument with Kridanta)" }, { key: "kritya", sutra: "2.1.33 (कृत्यैरधिकार्थवचने)", label: "ಕೃತ್ಯ ಪ್ರತ್ಯಯಾಂತ + ಅತಿಶಯೋಕ್ತಿ (Exaggeration)" }, { key: "anna", sutra: "2.1.34-35 (अन्नेन व्यञ्जनम् / भक्ष्येण मिश्रीकरणम्)", label: "ಅನ್ನ-ವ್ಯಂಜನ / ಆಹಾರ ಮಿಶ್ರಣ (Food combination)" } ], if_false_msg: "ಯಾವುದೇ ತೃತೀಯಾ ಸಮಾಸದ ಸಂಬಂಧ ಹೊಂದಿಕೆಯಾಗದ ಕಾರಣ ಸಮಾಸವಾಗುವುದಿಲ್ಲ." } },
    { rule_id: "2.1.36", sutra: "चतुर्थी तदर्थार्थबलिहितसुखरक्षितैः", samasa_type: "चतुर्थी-तत्पुरुषः", purva: { vibhakti: 4 }, uttara: { match_type: "exact_or_semantic", exact_words: ["अर्थ", "बलि", "हित", "सुख", "रक्षित"] }, semantic_check: { required_if_not_exact: true, question_sa: "प्रकृति-विकृति-भावः अस्ति?", question_kn: "ಇಲ್ಲಿ ಪ್ರಕೃತಿ-ವಿಕೃತಿ ಭಾವ (ಮೂಲ ವಸ್ತುವು ಉತ್ಪನ್ನವಾಗಿ ಮಾರ್ಪಡುವ ಸಂಬಂಧ) ಇದೆಯೇ?", if_false_msg: "ಪ್ರಕೃತಿ-ವಿಕೃತಿ ಭಾವ ಇಲ್ಲದಿರುವುದರಿಂದ ಸಮಾಸವಾಗುವುದಿಲ್ಲ (ಉದಾ: रन्धनाय स्थाली)." } }
  ];
}

window.addEventListener("DOMContentLoaded", initEngine);
