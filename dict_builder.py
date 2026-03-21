"""
═══════════════════════════════════════════════════════════════════════════════
  शब्दकोश-निर्माणम् (Dictionary Builder) — Final Version
  ──────────────────────────────────────────────────────────────────────────
  
  Parses the Sanskrit shabdakosha JSON database and converts it into
  a flat O(1) lookup table for the Samasa Generator.
  
  INPUT FORMAT (your .txt/.json file):
  ────────────────────────────────────────────────────────────────────────
  Array of objects, each with:
    "word"  : "राम"          (pratipadika)
    "linga" : "P"            (P=पुंल्लिङ्ग, S=स्त्रीलिङ्ग, N=नपुंसकलिङ्ग)
    "forms" : "रामः;रामौ;रामाः;रामम्;..."  (24 forms: 8 vibhaktis × 3 vachanas)
  
  FORMS ORDER (0-indexed):
    [0-2]   प्रथमा    (एक, द्वि, बहु)
    [3-5]   द्वितीया   (एक, द्वि, बहु)
    [6-8]   तृतीया    (एक, द्वि, बहु)
    [9-11]  चतुर्थी   (एक, द्वि, बहु)
    [12-14] पञ्चमी    (एक, द्वि, बहु)
    [15-17] षष्ठी     (एक, द्वि, बहु)
    [18-20] सप्तमी    (एक, द्वि, बहु)
    [21-23] सम्बोधन   (एक, द्वि, बहु)
  
  SPECIAL HANDLING:
    - "रामाद्-रामात्" → split on '-', each variant becomes a separate key
    - "हे राम" → prefix "हे " stripped, stored with vibhakti=8
    - Empty forms or "—" → skipped
  
  OUTPUT: Flat JSON lookup → { "रामस्य": {"r":"राम","v":"6","n":"1","k":"अ","g":"पुं"}, ... }
  
  USAGE:
    python3 dict_builder.py shabdakosha.json
    python3 dict_builder.py shabdakosha.json output.json
═══════════════════════════════════════════════════════════════════════════════
"""

import json
import sys
import re
from pathlib import Path
from collections import OrderedDict


# ─────────────────────────────────────────────────────────────────────────
#  CONSTANTS
# ─────────────────────────────────────────────────────────────────────────

VIBHAKTI_MAP = {
    0: "1", 1: "1", 2: "1",      # प्रथमा
    3: "2", 4: "2", 5: "2",      # द्वितीया
    6: "3", 7: "3", 8: "3",      # तृतीया
    9: "4", 10: "4", 11: "4",    # चतुर्थी
    12: "5", 13: "5", 14: "5",   # पञ्चमी
    15: "6", 16: "6", 17: "6",   # षष्ठी
    18: "7", 19: "7", 20: "7",   # सप्तमी
    21: "8", 22: "8", 23: "8",   # सम्बोधन
}

VACHANA_MAP = {
    0: "1", 1: "2", 2: "3",      # एक, द्वि, बहु — repeats for each vibhakti
    3: "1", 4: "2", 5: "3",
    6: "1", 7: "2", 8: "3",
    9: "1", 10: "2", 11: "3",
    12: "1", 13: "2", 14: "3",
    15: "1", 16: "2", 17: "3",
    18: "1", 19: "2", 20: "3",
    21: "1", 22: "2", 23: "3",
}

LINGA_MAP = {
    "P": "पुं",
    "S": "स्त्री",
    "N": "नपुं",
    "A": "त्रि",     # all three genders (if present)
}

VIBHAKTI_NAMES = {
    "1": "प्रथमा", "2": "द्वितीया", "3": "तृतीया", "4": "चतुर्थी",
    "5": "पञ्चमी", "6": "षष्ठी", "7": "सप्तमी", "8": "सम्बोधनम्",
}

VACHANA_NAMES = {
    "1": "एकवचनम्", "2": "द्विवचनम्", "3": "बहुवचनम्",
}


# ─────────────────────────────────────────────────────────────────────────
#  KARANTA DETECTION (infer stem-class from the pratipadika ending)
# ─────────────────────────────────────────────────────────────────────────

