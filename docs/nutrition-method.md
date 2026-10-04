# RePlate Nutrition v1

This is a general-food estimate, not an official Nutri-Score, Yuka score, medical assessment, or nutritional requirement. The original nutrient-profile threshold tables inform the nutrient calculation; RePlate's /100 transformation is its own display index. Fruit/vegetable bonuses and category-specific beverage, cheese, oil, and infant-food rules are not implemented. Those categories should not be compared using this demo as a validated category score.

Six core facts are required: kcal, total sugar, saturated fat, sodium, fiber, and protein. Values normalize to 100 g (or 100 ml when supplied on that basis). Confirmed gram servings convert with value × 100 / serving grams. Per-serving display prefers supplied label values. Salt converts to sodium by dividing by 2.5. Sodium storage is grams; display is milligrams. Calories use label-style rounding only in serving display, never during scoring.

For each limiting nutrient, count strict exceedances of these per-100 thresholds:

| Nutrient | Thresholds |
|---|---|
| Energy, kJ | 335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350 |
| Total sugar, g | 4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45 |
| Saturated fat, g | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| Sodium, mg | 90, 180, 270, 360, 450, 540, 630, 720, 810, 900 |
| Fiber benefit, g | 0.9, 1.9, 2.8, 3.7, 4.7 |
| Protein benefit, g | 1.6, 3.2, 4.8, 6.4, 8 |

Net points = limiting points minus fiber benefit minus protein benefit. Protein benefit is withheld when limiting points ≥11. No assumed fruit/vegetable percentage earns points. Linearly interpolate the index through (net points, index): (-10,100), (0,80), (2,70), (10,50), (18,25), (40,0), and clamp to 0–100. Labels: ≥80 Excellent, ≥70 Good, ≥50 Moderate, ≥25 Poor, otherwise Very Poor.

Source: original general-food tables, Exhibit 1A of [Santé Publique France specifications](https://www.aesan.gob.es/AECOSAN/docs/documentos/Nutri_Score/Nutriscore_EN.pdf). These are original thresholds; RePlate does not claim the current official algorithm.

## Lookup and confirmation

Use curated exact-barcode manufacturer facts first where available. Otherwise use Open Food Facts; if core facts are missing or inconsistent, search USDA FoodData Central and accept only an exact normalized UPC match. USDA's public DEMO_KEY is rate limited; set USDA_API_KEY for more reliable use. Never substitute a similarly named USDA product.

The old Lay's UPC 028400090889 has conflicting database values. A current same-flavor manufacturer label for UPC 028400199636 can prefill confirmation, but it does not automatically become a verified exact-package record. The user must check the portion and nutrients. Exact current manufacturer fixtures are [Sour Cream & Onion](https://smartlabel.pepsico.info/028400199636-0031-en-US/index.html) and [Classic](https://smartlabel.pepsico.info/028400199148-0047-en-US/index.html), updated September 5, 2025. Manufacturer details can change. Classic sugar is <1 g; calculations use a conservative upper bound and preserve the less-than label.

Photo extraction uses macOS Vision on the local server. It does not infer missing values or automatically confirm OCR. Users inspect and confirm editable fields. Confirmed facts persist only in their household's saved scans and override subsequent lookups for that barcode. Photos are stored in a temporary directory only during OCR and deleted in a finally block. macOS is required for this OCR build; other deployment platforms need another OCR adapter. Compile with npm run build:ocr.

Consistency checks reject large kcal/kJ and macro-energy conflicts. Missing facts lead to label confirmation, never a fabricated score. Allergy conflicts override buying guidance; neither goals nor existing kitchen inventory alter nutritional quality.
