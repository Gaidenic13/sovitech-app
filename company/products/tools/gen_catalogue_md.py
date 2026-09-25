#!/usr/bin/env python3
"""Generate company/products/catalogue.md from company/products/catalogue.json.

Reads only the JSON. Python 3 standard library only.

Usage (see README.md in this folder):
    python3 gen_catalogue_md.py --output /path/to/catalogue.md
    python3 gen_catalogue_md.py --input /path/to/catalogue.json --output /path/to/catalogue.md
"""
import argparse, datetime, json, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_DIR = os.path.dirname(HERE)                      # company/products

ap = argparse.ArgumentParser(description="Generate catalogue.md from catalogue.json.")
ap.add_argument("--input", default=os.path.join(PRODUCTS_DIR, "catalogue.json"),
                help="path to catalogue.json (default: %(default)s)")
ap.add_argument("--output", required=True, help="path of the catalogue.md to write")
ap.add_argument("--generated-on", default=datetime.date.today().isoformat(),
                help="date written in the footer, YYYY-MM-DD (default: today)")
ARGS = ap.parse_args()

d = json.load(open(ARGS.input, encoding="utf-8"))
products = d["products"]
P = {p["id"]: p for p in products}
NOT_SPEC = d["notSpecifiedSentinel"]["value"]
N = d["productCount"]
assert len(products) == N


import unicodedata


def _ws(c):
    return c.isspace()


def _punct(c):
    return unicodedata.category(c).startswith("P") or unicodedata.category(c).startswith("S")


def _needs_escape(s, ch):
    # Escape a delimiter character only when the text could open emphasis/strikethrough with it:
    # at least two runs of it, and at least one run is left-flanking (CommonMark/GFM definition).
    runs = [(m.start(), m.end()) for m in re.finditer(re.escape(ch) + "+", s)]
    if len(runs) < 2:
        return False
    for i, j in runs:
        nxt = s[j] if j < len(s) else " "
        prv = s[i - 1] if i > 0 else " "
        if _ws(nxt):
            continue
        if not _punct(nxt) or _ws(prv) or _punct(prv):
            return True
    return False


def esc(s):
    # Keep source text verbatim where Markdown would render it literally anyway.
    for ch in ("*", "~", "_"):
        if _needs_escape(s, ch):
            s = s.replace(ch, "\\" + ch)
    s = re.sub(r"<(?=[A-Za-z/!?])", r"\\<", s)
    return s


