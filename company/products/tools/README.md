# Tools: regenerate the product catalogue

These two scripts produce `../catalogue.json` and `../catalogue.md` from the SOVITECH website's product data. They are our own scripts, not website code. They read the website's TypeScript file as text and never run, build, install or import anything from the website repository.

## Requirements

- Python 3, standard library only. Tested with Python 3.9.6.
- Nothing to install. No network access.

## The scripts

| Script | Reads | Writes |
|--------|-------|--------|
| `parse_products.py` | `lib/product-data.ts` and the website's product image folder | `catalogue.json` |
| `gen_catalogue_md.py` | `catalogue.json` only | `catalogue.md` |

### `parse_products.py`

Parses the `products` array and the `categoryEn` map in `lib/product-data.ts` with a small tokenizer. A JSON or JSON5 parser cannot read that file, because each entry has a bare identifier (`icon`). The script:

- checks that four counts agree: the parsed array length, the lines that open an entry, the `id:` lines and the "(178 product cards)" source comment;
- checks for duplicate ids, unknown categories, and `features` and `featuresEn` of different lengths;
- keeps every source field verbatim, and puts computed fields under each product's `derived` key;
- sorts every model row against the entry's article codes (`validation.modelRow`), and lists the article codes found in more than one entry (`validation.articleCodesInMoreThanOneEntry`);
- hashes every image file, finds the ones no product uses, and finds byte-identical files.

| Argument | Default | Meaning |
|----------|---------|---------|
| `--source` | `company/website/source/lib/product-data.ts` | The source file. The default is a byte-identical copy of the file at commit `e080614`. |
| `--images-dir` | `company/products/images` and `company/products/images-unreferenced` | The website's `public/products/` folder. Repeatable. The two default folders together are a byte-for-byte copy of that folder at `e080614` (212 files). They are kept out of git, so restore them first ("Restore the images" below) or point this argument at a clone. |
| `--output` | none, required | Where to write `catalogue.json` |
| `--commit` | `e0806142735dbdd53b913af30102f9227b380475` | Commit hash recorded in `source.commit` |
| `--commit-date` | `2026-08-11` | Recorded in `source.commitDate` |
| `--commit-subject` | `Mobile-first product detail layout` | Recorded in `source.commitSubject` |
| `--imported-on` | `2026-09-23` | Recorded in `source.importedOn`, the date of the first import |
| `--quiet` | off | Do not print the summary |

Default paths are found from the script's own location, so the script works from any working directory.

### `gen_catalogue_md.py`

Writes the readable list: categories, families and products in source order, the image notes, and the "Products seen only as images" tables.

| Argument | Default | Meaning |
|----------|---------|---------|
| `--input` | `company/products/catalogue.json` | The JSON to read |
| `--output` | none, required | Where to write `catalogue.md` |
| `--generated-on` | today | The date in the footer. It is the only part of the output that depends on the day it runs. |

## What is written by hand

Some of the content is not computed. Review it whenever the source changes.

- **In `parse_products.py`:**
  - `UNREF_NOTES`: what each unused image shows, and its group.
  - `SAME_PICTURE` and `SAME_PICTURE_ACROSS_PRODUCTS`: pictures that are the same although the files differ. Finding them needs image decoding, which the standard library cannot do. They were found by comparing decoded pixels and by eye on 2026-09-24.
  - The `dataStatus` text, the caveat sentences, `unreferencedPolicy` and the field notes. The caveats about model rows and shared article codes are built from the data. The rest are fixed text.
- **In `gen_catalogue_md.py`:** the introduction, the "How to read an entry" list, and the glosses of Romanian words in the model row.

The parser stops with a message if a hand-written image note names a file that is not in the image folders, or if a same-picture group no longer matches the products that use those files. A new or changed picture still needs a look by eye.

## Restore the images

Owner decision, 2026-09-24: the product images are kept out of git. `company/products/images/` (162 files, about 53 MB) and `company/products/images-unreferenced/` (50 files, about 11 MB) are listed in the project's `.gitignore`, so a fresh clone of this project does not have them. Without them, `parse_products.py` fails with its default paths, and the image links in `../README.md` and `../catalogue.md` do not open.

They are a byte-for-byte copy of the website's `public/products/` folder at commit `e080614` (212 files). The scripts expect them in the same two folders as before: the files a product uses in `images/`, the other 50 in `images-unreferenced/`. To restore them:

