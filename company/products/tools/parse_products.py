#!/usr/bin/env python3
"""Build company/products/catalogue.json from the website's lib/product-data.ts.

Static parser. It reads the TypeScript file as text and never runs, builds,
installs or imports any website code. Python 3 standard library only.

Usage (see README.md in this folder):
    python3 parse_products.py --output /path/to/catalogue.json
    python3 parse_products.py --source <clone>/lib/product-data.ts \
        --images-dir <clone>/public/products --commit <hash> ... --output ...
"""
import argparse, datetime, json, re, sys, os, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_DIR = os.path.dirname(HERE)                      # company/products
COMPANY_DIR = os.path.dirname(PRODUCTS_DIR)               # company
DEFAULT_SOURCE = os.path.join(COMPANY_DIR, "website", "source", "lib", "product-data.ts")
# images/ + images-unreferenced/ together are a byte-for-byte copy of the website's
# public/products/ folder at commit e080614 (212 files).
DEFAULT_IMAGE_DIRS = [os.path.join(PRODUCTS_DIR, "images"), os.path.join(PRODUCTS_DIR, "images-unreferenced")]

ap = argparse.ArgumentParser(description="Parse lib/product-data.ts statically into catalogue.json.")
ap.add_argument("--source", default=DEFAULT_SOURCE,
                help="path to lib/product-data.ts (default: %(default)s)")
ap.add_argument("--images-dir", action="append", default=None,
                help="folder holding the website's product images (the repo's public/products/). "
                     "Repeatable. Default: company/products/images and company/products/images-unreferenced.")
ap.add_argument("--output", required=True, help="path of the catalogue.json to write")
ap.add_argument("--commit", default="e0806142735dbdd53b913af30102f9227b380475",
                help="full commit hash the source file comes from (default: %(default)s)")
ap.add_argument("--commit-date", default="2026-08-11", help="commit date, YYYY-MM-DD (default: %(default)s)")
ap.add_argument("--commit-subject", default="Mobile-first product detail layout",
                help="commit subject line (default: %(default)s)")
ap.add_argument("--imported-on", default="2026-09-23",
                help="date the import was made, YYYY-MM-DD (default: %(default)s, the first import)")
ap.add_argument("--quiet", action="store_true", help="do not print the summary")
ARGS = ap.parse_args()

F = ARGS.source
OUT = ARGS.output
COMMIT = ARGS.commit
IMAGE_DIRS = ARGS.images_dir or DEFAULT_IMAGE_DIRS

text = open(F, encoding="utf-8").read()
raw_bytes = open(F, "rb").read()


class Ident(str):
    """Bare JS identifier (e.g. a lucide-react icon component name)."""


def tokenize(s):
    i, n = 0, len(s)
    toks = []
    while i < n:
        c = s[i]
        if c in " \t\r\n":
            i += 1
        elif s.startswith("//", i):
            j = s.find("\n", i)
            i = n if j < 0 else j
        elif s.startswith("/*", i):
            j = s.find("*/", i)
            if j < 0:
                raise ValueError("unterminated block comment")
            i = j + 2
        elif c in "{}[]:,":
            toks.append(("p", c)); i += 1
        elif c == '"':
            j = i + 1
            buf = []
            while True:
                if j >= n:
                    raise ValueError("unterminated string at %d" % i)
                ch = s[j]
                if ch == "\\":
                    buf.append(s[j:j + 2]); j += 2; continue
                if ch == '"':
                    break
                if ch == "\n":
                    raise ValueError("newline in string at %d" % i)
                buf.append(ch); j += 1
            lit = '"' + "".join(buf) + '"'
            toks.append(("s", json.loads(lit)))  # JS \" and \\ escapes are JSON-compatible
            i = j + 1
        elif c in "'`":
            raise ValueError("single-quoted/template string at %d (not supported)" % i)
        elif re.match(r"[-0-9]", c):
            m = re.match(r"-?\d+(\.\d+)?", s[i:])
            toks.append(("n", float(m.group()) if "." in m.group() else int(m.group())))
            i += len(m.group())
        elif re.match(r"[A-Za-z_$]", c):
            m = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", s[i:])
            w = m.group()
            if w == "true": toks.append(("v", True))
            elif w == "false": toks.append(("v", False))
            elif w == "null": toks.append(("v", None))
            elif w == "undefined": toks.append(("v", None))
            else: toks.append(("i", Ident(w)))
            i += len(w)
        elif s.startswith("...", i):
            raise ValueError("spread at %d (not supported)" % i)
        else:
            raise ValueError("unexpected char %r at %d" % (c, i))
    return toks


