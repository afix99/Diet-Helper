#!/usr/bin/env python3
"""Extract seed data from Memey_Diet_Planner_v3.xlsx into seed/*.json.

One-off importer. The generated JSON under seed/ is committed and is the
source of truth for the app; the workbook itself is kept at
.source-workbook.xlsx only so this script stays re-runnable.

Usage:  python3 scripts/extract_xlsx.py
Requires: pip install openpyxl
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
WORKBOOK = ROOT / ".source-workbook.xlsx"
OUT = ROOT / "seed"


def cell(ws, row, col):
    v = ws.cell(row, col).value
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def num(v):
    """Excel stores these as ints or floats; keep them numeric, drop trailing .0."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v) if float(v).is_integer() else float(v)
    return None


def slug(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s


# --- Food Database: rows 4-72, cols A-J ------------------------------------
def extract_foods(wb):
    ws = wb["Food Database"]
    foods = []
    for r in range(4, 73):
        name = cell(ws, r, 2)
        if not name:
            continue
        foods.append(
            {
                "slug": slug(name),
                "category": cell(ws, r, 1),
                "name": name,
                "servingSize": cell(ws, r, 3),
                "kcal": num(cell(ws, r, 4)),
                "protein": num(cell(ws, r, 5)),
                "carbs": num(cell(ws, r, 6)),
                "fat": num(cell(ws, r, 7)),
                "fibre": num(cell(ws, r, 8)),
                "glycemicLoad": num(cell(ws, r, 9)),
                "notes": cell(ws, r, 10),
            }
        )
    return foods


# --- Recipe Collection: 4-row blocks from row 4, step 5, all in col A ------
RECIPE_HEADER = re.compile(
    r"^(?P<name>.+?)\s*\|\s*(?P<minutes>\d+)\s*min\s*\|\s*(?P<kcal>\d+)\s*kcal\s*\|\s*"
    r"P:(?P<protein>[\d.]+)g\s+C:(?P<carbs>[\d.]+)g\s+F:(?P<fat>[\d.]+)g\s+Fibre:(?P<fibre>[\d.]+)g$"
)


def extract_recipes(wb):
    ws = wb["Recipe Collection"]
    recipes = []
    for start in range(4, 38, 5):
        header = cell(ws, start, 1)
        if not header:
            continue
        m = RECIPE_HEADER.match(header)
        if not m:
            sys.exit(f"Unparsed recipe header at row {start}: {header!r}")
        ingredients = (cell(ws, start + 1, 1) or "").replace("INGREDIENTS:", "", 1).strip()
        steps_raw = cell(ws, start + 2, 1) or ""
        note = (cell(ws, start + 3, 1) or "").replace("CHEF'S NOTE:", "", 1).strip()
        recipes.append(
            {
                "slug": slug(m.group("name")),
                "name": m.group("name").strip(),
                "minutes": int(m.group("minutes")),
                "kcal": int(m.group("kcal")),
                "protein": num(float(m.group("protein"))),
                "carbs": num(float(m.group("carbs"))),
                "fat": num(float(m.group("fat"))),
                "fibre": num(float(m.group("fibre"))),
                "ingredients": [i.strip() for i in ingredients.split("|") if i.strip()],
                # steps are newline-separated and prefixed "1. ", "2. " ...
                "steps": [
                    re.sub(r"^\d+\.\s*", "", s).strip()
                    for s in steps_raw.split("\n")
                    if s.strip()
                ],
                "chefsNote": note or None,
            }
        )
    return recipes


# --- Shopping & Meal Prep --------------------------------------------------
def extract_shopping(wb):
    ws = wb["Shopping & Meal Prep"]
    items = []
    for r in range(6, 34):
        item = cell(ws, r, 7)
        if not item:
            continue
        items.append(
            {
                "category": cell(ws, r, 6),
                "item": item,
                "qty": cell(ws, r, 8),
                "estCostRm": cell(ws, r, 9),
                "vendor": cell(ws, r, 10),
                "priority": cell(ws, r, 11),
            }
        )
    return items


def extract_vendors(wb):
    ws = wb["Shopping & Meal Prep"]
    out = []
    for r in range(6, 13):
        name = cell(ws, r, 1)
        if not name:
            continue
        out.append(
            {
                "name": name,
                "hours": cell(ws, r, 2),
                "location": cell(ws, r, 3),
                "strengths": cell(ws, r, 4),
            }
        )
    return out


def extract_prep(wb):
    ws = wb["Shopping & Meal Prep"]
    tasks = []
    for r in range(17, 25):
        block = cell(ws, r, 1)
        if not block:
            continue
        tasks.append(
            {
                "timeBlock": block,
                "task": cell(ws, r, 2),
                "duration": cell(ws, r, 3),
                "storage": cell(ws, r, 4),
            }
        )
    storage = []
    for r in range(28, 36):
        food = cell(ws, r, 1)
        if not food:
            continue
        storage.append(
            {
                "food": food,
                "fridge": cell(ws, r, 2),
                "freezer": cell(ws, r, 3),
                "reheat": cell(ws, r, 4),
            }
        )
    budget = []
    for r in range(36, 43):
        cat = cell(ws, r, 6)
        if not cat:
            continue
        budget.append(
            {"category": cat, "weeklyCostRm": cell(ws, r, 7), "share": cell(ws, r, 8)}
        )
    return {"tasks": tasks, "storage": storage, "budget": budget}



# --- Supplement & Hydration ------------------------------------------------
def extract_supplements(wb):
    ws = wb["Supplement & Hydration"]

    supplements = []
    for r in range(6, 15):
        name = cell(ws, r, 1)
        if not name:
            continue
        supplements.append(
            {
                "name": name,
                "dose": cell(ws, r, 2),
                "timing": cell(ws, r, 3),
                "purpose": cell(ws, r, 4),
                "foodAlternative": cell(ws, r, 5),
            }
        )

    hydration = []
    for r in range(6, 15):
        time = cell(ws, r, 6)
        if not time:
            continue
        note = cell(ws, r, 10)
        hydration.append(
            {
                "time": time,
                "beverage": cell(ws, r, 7),
                # The last row is a range like "500-1000"; keep it as text.
                "volumeMl": cell(ws, r, 8),
                "notes": None if note in (None, "\u2014") else note,
            }
        )

    micronutrients = []
    for r in range(18, 30):
        nutrient = cell(ws, r, 1)
        if not nutrient:
            continue
        micronutrients.append(
            {
                "nutrient": nutrient,
                "target": cell(ws, r, 2),
                "sources": cell(ws, r, 3),
            }
        )

    caffeine = []
    for r in range(18, 24):
        beverage = cell(ws, r, 6)
        if not beverage:
            continue
        caffeine.append(
            {
                "beverage": beverage,
                "serving": cell(ws, r, 7),
                "caffeineMg": cell(ws, r, 8),
                "max": cell(ws, r, 9),
            }
        )

    return {
        "supplements": supplements,
        "hydration": hydration,
        "micronutrients": micronutrients,
        "caffeine": caffeine,
        "caffeineCutoff": cell(ws, 25, 6),
        "intro": cell(ws, 2, 1),
    }


# --- Dashboard defaults + Methodology --------------------------------------
def extract_defaults(wb):
    ws = wb["Dashboard"]
    targets = {}
    keys = {15: "kcal", 16: "protein", 17: "carbs", 18: "fat", 19: "fibre", 20: "waterMl"}
    for row, key in keys.items():
        targets[key] = num(cell(ws, row, 2))
        targets[f"{key}Range"] = cell(ws, row, 3)
        targets[f"{key}Note"] = cell(ws, row, 4)
    principles = [cell(ws, r, 1) for r in range(24, 32) if cell(ws, r, 1)]
    return {
        "startWeightKg": num(cell(ws, 6, 2)),
        "goalWeightKg": num(cell(ws, 6, 4)),
        "programmeWeeks": 12,
        "targets": targets,
        "principles": principles,
    }


def extract_methodology(wb):
    ws = wb["Methodology & References"]
    grab = lambda lo, hi: [cell(ws, r, 1) for r in range(lo, hi) if cell(ws, r, 1)]
    return {
        "methodology": grab(4, 19),
        "references": grab(21, 33),
        "disclaimer": grab(36, 48),
    }


def main():
    if not WORKBOOK.exists():
        sys.exit(f"Missing workbook at {WORKBOOK}")
    wb = openpyxl.load_workbook(WORKBOOK, data_only=True)
    OUT.mkdir(exist_ok=True)

    prep = extract_prep(wb)
    datasets = {
        "foods": extract_foods(wb),
        "recipes": extract_recipes(wb),
        "shopping": extract_shopping(wb),
        "vendors": extract_vendors(wb),
        "prep": prep,
        "defaults": extract_defaults(wb),
        "methodology": extract_methodology(wb),
        "supplements": extract_supplements(wb),
    }

    for name, data in datasets.items():
        path = OUT / f"{name}.json"
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        size = len(data) if isinstance(data, list) else len(data.keys())
        print(f"  seed/{name}.json  ({size} {'rows' if isinstance(data, list) else 'keys'})")

    # Integrity assertions — these numbers come from the workbook itself.
    assert len(datasets["foods"]) == 69, f"expected 69 foods, got {len(datasets['foods'])}"
    assert len(datasets["recipes"]) == 7, f"expected 7 recipes, got {len(datasets['recipes'])}"
    assert len(datasets["vendors"]) == 7, f"expected 7 vendors, got {len(datasets['vendors'])}"
    assert all(f["kcal"] is not None for f in datasets["foods"]), "a food is missing kcal"
    assert all(r["steps"] for r in datasets["recipes"]), "a recipe is missing steps"
    supp = datasets["supplements"]
    assert len(supp["supplements"]) == 9, f"expected 9 supplements, got {len(supp['supplements'])}"
    assert len(supp["micronutrients"]) == 12, (
        f"expected 12 micronutrients, got {len(supp['micronutrients'])}"
    )
    assert len(supp["hydration"]) == 9, f"expected 9 hydration rows, got {len(supp['hydration'])}"
    print("\nIntegrity checks passed.")


if __name__ == "__main__":
    main()
