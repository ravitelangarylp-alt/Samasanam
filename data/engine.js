// ============================================================================
// PANINIAN SAMASA ENGINE - PROTOTYPE v0.4
// Supports: All Vibhakti Tatpurushas (2nd to 7th) + External sandhi.js Module
// ============================================================================

var lexiconData = [];
var rulesData = [];
var formIndex = new Map();
var stemIndex = new Map();
var pendingEvaluation = null;

var KALAVACHAKA_WORDS = new Set([
  "मास", "संवत्सर", "अहर्", "अहन्", "रात्रि", "दिवस", "मुहूर्त", "क्षण", "काल", "सप्ताह", "पक्ष", "ऋतु", "कल्प", "युग", "शरद्", "हेमन्त", "वसन्त", "ग्रीष्म", "वर्षा", "शिशिर"
]);

var KNOWN_KTA_WORDS = new Set([
  "कृत", "आरूढ", "प्रमित", "भुक्त", "पीत", "गत", "आगत", "श्रित", "पतित", "अतीत", "प्राप्त", "आपन्न", "भिन्न", "हत", "दत्त", "उक्त", "बद्ध", "लब्ध", "भीत", "मुक्त", "अपेत", "अपोढ", "अपत्रस्त", "सिद्ध", "शुष्क", "पक्व"
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

// ಪ್ರಮುಖ ಶಬ್ದಗಳ, ಸರ್ವನಾಮಗಳ ಮತ್ತು ಹಲಂತ ಶಬ್ದಗಳ ವಿಭಕ್ತಿ ಕೋಷ್ಟಕ
var BUILTIN_DECLENSIONS = {
  "अस्मद्": { 1: "अहम्", 2: "माम्", 3: "मया", 4: "मह्यम्", 5: "मत्", 6: "मम", 7: "मयि" },
  "युष्मद्": { 1: "त्वम्", 2: "त्वाम्", 3: "त्वया", 4: "तुभ्यम्", 5: "त्वत्", 6: "तव", 7: "त्वयि" },
  "राजन्": { 1: "राजा", 2: "राजानम्", 3: "राज्ञा", 4: "राज्ञे", 5: "राज्ञः", 6: "राज्ञः", 7: "राज्ञि" },
  "शरद्": { 1: "शरत्", 2: "शरदम्", 3: "शरदा", 4: "शरदे", 5: "शरदः", 6: "शरदः", 7: "शरदि" },
  "वाच्": { 1: "वाक्", 2: "वाचम्", 3: "वाचा", 4: "वाचे", 5: "वाचः", 6: "वाचः", 7: "वाचि" },
  "कृष्ण": { 2: "कृष्णम्", 3: "कृष्णेन", 4: "कृष्णाय", 5: "कृष्णात्", 6: "कृष्णस्य", 7: "कृष्णे" },
  "खट्वा": { 2: "खट्वाम्", 3: "खट्वया", 4: "खट्वायै", 5: "खट्वायाः", 6: "खट्वायाः", 7: "खट्वायाम्" },
  "मुहूर्त": { 2: "मुहूर्तम्", 3: "मुहूर्तेन", 4: "मुहूर्ताय", 5: "मुहूर्तात्", 6: "मुहूर्तस्य", 7: "मुहूर्ते" },
  "मास": { 2: "मासम्", 3: "मासेन", 4: "मासाय", 5: "मासात्", 6: "मासस्य", 7: "मासे" },
  "ह्लादिनी": { 2: "ह्लादिनीम्", 3: "ह्लादिन्या", 4: "ह्लादिन्यै", 5: "ह्लादिन्याः", 6: "ह्लादिन्याः", 7: "ह्लादिन्याम्" },
  "अहि": { 2: "अहिम्", 3: "अहिना", 4: "अहये", 5: "अहेः", 6: "अहेः", 7: "अहौ" },
  "दधि": { 2: "दधि", 3: "दध्ना", 4: "दध्ने", 5: "दध्नः", 6: "दध्नः", 7: "दध्नि" },
  "द्विज": { 2: "द्विजम्", 3: "द्विजेन", 4: "द्विजाय", 5: "द्विजात्", 6: "द्विजस्य", 7: "द्विजे" },
  "यूप": { 2: "यूपम्", 3: "यूपेन", 4: "यूपाय", 5: "यूपात्", 6: "यूपस्य", 7: "यूपे" },
  "भूत": { 2: "भूतम्", 3: "भूतेन", 4: "भूतेभ्यः", 5: "भूतात्", 6: "भूतस्य", 7: "भूते" },
  "चोर": { 2: "चोरम्", 3: "चोरेण", 4: "चोराय", 5: "चोरात्", 6: "चोरस्य", 7: "चोरे" },
  "व्याघ्र": { 2: "व्याघ्रम्", 3: "व्याघ्रेण", 4: "व्याघ्राय", 5: "व्याघ्रात्", 6: "व्याघ्रस्य", 7: "व्याघ्रे" },
  "सुख": { 2: "सुखम्", 3: "सुखेन", 4: "सुखाय", 5: "सुखात्", 6: "सुखस्य", 7: "सुखे" },
  "स्वर्ग": { 2: "स्वर्गम्", 3: "स्वर्गेण", 4: "स्वर्गाय", 5: "स्वर्गात्", 6: "स्वर्गस्य", 7: "स्वर्गे" },
  "दूर": { 2: "दूरम्", 3: "दूरेण", 4: "दूराय", 5: "दूरात्", 6: "दूरस्य", 7: "दूरे" },
  "अक्ष": { 2: "अक्षम्", 3: "अक्षेण", 4: "अक्षाय", 5: "अक्षात्", 6: "अक्षस्य", 7: "अक्षेषु" },
  "कार्य": { 2: "कार्यम्", 3: "कार्येण", 4: "कार्याय", 5: "कार्यात्", 6: "कार्यस्य", 7: "कार्ये" },
  "आतप": { 2: "आतपम्", 3: "आतपेन", 4: "आतपाय", 5: "आतपात्", 6: "आतपस्य", 7: "आतपे" },
  "तीर्थ": { 2: "तीर्थम्", 3: "तीर्थेन", 4: "तीर्थाय", 5: "तीर्थात्", 6: "तीर्थस्य", 7: "तीर्थे" }
};

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function extractArray(rawJson) {
  if (Array.isArray(rawJson)) return rawJson;
  if (rawJson && typeof rawJson === "object") {
    var keys = Object.keys(rawJson);
    var found = null;
    keys.forEach(function(k) {
      if (!found && Array.isArray(rawJson[k])) {
        found = rawJson[k];
      }
    });
    if (found) return found;
    return Object.values(rawJson);
  }
  return [];
}

// sandhi.js ಫೈಲ್ ಅನ್ನು ತಾನಾಗಿಯೇ ಲೋಡ್ ಮಾಡಿಕೊಳ್ಳುವ ಫಂಕ್ಷನ್
function loadSandhiModule() {
  return new Promise(function(resolve) {
    if (window.PaniniSandhi) {
      resolve(true);
      return;
    }
    var s1 = document.createElement("script");
    s1.src = "./data/sandhi.js";
    s1.onload = function() { resolve(true); };
    s1.onerror = function() {
      var s2 = document.createElement("script");
      s2.src = "./sandhi.js";
      s2.onload = function() { resolve(true); };
      s2.onerror = function() { resolve(false); };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });
}

function buildAppInterface() {
  document.title = "पाणिनीय-समास-यन्त्रम् | Samasa Engine v0.4";

  var styleNode = document.createElement("style");
  styleNode.textContent = [
    ":root { --bg: #FAF7F2; --card: #FFFFFF; --primary: #7C2D12; --accent: #D97706; --border: #E5DEC9; --text: #292524; --success: #15803D; --danger: #B91C1C; --indigo: #3730A3; }",
    "* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Noto Sans Devanagari', 'Noto Sans Kannada', system-ui, sans-serif; }",
    "body { background: var(--bg); color: var(--text); padding: 24px; line-height: 1.6; }",
    ".container { max-width: 1020px; margin: 0 auto; }",
    ".app-header { text-align: center; padding: 24px; background: linear-gradient(135deg, #7C2D12, #9A3412); color: #FFF; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(124,45,18,0.15); }",
    ".app-header h1 { font-size: 28px; margin-bottom: 6px; }",
    ".app-header p { font-size: 15px; opacity: 0.9; }",
    ".status-badge { display: inline-block; margin-top: 12px; padding: 6px 14px; border-radius: 20px; font-size: 13px; background: rgba(255,255,255,0.18); }",
    ".status-badge.ready { background: #166534; color: #DCFCE7; }",
    ".status-badge.warning { background: #92400E; color: #FEF3C7; }",
    ".card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }",
    ".card.vigraha-card { border-color: #C7D2FE; background: linear-gradient(180deg, #FFFFFF, #F5F7FF); }",
    ".card h2 { font-size: 19px; color: var(--primary); margin-bottom: 16px; border-bottom: 2px solid #F5EFE6; padding-bottom: 8px; }",
    ".card.vigraha-card h2 { color: var(--indigo); border-bottom-color: #E0E7FF; }",
    ".input-grid { display: grid; grid-template-columns: 1fr auto 1fr auto; gap: 12px; align-items: end; }",
    ".vigraha-grid { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: end; margin-bottom: 16px; }",
    ".field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #57534E; }",
    ".field input { width: 100%; padding: 12px 14px; font-size: 18px; border: 2px solid var(--border); border-radius: 8px; outline: none; }",
    ".field input:focus { border-color: var(--accent); }",
    ".plus-sign { font-size: 26px; font-weight: bold; color: var(--accent); padding-bottom: 8px; }",
    ".btn-analyze { background: var(--primary); color: #FFF; border: none; padding: 13px 26px; font-size: 16px; font-weight: 600; border-radius: 8px; cursor: pointer; }",
    ".btn-analyze:hover { background: #5B210B; }",
    ".btn-vigraha { background: var(--indigo); color: #FFF; border: none; padding: 13px 26px; font-size: 16px; font-weight: 600; border-radius: 8px; cursor: pointer; }",
    ".btn-vigraha:hover { background: #1E1B4B; }",
    ".test-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }",
    ".test-group { background: #FDFBF7; border: 1px solid var(--border); border-radius: 8px; padding: 12px; }",
    ".test-group h4 { font-size: 13px; color: var(--primary); margin-bottom: 8px; }",
    ".test-chip { display: block; width: 100%; text-align: left; background: #FFF; border: 1px solid #E7E0D0; padding: 7px 10px; margin-bottom: 6px; border-radius: 6px; font-size: 13px; cursor: pointer; }",
    ".test-chip:hover { background: #FEF3C7; border-color: var(--accent); }",
    ".vigraha-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }",
    ".v-chip { background: #EEF2FF; border: 1px solid #C7D2FE; color: var(--indigo); padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; }",
    ".v-chip:hover { background: #E0E7FF; }",
    ".result-card { border-radius: 12px; padding: 22px; margin-bottom: 20px; border: 2px solid; }",
    ".result-card.success { background: #F0FDF4; border-color: #86EFAC; }",
    ".result-card.failure { background: #FEF2F2; border-color: #FCA5A5; }",
    ".result-card.vigraha-res { background: #EEF2FF; border-color: #A5B4FC; }",
    ".result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }",
    ".badge-success { background: var(--success); color: #FFF; padding: 5px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; }",
    ".badge-fail { background: var(--danger); color: #FFF; padding: 5px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; }",
    ".badge-vigraha { background: var(--indigo); color: #FFF; padding: 5px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; }",
    ".samasa-name { font-size: 18px; font-weight: 700; color: var(--primary); }",
    ".samasta-hero { display: flex; align-items: center; justify-content: center; gap: 18px; background: #FFF; padding: 18px; border-radius: 10px; margin-bottom: 18px; border: 1px solid rgba(0,0,0,0.08); }",
    ".vigraha-part { font-size: 22px; color: #44403C; }",
    ".arrow { font-size: 24px; color: var(--accent); }",
    ".samasta-word { font-size: 28px; font-weight: 800; color: var(--success); }",
    ".samasta-word.fail-text { font-size: 20px; color: var(--danger); }",
    ".prakriya-box { background: #FFF; padding: 16px 20px; border-radius: 8px; border: 1px solid #DCFCE7; margin-bottom: 12px; }",
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
    ".modal-box { background: #FFF; max-width: 540px; width: 100%; border-radius: 14px; padding: 24px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }",
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
  header.appendChild(el("h1", "", "पाणिनीय-समास-यन्त्रम् (Prototype v0.4)"));
  header.appendChild(el("p", "", "ದ್ವಿತೀಯಾದಿಂದ ಸಪ್ತಮೀವರೆಗಿನ ಸಂಪೂರ್ಣ ವಿಭಕ್ತಿ ತತ್ಪುರುಷ ಸಮಾಸ ಎಂಜಿನ್ (sandhi.js ಮಾಡ್ಯೂಲ್ ಸಹಿತ)"));
  var statusBadge = el("div", "status-badge", "⏳ ಎಂಜಿನ್ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...");
  statusBadge.id = "engineStatus";
  header.appendChild(statusBadge);
  container.appendChild(header);

  // Card 1: Samasa Generator
  var inputCard = el("div", "card");
  inputCard.appendChild(el("h2", "", "१. ಸಮಾಸ ನಿರ್ಮಾಣ ಯಂತ್ರ (Vigraha ➔ Samastapada)"));
  var grid = el("div", "input-grid");

  var f1 = el("div", "field");
  f1.appendChild(el("label", "", "ಪೂರ್ವಪದ (First Word with Vibhakti)"));
  var inp1 = el("input");
  inp1.type = "text";
  inp1.id = "purvaInput";
  inp1.value = "मम";
  f1.appendChild(inp1);

  var plus = el("div", "plus-sign", "+");

  var f2 = el("div", "field");
  f2.appendChild(el("label", "", "ಉತ್ತರಪದ (Second Word)"));
  var inp2 = el("input");
  inp2.type = "text";
  inp2.id = "uttaraInput";
  inp2.value = "ग्रामः";
  f2.appendChild(inp2);

  var btnAnalyze = el("button", "btn-analyze", "ಸಮಾಸ ಮಾಡಿ (Combine)");
  btnAnalyze.onclick = runSamasaEngine;

  grid.appendChild(f1);
  grid.appendChild(plus);
  grid.appendChild(f2);
  grid.appendChild(btnAnalyze);
  inputCard.appendChild(grid);
  container.appendChild(inputCard);

  // Card 2: Samasa Vigraha (Reverse Analyzer)
  var vigCard = el("div", "card vigraha-card");
  vigCard.appendChild(el("h2", "", "२. ಸಮಸ್ತಪದ ವಿಗ್ರಹ ಯಂತ್ರ (Samastapada ➔ Vigraha Splitter)"));
  var vGrid = el("div", "vigraha-grid");

  var vf = el("div", "field");
  vf.appendChild(el("label", "", "ಸಮಸ್ತಪದವನ್ನು ನಮೂದಿಸಿ (Enter Compound Word to Split)"));
  var vInp = el("input");
  vInp.type = "text";
  vInp.id = "samastaInput";
  vInp.value = "मद्ग्रामः";
  vf.appendChild(vInp);

  var btnVigraha = el("button", "btn-vigraha", "ವಿಗ್ರಹ ಮಾಡಿ (Split Word)");
  btnVigraha.onclick = runVigrahaEngine;

  vGrid.appendChild(vf);
  vGrid.appendChild(btnVigraha);
  vigCard.appendChild(vGrid);

  vigCard.appendChild(el("p", "", "ಕೆಳಗಿನ ಸಮಸ್ತಪದಗಳನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ನೇರವಾಗಿ ವಿಗ್ರಹ ಪರೀಕ್ಷಿಸಿ:"));
  var vChips = el("div", "vigraha-chips");
  var sampleCompounds = [
    "मद्ग्रामः", "मत्पुत्रः", "राजपुरुषः", "शरत्पूर्वः", "वाक्कलहः",
    "चोरभयम्", "सुखापेतः", "अक्षशौण्डः", "आतपशुष्कः",
    "कृष्णश्रितः", "खट्वारूढः", "दध्योदनः", "यूपदारु"
  ];
  sampleCompounds.forEach(function(word) {
    var cBtn = el("button", "v-chip", word);
    cBtn.onclick = function() {
      document.getElementById("samastaInput").value = word;
      runVigrahaEngine();
    };
    vChips.appendChild(cBtn);
  });
  vigCard.appendChild(vChips);
  container.appendChild(vigCard);

  // Card 3: Quick Test Suite (2nd to 7th Tatpurusha)
  var testCard = el("div", "card");
  testCard.appendChild(el("h2", "", "३. ದ್ವಿತೀಯಾದಿಂದ ಸಪ್ತಮೀ ತತ್ಪುರುಷ ಪರೀಕ್ಷಾ ಉದಾಹರಣೆಗಳು (1-Click Tests)"));
  var testGroups = el("div", "test-groups");

  var suiteData = [
    {
      title: "✅ ದ್ವಿತೀಯಾ ಮತ್ತು ತೃತೀಯಾ",
      items: [
        ["कृष्णम्", "श्रितः", "कृष्णम् + श्रितः (2.1.24)"],
        ["खट्वाम्", "आरूढः", "खट्वाम् + आरूढः (2.1.26 ಕ್ಷೇಪ)"],
        ["शरदा", "पूर्वः", "शरदा + पूर्वः (➔ शरत्पूर्वः)"],
        ["दध्ना", "ओदनः", "दध्ना + ओदनः (➔ दध्योदनः)"]
      ]
    },
    {
      title: "✅ ಚತುರ್ಥೀ ಮತ್ತು ಪಂಚಮೀ",
      items: [
        ["यूपाय", "दारु", "यूपाय + दारु (2.1.36 ಚತುರ್ಥೀ)"],
        ["चोरात्", "भयम्", "चोरात् + भयम् (2.1.37 ಪಂಚಮೀ)"],
        ["सुखात्", "अपेतः", "सुखात् + अपेतः (2.1.38 ➔ सुखापेतः)"],
        ["दूरात्", "आगतः", "दूरात् + आगतः (2.1.39 ➔ दूरागतः)"]
      ]
    },
    {
      title: "✅ ಷಷ್ಠೀ ಮತ್ತು ಸಪ್ತಮೀ",
      items: [
        ["मम", "ग्रामः", "मम + ग्रामः (2.2.8 ➔ मद्ग्रामः)"],
        ["मम", "पुत्रः", "मम + पुत्रः (2.2.8 ➔ मत्पुत्रः)"],
        ["राज्ञः", "पुरुषः", "राज्ञः + पुरुषः (2.2.8 ➔ राजपुरुषः)"],
        ["अक्षेषु", "शौण्डः", "अक्षेषु + शौण्डः (2.1.40 ಸಪ್ತಮೀ)"],
        ["आतपे", "शुष्कः", "आतपे + शुष्कः (2.1.41 ಸಪ್ತಮೀ)"]
      ]
    },
    {
      title: "❌ Negative Tests (ಸಮಾಸ ನಿಷೇಧ)",
      items: [
        ["ग्रामात्", "आगतः", "ग्रामात् + आगतः (ಪಂಚಮೀ ಸೂತ್ರವಿಲ್ಲ)"],
        ["रन्धनाय", "स्थाली", "रन्धनाय + स्थाली (ಚತುರ್ಥೀ ನಿಷೇಧ)"],
        ["नृणाम्", "श्रेष्ठः", "नृणाम् + श्रेष्ठः (2.2.10 ನಿರ್ಧಾರಣ ನಿಷೇಧ)"]
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
    statusEl.textContent = "⏳ sanskrit_lexicon.json, samasa_rules.json ಮತ್ತು sandhi.js ಲೋಡ್ ಆಗುತ್ತಿದೆ...";
    
    await loadSandhiModule();

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

    if (!rulesData || rulesData.length < 10) {
      loadFallbackData();
    }

    buildFormIndex();
    var sandhiLoaded = window.PaniniSandhi ? "sandhi.js ಸಕ್ರಿಯವಾಗಿದೆ" : "Built-in Sandhi";
    statusEl.textContent = "✅ ಎಂಜಿನ್ ಸಿದ್ಧವಾಗಿದೆ! (" + lexiconData.length.toLocaleString() + " ಶಬ್ದಗಳು, " + rulesData.length + " ಸೂತ್ರಗಳು | " + sandhiLoaded + ")";
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
  stemIndex.clear();

  lexiconData.forEach(function(entry) {
    if (!entry || !entry.forms || !entry.word) return;
    var stem = String(entry.word).trim();
    var formsArr = String(entry.forms).split(";").slice(0, 21).map(function(s) { return s.trim(); });

    if (!stemIndex.has(stem)) {
      stemIndex.set(stem, {
        pratipadika: stem,
        linga: entry.linga || "",
        artha: entry.artha || "",
        formsArr: formsArr
      });
    }
    
    formsArr.forEach(function(rawForm, idx) {
      var vibhakti = Math.floor(idx / 3) + 1;
      var vachana = (idx % 3) + 1;

      var subForms = rawForm.split(/[\/,]/).map(function(s) { return s.trim(); }).filter(Boolean);
      
      subForms.forEach(function(cleanForm) {
        if (!formIndex.has(cleanForm)) {
          formIndex.set(cleanForm, []);
        }
        formIndex.get(cleanForm).push({
          pratipadika: stem,
          linga: entry.linga || "",
          artha: entry.artha || "",
          vibhakti: vibhakti,
          vachana: vachana,
          prathamaEkavachana: formsArr[0] || stem
        });
      });
    });
  });
}

function getInflectedForm(pratipadika, vibhaktiNum) {
  if (pratipadika === "स्वयम्" || pratipadika === "सामि") return pratipadika;

  if (BUILTIN_DECLENSIONS[pratipadika] && BUILTIN_DECLENSIONS[pratipadika][vibhaktiNum]) {
    return BUILTIN_DECLENSIONS[pratipadika][vibhaktiNum];
  }

  if (stemIndex.has(pratipadika)) {
    var entry = stemIndex.get(pratipadika);
    var targetIdx = (vibhaktiNum - 1) * 3;
    if (entry.formsArr[targetIdx]) {
      return entry.formsArr[targetIdx].split(/[\/,]/)[0].trim();
    }
  }

  if (vibhaktiNum === 2) return pratipadika + "म्";
  if (vibhaktiNum === 3) {
    if (pratipadika.endsWith("ा")) return pratipadika.slice(0, -1) + "या";
    if (pratipadika.endsWith("ि") || pratipadika.endsWith("ु")) return pratipadika + "ना";
    if (pratipadika.endsWith("द्") || pratipadika.endsWith("त्")) return pratipadika.slice(0, -1) + "ा";
    return pratipadika + "ेन";
  }
  if (vibhaktiNum === 4) return pratipadika.endsWith("ा") ? pratipadika + "यै" : pratipadika + "ाय";
  if (vibhaktiNum === 5) return pratipadika.endsWith("ा") ? pratipadika + "याः" : pratipadika + "ात्";
  if (vibhaktiNum === 6) return pratipadika.endsWith("ा") ? pratipadika + "याः" : pratipadika + "स्य";
  if (vibhaktiNum === 7) return pratipadika.endsWith("ा") ? pratipadika + "याम्" : pratipadika + "े";
  return pratipadika;
}

function isValidPratipadika(stem) {
  if (stem === "स्वयम्" || stem === "सामि") return true;
  if (BUILTIN_DECLENSIONS[stem]) return true;
  if (KALAVACHAKA_WORDS.has(stem)) return true;
  if (stemIndex.has(stem)) return true;
  return false;
}

// ಪದದ ರೂಪ ವಿಶ್ಲೇಷಣೆ (Morphological Analyzer - 1 ರಿಂದ 7ನೇ ವಿಭಕ್ತಿಗಳವರೆಗೆ)
function analyzeWord(surfaceWord) {
  var clean = surfaceWord.trim();
  var analyses = [];

  // ಅವ್ಯಯಗಳು ಮತ್ತು ಪ್ರಮುಖ ಸರ್ವನಾಮ/ಹಲಂತ ರೂಪಗಳು
  if (clean === "स्वयम्" || clean === "स्वयं") {
    analyses.push({ surface: "स्वयम्", pratipadika: "स्वयम्", vibhakti: 0, vachana: 1, isAvyaya: true, artha: "आत्मना (ತನ್ನಿಂದ ತಾನೇ)" });
  }
  if (clean === "सामि") {
    analyses.push({ surface: "सामि", pratipadika: "सामि", vibhakti: 0, vachana: 1, isAvyaya: true, artha: "अर्धम् (ಅರ್ಧ)" });
  }
  if (clean === "मम" || clean === "मे") {
    analyses.push({ surface: clean, pratipadika: "अस्मद्", vibhakti: 6, vachana: 1, artha: "ಅಸ್ಮದ್ ಶಬ್ದದ ಷಷ್ಠೀ ಏಕವಚನ (ನನ್ನ)" });
  }
  if (clean === "अस्माकम्" || clean === "नः") {
    analyses.push({ surface: clean, pratipadika: "अस्मद्", vibhakti: 6, vachana: 3, artha: "ಅಸ್ಮದ್ ಶಬ್ದದ ಷಷ್ಠೀ ಬಹುವಚನ (ನಮ್ಮ)" });
  }
  if (clean === "तव" || clean === "ते") {
    analyses.push({ surface: clean, pratipadika: "युष्मद्", vibhakti: 6, vachana: 1, artha: "ಯುಷ್ಮದ್ ಶಬ್ದದ ಷಷ್ಠೀ ಏಕವಚನ (ನಿನ್ನ)" });
  }
  if (clean === "राज्ञः") {
    analyses.push({ surface: "राज्ञः", pratipadika: "राजन्", vibhakti: 6, vachana: 1, artha: "ರಾಜನ (ಷಷ್ಠೀ ಏಕವಚನ)" });
    analyses.push({ surface: "राज्ञः", pratipadika: "राजन्", vibhakti: 5, vachana: 1, artha: "ರಾಜನಿಂದ (ಪಂಚಮೀ ಏಕವಚನ)" });
  }
  if (clean === "शरदा") {
    analyses.push({ surface: "शरदा", pratipadika: "शरद्", vibhakti: 3, vachana: 1, linga: "S", artha: "शरत्कालेन (ಶರತ್ಕಾಲದಿಂದ)" });
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
  // 6ನೇ ವಿಭಕ್ತಿ (स्य / आणाम् / नाम् / याः)
  if (word.endsWith("स्य")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -2), vibhakti: 6, vachana: 1, artha: "(ಷಷ್ಠೀ ಏಕವಚನ)" });
  }
  if (word.endsWith("णाम्") || word.endsWith("नाम्")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -4), vibhakti: 6, vachana: 3, artha: "(ಷಷ್ಠೀ ಬಹುವಚನ)" });
  }
  // 5ನೇ ವಿಭಕ್ತಿ (ात्)
  if (word.endsWith("ात्")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -2), vibhakti: 5, vachana: 1, artha: "(ಪಂಚಮೀ ಏಕವಚನ)" });
  }
  // 7ನೇ ವಿಭಕ್ತಿ (े / याम् / षु / सु)
  if (word.endsWith("ेषु")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -3), vibhakti: 7, vachana: 3, artha: "(ಸಪ್ತಮೀ ಬಹುವಚನ)" });
  }
  if (word.endsWith("याम्")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -4) + "ा", vibhakti: 7, vachana: 1, artha: "(ಸಪ್ತಮೀ ಏಕವಚನ)" });
  }
  if (word.endsWith("े") && !word.endsWith("ते")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -1), vibhakti: 7, vachana: 1, artha: "(ಸಪ್ತಮೀ ಏಕವಚನ)" });
  }
  // 4ನೇ ವಿಭಕ್ತಿ (ाय / ेभ्यः)
  if (word.endsWith("ाय")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -2), vibhakti: 4, vachana: 1, artha: "(ಚತುರ್ಥೀ ಏಕವಚನ)" });
  }
  if (word.endsWith("ेभ्यः")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -5), vibhakti: 4, vachana: 3, artha: "(ಚತುರ್ಥೀ/ಪಂಚಮೀ ಬಹುವಚನ)" });
  }
  // 3ನೇ ವಿಭಕ್ತಿ (ेन / ेण / या / ना)
  if (word.endsWith("ेन") || word.endsWith("ेण")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -2), vibhakti: 3, vachana: 1, artha: "(ತೃತೀಯಾ ಏಕವಚನ)" });
  }
  if (word.endsWith("या")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -2) + "ा", vibhakti: 3, vachana: 1, artha: "(ತೃತೀಯಾ ಏಕವಚನ)" });
  }
  if (word === "दध्ना") {
    guesses.push({ surface: word, pratipadika: "दधि", vibhakti: 3, vachana: 1, artha: "(ಮೊಸರಿನಿಂದ)" });
  }
  if (word.endsWith("ना") || word.endsWith("णा")) {
    guesses.push({ surface: word, pratipadika: word.slice(0, -2), vibhakti: 3, vachana: 1, artha: "(ತೃತೀಯಾ ಏಕವಚನ)" });
  }
  // 2ನೇ ಮತ್ತು 1ನೇ ವಿಭಕ್ತಿ
  if (word.endsWith("म्") || word.endsWith("ं")) {
    var stem = word.replace(/(म्|ं)$/, "");
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 2, vachana: 1, artha: "(ದ್ವಿತೀಯಾ/ಪ್ರಥಮಾ)" });
    guesses.push({ surface: word, pratipadika: stem, vibhakti: 1, vachana: 1, artha: "(ಪ್ರಥಮಾ ನಪುಂಸಕಲಿಂಗ)" });
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
  if (analysis.artha && /(काल|समयः|मास|दिवस|रात्रि|क्षण|शरद्|ऋतु)/.test(analysis.artha)) return true;
  return false;
}