class P:
    def __init__(self, toks):
        self.t, self.k = toks, 0

    def peek(self):
        return self.t[self.k]

    def eat(self, kind=None, val=None):
        tk = self.t[self.k]
        if kind and tk[0] != kind or val is not None and tk[1] != val:
            raise ValueError("expected %s %s got %r at token %d" % (kind, val, tk, self.k))
        self.k += 1
        return tk

    def value(self):
        tk = self.peek()
        if tk == ("p", "{"): return self.obj()
        if tk == ("p", "["): return self.arr()
        self.k += 1
        if tk[0] in ("s", "n", "v"): return tk[1]
        if tk[0] == "i": return {"__identifier__": str(tk[1])}
        raise ValueError("bad value %r" % (tk,))

    def obj(self):
        self.eat("p", "{")
        o, order = {}, []
        while self.peek() != ("p", "}"):
            kt = self.eat()
            if kt[0] not in ("i", "s"):
                raise ValueError("bad key %r" % (kt,))
            key = str(kt[1])
            if key in o:
                raise ValueError("duplicate key %s" % key)
            self.eat("p", ":")
            o[key] = self.value()
            order.append(key)
            if self.peek() == ("p", ","): self.k += 1
            else: break
        self.eat("p", "}")
        return o

    def arr(self):
        self.eat("p", "[")
        a = []
        while self.peek() != ("p", "]"):
            a.append(self.value())
            if self.peek() == ("p", ","): self.k += 1
            else: break
        self.eat("p", "]")
        return a


def extract_block(marker, open_ch):
    start = text.index(marker)
    b = text.index(open_ch, start + len(marker) - 1)
    # find matching close, respecting strings
    close = {"[": "]", "{": "}"}[open_ch]
    depth, i, instr = 0, b, False
    while i < len(text):
        ch = text[i]
        if instr:
            if ch == "\\": i += 2; continue
            if ch == '"': instr = False
        else:
            if ch == '"': instr = True
            elif ch == open_ch: depth += 1
            elif ch == close:
                depth -= 1
                if depth == 0:
                    return text[b:i + 1], text[:b].count("\n") + 1, text[:i].count("\n") + 1
        i += 1
    raise ValueError("unbalanced")


arr_src, arr_l0, arr_l1 = extract_block("export const products: Product[] = [", "[")
cat_src, cat_l0, cat_l1 = extract_block("export const categoryEn: Record<string, string> = {", "{")
iface_start = text.index("export interface Product {")
iface_src = text[iface_start:text.index("\n}\n", iface_start) + 2]

p = P(tokenize(arr_src)); products = p.arr(); assert p.k == len(p.t)
p = P(tokenize(cat_src)); category_en = p.obj(); assert p.k == len(p.t)

# ---- independent counts --------------------------------------------------
lines = arr_src.split("\n")
count_open_braces_at_2 = sum(1 for l in lines if l == "  {")
count_id_lines = sum(1 for l in lines if re.match(r'^    id: "', l))
comment_m = re.search(r"\((\d+) product cards\)", text)
_sc = re.search(r"^// (Generated from [^\n]*product cards\)\.)$", text, re.M)
source_comment = _sc.group(1) if _sc else None
counts = {
    "parsedArrayLength": len(products),
    "linesEqualTo_two_spaces_open_brace": count_open_braces_at_2,
    "linesMatching_4sp_id_colon_quote": count_id_lines,
    "sourceCommentClaim": int(comment_m.group(1)) if comment_m else None,
}
assert len(set(counts.values())) == 1, counts

# ---- field inventory ------------------------------------------------------
field_counts, spec_counts, specen_counts = {}, {}, {}
for pr in products:
    for k in pr: field_counts[k] = field_counts.get(k, 0) + 1
    for k in pr.get("specs", {}): spec_counts[k] = spec_counts.get(k, 0) + 1
    for k in pr.get("specsEn", {}): specen_counts[k] = specen_counts.get(k, 0) + 1

# ---- validations ----------------------------------------------------------
ids = [pr["id"] for pr in products]
dup_ids = sorted({x for x in ids if ids.count(x) > 1})
empty_name = [pr["id"] for pr in products if not str(pr.get("name", "")).strip()]
empty_name_en = [pr["id"] for pr in products if not str(pr.get("nameEn", "")).strip()]
unknown_cat = sorted({pr["category"] for pr in products} - set(category_en))
feat_len_mismatch = [pr["id"] for pr in products if "featuresEn" in pr and len(pr["featuresEn"]) != len(pr["features"])]

NOT_SPEC = "NU ESTE SPECIFICAT"
not_specified = []
for pr in products:
    for k, v in pr["specs"].items():
        if v == NOT_SPEC: not_specified.append((pr["id"], k))


def article_codes(pr):
    # mirrors articleCodes() in lib/product-data.ts: split on , or ; followed by optional whitespace
    return [c.strip() for c in re.split(r"[,;]\s*", pr.get("modelCodes") or "") if c.strip()]


fam_members = {}
for pr in products:
    fam_members.setdefault(pr["familyTitle"], []).append(pr["id"])

# line number of each product's opening brace in the source file
open_lines = [arr_l0 + idx for idx, l in enumerate(lines) if l == "  {"]

out_products = []
for idx, pr in enumerate(products):
    rec = {}
    for k, v in pr.items():
        rec[k] = v["__identifier__"] if isinstance(v, dict) and "__identifier__" in v else v
    rec["derived"] = {
        "categoryEn": category_en.get(pr["category"]),
        "articleCodes": article_codes(pr),
        "relatedProductIds": [x for x in fam_members[pr["familyTitle"]] if x != pr["id"]],
        "websitePath": "/produse/" + pr["id"],
        "imageFile": os.path.basename(pr["image"]) if pr.get("image") else None,
        "sourceLine": open_lines[idx],
        "notSpecifiedSpecs": [k for k, v in pr["specs"].items() if v == NOT_SPEC],
    }
    out_products.append(rec)