def slug(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


# image sharing notes
shared_by_name = {}
for img, ids in d["images"]["imagesSharedByMoreThanOneProduct"].items():
    for i in ids:
        shared_by_name[i] = [x for x in ids if x != i]
byte_identical = {}
for grp in d["images"]["byteIdenticalImagesAcrossDifferentProducts"]:
    ids = grp["productIds"]
    for i in ids:
        byte_identical.setdefault(i, []).extend([x for x in ids if x != i])

SLEEVES = ("0391-0392-0393", "0391-0392-0393-2")
MR = d["validation"]["modelRow"]["counts"]
UNREF = d["images"]["presentButUnreferenced"]
CODES_IN_TWO = d["validation"]["articleCodesInMoreThanOneEntry"]
same_picture = {}
for grp in d["images"]["samePictureAcrossProducts"]["groups"]:
    for i in grp["productIds"]:
        same_picture.setdefault(i, []).extend([x for x in grp["productIds"] if x != i])
MODEL_CODE_MISSING = {x["id"]: x for x in d["validation"]["modelRow"]["codeNotInModelCodes"]}


def plural(n, word, words=None):
    return "%d %s" % (n, word if n == 1 else (words or word + "s"))


def spec_row(p, key):
    v = p["specs"][key]
    if v == NOT_SPEC:
        return "*Not specified*"
    en = (p.get("specsEn") or {}).get(key)
    return esc(en if en is not None else v)


def code_label(p):
    return esc(p["code"])


out = []
w = out.append

cats = d["categoryOrderOnSite"]
tree = d["categoryTree"]
total_fams = sum(len(tree[c]["families"]) for c in cats)
assert sum(tree[c]["count"] for c in cats) == N

w("# SOVITECH website product catalogue (SAUTER)")
w("")
w("This is the full list of the %d SAUTER products that the SOVITECH website shows on its products page (`/produse`), grouped the way the website groups them: %d categories and %d families. It is generated from `catalogue.json` in this folder, which was parsed from the website repository at commit `%s` (%s). It is website marketing data, not verified engineering data: read [README.md](README.md), section \"Use in the app\", before using any of it in the app." % (N, len(cats), total_fams, d["source"]["commit"][:7], d["source"]["commitDate"]))
w("")
w("Source: `lib/product-data.ts` (all product data), `components/product-detail.tsx` (spec row labels, the \"Not specified\" rendering, the same-family rule), `app/produse/page.tsx` (category order and filter).")
w("")
w("## How to read an entry")
w("")
w("- **Heading:** the SAUTER type code as the site shows it (`code`), then the English name (`nameEn`).")
w("- **RO:** the Romanian name (`name`). The site's primary language is Romanian.")
w("- **id:** the website slug. The product page is `/produse/<id>`.")
w("- **Function:** the English one-sentence description (`shortDescEn`), verbatim.")
w("- **Features:** the English feature bullets (`featuresEn`), verbatim, one sub-bullet each.")
w("- **Model, Protocol / signal, Range, Power:** the four spec rows of the product page. English values are shown where the source has one (`specsEn`); otherwise the source value is shown unchanged, as the site does. The model row usually names one representative article code in brackets. In %d entries it does not: %d hold a code range, %d holds other text, %d name a code that is not in the entry's article codes (flagged below), and %d have no brackets. See [README.md](README.md), \"Data caveats\". Use the article codes, not the model row." % (
    N - MR["oneListedCode"], MR["codeRange"], MR["notACode"], MR["codeNotInModelCodes"], MR["noBrackets"]))
w("- ***Not specified*** is how the site renders the source value `NU ESTE SPECIFICAT`. It means the value is not given. Treat it as Unknown, never as none or zero.")
w("- **Article codes:** the SAUTER article numbers in `modelCodes`, split on commas and semicolons as the site does.")
w("- **Article codes also in another entry:** shown only for the %d entries that share an article code with another entry." % len({i for ids in CODES_IN_TWO.values() for i in ids}))
w("- **Image:** a relative link into `images/`. A note follows when other products use the same file, a byte-identical file, or the same picture saved as a different file (the last found by eye, `images.samePictureAcrossProducts`). An image does not prove which variant is shown.")
w("")
w("Image files that no product uses are listed at the end, under [Products seen only as images](#images-only).")
w("")
w("Spec values are free text written for the website. One row often mixes several quantities, number formats are mixed (`0,1 K` and `Kvs 1.6` both occur), and some rows hold a signal type or a contact rating instead of what the label says. They are not engineering values (guardrails rules 1 and 8).")
w("")
w("## Contents")
w("")
w("| # | Category (EN) | Category (RO, as on the site) | Families | Products |")
w("|---|---------------|-------------------------------|---------:|---------:|")
for n, c in enumerate(cats, 1):
    t = tree[c]
    w("| %d | [%s](#cat-%d) | %s | %d | %d |" % (n, t["categoryEn"], n, c, len(t["families"]), t["count"]))
w("| | **Total** | | **%d** | **%d** |" % (total_fams, N))
w("")
for n, c in enumerate(cats, 1):
    t = tree[c]
    w("- **[%d. %s](#cat-%d)** (%d)" % (n, t["categoryEn"], n, t["count"]))
    for m, (f, fv) in enumerate(t["families"].items(), 1):
        w("  - [%d.%d %s](#fam-%d-%d) (%d)" % (n, m, esc(fv["familyTitleEn"]), n, m, fv["count"]))
w("- **[Products seen only as images](#images-only)** (%d image files that no product uses)" % len(UNREF))
w("")

entry_count = 0
seen = []
for n, c in enumerate(cats, 1):
    t = tree[c]
    w('<a id="cat-%d"></a>' % n)
    w("")
    w("## %d. %s (%s)" % (n, t["categoryEn"], c))
    w("")
    w("%s in %s. Source: `lib/product-data.ts`, entries with `category: \"%s\"`." % (plural(t["count"], "product"), plural(len(t["families"]), "family", "families"), c))
    w("")
    for m, (f, fv) in enumerate(t["families"].items(), 1):
        w('<a id="fam-%d-%d"></a>' % (n, m))
        w("")
        fam_title = esc(fv["familyTitleEn"])
        if f != fv["familyTitleEn"]:
            fam_title += " (%s)" % esc(f)
        w("### %d.%d %s" % (n, m, fam_title))
        w("")
        w("%s." % plural(fv["count"], "product"))
        w("")
        for pid in fv["productIds"]:
            p = P[pid]
            dv = p["derived"]
            entry_count += 1
            seen.append(pid)
            w("#### %s: %s" % (code_label(p), esc(p["nameEn"])))
            w("")
            if p["name"] != p["nameEn"]:
                w("- **RO:** %s" % esc(p["name"]))
            w("- **id:** `%s` (site page `%s`)" % (pid, dv["websitePath"]))
            w("- **Function:** %s" % esc(p["shortDescEn"]))
            w("- **Features:**")
            for feat in p["featuresEn"]:
                w("  - %s" % esc(feat))
            model = p["specs"]["model"]
            model_txt = esc(model)
            if "teacă imersie" in model:
                model_txt += " (RO \"teacă imersie\" = immersion sleeve; the source has no English value)"
            if "conector VPN" in model:
                model_txt += " (RO \"conector VPN\" = VPN connector; the source has no English value)"
            if pid in MODEL_CODE_MISSING:
                mc = MODEL_CODE_MISSING[pid]
                model_txt += " (the code in brackets, `%s`, is not in this entry's article codes%s)" % (
                    mc["code"], "; they list `%s`" % "`, `".join(mc["modelCodesStartingWithIt"]) if mc["modelCodesStartingWithIt"] else "")
            w("- **Model:** %s" % model_txt)
            w("- **Protocol / signal:** %s" % spec_row(p, "protocol"))
            w("- **Range:** %s" % spec_row(p, "range"))
            w("- **Power:** %s" % spec_row(p, "power"))
            codes = dv["articleCodes"]
            w("- **Article codes (%d):** %s" % (len(codes), ", ".join("`%s`" % x for x in codes)))
            img = dv["imageFile"]
            line = "- **Image:** [%s](images/%s)" % (esc(img), img.replace(" ", "%20"))
            notes = []
            if pid in shared_by_name:
                notes.append("same file also used for %s" % ", ".join("`%s`" % x for x in shared_by_name[pid]))
            if pid in byte_identical:
                notes.append("byte-identical to the image of %s" % ", ".join("`%s`" % x for x in byte_identical[pid]))
            covered = set(shared_by_name.get(pid, [])) | set(byte_identical.get(pid, []))
            sp = [x for x in same_picture.get(pid, []) if x not in covered]
            if sp:
                notes.append("the same picture, as a different file, is used for %s" % ", ".join("`%s`" % x for x in sp))
            if notes:
                line += ". Note: " + "; ".join(notes) + "."
            w(line)
            shared_codes = {}
            for c, ids in CODES_IN_TWO.items():
                if pid in ids:
                    shared_codes.setdefault(tuple(x for x in ids if x != pid), []).append(c)
            if shared_codes:
                w("- **Article codes also in another entry:** %s." % "; ".join(
                    "%s in %s" % (", ".join("`%s`" % c for c in cs), ", ".join("`%s`" % x for x in o)) for o, cs in shared_codes.items()))
            if pid in SLEEVES:
                other = SLEEVES[1] if pid == SLEEVES[0] else SLEEVES[0]
                a = set(dv["articleCodes"]); b = set(P[other]["derived"]["articleCodes"])
                w("- **Duplicate entry:** the same immersion sleeves are also listed as `%s` (%s). The article-code lists differ: only here %s; only there %s. The source does not say which list is right." % (
                    other, P[other]["derived"]["categoryEn"],
                    ", ".join("`%s`" % x for x in sorted(a - b)),
                    ", ".join("`%s`" % x for x in sorted(b - a))))
            w("")

assert entry_count == N and len(set(seen)) == N and set(seen) == set(P)


def cell(t):
    return esc(t).replace("|", "\\|")


GROUPS = [("noEntry", "Products with no catalogue entry"),
          ("other", "Other pictures, not matched to one entry"),
          ("duplicate", "The same picture as an image a product uses")]
assert sorted(r["group"] for r in UNREF) == sorted(r["group"] for g, _ in GROUPS for r in UNREF if r["group"] == g)
w('<a id="images-only"></a>')
w("")
w("## Products seen only as images")
w("")
w("The website's image folder `public/products/` holds %d files that no product uses. They are copied byte for byte into [`images-unreferenced/`](images-unreferenced/). What each shows comes from its file name and from looking at the picture; \"label reads\" means text read off the picture itself. These pictures are not catalogue data: a picture shows neither that SOVITECH offers the product nor which variant it is. Source: `catalogue.json`, `images.presentButUnreferenced`, where `samePictureAs` lists each match." % len(UNREF))
w("")
for g, title in GROUPS:
    rows = [r for r in UNREF if r["group"] == g]
    w("### %s (%d)" % (title, len(rows)))
    w("")
    assert d["images"]["unreferencedGroups"][g]["count"] == len(rows)
    w(esc(d["images"]["unreferencedGroups"][g]["description"]))
    w("")
    w("| File | What it shows | Duplicates a referenced image? |")
    w("|------|---------------|--------------------------------|")
    for r in rows:
        w("| [%s](images-unreferenced/%s) | %s | %s |" % (cell(r["file"]), r["file"].replace(" ", "%20"), cell(r["shows"]), cell(r["duplicatesReferencedImage"])))
    w("")
w("---")
w("")
w("Entries in this file: %d, one per product in `catalogue.json` (`productCount` %d). Generated on %s from `catalogue.json`; website repository commit `%s`." % (entry_count, d["productCount"], ARGS.generated_on, d["source"]["commit"]))
w("")

open(ARGS.output, "w", encoding="utf-8").write("\n".join(out))
print("entries", entry_count)