// sandhi.js ಮಾಡ್ಯೂಲ್ ಮೂಲಕ ಪದ ಜೋಡಣೆ
function joinSamastaWithSandhi(pAna, uAna) {
  if (window.PaniniSandhi && window.PaniniSandhi.joinWords) {
    return window.PaniniSandhi.joinWords(pAna.pratipadika, uAna.surface, pAna);
  }
  return { samasta: pAna.pratipadika + uAna.surface, sandhiNote: "ನೇರ ಜೋಡಣೆ" };
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
  // ತಿಗಂತ ಕ್ರಿಯಾಪದವಾಗಿದ್ದರೆ (उदा: पश्यति, गच्छति) ಸಮಾಸವಾಗುವುದಿಲ್ಲ
  if (uAna.surface.endsWith("ति") && uAna.pratipadika !== "भीति") {
    return { isMatch: false };
  }

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

  if (rule.purva.allowed_stems && rule.purva.allowed_stems.indexOf(pAna.pratipadika) === -1) {
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
    return { isMatch: true, needsModal: true, reason: pAna.vibhakti + "ನೇ ವಿಭಕ್ತಿ ಪೂರ್ವಪದವಿದೆ; ಅರ್ಥಸಂಬಂಧ/ವಿವಕ್ಷೆಯ ನಿರ್ಣಯವಾಗಬೇಕು." };
  }

  if (uttaraType === "exact_or_semantic") {
    if (rule.uttara.exact_words.indexOf(uAna.pratipadika) !== -1) {
      return { isMatch: true, needsModal: false, reason: "ಉತ್ತರಪದ '" + uAna.pratipadika + "' ಚತುರ್ಥೀ ಸೂತ್ರದ ನೇರ ಪಟ್ಟಿಯಲ್ಲಿದೆ." };
    }
    return { isMatch: true, needsModal: true, reason: "ಚತುರ್ಥೀ ವಿಭಕ್ತಿ ಇದೆ; ಪ್ರಕೃತಿ-ವಿಕೃತಿ ಭಾವದ ಪರೀಕ್ಷೆ ಅಗತ್ಯ." };
  }

  if (uttaraType === "shashthi_general") {
    // 2.2.10 ನ ನಿರ್ಧಾರಣೇ (ಉದಾ: श्रेष्ठ, उत्तम, तमप्) ಆಗಿದ್ದರೆ Modal ಮೂಲಕ ಎಚ್ಚರಿಸುವುದು
    var isNirdharanaWord = (uAna.pratipadika === "श्रेष्ठ" || uAna.pratipadika === "उत्तम" || uAna.pratipadika.endsWith("तम"));
    var needsShashthiModal = Boolean(isNirdharanaWord);
    return {
      isMatch: true,
      needsModal: needsShashthiModal,
      reason: "ಪೂರ್ವಪದವು ಷಷ್ಠೀ ವಿಭಕ್ತಿಯಲ್ಲಿದೆ ('षष्ठी 2.2.8' ಸೂತ್ರದಿಂದ ಸಮಾಸ)."
    };
  }

  return { isMatch: false };
}