# category tree
tree = {}
for pr in products:
    c = tree.setdefault(pr["category"], {"categoryEn": category_en.get(pr["category"]), "count": 0, "families": {}})
    c["count"] += 1
    f = c["families"].setdefault(pr["familyTitle"], {"familyTitleEn": pr.get("familyTitleEn"), "count": 0, "productIds": []})
    f["count"] += 1
    f["productIds"].append(pr["id"])

# families spanning more than one category
fam_cats = {}
for pr in products:
    fam_cats.setdefault(pr["familyTitle"], set()).add(pr["category"])
multi_cat_fams = {k: sorted(v) for k, v in fam_cats.items() if len(v) > 1}

# ---- images ---------------------------------------------------------------
img_path = {}
for _d in IMAGE_DIRS:
    for _f in os.listdir(_d):
        if _f.startswith("."):
            continue
        if _f in img_path:
            raise ValueError("image %s is in more than one --images-dir" % _f)
        img_path[_f] = os.path.join(_d, _f)
present = set(img_path)
refs = [pr["image"] for pr in products]
non_products_prefix = [r for r in refs if not r.startswith("/products/")]
ref_files = {os.path.basename(r) for r in refs if r.startswith("/products/")}
missing = sorted(ref_files - present)
unreferenced = sorted(present - ref_files)
shared_images = {}
for pr in products:
    shared_images.setdefault(pr["image"], []).append(pr["id"])
shared_images = {k: v for k, v in shared_images.items() if len(v) > 1}

# other references to products images anywhere in repo (excluding public/)
# byte-level duplicate analysis
import hashlib as _h
_hash = {}
for f in sorted(present):
    _hash.setdefault(_h.sha256(open(img_path[f], "rb").read()).hexdigest(), []).append(f)
img2ids = {}
for pr in products:
    img2ids.setdefault(os.path.basename(pr["image"]), []).append(pr["id"])
byte_identical_across_products = []
unref_dup_of_referenced = {}
unref_dup_of_unreferenced = []
for hsh, fs in _hash.items():
    if len(fs) < 2: continue
    refd = [f for f in fs if f in ref_files]
    unr = [f for f in fs if f not in ref_files]
    if len(refd) > 1:
        byte_identical_across_products.append({"files": refd, "productIds": [i for f in refd for i in img2ids[f]]})
    for u in unr:
        if refd:
            unref_dup_of_referenced[u] = {"identicalTo": refd[0], "productIds": img2ids[refd[0]]}
    if not refd and len(unr) > 1:
        unref_dup_of_unreferenced.append(unr)

