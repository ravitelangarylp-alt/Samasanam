// ============================================================================
// PANINIAN SANDHI & SAMASA-ADESHA MODULE (sandhi.js)
// Handles: 1. Purvapada Adesha (7.2.98 अस्मद्->मद्, युष्मद्->त्वद्, 8.2.7 न लोपः)
//          2. Ach Sandhi (Savarna-dirgha, Guna, Vriddhi, Yan)
//          3. Hal Sandhi (Jashtva 8.2.39, Chartva 8.4.55, Choh Kuh 8.2.30)
//          4. Reverse Sandhi Splitter for Samasa Vigraha
// ============================================================================

window.PaniniSandhi = (function() {

  var KHAR_CONSONANTS = ["क", "ख", "च", "छ", "ट", "ठ", "त", "थ", "प", "फ", "श", "ष", "स"];

  var VOWEL_MATRA_MAP = {
    "अ": "", "आ": "ा", "इ": "ि", "ई": "ी", "उ": "ु", "ऊ": "ू",
    "ऋ": "ृ", "ए": "े", "ऐ": "ै", "ओ": "ो", "औ": "ौ"
  };

  var MATRA_TO_VOWEL = {
    "ा": "आ", "ि": "इ", "ी": "ई", "ु": "उ", "ू": "ऊ",
    "ृ": "ऋ", "े": "ए", "ै": "ऐ", "ो": "ओ", "ौ": "औ"
  };

  // 1. ಪೂರ್ವಪದ ಮತ್ತು ಉತ್ತರಪದವನ್ನು ಸಂಧಿ ಮಾಡಿ ಸೇರಿಸುವ ಫಂಕ್ಷನ್
  function joinWords(purvaPratipadika, uttaraSurface, purvaAnalysis) {
    var p = purvaPratipadika;
    var u = uttaraSurface;
    var notes = [];

    // A. ಸರ್ವನಾಮ ಆದೇಶ: प्रत्ययोत्तरपदयोश्च (7.2.98)
    if (p === "अस्मद्") {
      if (!purvaAnalysis || purvaAnalysis.vachana === 1) {
        p = "मद्";
        notes.push("प्रत्ययोत्तरपदयोश्च (7.2.98) ಸೂತ್ರದಿಂದ ಏಕವಚನದ 'अस्मद्' ಶಬ್ದಕ್ಕೆ 'मद्' ಆದೇಶ");
      }
    } else if (p === "युष्मद्") {
      if (!purvaAnalysis || purvaAnalysis.vachana === 1) {
        p = "त्वद्";
        notes.push("प्रत्ययोत्तरपदयोश्च (7.2.98) ಸೂತ್ರದಿಂದ ಏಕವಚನದ 'युष्मद्' ಶಬ್ದಕ್ಕೆ 'त्वद्' ಆದೇಶ");
      }
    }

    // B. ನಕಾರಾಂತ ಲೋಪ: न लोपः प्रातिपदिकान्तस्य (8.2.7) — ಉದಾ: राजन् -> राज, आत्मन् -> आत्म
    if (p.endsWith("न्") && p !== "अहन्") {
      p = p.slice(0, -2);
      notes.push("न लोपः प्रातिपदिकान्तस्य (8.2.7) ಸೂತ್ರದಿಂದ ಪ್ರಾತಿಪದಿಕಾಂತ ನಕಾರ ಲೋಪ");
    }

    // C. ಅವ್ಯಯ ಅನುಸ್ವಾರ: स्वयम् -> स्वयं
    if (p === "स्वयम्") {
      notes.push("मोऽनुस्वारः (8.3.23) ಸೂತ್ರದಿಂದ ಮಕಾರಕ್ಕೆ ಅನುಸ್ವಾರ");
      return {
        samasta: "स्वयं" + u,
        sandhiNote: notes.join(" + ")
      };
    }

    var firstChar = u.charAt(0);
    var isKhar = KHAR_CONSONANTS.indexOf(firstChar) !== -1;
    var isVowel = Object.prototype.hasOwnProperty.call(VOWEL_MATRA_MAP, firstChar);

    // D. ಹಲಂತ ಪೂರ್ವಪದ + ಸ್ವರಾದಿ ಉತ್ತರಪದ (ಉದಾ: मद् + अर्थः -> मदर्थः, वाच् + ईशः -> वागीशः)
    if (p.endsWith("्") && isVowel) {
      var restVowel = u.slice(1);
      if (p.endsWith("च्")) {
        p = p.slice(0, -2) + "ग्";
        notes.push("चोः कुः (8.2.30) & झलां जशोऽन्ते (8.2.39) ಜಶ್ತ್ವ");
      } else if (p.endsWith("त्")) {
        p = p.slice(0, -2) + "द्";
        notes.push("झलां जशोऽन्ते (8.2.39) ಜಶ್ತ್ವ");
      }
      var joinedHalVowel = p.slice(0, -1) + VOWEL_MATRA_MAP[firstChar] + restVowel;
      notes.push("व्यञ्जन-स्वर-संयोगः");
      return {
        samasta: joinedHalVowel,
        sandhiNote: notes.join(" | ")
      };
    }

    // E. ವ್ಯಂಜನ ಸಂಧಿ (ಚರ್ತ್ವ 8.4.55 ಮತ್ತು ಜಶ್ತ್ವ 8.2.39)
    if (p.endsWith("च्") || p.endsWith("ज्")) {
      p = p.slice(0, -2) + (isKhar ? "क्" : "ग्");
      notes.push("चोः कुः (8.2.30) & " + (isKhar ? "खरि च (8.4.55) ಚರ್ತ್ವ" : "झलां जशोऽन्ते (8.2.39) ಜಶ್ತ್ವ"));
    } else if (p.endsWith("द्")) {
      if (isKhar) {
        p = p.slice(0, -2) + "त्";
        notes.push("खरि च (8.4.55) ಸೂತ್ರದಿಂದ ಚರ್ತ್ವ ('द्' ➔ 'त्')");
      } else {
        notes.push("झलां जशोऽन्ते (8.2.39) ಜಶ್ತ್ವ ('द्' ಹಾಗೆಯೇ ಉಳಿಯುತ್ತದೆ)");
      }
    } else if (p.endsWith("त्")) {
      if (!isKhar) {
        p = p.slice(0, -2) + "द्";
        notes.push("झलां जशोऽन्ते (8.2.39) ಸೂತ್ರದಿಂದ ಜಶ್ತ್ವ ('त्' ➔ 'द्')");
      } else {
        notes.push("खरि च (8.4.55) ಚರ್ತ್ವ");
      }
    } else if (p.endsWith("ब्")) {
      if (isKhar) {
        p = p.slice(0, -2) + "प्";
        notes.push("खरि च (8.4.55) ಚರ್ತ್ವ");
      }
    }

    // F. ಸ್ವರ ಸಂಧಿ (Ach Sandhi)
    if (isVowel) {
      var restU = u.slice(1);
      // ಯಣ್ ಸಂಧಿ: इ/ई + असवर्ण स्वर (दधि + ओदनः -> दध्योदनः)
      if ((p.endsWith("ि") || p.endsWith("ी")) && firstChar !== "इ" && firstChar !== "ई") {
        notes.push("इको यणचि (6.1.77) ಯಣ್ ಸಂಧಿ");
        return {
          samasta: p.slice(0, -1) + "्य" + VOWEL_MATRA_MAP[firstChar] + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      // ಸವರ್ಣದೀರ್ಘ ಸಂಧಿ
      if ((p.endsWith("ि") || p.endsWith("ी")) && (firstChar === "इ" || firstChar === "ई")) {
        notes.push("अकः सवर्णे दीर्घः (6.1.101) ಸವರ್ಣದೀರ್ಘ ಸಂಧಿ");
        return {
          samasta: p.slice(0, -1) + "ी" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      if (firstChar === "अ" || firstChar === "आ") {
        notes.push("अकः सवर्णे दीर्घः (6.1.101) ಸವರ್ಣದೀರ್ಘ ಸಂಧಿ");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "ा" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      // ಗುಣ ಸಂಧಿ
      if (firstChar === "इ" || firstChar === "ई") {
        notes.push("आद्गुणः (6.1.87) ಗುಣ ಸಂಧಿ");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "े" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      if (firstChar === "उ" || firstChar === "ऊ") {
        notes.push("आद्गुणः (6.1.87) ಗುಣ ಸಂಧಿ");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "ो" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      // ವೃದ್ಧಿ ಸಂಧಿ
      if (firstChar === "ए" || firstChar === "ऐ") {
        notes.push("वृद्धिरेचि (6.1.88) ವೃದ್ಧಿ ಸಂಧಿ");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "ै" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      if (firstChar === "ओ" || firstChar === "औ") {
        notes.push("वृद्धिरेचि (6.1.88) ವೃದ್ಧಿ ಸಂಧಿ");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "ौ" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
    }

    if (notes.length === 0) {
      notes.push("ನೇರ ವರ್ಣ ಸಂಯೋಗ (ಯಾವುದೇ ಸಂಧಿ ವಿಕಾರವಿಲ್ಲ)");
    }

    return {
      samasta: p + u,
      sandhiNote: notes.join(" | ")
    };
  }

  // 2. ಸಮಸ್ತಪದವನ್ನು ಸಂಧಿ ಬಿಡಿಸಿ ಒಡೆಯುವ ಫಂಕ್ಷನ್ (Reverse Sandhi Splitter)
  function generateSplits(word) {
    var candidates = [];
    var chars = Array.from(word);
    var len = chars.length;

    chars.forEach(function(_, idx) {
      if (idx === 0 || idx === len) return;
      var left = chars.slice(0, idx).join("");
      var right = chars.slice(idx).join("");
      if (!right) return;

      // 1. ನೇರ ವಿಭಜನೆ
      candidates.push({ pStem: left, uSurface: right, sandhi: "ನೇರ ಜೋಡಣೆ (Direct Split)" });

      // 2. ನಕಾರಾಂತ ಪುನರ್ನಿರ್ಮಾಣ (राजपुरुषः -> राजन् + पुरुषः)
      if (!left.endsWith("्")) {
        candidates.push({ pStem: left + "न्", uSurface: right, sandhi: "न लोपः प्रातिपदिकान्तस्य (8.2.7) — " + left + "न् + " + right });
      }

      // 3. ಸರ್ವನಾಮ ಆದೇಶ ವಿಚ್ಛೇದ (मद्ग्रामः / मत्पुत्रः -> अस्मद्, त्वद्ग्रामः -> युष्मद्)
      if (left === "मद्" || left === "मत्") {
        candidates.push({ pStem: "अस्मद्", uSurface: right, sandhi: "प्रत्ययोत्तरपदयोश्च (7.2.98) — अस्मद् (मम/मत्) + " + right });
      }
      if (left === "त्वद्" || left === "त्वत्") {
        candidates.push({ pStem: "युष्मद्", uSurface: right, sandhi: "प्रत्ययोत्तरपदयोश्च (7.2.98) — युष्मद् (तव/त्वत्) + " + right });
      }

      // 4. ಅನುಸ್ವಾರ ವಿಚ್ಛೇದ (स्वयंकृतः -> स्वयम् + कृतः)
      if (left === "स्वयं") {
        candidates.push({ pStem: "स्वयम्", uSurface: right, sandhi: "मोऽनुस्वारः (8.3.23) — स्वयम् + " + right });
      }

      // 5. ಚರ್ತ್ವ ಮತ್ತು ಜಶ್ತ್ವ ಸಂಧಿ ವಿಚ್ಛೇದ (शरत्पूर्वः -> शरद् + पूर्वः, वाक्कलहः -> वाच् + कलहः)
      if (left.endsWith("त्")) {
        var baseT = left.slice(0, -2);
        candidates.push({ pStem: baseT + "द्", uSurface: right, sandhi: "खरि च (8.4.55) ಚರ್ತ್ವ ಸಂಧಿ — " + baseT + "द् + " + right });
      }
      if (left.endsWith("द्")) {
        var baseD = left.slice(0, -2);
        candidates.push({ pStem: baseD + "त्", uSurface: right, sandhi: "झलां जशोऽन्ते (8.2.39) ಜಶ್ತ್ವ ಸಂಧಿ — " + baseD + "त् + " + right });
      }
      if (left.endsWith("क्")) {
        var baseK = left.slice(0, -2);
        candidates.push({ pStem: baseK + "च्", uSurface: right, sandhi: "चोः कुः (8.2.30) / खरि च (8.4.55) — " + baseK + "च् + " + right });
        candidates.push({ pStem: baseK + "ज्", uSurface: right, sandhi: "चोः कुः (8.2.30) / खरि च (8.4.55) — " + baseK + "ज् + " + right });
      }
      if (left.endsWith("ग्")) {
        var baseG = left.slice(0, -2);
        candidates.push({ pStem: baseG + "च्", uSurface: right, sandhi: "चोः कुः (8.2.30) / ಜಶ್ತ್ವ — " + baseG + "च् + " + right });
        candidates.push({ pStem: baseG + "ज्", uSurface: right, sandhi: "चोः कुः (8.2.30) / ಜಶ್ತ್ವ — " + baseG + "ज् + " + right });
        candidates.push({ pStem: baseG + "क्", uSurface: right, sandhi: "झलां जशोऽन्ते (8.2.39) — " + baseG + "क् + " + right });
      }

      // 6. ಸವರ್ಣದೀರ್ಘ ಸಂಧಿ ವಿಚ್ಛೇದ (खट्वारूढः -> खट्वा + आरूढः, सुखापेतः -> सुख + अपेतः)
      if (left.endsWith("ा")) {
        var baseA = left.slice(0, -1);
        candidates.push({ pStem: baseA, uSurface: "अ" + right, sandhi: "अकः सवर्णे दीर्घः (6.1.101) — " + baseA + " + अ" + right });
        candidates.push({ pStem: baseA, uSurface: "आ" + right, sandhi: "अकः सवर्णे दीर्घः (6.1.101) — " + baseA + " + आ" + right });
        candidates.push({ pStem: left, uSurface: "अ" + right, sandhi: "अकः सवर्णे दीर्घः (6.1.101) — " + left + " + अ" + right });
        candidates.push({ pStem: left, uSurface: "आ" + right, sandhi: "अकः सवर्णे दीर्घः (6.1.101) — " + left + " + आ" + right });
      }

      // 7. ಯಣ್ ಸಂಧಿ ವಿಚ್ಛೇದ (दध्योदनः -> दधि + ओदनः)
      if (left.endsWith("्य")) {
        var baseYan = left.slice(0, -2);
        var firstR = right.charAt(0);
        if (MATRA_TO_VOWEL[firstR]) {
          var restoredU = MATRA_TO_VOWEL[firstR] + right.slice(1);
          candidates.push({ pStem: baseYan + "ि", uSurface: restoredU, sandhi: "इको यणचि (6.1.77) — " + baseYan + "ि + " + restoredU });
          candidates.push({ pStem: baseYan + "ी", uSurface: restoredU, sandhi: "इको यणचि (6.1.77) — " + baseYan + "ी + " + restoredU });
        } else {
          var restoredUA = "अ" + right;
          candidates.push({ pStem: baseYan + "ि", uSurface: restoredUA, sandhi: "इको यणचि (6.1.77) — " + baseYan + "ि + " + restoredUA });
        }
      }
    });

    return candidates;
  }

  return {
    joinWords: joinWords,
    generateSplits: generateSplits
  };
})();