def detect_karanta(word, linga):
    """Infer the कारान्त type from the last character of the pratipadika."""
    if not word:
        return "?"
    
    last = word[-1]
    
    # Matra-based detection
    matra_map = {
        'ा': 'आ', 'ि': 'इ', 'ी': 'ई',
        'ु': 'उ', 'ू': 'ऊ', 'ृ': 'ऋ',
        'े': 'ए', 'ै': 'ऐ', 'ो': 'ओ', 'ौ': 'औ',
    }
    
    if last in matra_map:
        return matra_map[last]
    
    # Halanta endings
    if last == '्':
        # Look at the consonant before halant
        if len(word) >= 2:
            pre = word[-2]
            if pre == 'न':
                return "अन्"
            elif pre == 'स':
                return "अस्"
            elif pre == 'त':
                return "अत्"
        return "हल्"
    
    # Default: if it ends in a full consonant (no matra), it's अ-कारान्त
    # (In Devanagari, a consonant without matra has inherent 'अ')
    return "अ"


# ─────────────────────────────────────────────────────────────────────────
#  MAIN PARSER
# ─────────────────────────────────────────────────────────────────────────

def parse_shabdakosha(filepath):
    """
    Parse the shabdakosha JSON file into a flat lookup dictionary.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    # Handle case where file might be wrapped in extra structure
    # or might be a bare array
    data = json.loads(content)
    
    # If it's wrapped in an object with a key like "data" or "words"
    if isinstance(data, dict):
        # Try common wrapper keys
        for key in ['data', 'words', 'entries', 'shabdakosha']:
            if key in data and isinstance(data[key], list):
                data = data[key]
                break
        else:
            # If dict but no list inside, maybe it's already our format
            if all(isinstance(v, dict) for v in data.values()):
                print("  Input appears to already be a flat lookup dict!")
                return data
    
    if not isinstance(data, list):
        print(f"ERROR: Expected a JSON array, got {type(data).__name__}")
        sys.exit(1)
    
    lookup = {}
    skipped = 0
    alt_forms = 0
    sambodhan_count = 0
    
    for entry in data:
        word = entry.get("word", "").strip()
        linga = entry.get("linga", "?").strip()
        forms_str = entry.get("forms", "")
        
        if not word or not forms_str:
            skipped += 1
            continue
        
        karanta = detect_karanta(word, linga)
        gender = LINGA_MAP.get(linga, linga)
        
        # Split the semicolon-separated forms
        forms = forms_str.split(";")
        
        for idx, raw_form in enumerate(forms):
            raw_form = raw_form.strip()
            if not raw_form or raw_form == "—" or raw_form == "-":
                continue
            
            vibhakti = VIBHAKTI_MAP.get(idx, "?")
            vachana = VACHANA_MAP.get(idx, "?")
            
            # Handle alternative forms: "रामाद्-रामात्" → two entries
            variants = raw_form.split("-")
            
            for variant in variants:
                variant = variant.strip()
                if not variant:
                    continue
                
                # Handle सम्बोधन prefix: "हे राम" → store "राम" with v=8
                if variant.startswith("हे "):
                    variant = variant[3:].strip()
                    sambodhan_count += 1
                
                if not variant:
                    continue
                
                if len(variants) > 1:
                    alt_forms += 1
                
                # First-match-wins: don't overwrite existing entries
                if variant not in lookup:
                    lookup[variant] = {
                        "r": word,
                        "v": vibhakti,
                        "n": vachana,
                        "k": karanta,
                        "g": gender,
                    }
    
    print(f"  Entries processed  : {len(data):,}")
    print(f"  Entries skipped    : {skipped:,} (no word/forms)")
    print(f"  Alternative forms  : {alt_forms:,} (e.g., रामाद्/रामात्)")
    print(f"  Sambodhan cleaned  : {sambodhan_count:,} ('हे' prefix removed)")
    
    return lookup


# ─────────────────────────────────────────────────────────────────────────
#  EXPORT
# ─────────────────────────────────────────────────────────────────────────

def build_and_export(filepath, output=None):
    """Main entry point."""
    path = Path(filepath)
    if not path.exists():
        print(f"ERROR: File not found: {filepath}")
        sys.exit(1)
    
    print(f"\n{'═' * 64}")
    print(f"  शब्दकोश-निर्माणम् — Dictionary Builder")
    print(f"{'═' * 64}")
    print(f"  Input: {filepath}")
    print()
    
    lookup = parse_shabdakosha(filepath)
    
    # ── Statistics ──
    roots = set(v["r"] for v in lookup.values())
    genders = {}
    karantas = {}
    for v in lookup.values():
        genders[v["g"]] = genders.get(v["g"], 0) + 1
        karantas[v["k"]] = karantas.get(v["k"], 0) + 1
    
    print(f"\n  ── सांख्यिकी (Statistics) ──")
    print(f"  Total inflected forms : {len(lookup):,}")
    print(f"  Unique root words     : {len(roots):,}")
    print(f"  Avg forms per root    : {len(lookup) / max(len(roots), 1):.1f}")
    
    print(f"\n  लिङ्ग distribution:")
    for g, count in sorted(genders.items(), key=lambda x: x[1], reverse=True):
        pct = count / len(lookup) * 100
        bar = '█' * int(pct / 2)
        print(f"    {g:<8} {count:>8,}  ({pct:4.1f}%)  {bar}")
    
    print(f"\n  कारान्त distribution (top 10):")
    for k, count in sorted(karantas.items(), key=lambda x: x[1], reverse=True)[:10]:
        pct = count / len(lookup) * 100
        bar = '█' * int(pct / 2)
        print(f"    {k + '-कारान्त':<16} {count:>8,}  ({pct:4.1f}%)  {bar}")
    
    print(f"\n  विभक्ति distribution:")
    vdist = {}
    for v in lookup.values():
        vname = VIBHAKTI_NAMES.get(v["v"], v["v"])
        vdist[vname] = vdist.get(vname, 0) + 1
    for vname in ["प्रथमा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","सम्बोधनम्"]:
        count = vdist.get(vname, 0)
        pct = count / len(lookup) * 100 if lookup else 0
        bar = '█' * int(pct / 2)
        print(f"    {vname:<14} {count:>8,}  ({pct:4.1f}%)  {bar}")
    
    # ── Export ──
    out_path = Path(output) if output else path.with_suffix('.json')
    sorted_lookup = OrderedDict(sorted(lookup.items()))
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(sorted_lookup, f, ensure_ascii=False, separators=(',', ':'))
    
    size_mb = out_path.stat().st_size / (1024 * 1024)
    
    print(f"\n  ── Output ──")
    print(f"  File : {out_path}")
    print(f"  Size : {size_mb:.2f} MB")
    
    # ── Sample ──
    print(f"\n  ── Sample (first 8 entries) ──")
    for i, (k, v) in enumerate(sorted_lookup.items()):
        if i >= 8:
            break
        vn = VIBHAKTI_NAMES.get(v["v"], "?")
        nn = VACHANA_NAMES.get(v["n"], "?")
        print(f"    \"{k}\" → {v['r']} · {vn} {nn} · {v['k']}-कारान्त · {v['g']}")
    
    print(f"\n{'═' * 64}")
    print(f"  ✓ Done! Use this JSON in your Samasa Generator.")
    print(f"{'═' * 64}\n")
    
    return sorted_lookup


# ─────────────────────────────────────────────────────────────────────────
#  CLI
# ─────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 dict_builder.py <shabdakosha.json> [output.json]")
        print()
        print("  Reads the shabdakosha JSON array and builds a flat")
        print("  O(1) lookup table for the Samasa Generator.")
        print()
        print("  Example:")
        print("    python3 dict_builder.py shabdakosha.txt shabdakosha_lookup.json")
        sys.exit(0)
    
    input_file = sys.argv[1]
    out_file = sys.argv[2] if len(sys.argv) > 2 else None
    build_and_export(input_file, out_file)