# ---- images present in public/products/ but used by no product -------------
# Hand-written notes. They come from the file name and from looking at each picture;
# "label reads" means text read off the picture itself. Reviewed on 2026-09-24.
# Groups:
#   noEntry    - a product (named by the file name or a label) with no catalogue entry
#   other      - a picture not matched to one catalogue entry
#   duplicate  - the same picture as an image that a product uses
# Byte-identical matches are computed below. Pixel-identical and "same picture, other
# compression" matches need image decoding, so they are recorded by hand in SAME_PICTURE.
UNREF_NOTES = {
    "1083683.png": ("noEntry", "Black SAUTER DIN-rail device labelled 'Building Data Integrity Manager', with four LAN ports; small print appears to read 'modu615-BM'. No catalogue entry."),
    "1086975-958x1024.png": ("other", "Brass threaded 3-way valve with a black knob and yellow flange. It resembles the valve pictured for m3r-m4r (control-valve-with-threaded-connection-pn-10.jpg) but is a different picture. Not matched to an entry."),
    "2-way-flanged-valve-pn-6-pn.jpg": ("duplicate", "Flanged valve. The file name says PN 6, but the picture is the one the catalogue uses for the PN 16/10 valves bue and vue. Which product it was meant to show is unclear."),
    "3-way-flanged-valve-pn-6-pn.jpg": ("duplicate", "Same picture as 2-way-flanged-valve-pn-6-pn.jpg, under a 3-way name. The picture is the one the catalogue uses for bue and vue."),
    "423066.jpg": ("noEntry", "Grey SAUTER pneumatic device labelled 'XTP 2', with a time dial in minutes. No pneumatic products in the catalogue."),
    "423077.jpg": ("other", "Two pneumatic valve actuators; no brand is readable. No pneumatic products in the catalogue."),
    "423088.jpg": ("other", "Olive metal enclosure with a cable gland. Not identifiable."),
    "481436-1.jpg": ("noEntry", "Yellow modular automation station: modu524/525, going by the file of the same picture that is named for it. Not in the catalogue."),
    "481437-543x1024.jpg": ("noEntry", "Yellow DIN-rail I/O module: modu530, going by the byte-identical file that is named for it. Not in the catalogue."),
    "481455.jpg": ("noEntry", "Yellow local operating unit with an LCD and a rotary knob; label reads 'modu840'. Not in the catalogue, whose local operating unit is the modulo 6 unit ey6lo00 (Local operating and display unit)."),
    "487592.jpg": ("other", "Yellow and black rotary actuator with a manual lever; label reads 'AKM115F120'. That article code is listed in the entry akm-105-115 (AKM 105/115), which uses a different-looking picture, rotary-actuator.png."),
    "499362.jpg": ("other", "White SAUTER room thermostat in the TSHK style (fan-speed switch, ON/OFF switch, dial). It differs from tshk670.jpg and tshk681.jpg. No entry uses it; which variant it shows is unclear."),
    "499415.jpg": ("noEntry", "Room controller: equiflex, going by the byte-identical file that is named for it. Not in the catalogue."),
    "635841.jpg": ("noEntry", "Yellow and black web server housing: moduWeb500, going by the file of the same picture that is named for it. Not in the catalogue."),
    "692074.jpg": ("other", "Grey DIN-rail terminal/distributor strip. It resembles the FXV 3 distributor but is not the picture used for fxv-3 (fxv3.jpg); not confirmed."),
    "692095.jpg": ("other", "White wall room unit with an LCD and touch keys. Not matched to an entry."),
    "826866.png": ("noEntry", "flexotron800 controller with an English display. Same product as communicative-controller-for-universal-use-flexotron800.png, which shows a German display. The catalogue has flexotron400 (RDT) only."),
    "865070-747x1024.png": ("other", "White SAUTER DIN-rail module with a green LED. Not matched to an entry."),
    "communication-module-with-eia-232-and-eia-485-interfaces-modu721.jpg": ("noEntry", "modu721 communication module (from the file name). Not in the catalogue."),
    "communication-module-with-m-bus-and-eia-232-interfaces-modu731.jpg": ("noEntry", "modu731 communication module (from the file name). Not in the catalogue."),
    "communicative-controller-for-universal-use-flexotron800.png": ("noEntry", "flexotron800 controller (from the file name). Not in the catalogue."),
    "electronic-air-conditioning-controller-heating-cooling-equiflex.jpg": ("noEntry", "equiflex room controller (from the file name). Not in the catalogue."),
    "energy-data-logger-for-ems-4.jpg": ("noEntry", "Industrial-PC style energy data logger (the file name says EMS). Not in the catalogue."),
    "i-o-module-digital-and-universal-inputs-modu530.jpg": ("noEntry", "modu530 I/O module (from the file name). Not in the catalogue."),
    "modular-automation-station-modu524-525.jpg": ("noEntry", "modu524/525 automation station (from the file name). Not in the catalogue."),
    "pneumatic-actuator-2.png": ("noEntry", "Yellow and black pneumatic actuator (from the file name). No pneumatic products in the catalogue."),
    "pneumatic-valve-actuator.jpg": ("noEntry", "Pneumatic valve actuator (from the file name). No pneumatic products in the catalogue."),
    "room-automation-station-ecos500.jpg": ("noEntry", "ecos500 room automation station (from the file name). Not in the catalogue (it has ecos504/505, ecos514/515 and ecos311)."),
    "web-server-for-moduweb-vision-and-moduweb500-bacnet-networks.jpg": ("noEntry", "moduWeb500 web server (from the file name). Not in the catalogue."),
    "wireless-interface-ecomod580.jpg": ("noEntry", "ecomod580 wireless interface (from the file name). Not in the catalogue (it has ecosCom581, EY-CM 581)."),
}
# Same picture under a different file (not byte-identical), found by comparing decoded
# pixels and by eye on 2026-09-24. how: "pixel-identical" = every decoded pixel equal;
# "same picture, other compression" = same image saved at a different JPEG quality.
SAME_PICTURE = {
    "2-way-flanged-valve-pn-6-pn.jpg": [("3-way-flanged-valve-pn-16-10-el.jpg", "pixel-identical"), ("vue.jpg", "same picture, other compression"), ("3-way-flanged-valve-pn-6-pn.jpg", "pixel-identical")],
    "3-way-flanged-valve-pn-6-pn.jpg": [("3-way-flanged-valve-pn-16-10-el.jpg", "pixel-identical"), ("vue.jpg", "same picture, other compression"), ("2-way-flanged-valve-pn-6-pn.jpg", "pixel-identical")],
    "423021.jpg": [("2-way-flanged-valve-pn-25-16-el.jpg", "pixel-identical")],
    "499511.jpg": [("avf-234s.jpg", "same picture, other compression")],
    "481436-1.jpg": [("modular-automation-station-modu524-525.jpg", "same picture, other compression")],
    "635841.jpg": [("web-server-for-moduweb-vision-and-moduweb500-bacnet-networks.jpg", "same picture, other compression")],
    "modular-automation-station-modu524-525.jpg": [("481436-1.jpg", "same picture, other compression")],
    "web-server-for-moduweb-vision-and-moduweb500-bacnet-networks.jpg": [("635841.jpg", "same picture, other compression")],
}
# Different products whose images are the same picture saved as different files (not
# byte-identical). Found with a perceptual hash and checked by eye on 2026-09-24. The list
# may not be complete. Byte-identical pairs are computed separately.
SAME_PICTURE_ACROSS_PRODUCTS = [
    {"files": ["vue.jpg", "3-way-flanged-valve-pn-16-10-el.jpg"], "productIds": ["vue", "bue"]},
    {"files": ["2-way-flanged-valve-pn-25-16-el.jpg", "3-way-flanged-valve-pn-25-16-el.jpg"], "productIds": ["vug", "bug"], "note": "pixel-identical"},
    {"files": ["2-way-flanged-valve-pn-6.jpg", "2-way-flanged-valve-pn-16.jpg", "vqd-vqe.jpg"], "productIds": ["vud", "vqe", "vqd"], "note": "the first two are byte-identical"},
    {"files": ["3-way-flanged-valve-pn-6.jpg", "bqd-bqe.jpg"], "productIds": ["bud", "bqd", "bqe"]},
    {"files": ["2-way-regulating-ball-valve-with-female-thread-pn-40.jpg", "vkai.jpg"], "productIds": ["vkr", "vkai"]},
    {"files": ["vkaa.png", "vkra.png"], "productIds": ["vkaa", "vkra"]},
    {"files": ["akf-112-113.jpg", "rotary-actuator-with-spring-return-and-positioner.jpg"], "productIds": ["akf-112-113", "akf-113s"]},
    {"files": ["asf-122-123.jpg", "damper-actuator-with-spring-return-and-positioner-2.jpg"], "productIds": ["asf-122-123", "asf-123s", "asf-113s"]},
    {"files": ["asm-124.jpg", "asm-134.jpg", "asm-124s-134s.jpg", "damper-actuator-with-sauter-universal-technology-sut.jpg"], "productIds": ["asm-124", "asm-134", "asm-124s-134s", "asm-105s-115s-f132"], "note": "the first two are byte-identical"},
    {"files": ["avf-234s.jpg", "sut-valve-actuator-with-positioner.jpg"], "productIds": ["avf-234s", "avm-234s"]},
]
file_by_hash = {f: hsh for hsh, fs in _hash.items() for f in fs}
_prod_name = {pr["id"]: pr["nameEn"] for pr in products}