1. Clone the website repository read-only, outside this project, and check out the commit. Do not install, build or run it.

   ```sh
   git clone https://github.com/Gaidenic13/sovitech-website.git /tmp/sovitech-website
   git -C /tmp/sovitech-website checkout --detach e0806142735dbdd53b913af30102f9227b380475
   ```

2. Copy every file in `public/products/` into `images/`, then move the 50 files that no product uses into `images-unreferenced/`. `catalogue.json` lists those 50 under `images.presentButUnreferenced`.

   ```sh
   cd "company/products"
   mkdir -p images images-unreferenced
   cp -p /tmp/sovitech-website/public/products/* images/
   python3 -c 'import json; print("\n".join(i["file"] for i in json.load(open("catalogue.json"))["images"]["presentButUnreferenced"]))' \
     | while IFS= read -r f; do mv "images/$f" images-unreferenced/; done
   ```

3. Check the result. The counts must be 162 and 50, every file must match the clone, and the reproduction check below must pass.

   ```sh
   ls images | wc -l                  # 162
   ls images-unreferenced | wc -l     # 50
   for f in images/* images-unreferenced/*; do
     cmp "$f" "/tmp/sovitech-website/public/products/$(basename "$f")" || echo "DIFFERS: $f"
   done
   ```

   Then run "Reproduction check" below. If `catalogue.json` and `catalogue.md` come out identical, the folders match what the catalogue describes.

If you only need to regenerate the catalogue, you can skip the copy and pass `--images-dir /tmp/sovitech-website/public/products` to `parse_products.py`. The output is the same (see "Reproduction check"). The image links in the READMEs still need the two folders.

## Regenerate from this folder

This rebuilds both files from the copies kept in `company/`. With the defaults, no clone of the website is needed, once the two image folders are in place (see "Restore the images").

```sh
cd "company/products"
python3 tools/parse_products.py --output catalogue.json
python3 tools/gen_catalogue_md.py --output catalogue.md
```

## Regenerate from a new website commit

1. Clone the website repository read-only and check out the commit. Record its full hash, date and subject.
2. Copy the images. Copy each file that a product's `image` field names from `public/products/` into `images/`, and every other file into `images-unreferenced/`, under the same names. Check each sha256. Both folders stay out of git. Update the commit in "Restore the images" above.
3. Run the parser against the clone:

   ```sh
   python3 tools/parse_products.py \
     --source <clone>/lib/product-data.ts \
     --images-dir <clone>/public/products \
     --commit <full hash> --commit-date <YYYY-MM-DD> --commit-subject "<subject>" \
     --imported-on <YYYY-MM-DD> \
     --output catalogue.json
   python3 tools/gen_catalogue_md.py --output catalogue.md
   ```

4. Read the printed summary. Check `referencedMissing`, `presentButUnreferencedCount` and the validation lists.
5. Update the hand-written notes (see above), the counts in `../README.md`, and the snapshot in `company/website/source/` if it is kept in step.
6. Compare with the previous `catalogue.json`, and note what changed. Any app dataset built on this one needs a new version, not an in-place edit (`../README.md`, "Use in the app").

## Reproduction check

On 2026-09-24 both scripts were run into a temporary folder, before and after the changes of that day:

- **Before the changes.** Run against the clone at `e080614` with `--images-dir <clone>/public/products`, they reproduced the first import's `catalogue.json` and `catalogue.md` byte for byte. They did the same with the default paths, once `images-unreferenced/` existed. The footer date matched because the default `--generated-on` was also 2026-09-24.
- **After the changes.** A second run with the defaults reproduces the current `catalogue.json` and `catalogue.md` byte for byte. Running the parser twice gives identical output. Pointing `--images-dir` at the clone instead of the two local folders also gives identical output.

To repeat the check:

```sh
mkdir -p /tmp/catalogue-check
python3 tools/parse_products.py --output /tmp/catalogue-check/catalogue.json --quiet
python3 tools/gen_catalogue_md.py --input /tmp/catalogue-check/catalogue.json \
  --output /tmp/catalogue-check/catalogue.md --generated-on 2026-09-24
cmp /tmp/catalogue-check/catalogue.json catalogue.json
cmp /tmp/catalogue-check/catalogue.md catalogue.md
```

Use the footer date of the current `catalogue.md` as `--generated-on`. Otherwise only that line differs.