function getRejectionReason(rule, pAna, uAna) {
  if (rule.purva.exact_word && pAna.surface !== rule.purva.exact_word) {
    return "ಪೂರ್ವಪದ '" + rule.purva.exact_word + "' ಆಗಿರಬೇಕಿತ್ತು.";
  }
  if (rule.purva.vibhakti && pAna.vibhakti !== rule.purva.vibhakti) {
    return "ಪೂರ್ವಪದವು " + rule.purva.vibhakti + "ನೇ ವಿಭಕ್ತಿಯಲ್ಲಿರಬೇಕು (ಇಲ್ಲಿ " + (pAna.vibhakti || "ಅವ್ಯಯ") + "ನೇ ವಿಭಕ್ತಿ ಇದೆ).";
  }
  if (rule.purva.allowed_stems && rule.purva.allowed_stems.indexOf(pAna.pratipadika) === -1) {
    return "ಪೂರ್ವಪದವು स्तोक/अन्तिक/दूर/कृच्छ्र ಆಗಿರಬೇಕಿತ್ತು.";
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

  modalContent.appendChild(el("div", "modal-badge", "ಸೂತ್ರ " + rule.rule_id + " — ವಿವಕ್ಷಾ / ನಿಷೇಧ ಪರೀಕ್ಷೆ"));
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
        if (opt.is_nishedha) {
          resolveSemanticChoice(false, opt.sutra, opt.label);
        } else {
          resolveSemanticChoice(true, opt.sutra, opt.label);
        }
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
    var failMsg = customNote
      ? (customSutra + " — " + customNote)
      : ((primaryMatch.rule.semantic_check && primaryMatch.rule.semantic_check.if_false_msg) || "ವಿವಕ್ಷೆ ಇಲ್ಲದಿರುವುದರಿಂದ ಸಮಾಸವಾಗುವುದಿಲ್ಲ.");

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
    var joinResult = joinSamastaWithSandhi(pAna, uAna);
    var samastaPada = joinResult.samasta;
    var sandhiExplanation = joinResult.sandhiNote;

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

    ol.appendChild(el("li", "", "ಸುಬ್ಳುಕ್ (ವಿಭಕ್ತಿ ಲೋಪ): 'सुपो धातुप्रातिपदिकयोः (2.4.71)' ಸೂತ್ರದಿಂದ ಪ್ರತ್ಯಯ ಲೋಪ ➔ " + pAna.pratipadika + " + " + uAna.surface));
    ol.appendChild(el("li", "", "ಸಂಧಿ ಮತ್ತು ಆದೇಶ ಪ್ರಕ್ರಿಯೆ (sandhi.js): " + sandhiExplanation + " ➔ " + samastaPada));

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

// ವಿಪರೀತ ಕ್ರಮದ ವಿಗ್ರಹ ವಿಶ್ಲೇಷಕ (Reverse Splitter using sandhi.js)
function runVigrahaEngine() {
  var samastaWord = document.getElementById("samastaInput").value.trim();
  if (!samastaWord) {
    alert("ದಯವಿಟ್ಟು ಸಮಸ್ತಪದವನ್ನು ನಮೂದಿಸಿ.");
    return;
  }

  var rawSplits = (window.PaniniSandhi && window.PaniniSandhi.generateSplits)
    ? window.PaniniSandhi.generateSplits(samastaWord)
    : [{ pStem: samastaWord.slice(0, 3), uSurface: samastaWord.slice(3), sandhi: "ನೇರ ವಿಭಜನೆ" }];

  var validAnalyses = [];
  var seenKeys = new Set();

  rawSplits.forEach(function(split) {
    var candidateStems = [];
    if (isValidPratipadika(split.pStem)) {
      candidateStems.push(split.pStem);
    }
    if (formIndex.has(split.pStem)) {
      formIndex.get(split.pStem).forEach(function(fItem) {
        if (fItem.vibhakti === 1 && fItem.vachana === 1 && candidateStems.indexOf(fItem.pratipadika) === -1) {
          candidateStems.push(fItem.pratipadika);
        }
      });
    }
    if (candidateStems.length === 0) return;

    var uAnalyses = analyzeWord(split.uSurface);
    var uAna = uAnalyses[0];
    if (!uAna) return;

    candidateStems.forEach(function(actualStem) {
      rulesData.forEach(function(rule) {
        var reqVibhakti = rule.purva.vibhakti || 0;
        var fakePAna = {
          surface: getInflectedForm(actualStem, reqVibhakti),
          pratipadika: actualStem,
          vibhakti: reqVibhakti,
          vachana: 1,
          isAvyaya: (actualStem === "स्वयम्" || actualStem === "सामि"),
          artha: stemIndex.has(actualStem) ? stemIndex.get(actualStem).artha : ""
        };

        var check = evaluateRuleOnPair(rule, fakePAna, uAna);
        if (!check.isMatch) return;

        // ಸಾಮಾನ್ಯ ಸೂತ್ರಗಳು ಅನಗತ್ಯವಾಗಿ ಎಲ್ಲಾ ಪದಗಳಿಗೂ ಬರುವುದನ್ನು ತಡೆಯುವ ಫಿಲ್ಟರ್
        if (rule.uttara.match_type === "semantic_dependent") {
          var isFood = (actualStem === "दधि" || actualStem === "गुड" || uAna.pratipadika === "ओदन");
          var isKridanta = isKtaAnta(uAna.pratipadika) || uAna.pratipadika === "पेया" || uAna.pratipadika === "खण्ड";
          var isSaptamiSpecial = (actualStem === "तीर्थ" || uAna.pratipadika === "देय" || uAna.pratipadika === "तिलक");
          if (!isFood && !isKridanta && !isSaptamiSpecial) return;
        }

        if (rule.uttara.match_type === "exact_or_semantic") {
          var isExact4 = rule.uttara.exact_words.indexOf(uAna.pratipadika) !== -1;
          var isPrakriti = (actualStem === "यूप" || uAna.pratipadika === "दारु" || uAna.pratipadika === "कुण्डल");
          if (!isExact4 && !isPrakriti) return;
        }

        var uniqueKey = actualStem + "+" + split.uSurface + "+" + rule.rule_id;
        if (seenKeys.has(uniqueKey)) return;
        seenKeys.add(uniqueKey);

        var vigrahaVakya = fakePAna.surface + " " + split.uSurface;
        var conditionNote = "ನೇರ ವಿಗ್ರಹ (Exact Rule Match)";
        var displaySutra = rule.rule_id + " — " + rule.sutra;

        if (rule.rule_id === "2.2.8") {
          conditionNote = "ಸಾಮಾನ್ಯ ಷಷ್ಠೀ ಸಂಬಂಧ (ಸ್ವ-ಸ್ವಾಮಿ / ಸಂಬಂಧಾರ್ಥದಲ್ಲಿ).";
        }

        validAnalyses.push({
          samasta: samastaWord,
          pStem: actualStem,
          uStem: uAna.pratipadika,
          pInflected: fakePAna.surface,
          uSurface: split.uSurface,
          vigraha: vigrahaVakya,
          sandhi: split.sandhi,
          samasa_type: rule.samasa_type,
          sutra: displaySutra,
          vibhakti: reqVibhakti,
          isAvyaya: fakePAna.isAvyaya,
          conditionNote: conditionNote
        });
      });
    });
  });

  renderVigrahaOutput(samastaWord, validAnalyses);
}

function renderVigrahaOutput(samastaWord, analyses) {
  var resBox = document.getElementById("resultSection");
  resBox.innerHTML = "";
  resBox.style.display = "block";

  if (analyses.length === 0) {
    var failCard = el("div", "result-card failure");
    failCard.appendChild(el("div", "result-header", "❌ ವಿಗ್ರಹ ಪತ್ತೆಯಾಗಿಲ್ಲ (No Valid Vigraha Found)"));
    failCard.appendChild(el("p", "", "'" + samastaWord + "' ಎಂಬ ಪದಕ್ಕೆ ವಿಭಜನೆ ಸಿಗುತ್ತಿಲ್ಲ."));
    resBox.appendChild(failCard);
    resBox.scrollIntoView({ behavior: "smooth" });
    return;
  }

  analyses.forEach(function(item, idx) {
    var card = el("div", "result-card vigraha-res");
    var hdr = el("div", "result-header");
    hdr.appendChild(el("span", "badge-vigraha", "🔍 ವಿಗ್ರಹ ವಿಶ್ಲೇಷಣೆ #" + (idx + 1)));
    hdr.appendChild(el("span", "samasa-name", item.samasa_type));
    card.appendChild(hdr);

    var hero = el("div", "samasta-hero");
    hero.appendChild(el("div", "samasta-word", item.samasta));
    hero.appendChild(el("div", "arrow", "➔"));
    hero.appendChild(el("div", "vigraha-part", item.vigraha));
    card.appendChild(hero);

    var pBox = el("div", "prakriya-box");
    pBox.appendChild(el("h4", "", "📜 ವಿಪರೀತ ವಿಶ್ಲೇಷಣಾ ಹಂತಗಳು (Reverse Decompounding Steps):"));
    var ol = el("ol", "prakriya-steps");

    ol.appendChild(el("li", "", "೧. ಸಂಧಿ ಮತ್ತು ಆದೇಶ ವಿಚ್ಛೇದ (sandhi.js): " + item.samasta + " ➔ '" + item.pStem + "' (ಪೂರ್ವಪದ ಪ್ರಾತಿಪದಿಕ) + '" + item.uSurface + "' (ಉತ್ತರಪದ) [" + item.sandhi + "]"));
    
    var liSutra = el("li", "", "೨. ಪತ್ತೆಯಾದ ಸಮಾಸ ಸೂತ್ರ: ");
    liSutra.appendChild(el("span", "sutra-highlight", item.sutra));
    ol.appendChild(liSutra);

    var vibhaktiText = item.isAvyaya ? "ಅವ್ಯಯ ('" + item.pInflected + "')" : (item.vibhakti + "ನೇ ವಿಭಕ್ತಿ ಜೋಡಣೆ: '" + item.pStem + "' ➔ '" + item.pInflected + "'");
    ol.appendChild(el("li", "", "೩. ಪೂರ್ವಪದ ವಿಭಕ್ತಿ ಪುನರ್ನಿರ್ಮಾಣ: " + vibhaktiText));
    ol.appendChild(el("li", "", "೪. ಲೌಕಿಕ ವಿಗ್ರಹವಾಕ್ಯ: " + item.vigraha));
    ol.appendChild(el("li", "", "೫. ಅರ್ಥ / ವಿವಕ್ಷಾ ವಿವರಣೆ: " + item.conditionNote));

    pBox.appendChild(ol);
    card.appendChild(pBox);
    resBox.appendChild(card);
  });

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
    { rule_id: "2.1.31", sutra: "पूर्वसदृशसमोनार्थकलहनिपुणमिश्रश्लक्ष्णैः", samasa_type: "तृतीया-तत्पुरुषः", purva: { vibhakti: 3 }, uttara: { match_type: "exact_pratipadika", words: ["पूर्व", "सदृश", "सम", "ऊन", "अर्थ", "कलह", "निपुण", "मिश्र", "श्लक्ष्ण", "अवर"] }, semantic_check: { required: false } },
    { rule_id: "2.1.36", sutra: "चतुर्थी तदर्थार्थबलिहितसुखरक्षितैः", samasa_type: "चतुर्थी-तत्पुरुषः", purva: { vibhakti: 4 }, uttara: { match_type: "exact_or_semantic", exact_words: ["अर्थ", "बलि", "हित", "सुख", "रक्षित"] }, semantic_check: { required_if_not_exact: true, question_sa: "प्रकृति-विकृति-भावः अस्ति?", question_kn: "ಇಲ್ಲಿ ಪ್ರಕೃತಿ-ವಿಕೃತಿ ಭಾವ ಇದೆಯೇ?", if_false_msg: "ಪ್ರಕೃತಿ-ವಿಕೃತಿ ಭಾವ ಇಲ್ಲದಿರುವುದರಿಂದ ಸಮಾಸವಾಗುವುದಿಲ್ಲ." } },
    { rule_id: "2.1.37", sutra: "पञ्चमी भयेन", samasa_type: "पञ्चमी-तत्पुरुषः", purva: { vibhakti: 5 }, uttara: { match_type: "exact_pratipadika", words: ["भय", "भीत", "भीति", "भी"] }, semantic_check: { required: false } },
    { rule_id: "2.1.38", sutra: "अपेतापोढमुक्तपतितापत्रस्तैरल्पशः", samasa_type: "पञ्चमी-तत्पुरुषः", purva: { vibhakti: 5 }, uttara: { match_type: "exact_pratipadika", words: ["अपेत", "अपोढ", "मुक्त", "पतित", "अपत्रस्त"] }, semantic_check: { required: false } },
    { rule_id: "2.1.39", sutra: "स्तोकान्तिकदूरार्थकृच्छ्राणि क्तेन", samasa_type: "पञ्चमी-तत्पुरुषः", purva: { vibhakti: 5, allowed_stems: ["स्तोक", "अन्तिक", "दूर", "कृच्छ्र", "अल्प", "निकट"] }, uttara: { match_type: "kta_anta" }, semantic_check: { required: false } },
    { rule_id: "2.2.8", sutra: "षष्ठी", samasa_type: "षष्ठी-तत्पुरुषः", purva: { vibhakti: 6 }, uttara: { match_type: "shashthi_general" }, semantic_check: { required: true, question_sa: "षष्ठी-समास-निषेध-परीक्षा", question_kn: "ಇದು ನಿರ್ಧಾರಣ ಷಷ್ಠಿಯೇ (2.2.10) ಅಥವಾ ಸಾಮಾನ್ಯ ಷಷ್ಠಿಯೇ?", options: [ { key: "valid", sutra: "2.2.8 (षष्ठी)", label: "✅ ಸಾಮಾನ್ಯ ಸಂಬಂಧ ಷಷ್ಠೀ (ಸಮಾಸವಾಗುತ್ತದೆ)" }, { key: "nishedha", sutra: "2.2.10 (न निर्धारणे)", label: "❌ ನಿರ್ಧಾರಣ ಷಷ್ಠೀ (ಗುಂಪಿನಿಂದ ಶ್ರೇಷ್ಠವೆಂದು ಬೇರ್ಪಡಿಸುವುದು — ಸಮಾಸ ನಿಷಿದ್ಧ)", is_nishedha: true } ] } },
    { rule_id: "2.1.40_41", sutra: "सप्तमी शौण्डैः (2.1.40) / सिद्धशुष्कपक्वबन्धैश्च (2.1.41)", samasa_type: "सप्तमी-तत्पुरुषः", purva: { vibhakti: 7 }, uttara: { match_type: "exact_pratipadika", words: ["शौण्ड", "धूर्त", "कितव", "व्याड", "प्रवीण", "संवीत", "अन्तर", "अधि", "पटु", "पण्डित", "कुशल", "चपल", "निपुण", "सिद्ध", "शुष्क", "पक्व", "बन्ध"] }, semantic_check: { required: false } }
  ];
}

window.addEventListener("DOMContentLoaded", initEngine);