def _ref(f, how):
    return {"file": f, "referenced": f in ref_files, "productIds": img2ids.get(f, []), "how": how}


def _phrase(m):
    ids = " (%s)" % ", ".join(m["productIds"]) if m["productIds"] else ""
    if m["how"] == "same picture, other compression":
        return "the same picture as %s%s, saved at another compression" % (m["file"], ids)
    return "%s to %s%s" % (m["how"], m["file"], ids)


unref_detail = []
for f in unreferenced:
    byte_same = [x for x in _hash[file_by_hash[f]] if x != f]
    matches = [_ref(x, "byte-identical") for x in byte_same]
    matches += [_ref(x, how) for x, how in SAME_PICTURE.get(f, [])]
    ref_matches = [m for m in matches if m["referenced"]]
    if f in UNREF_NOTES:
        group, shows = UNREF_NOTES[f]
    else:
        # byte-identical to an image a product uses: describe it through that product
        group = "duplicate"
        shows = "Same picture as the image of %s." % " and ".join(
            "%s (%s)" % (i, _prod_name[i]) for m in ref_matches if m["how"] == "byte-identical" for i in m["productIds"])
    if ref_matches:
        dup = "Yes: %s." % "; ".join(_phrase(m) for m in ref_matches)
    else:
        dup = "No."
        unr = [m for m in matches if not m["referenced"]]
        if unr:
            dup += " It is %s, which no product uses either." % "; ".join(_phrase(m) for m in unr)
    assert (group == "duplicate") == bool(ref_matches), f
    unref_detail.append({
        "file": f,
        "copiedTo": "company/products/images-unreferenced/" + f,
        "group": group,
        "shows": shows,
        "duplicatesReferencedImage": dup,
        "samePictureAs": matches,
    })
assert set(UNREF_NOTES) <= set(unreferenced), sorted(set(UNREF_NOTES) - set(unreferenced))
assert all(f in UNREF_NOTES or any(m["referenced"] for m in r["samePictureAs"]) for f, r in zip(unreferenced, unref_detail))
# The hand-written notes name files and products. If the source changes, they must be reviewed.
_hand_files = set(UNREF_NOTES) | set(SAME_PICTURE) | {x for v in SAME_PICTURE.values() for x, _ in v} \
    | {x for g in SAME_PICTURE_ACROSS_PRODUCTS for x in g["files"]}
if not _hand_files <= present:
    raise SystemExit("Hand-written image notes name files that are not in the image folders: %s. "
                     "Review UNREF_NOTES, SAME_PICTURE and SAME_PICTURE_ACROSS_PRODUCTS." % sorted(_hand_files - present))
for g in SAME_PICTURE_ACROSS_PRODUCTS:
    if sorted(g["productIds"]) != sorted(i for f in g["files"] for i in img2ids.get(f, [])):
        raise SystemExit("SAME_PICTURE_ACROSS_PRODUCTS is out of date for %s" % g["files"])

