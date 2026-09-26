// ============================================================================
// PANINIAN SANDHI & SAMASA-ADESHA MODULE (sandhi.js) - Sanskrit & English UI
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

  function joinWords(purvaPratipadika, uttaraSurface, purvaAnalysis) {
    var p = purvaPratipadika;
    var u = uttaraSurface;
    var notes = [];

    // 1. Pratyayottarapadayośca (7.2.98) - Asmad / Yushmad Adesha
    if (p === "अस्मद्") {
      if (!purvaAnalysis || purvaAnalysis.vachana === 1) {
        p = "मद्";
        notes.push("प्रत्ययोत्तरपदयोश्च (7.2.98) इत्यनेन एकवचने 'अस्मद्' इत्यस्य 'मद्'-आदेशः (Stem replacement अस्मद् ➔ मद्)");
      } else {
        p = "अस्मद्";
      }
    } else if (p === "युष्मद्") {
      if (!purvaAnalysis || purvaAnalysis.vachana === 1) {
        p = "त्वद्";
        notes.push("प्रत्ययोत्तरपदयोश्च (7.2.98) इत्यनेन एकवचने 'युष्मद्' इत्यस्य 'त्वद्'-आदेशः (Stem replacement युष्मद् ➔ त्वद्)");
      } else {
        p = "युष्मद्";
      }
    }

    // 2. Na lopah pratipadikantasya (8.2.7) - राजन् -> राज, आत्मन् -> आत्म
    if (p.endsWith("न्") && p !== "अहन्") {
      p = p.slice(0, -2);
      notes.push("न लोपः प्रातिपदिकान्तस्य (8.2.7) इत्यनेन नकारलोपः (Final न् elision)");
    }

    // 3. Avyaya Anusvara: स्वयम् -> स्वयं
    if (p === "स्वयम्") {
      notes.push("मोऽनुस्वारः (8.3.23) इत्यनेन अनुस्वारः");
      return {
        samasta: "स्वयं" + u,
        sandhiNote: notes.join(" | ")
      };
    }

    var firstChar = u.charAt(0);
    var isKhar = KHAR_CONSONANTS.indexOf(firstChar) !== -1;
    var isVowel = Object.prototype.hasOwnProperty.call(VOWEL_MATRA_MAP, firstChar);

    // 4. Halanta Purvapada + Vowel Uttarapada
    if (p.endsWith("्") && isVowel) {
      var restVowel = u.slice(1);
      if (p.endsWith("च्")) {
        p = p.slice(0, -2) + "ग्";
        notes.push("चोः कुः (8.2.30) तथा झलां जशोऽन्ते (8.2.39) इत्यनेन जश्त्वम्");
      } else if (p.endsWith("त्")) {
        p = p.slice(0, -2) + "द्";
        notes.push("झलां जशोऽन्ते (8.2.39) इत्यनेन जश्त्वम्");
      }
      var joinedHalVowel = p.slice(0, -1) + VOWEL_MATRA_MAP[firstChar] + restVowel;
      notes.push("व्यञ्जन-स्वर-संयोगः (Consonant-Vowel conjunction)");
      return {
        samasta: joinedHalVowel,
        sandhiNote: notes.join(" | ")
      };
    }

    // 5. Hal Sandhi (Chartva 8.4.55 & Jashtva 8.2.39)
    if (p.endsWith("च्") || p.endsWith("ज्")) {
      p = p.slice(0, -2) + (isKhar ? "क्" : "ग्");
      notes.push("चोः कुः (8.2.30) तथा " + (isKhar ? "खरि च (8.4.55) चर्त्वम्" : "झलां जशोऽन्ते (8.2.39) जश्त्वम्"));
    } else if (p.endsWith("द्")) {
      if (isKhar) {
        p = p.slice(0, -2) + "त्";
        notes.push("खरि च (8.4.55) इत्यनेन चर्त्वम् (द् ➔ त्)");
      } else {
        notes.push("झलां जशोऽन्ते (8.2.39) इत्यनेन जश्त्वम् (द् retained before voiced consonant)");
      }
    } else if (p.endsWith("त्")) {
      if (!isKhar) {
        p = p.slice(0, -2) + "द्";
        notes.push("झलां जशोऽन्ते (8.2.39) इत्यनेन जश्त्वम् (त् ➔ द्)");
      } else {
        notes.push("खरि च (8.4.55) इत्यनेन चर्त्वम्");
      }
    } else if (p.endsWith("ब्")) {
      if (isKhar) {
        p = p.slice(0, -2) + "प्";
        notes.push("खरि च (8.4.55) इत्यनेन चर्त्वम्");
      }
    }

    // 6. Ach Sandhi (Vowel Sandhi)
    if (isVowel) {
      var restU = u.slice(1);
      if ((p.endsWith("ि") || p.endsWith("ी")) && firstChar !== "इ" && firstChar !== "ई") {
        notes.push("इको यणचि (6.1.77) इत्यनेन यण्-सन्धिः");
        return {
          samasta: p.slice(0, -1) + "्य" + VOWEL_MATRA_MAP[firstChar] + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      if ((p.endsWith("ि") || p.endsWith("ी")) && (firstChar === "इ" || firstChar === "ई")) {
        notes.push("अकः सवर्णे दीर्घः (6.1.101) इत्यनेन सवर्णदीर्घ-सन्धिः");
        return {
          samasta: p.slice(0, -1) + "ी" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      if (firstChar === "अ" || firstChar === "आ") {
        notes.push("अकः सवर्णे दीर्घः (6.1.101) इत्यनेन सवर्णदीर्घ-सन्धिः");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "ा" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      if (firstChar === "इ" || firstChar === "ई") {
        notes.push("आद्गुणः (6.1.87) इत्यनेन गुण-सन्धिः");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "े" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      if (firstChar === "उ" || firstChar === "ऊ") {
        notes.push("आद्गुणः (6.1.87) इत्यनेन गुण-सन्धिः");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "ो" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      if (firstChar === "ए" || firstChar === "ऐ") {
        notes.push("वृद्धिरेचि (6.1.88) इत्यनेन वृद्धि-सन्धिः");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "ै" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
      if (firstChar === "ओ" || firstChar === "औ") {
        notes.push("वृद्धिरेचि (6.1.88) इत्यनेन वृद्धि-सन्धिः");
        return {
          samasta: (p.endsWith("ा") ? p.slice(0, -1) : p) + "ौ" + restU,
          sandhiNote: notes.join(" | ")
        };
      }
    }

    if (notes.length === 0) {
      notes.push("प्रकृतिभावः / वर्णसंयोगः (Direct concatenation without phonetic alteration)");
    }

    return {
      samasta: p + u,
      sandhiNote: notes.join(" | ")
    };
  }

  function generateSplits(word) {
    var candidates = [];
    var chars = Array.from(word);
    var len = chars.length;

    chars.forEach(function(_, idx) {
      if (idx === 0 || idx === len) return;
      var left = chars.slice(0, idx).join("");
      var right = chars.slice(idx).join("");
      if (!right) return;

      // 1. Direct split (e.g., सीतापतिः -> सीता + पतिः, कृष्णश्रितः -> कृष्ण + श्रितः)
      candidates.push({ pStem: left, uSurface: right, sandhi: "वर्णसंयोगः (Direct Split)" });

      // 2. Nakaranta restoration (8.2.7: राजपुरुषः -> राजन् + पुरुषः)
      if (!left.endsWith("्")) {
        candidates.push({ pStem: left + "न्", uSurface: right, sandhi: "न लोपः प्रातिपदिकान्तस्य (8.2.7) — " + left + "न् + " + right });
      }

      // 3. Asmad / Yushmad restoration (7.2.98: मद्ग्रामः / मत्पुत्रः -> अस्मद्)
      if (left === "मद्" || left === "मत्") {
        candidates.push({ pStem: "अस्मद्", uSurface: right, sandhi: "प्रत्ययोत्तरपदयोश्च (7.2.98) — अस्मद् (मम) + " + right });
      }
      if (left === "त्वद्" || left === "त्वत्") {
        candidates.push({ pStem: "युष्मद्", uSurface: right, sandhi: "प्रत्ययोत्तरपदयोश्च (7.2.98) — युष्मद् (तव) + " + right });
      }

      // 4. Anusvara split (स्वयंकृतः -> स्वयम् + कृतः)
      if (left === "स्वयं") {
        candidates.push({ pStem: "स्वयम्", uSurface: right, sandhi: "मोऽनुस्वारः (8.3.23) — स्वयम् + " + right });
      }

      // 5. Chartva & Jashtva splits (शरत्पूर्वः -> शरद् + पूर्वः, वाक्कलहः -> वाच् + कलहः)
      if (left.endsWith("त्")) {
        var baseT = left.slice(0, -2);
        candidates.push({ pStem: baseT + "द्", uSurface: right, sandhi: "खरि च (8.4.55) चर्त्व-सन्धिः — " + baseT + "द् + " + right });
      }
      if (left.endsWith("द्")) {
        var baseD = left.slice(0, -2);
        candidates.push({ pStem: baseD + "त्", uSurface: right, sandhi: "झलां जशोऽन्ते (8.2.39) जश्त्व-सन्धिः — " + baseD + "त् + " + right });
      }
      if (left.endsWith("क्")) {
        var baseK = left.slice(0, -2);
        candidates.push({ pStem: baseK + "च्", uSurface: right, sandhi: "चोः कुः (8.2.30) / खरि च (8.4.55) — " + baseK + "च् + " + right });
        candidates.push({ pStem: baseK + "ज्", uSurface: right, sandhi: "चोः कुः (8.2.30) / खरि च (8.4.55) — " + baseK + "ज् + " + right });
      }
      if (left.endsWith("ग्")) {
        var baseG = left.slice(0, -2);
        candidates.push({ pStem: baseG + "च्", uSurface: right, sandhi: "चोः कुः (8.2.30) / जश्त्वम् — " + baseG + "च् + " + right });
        candidates.push({ pStem: baseG + "ज्", uSurface: right, sandhi: "चोः कुः (8.2.30) / जश्त्वम् — " + baseG + "ज् + " + right });
        candidates.push({ pStem: baseG + "क्", uSurface: right, sandhi: "झलां जशोऽन्ते (8.2.39) — " + baseG + "क् + " + right });
      }

      // 6. Savarna-dirgha split (खट्वारूढः -> खट्वा + आरूढः, सुखापेतः -> सुख + अपेतः)
      if (left.endsWith("ा")) {
        var baseA = left.slice(0, -1);
        candidates.push({ pStem: baseA, uSurface: "अ" + right, sandhi: "अकः सवर्णे दीर्घः (6.1.101) — " + baseA + " + अ" + right });
        candidates.push({ pStem: baseA, uSurface: "आ" + right, sandhi: "अकः सवर्णे दीर्घः (6.1.101) — " + baseA + " + आ" + right });
        candidates.push({ pStem: left, uSurface: "अ" + right, sandhi: "अकः सवर्णे दीर्घः (6.1.101) — " + left + " + अ" + right });
        candidates.push({ pStem: left, uSurface: "आ" + right, sandhi: "अकः सवर्णे दीर्घः (6.1.101) — " + left + " + आ" + right });
      }

      // 7. Yan sandhi split (दध्योदनः -> दधि + ओदनः)
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