# ---- model row versus article codes -----------------------------------------
# specs.model usually reads "SAUTER <name> (<one article code>)". Classify every entry.
model_row = {"oneListedCode": [], "codeRange": [], "notACode": [], "noBrackets": [], "codeNotInModelCodes": []}
for rec in out_products:
    m_ = re.search(r"\(([^()]*)\)\s*$", rec["specs"]["model"])
    codes_ = rec["derived"]["articleCodes"]
    if not m_:
        model_row["noBrackets"].append({"id": rec["id"], "model": rec["specs"]["model"]})
        continue
    inner = m_.group(1).strip()
    if inner in codes_:
        model_row["oneListedCode"].append(rec["id"])
    elif "\u2026" in inner or "..." in inner:
        model_row["codeRange"].append({"id": rec["id"], "model": rec["specs"]["model"]})
    elif re.search(r"[a-z]|\s", inner):
        model_row["notACode"].append({"id": rec["id"], "model": rec["specs"]["model"]})
    else:
        model_row["codeNotInModelCodes"].append({
            "id": rec["id"], "code": inner, "sourceLine": rec["derived"]["sourceLine"],
            "modelCodesStartingWithIt": [c for c in codes_ if c.startswith(inner)],
            "inAnyModelCodes": any(inner in r2["derived"]["articleCodes"] for r2 in out_products),
        })

# ---- article codes listed in more than one entry ------------------------------
code_entries = {}
for rec in out_products:
    for c in rec["derived"]["articleCodes"]:
        code_entries.setdefault(c, []).append(rec["id"])
codes_in_two = {c: ids for c, ids in code_entries.items() if len(ids) > 1}
article_code_total = sum(len(v) for v in code_entries.values())


_WORDS = "Zero One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve".split()


def _word(n):
    return _WORDS[n] if n < len(_WORDS) else str(n)


def _join(items):
    items = list(items)
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]


def model_row_caveat():
    mr = model_row
    parts = []
    if mr["codeRange"]:
        parts.append("%d entries hold a code range (%s)" % (len(mr["codeRange"]), ", ".join(x["id"] for x in mr["codeRange"])))
    for x in mr["notACode"]:
        parts.append("%s holds '%s'" % (x["id"], re.search(r"\(([^()]*)\)\s*$", x["model"]).group(1)))
    if mr["noBrackets"]:
        parts.append("%s have no brackets" % _join([x["id"] for x in mr["noBrackets"]]))
    if mr["codeNotInModelCodes"]:
        def one(x):
            t = "%s %s" % (x["id"], x["code"])
            if x["modelCodesStartingWithIt"]:
                t += " (modelCodes has only %s)" % ", ".join(x["modelCodesStartingWithIt"])
            return t
        parts.append("in %d entries the bracketed code is in no modelCodes list (%s)" % (
            len(mr["codeNotInModelCodes"]), ", ".join(one(x) for x in mr["codeNotInModelCodes"])))
    return ("specs.model usually holds one representative article code in brackets, e.g. "
            "'SAUTER TSHK 621…643 (TSHK621F001)'. %d of %d entries do. Exceptions: %s. "
            "The model row is not a reliable article code; use modelCodes (derived.articleCodes), "
            "and see validation.modelRow." % (len(mr["oneListedCode"]), len(out_products), "; ".join(parts)))


def codes_in_two_caveat():
    by_first = {}
    for c, ids in codes_in_two.items():
        by_first.setdefault(ids[0], []).append((c, ids[1:]))
    parts = []
    for first, items in by_first.items():
        others = {tuple(o) for _, o in items}
        codes = [c for c, _ in items]
        if len(others) == 1:
            parts.append("%s in %s and %s" % (_join(codes), first, _join(list(others.pop()))))
        else:
            parts.append("%s in %s and also in one other entry each (%s)" % (
                _join(codes), first, ", ".join("%s in %s" % (c, _join(o)) for c, o in items)))
    return ("%s article codes appear in more than one entry, so an article code does not always lead to exactly one entry: %s. "
            "modelCodes holds %d codes in total, %d of them distinct. See validation.articleCodesInMoreThanOneEntry."
            % (_word(len(codes_in_two)), "; ".join(parts), article_code_total, len(code_entries)))


catalogue = {
    "about": (
        "SAUTER product catalogue as published on the SOVITECH website (route /produse). "
        "Parsed statically from lib/product-data.ts. Every source field is kept verbatim under its original name; "
        "fields computed during import are grouped under each product's 'derived' key."
    ),
    "source": {
        "repository": "https://github.com/Gaidenic13/sovitech-website",
        "path": "lib/product-data.ts",
        "commit": COMMIT,
        "commitDate": ARGS.commit_date,
        "commitSubject": ARGS.commit_subject,
        "fileSha256": hashlib.sha256(raw_bytes).hexdigest(),
        "fileBytes": len(raw_bytes),
        "productsArrayLines": [arr_l0, arr_l1],
        "sourceComment": source_comment,
        "upstreamCatalogueLink": "https://issuu.com/sauter/docs/2026_2027_catalogue_product_and_sys_6fc437e2aa86d2?fr=sZWRkMjg0Mjg1NTI",
        "upstreamCatalogueLinkSource": "app/produse/page.tsx",
        "displayedBy": ["app/produse/page.tsx", "app/produse/[id]/page.tsx", "app/produse/layout.tsx", "components/product-detail.tsx"],
        "parsedWith": "Python tokenizer over the TypeScript object literal; repo code was not executed",
        "importedOn": ARGS.imported_on,
    },
    "dataStatus": (
        "Website catalogue copy, written by the website team from the SAUTER 2026-2027 catalogue for a sales page. "
        "It is marketing data: not verified engineering data, and not an approved reference dataset. "
        "In the app, SAUTER product identifiers (model numbers, product names and product lines) come only from "
        "an approved, versioned reference dataset (docs/guardrails.md rule 1 and section 2.1). This catalogue is not one, "
        "so the app must not use it to name, describe or suggest products. "
        "It may inform a future reference dataset only after the approver decides to adopt it "
        "(guardrails section 10, case G1-12); no approver was named as of 2026-09-24. "
        "Until then it serves only as background knowledge while building the app, and as a starting point "
        "for requesting a proper machine-readable catalogue. "
        "Its spec values (ranges, supplies, protocols) never become engineering values without the unit registry "
        "and verification against the manufacturer datasheet by a SOVITECH engineer (rules 1, 3 and 8). "
        "The source has no prices, no datasheet URLs and no application or sector links per product. "
        "See company/products/README.md, 'Use in the app'."
    ),
    "caveats": [
        "The four spec slots (model, protocol, range, power) are display rows, not typed quantities. One string often mixes several quantities (e.g. 'DN 15…50, Kvs 1.6…40 m³/h, PN 6'). 'power' sometimes holds a contact rating rather than a supply (e.g. tuc: 'Sarcină contacte 230 VAC, 10(2.5) A'); 'protocol' sometimes holds a signal type or contact description. Do not parse them into engineering values without the unit registry and engineer verification (guardrails rule 8).",
        "%d spec values are the sentinel 'NU ESTE SPECIFICAT' (%d power, %d protocol), mostly on valves and passive items. This means 'not given', not 'none'." % (
            len(not_specified), sum(1 for _, k in not_specified if k == "power"), sum(1 for _, k in not_specified if k == "protocol")),
        model_row_caveat(),
        "Number formats are mixed inside Romanian text: decimal point in some values ('Kvs 1.6…40 m³/h', '10(2.5) A') and decimal comma in others ('3,5 W', '1,7 GHz'). Ranges use the ellipsis character '…' mostly and '...' in a few values.",
        "Category names are website groupings, not SAUTER's. 'Actuatori' (85 items) also contains valves, ball valves and balancing valves; 'Panouri Operare' also contains thermostats and one immersion-sleeve entry.",
        "The immersion sleeves appear twice: '0391-0392-0393' (Panouri Operare, TUC family) and '0391-0392-0393-2' (Senzori Ambient, EGT family). Their modelCodes lists differ (e.g. 0391022600 vs 0391022450, 0393022100 vs 0393022200, 0392022100 vs 0392022200). Which is right is not stated in the source.",
        codes_in_two_caveat(),
        "The 'docs' field is only a datasheet label ('Fisa tehnica ...'). The source has no datasheet URLs, and no page renders this field at this commit.",
        "The source has no prices, no stock data, and no link between products and sectors/applications.",
        "%s pairs of different products share byte-identical images (see images.byteIdenticalImagesAcrossDifferentProducts), and %d images are shared by name across products (images.imagesSharedByMoreThanOneProduct). A visual check found %d more groups of different products whose images are the same picture saved as different files (images.samePictureAcrossProducts); that list may not be complete. An image does not prove which variant a product is." % (
            _word(len(byte_identical_across_products)), len(shared_images), len(SAME_PICTURE_ACROSS_PRODUCTS)),
    ],
    "productCount": len(products),
    "countCheck": counts,
    "validation": {
        "duplicateIds": dup_ids,
        "emptyName": empty_name,
        "emptyNameEn": empty_name_en,
        "categoriesNotInCategoryEnMap": unknown_cat,
        "featuresEnLengthMismatch": feat_len_mismatch,
        "articleCodeTotal": article_code_total,
        "articleCodeDistinct": len(code_entries),
        "articleCodesInMoreThanOneEntry": codes_in_two,
        "modelRow": {
            "rule": "specs.model is expected to end with one article code in brackets that is also in modelCodes. Entries are sorted into oneListedCode or one of the exceptions.",
            "counts": {k: len(v) for k, v in model_row.items()},
            **model_row,
        },
    },
    "notSpecifiedSentinel": {
        "value": NOT_SPEC,
        "meaning": "Spec not given by the source. Website renders it as 'Nu este specificat' / 'Not specified' (components/product-detail.tsx). Treat as Unknown, never as empty or zero.",
        "occurrences": [{"id": a, "spec": b} for a, b in not_specified],
    },
    "schema": {
        "typescriptInterface": iface_src,
        "fields": {k: {"presentIn": v} for k, v in field_counts.items()},
        "specsKeys": spec_counts,
        "specsEnKeys": specen_counts,
        "fieldNotes": {
            "id": "URL slug; product page is /produse/<id>.",
            "name / nameEn": "Product name in Romanian / English.",
            "code": "SAUTER type designation as shown on the site (e.g. 'TSHK 621…643'). Uses the ellipsis character '…' for ranges.",
            "category": "One of 8 Romanian category labels; English label via categoryEn map.",
            "image": "Path under the website's public/ folder. Copied files are in company/products/images/ with the same file name.",
            "icon": "Name of a lucide-react icon component used on the catalogue card. Stored here as a string.",
            "shortDesc / shortDescEn": "One-sentence function description, RO / EN.",
            "specs": "Four display rows: model, protocol (label on detail page: 'Protocol / Semnal'), range ('Gamă'), power ('Alimentare'). Romanian, free text, may combine several quantities in one string.",
            "specsEn": "English overrides only for spec values that contain Romanian words; when absent the site shows specs.* unchanged. specs.model never has an EN override.",
            "docs": "A label such as 'Fisa tehnica TSHK 621…643' (datasheet name). It is not a link and no page renders it at this commit.",
            "features / featuresEn": "Feature bullets, RO / EN, aligned by index.",
            "modelCodes": "Comma-separated SAUTER article numbers (e.g. 'TSHK621F001, TSHK642F001'). Split into derived.articleCodes with the site's own rule.",
            "familyTitle / familyTitleEn": "Product family. The site's 'related products' are the other products with the same familyTitle.",
        },
        "derivedFields": {
            "derived.categoryEn": "categoryEn[category] from lib/product-data.ts.",
            "derived.articleCodes": "modelCodes split on ',' or ';' (same rule as articleCodes() in lib/product-data.ts).",
            "derived.relatedProductIds": "Other products with the same familyTitle (same rule as components/product-detail.tsx).",
            "derived.websitePath": "/produse/<id>.",
            "derived.imageFile": "File name of image, as copied into company/products/images/.",
            "derived.sourceLine": "Line of the product's opening brace in lib/product-data.ts at the source commit.",
            "derived.notSpecifiedSpecs": "Spec keys whose value is the sentinel 'NU ESTE SPECIFICAT'.",
        },
    },
    "categoryEn": category_en,
    "categoryOrderOnSite": ["Controllere & PLC", "Senzori Presiune", "Senzori Ambient", "Actuatori", "Panouri Operare", "Software BMS", "Gateway & Integrare", "Alimentare & Accesorii"],
    "categoryTree": tree,
    "familiesInMoreThanOneCategory": multi_cat_fams,
    "images": {
        "copiedTo": "company/products/images/",
        "unreferencedCopiedTo": "company/products/images-unreferenced/",
        "referencedDistinct": len({r for r in refs}),
        "referencedMissing": missing,
        "referencedOutsideProductsFolder": sorted(set(non_products_prefix)),
        "imagesSharedByMoreThanOneProduct": shared_images,
        "presentInFolder": len(present),
        "copiedCount": len(ref_files),
        "presentButUnreferencedCount": len(unreferenced),
        "presentButUnreferenced": unref_detail,
        "unreferencedPolicy": (
            "Copied byte for byte into company/products/images-unreferenced/ (sha256 checked), so the notes can be "
            "checked against the pictures. No product uses them, and they are not catalogue data: a picture shows "
            "neither that SOVITECH offers the product nor which variant it is. 'shows' comes from the file name and from "
            "looking at each picture, and was reviewed by hand on 2026-09-24. At commit e080614 all %d were added in "
            "commit 02c0fde and are referenced nowhere in the repository; the unmerged branch redesign-2026 (af81353) "
            "changes neither the product data nor these images." % len(unreferenced)
        ),
        "unreferencedGroups": {
            g: {"description": desc, "count": sum(1 for r in unref_detail if r["group"] == g)}
            for g, desc in (
                ("noEntry", "A product named by the file name or by a label on the picture, with no catalogue entry. Most names are SAUTER product lines."),
                ("other", "A picture not matched to one catalogue entry."),
                ("duplicate", "The same picture as an image that a product uses."),
            )
        },
        "byteIdenticalImagesAcrossDifferentProducts": byte_identical_across_products,
        "unreferencedByteIdenticalPairs": unref_dup_of_unreferenced,
        "samePictureAcrossProducts": {
            "method": "Perceptual hash over all referenced images, then checked by eye and by decoded-pixel comparison on 2026-09-24. Not computed by the parser. May not be complete.",
            "groups": SAME_PICTURE_ACROSS_PRODUCTS,
        },
    },
    "products": out_products,
}

if __name__ == "__main__":
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(catalogue, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    if ARGS.quiet:
        sys.exit(0)
    summary = {k: catalogue[k] for k in ("productCount", "countCheck", "validation")}
    summary["fields"] = field_counts
    summary["specs"] = spec_counts
    summary["specsEn"] = specen_counts
    summary["notSpecified"] = len(not_specified)
    summary["tree"] = {k: (v["categoryEn"], v["count"], len(v["families"])) for k, v in tree.items()}
    summary["multiCatFams"] = multi_cat_fams
    summary["images"] = {k: v for k, v in catalogue["images"].items()}
    summary["families"] = len(fam_members)
    print(json.dumps(summary, ensure_ascii=False, indent=1))
