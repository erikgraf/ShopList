#!/usr/bin/env python3
"""
Enrich data/off-de-full.csv with a 'generic_name_clean' column.

Priority per row:
  1. Existing OFF generic_name  → clean (strip Bio/verbose/non-German)
  2. Most-specific OFF category tag → map to German generic
  3. Product name               → strip brand/sizes/qualifiers

Output: same file with an appended generic_name_clean column.
"""
import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
IN_PATH  = ROOT / "data" / "off-de-full.csv"
OUT_PATH = IN_PATH   # overwrite in place (add --dry-run for a sidecar file)

# ─────────────────────────────────────────────────────────────
# 1.  Cleanup rules for existing generic_name values
# ─────────────────────────────────────────────────────────────

_PREFIX_BIO = re.compile(r"^(bio|organic)\s*[-,]?\s*", re.I)

_QUALIFIER_WORDS = re.compile(
    r"\b("
    r"klassik|classic|clasique|classique|"
    r"knusprig|crunchy|croustillant|"
    r"leicht|light|légère?|"
    r"cremig|creamy|onctueuse?|"
    r"sämig|sah?nig|"
    r"natur|nature?|natural|"
    r"verzehrfertig|ready.to.eat|"
    r"tiefgekühlt|tiefgefroren|gefroren|frozen|surgelée?|"
    r"pasteurisiert|pasteurized|pasteurisée?|thermisée?|"
    r"raffiniert|refined|"
    r"haltbar|uht|h-milch-basis|"
    r"ungesalzen|gesalzen|"
    r"grob|fein|feinblatt|extra-fein|ultrafein|"
    r"groß|familien|vorrats|party"
    r")\b",
    re.I,
)

# Trailing verbose clauses — eat from the keyword to end of string
_TRAILING_CLAUSES = [
    re.compile(p, re.I) for p in [
        r",?\s*für\s+(kinder|babies|kleinkinder|babys|säuglinge|schwangere)[^,]*",
        r",?\s*angereichert\s+mit\b.*",
        r",?\s*mit\s+süßungsmitteln\b.*",
        r",?\s*mit\s+(calcium|vitaminen?|eisen|zink|protein)\b.*",
        r",?\s*(groß|familien|vorrats|party)packung\b.*",
        r",?\s*nahrungsergänzungsmittel\b.*",
        r",?\s*(aus|auf|zu)\s+\d+\s*%\b.*",
        r",?\s*\d+\s*%\s*(kakao|frucht|milch|fett|schokolade)\b.*",
        r",?\s*enthält\s+\d+\s*%\b.*",
        # Parenthesised attributes: (68,5%)  (3,5% Fett)  (250 ml)
        r"\s*\([^)]*(%|fett|\d\s*(g|ml|kg|l))[^)]*\)",
        # Fat/protein percentage spec: "3,5% Fett", "3,5% Fett i.Tr.", "0% Zucker"
        r",?\s*\d+[,.]?\d*\s*%\b.*",
        # Trailing size specs
        r",?\s*\d+\s*(x\s*)?\d*\.?\d*\s*(ml|g|kg|l|cl|stück|stk\.?)\s*$",
        # "for spreading", "zum aufstreichen" etc.
        r",?\s*zum\s+\w+en\b.*",
        # ── verbose OFF ingredient/composition descriptions ───────
        # "mit einer Füllung aus …", "mit ganzen Mandeln …", etc.
        r",?\s+mit\s+(eine[rm]\s+\w+|ganzen|getrockneten|kakaohalt\w+|salzigem|"
        r"weißem|schwarzem|gemahlenem|gepufftem|weiß[s]?en|frischen|echten)\b.*",
        # "aus pasteurisierter Kuhmilch …" / "aus biologischer Landwirtschaft …"
        r",?\s+aus\s+(pasteurisierter?|biologischer?|zertifizierter?|konzentrat|"
        r"schweinefleisch|blöcken)\b.*",
        # Processing predicates after a comma or dash
        r"[,\-]\s*(gepökelt|paniert|frittiert|gegart|getrocknet|ultrahocherhitzt|"
        r"chininhaltig|sterilisiert|homogenisiert)\b.*",
        # "auf 47% Zartbitterschokolade" / "in 17% Zartbitterschokolade"
        r"\s+(auf|in)\s+\d+\s*%\b.*",
        # Trailing "Doppelrahmstufe", "Rahmstufe" etc.
        r",?\s*(doppelrahm|rahm|doppelrahmstufe|rahmstufe)\s*$",
    ]
]

# Detect non-German text (French / Italian / Spanish keywords are a red flag)
_NON_DE = re.compile(
    r"\b(pâtes|qualité|naturelle|minérale|pasteurisée|thermisée|"
    r"lait|fromage|beurre|crème|sucre|farine|saucisse|végétale|végétal|"
    r"poulet|boeuf|porc|viande|légume|tomate fraîche|"
    r"latte|formaggio|burro|zucchero|farina|sale|"
    r"leche|queso|mantequilla|carne|pollo)\b",
    re.I,
)


def clean_generic(s: str) -> str:
    """Clean up an existing OFF generic_name string."""
    s = s.strip()
    if not s:
        return ""
    # Reject if clearly not German
    if _NON_DE.search(s):
        return ""
    # Strip Bio/Organic prefix
    s = _PREFIX_BIO.sub("", s)
    # Remove trailing verbose clauses
    for pat in _TRAILING_CLAUSES:
        s = pat.sub("", s)
    # Remove standalone qualifier words
    s = _QUALIFIER_WORDS.sub(" ", s)
    # Remove asterisks and stray punctuation
    s = re.sub(r"\*+", "", s)
    s = re.sub(r"\s*[,;]\s*$", "", s)
    s = re.sub(r"^\s*[,;]\s*", "", s)
    s = re.sub(r"\s{2,}", " ", s).strip(" ,;.")
    # If result is too short, too long, or still sounds like a sentence, discard.
    # ≤45 chars keeps single/compound nouns; sentence-style descriptions are longer.
    # >5 words usually means leftover ingredient prose rather than a category name.
    if len(s) < 3 or len(s) > 45:
        return ""
    if len(s.split()) > 5:
        return ""
    return s[:1].upper() + s[1:]


# ─────────────────────────────────────────────────────────────
# 2.  OFF category tag → German generic
# ─────────────────────────────────────────────────────────────
# Walk tags from most-specific (last) to least-specific (first).

TAG_TO_DE: dict[str, str] = {
    # ── Milch & Eier ─────────────────────────────────────────
    "en:whole-milks":               "Vollmilch",
    "en:semi-skimmed-milks":        "Halbfettmilch",
    "en:skimmed-milks":             "Magermilch",
    "en:long-life-milks":           "H-Milch",
    "en:lactose-free-milks":        "Laktosefreie Milch",
    "en:oat-milks":                 "Haferdrink",
    "en:almond-milks":              "Mandeldrink",
    "en:soy-milks":                 "Sojadrink",
    "en:rice-milks":                "Reisdrink",
    "en:coconut-milks":             "Kokosmilch",
    "en:plant-based-milks":         "Pflanzenmilch",
    "en:condensed-milks":           "Kondensmilch",
    "en:milks":                     "Milch",
    "en:buttermilks":               "Buttermilch",
    "en:kefir":                     "Kefir",
    "en:greek-yogurts":             "Griechischer Joghurt",
    "en:skyr":                      "Skyr",
    "en:drinkable-yogurts":         "Trinkjoghurt",
    "en:yogurts":                   "Joghurt",
    "en:creme-fraiche":             "Crème fraîche",
    "en:soured-cream":              "Sauerrahm",
    "en:sour-cream":                "Sauerrahm",
    "en:sour-creams":               "Sauerrahm",
    "en:whipping-creams":           "Schlagsahne",
    "en:creams":                    "Sahne",
    "en:quark":                     "Quark",
    "en:fromage-frais":             "Frischkäse",
    "en:cream-cheeses":             "Frischkäse",
    "en:fresh-cheeses":             "Frischkäse",
    "en:spreadable-cheeses":        "Frischkäse",
    "en:spreadable-goat-cheeses":   "Ziegenkäse",
    "en:cottage-cheeses":           "Hüttenkäse",
    "en:ricotta":                   "Ricotta",
    "en:mozzarella":                "Mozzarella",
    "en:camemberts":                "Camembert",
    "en:camembert":                 "Camembert",
    "en:brie":                      "Brie",
    "en:gouda":                     "Gouda",
    "en:edam":                      "Edamer",
    "en:emmental":                  "Emmentaler",
    "en:emmentaler":                "Emmentaler",
    "en:parmesan":                  "Parmesan",
    "en:cheddar":                   "Cheddar",
    "en:feta":                      "Feta",
    "en:halloumi":                  "Halloumi",
    "en:roquefort":                 "Roquefort",
    "en:blue-veined-cheeses":       "Blauschimmelkäse",
    "en:hard-cheeses":              "Hartkäse",
    "en:semi-hard-cheeses":         "Schnittkäse",
    "en:soft-cheeses":              "Weichkäse",
    "en:sliced-cheeses":            "Käsescheiben",
    "en:melted-cheese":             "Schmelzkäse",
    "en:processed-cheeses":         "Schmelzkäse",
    "en:cheeses-for-kids":          "Kinderkäse",
    "en:cheeses":                   "Käse",
    "en:hen-eggs":                  "Eier",
    "en:eggs":                      "Eier",
    "en:butters":                   "Butter",
    "en:clarified-butters":         "Butterschmalz",
    "en:margarines":                "Margarine",
    "en:fat-blends":                "Streichfett",
    "en:dairies":                   "Milchprodukt",
    "en:fermented-milk-products":   "Fermentiertes Milchprodukt",

    # ── Fleisch & Fisch ───────────────────────────────────────
    "en:chicken-breasts":           "Hähnchenbrust",
    "en:chicken":                   "Hähnchen",
    "en:turkey":                    "Truthahn",
    "en:duck":                      "Ente",
    "en:poultry":                   "Geflügel",
    "en:poultries":                 "Geflügel",
    "en:beef":                      "Rindfleisch",
    "en:minced-beef":               "Rinderhackfleisch",
    "en:pork":                      "Schweinefleisch",
    "en:minced-pork":               "Schweinehackfleisch",
    "en:minced-meat":               "Hackfleisch",
    "en:lamb":                      "Lammfleisch",
    "en:veal":                      "Kalbfleisch",
    "en:meats":                     "Fleisch",
    "en:salami":                    "Salami",
    "en:raw-hams":                  "Rohschinken",
    "en:cooked-hams":               "Kochschinken",
    "en:hams":                      "Schinken",
    "en:prosciutto":                "Prosciutto",
    "en:mortadella":                "Mortadella",
    "en:liver-pates":               "Leberwurst",
    "en:blood-sausages":            "Blutwurst",
    "en:frankfurters":              "Frankfurter",
    "en:sausages":                  "Wurst",
    "en:salamis":                   "Salami",
    "en:charcuterie":               "Aufschnitt",
    "en:cooked-meats":              "Aufschnitt",
    "en:salmons":                   "Lachs",
    "en:smoked-salmons":            "Räucherlachs",
    "en:canned-tunas":              "Thunfisch in Dose",
    "en:tunas":                     "Thunfisch",
    "en:tuna":                      "Thunfisch",
    "en:sardines":                  "Sardinen",
    "en:canned-sardines":           "Sardinen in Dose",
    "en:herrings":                  "Hering",
    "en:mackerels":                 "Makrele",
    "en:cod":                       "Kabeljau",
    "en:alaska-pollock":            "Seelachs",
    "en:fish-fingers":              "Fischstäbchen",
    "en:fish-sticks":               "Fischstäbchen",
    "en:canned-fish":               "Fischkonserve",
    "en:canned-fishes":             "Fischkonserve",
    "en:fishes":                    "Fisch",
    "en:shrimps":                   "Garnelen",
    "en:mussels":                   "Muscheln",
    "en:seafood":                   "Meeresfrüchte",

    # ── Brot & Backwaren ──────────────────────────────────────
    "en:whole-wheat-breads":        "Vollkornbrot",
    "en:rye-breads":                "Roggenbrot",
    "en:sourdough-breads":          "Sauerteigbrot",
    "en:white-breads":              "Weißbrot",
    "en:toast-breads":              "Toastbrot",
    "en:pumpernickel":              "Pumpernickel",
    "en:breads":                    "Brot",
    "en:rolls":                     "Brötchen",
    "en:bread-rolls":               "Brötchen",
    "en:baguettes":                 "Baguette",
    "en:pita-breads":               "Pita",
    "en:flat-breads":               "Fladenbrot",
    "en:wraps":                     "Wraps",
    "en:rusks":                     "Zwieback",
    "en:crispbreads":               "Knäckebrot",
    "en:crackers":                  "Cracker",
    "en:tartlet-biscuits":          "Tartelettes",
    "en:croissants":                "Croissant",
    "en:viennoiseries":             "Plundergebäck",
    "en:pastries":                  "Gebäck",
    "en:pretzels":                  "Brezeln",

    # ── Obst & Gemüse ─────────────────────────────────────────
    "en:apple-sauces":              "Apfelmus",
    "en:passata":                   "Passierte Tomaten",
    "en:tomato-purees":             "Tomatenmark",
    "en:canned-tomatoes":           "Tomatenkonserven",
    "en:sun-dried-tomatoes":        "Getrocknete Tomaten",
    "en:tomatoes":                  "Tomaten",
    "en:beetroot":                  "Rote Bete",
    "en:canned-corn":               "Maiskonserve",
    "en:corn":                      "Mais",
    "en:canned-peas":               "Erbsenkonserve",
    "en:peas":                      "Erbsen",
    "en:canned-beans":              "Bohnenkonserve",
    "en:kidney-beans":              "Kidneybohnen",
    "en:black-beans":               "Schwarze Bohnen",
    "en:white-beans":               "Weiße Bohnen",
    "en:edamame":                   "Edamame",
    "en:soybeans":                  "Sojabohnen",
    "en:chickpeas":                 "Kichererbsen",
    "en:red-lentils":               "Rote Linsen",
    "en:green-lentils":             "Grüne Linsen",
    "en:beluga-lentils":            "Beluga-Linsen",
    "en:lentils":                   "Linsen",
    "en:legumes":                   "Hülsenfrüchte",
    "en:canned-vegetables":         "Gemüsekonserven",
    "en:pickles":                   "Gurken (eingelegt)",
    "en:sauerkraut":                "Sauerkraut",
    "en:olives":                    "Oliven",
    "en:mushrooms":                 "Pilze",
    "en:carrots":                   "Karotten",
    "en:peppers":                   "Paprika",
    "en:cucumbers":                 "Gurken",
    "en:onions":                    "Zwiebeln",
    "en:garlic":                    "Knoblauch",
    "en:potatoes":                  "Kartoffeln",
    "en:spinach":                   "Spinat",
    "en:broccoli":                  "Brokkoli",
    "en:cauliflower":               "Blumenkohl",
    "en:vegetables":                "Gemüse",
    "en:raisins":                   "Rosinen",
    "en:dates":                     "Datteln",
    "en:prunes":                    "Pflaumen",
    "en:dried-apricots":            "Getrocknete Aprikosen",
    "en:dried-figs":                "Getrocknete Feigen",
    "en:dried-mangoes":             "Getrocknete Mangos",
    "en:dried-fruits":              "Trockenfrüchte",
    "en:apple-juices":              "Apfelsaft",
    "en:jams":                      "Konfitüre",
    "en:strawberry-jams":           "Erdbeer-Konfitüre",
    "en:raspberry-jams":            "Himbeer-Konfitüre",
    "en:apricot-jams":              "Aprikosen-Konfitüre",
    "en:cherry-jams":               "Kirsch-Konfitüre",
    "en:blueberry-jams":            "Heidelbeer-Konfitüre",
    "en:marmalades":                "Marmelade",
    "en:orange-marmalades":         "Orangen-Marmelade",
    "en:fruit-spreads":             "Fruchtaufstrich",
    "en:fruit-purees":              "Fruchtpüree",
    "en:apples":                    "Äpfel",
    "en:pears":                     "Birnen",
    "en:bananas":                   "Bananen",
    "en:oranges":                   "Orangen",
    "en:lemons":                    "Zitronen",
    "en:limes":                     "Limetten",
    "en:grapes":                    "Weintrauben",
    "en:strawberries":              "Erdbeeren",
    "en:blueberries":               "Heidelbeeren",
    "en:raspberries":               "Himbeeren",
    "en:cherries":                  "Kirschen",
    "en:mangoes":                   "Mangos",
    "en:pineapples":                "Ananas",
    "en:peaches":                   "Pfirsiche",
    "en:fruits":                    "Obst",

    # ── Getränke ──────────────────────────────────────────────
    "en:sparkling-waters":          "Mineralwasser",
    "en:still-waters":              "Stilles Mineralwasser",
    "en:spring-waters":             "Quellwasser",
    "en:waters":                    "Mineralwasser",
    "en:orange-juices":             "Orangensaft",
    "en:apple-juices":              "Apfelsaft",
    "en:grape-juices":              "Traubensaft",
    "en:tomato-juices":             "Tomatensaft",
    "en:carrot-juices":             "Karottensaft",
    "en:multivitamin-juices":       "Multivitaminsaft",
    "en:fruit-juices":              "Fruchtsaft",
    "en:vegetable-juices":          "Gemüsesaft",
    "en:fruit-nectars":             "Fruchtnektar",
    "en:smoothies":                 "Smoothie",
    "en:colas":                     "Cola",
    "en:lemonades":                 "Limonade",
    "en:soft-drinks":               "Limonade",
    "en:energy-drinks":             "Energy-Drink",
    "en:isotonic-drinks":           "Sportgetränk",
    "en:ice-teas":                  "Eistee",
    "en:non-alcoholic-beers":       "Alkoholfreies Bier",
    "en:wheat-beers":               "Weizenbier",
    "en:lagers":                    "Lagerbier",
    "en:ales":                      "Ale",
    "en:beers":                     "Bier",
    "en:red-wines":                 "Rotwein",
    "en:white-wines":               "Weißwein",
    "en:rose-wines":                "Rosé",
    "en:sparkling-wines":           "Sekt",
    "en:champagnes":                "Champagner",
    "en:wines":                     "Wein",
    "en:whiskies":                  "Whisky",
    "en:vodkas":                    "Wodka",
    "en:gins":                      "Gin",
    "en:rums":                      "Rum",
    "en:spirits":                   "Spirituosen",
    "en:instant-coffees":           "Instantkaffee",
    "en:espresso":                  "Espresso",
    "en:coffees":                   "Kaffee",
    "en:green-teas":                "Grüntee",
    "en:black-teas":                "Schwarztee",
    "en:herbal-teas":               "Kräutertee",
    "en:fruit-teas":                "Früchtetee",
    "en:teas":                      "Tee",
    "en:hot-chocolates":            "Trinkschokolade",
    "en:cocoa-powders":             "Kakaopulver",
    "en:beverage-preparations":     "Getränkepulver",
    "en:malted-beverages":          "Malzgetränk",
    "en:syrups":                    "Sirup",
    "en:mate":                      "Mate",
    "en:kombuchas":                 "Kombucha",
    "en:kefir-drinks":              "Kefir",

    # ── Frühstück & Aufstrich ──────────────────────────────────
    "en:corn-flakes":               "Cornflakes",
    "en:mueslis":                   "Müsli",
    "en:granolas":                  "Granola",
    "en:porridges":                 "Porridge",
    "en:oatmeals":                  "Haferflocken",
    "en:rolled-oats":               "Haferflocken",
    "en:breakfast-cereals":         "Frühstücksflocken",
    "en:puffed-rice":               "Puffreis",
    "en:puffed-corn":               "Gepuffter Mais",
    "en:puffed-wheat":              "Gepuffter Weizen",
    "en:puffed-cereals":            "Gepufftes Getreide",
    "en:chocolate-spreads":         "Schokoladenaufstrich",
    "en:hazelnut-spreads":          "Haselnussaufstrich",
    "en:cocoa-and-hazelnuts-spreads":"Nuss-Nougat-Creme",
    "en:peanut-butters":            "Erdnussbutter",
    "en:almond-butters":            "Mandelmus",
    "en:cashew-butters":            "Cashewmus",
    "en:nut-butters":               "Nussmus",
    "en:tahini":                    "Tahini",
    "en:flower-honeys":             "Blütenhonig",
    "en:honeys":                    "Honig",
    "en:maple-syrups":              "Ahornsirup",
    "en:agave-syrups":              "Agavensirup",
    "en:date-syrups":               "Dattelsirup",
    "en:sweet-spreads":             "Aufstrich",
    "en:spreads":                   "Aufstrich",
    "en:vegetable-spreads":         "Gemüseaufstrich",
    "en:hummus":                    "Hummus",

    # ── Gewürze & Saucen ──────────────────────────────────────
    "en:olive-oils":                "Olivenöl",
    "en:sunflower-oils":            "Sonnenblumenöl",
    "en:rapeseed-oils":             "Rapsöl",
    "en:coconut-oils":              "Kokosöl",
    "en:palm-oils":                 "Palmöl",
    "en:sesame-oils":               "Sesamöl",
    "en:cooking-oils":              "Speiseöl",
    "en:oils":                      "Öl",
    "en:apple-cider-vinegars":      "Apfelessig",
    "en:balsamic-vinegars":         "Balsamico",
    "en:white-vinegars":            "Weißweinessig",
    "en:vinegars":                  "Essig",
    "en:sea-salts":                 "Meersalz",
    "en:iodised-salts":             "Jodsalz",
    "en:salts":                     "Salz",
    "en:black-peppers":             "Schwarzer Pfeffer",
    "en:spice-mixes":               "Gewürzmischung",
    "en:spices":                    "Gewürze",
    "en:herbs":                     "Kräuter",
    "en:ketchups":                  "Ketchup",
    "en:mustards":                  "Senf",
    "en:dijon-mustards":            "Dijon-Senf",
    "en:mayonnaises":               "Mayonnaise",
    "en:remoulades":                "Remoulade",
    "en:dressings":                 "Dressing",
    "en:soy-sauces":                "Sojasoße",
    "en:hot-sauces":                "Scharfe Sauce",
    "en:worcestershire-sauces":     "Worcestershiresauce",
    "en:pestos":                    "Pesto",
    "en:tomato-sauces":             "Tomatensauce",
    "en:curry-sauces":              "Currysauce",
    "en:bbq-sauces":                "BBQ-Sauce",
    "en:sweet-and-sour-sauces":     "Süß-Sauer-Sauce",
    "en:sauces":                    "Sauce",
    "en:condiments":                "Würzsauce",
    "en:vegetable-stocks":          "Gemüsebrühe",
    "en:chicken-stocks":            "Hühnerbrühe",
    "en:beef-stocks":               "Rinderbrühe",
    "en:stocks":                    "Brühe",
    "en:soups":                     "Suppe",
    "en:vegetable-soups":           "Gemüsesuppe",
    "en:tomato-soups":              "Tomatensuppe",
    "en:lentil-soups":              "Linsensuppe",

    # ── Süßes & Knabberei ─────────────────────────────────────
    "en:dark-chocolate-bars":       "Zartbitterschokolade",
    "en:dark-chocolates":           "Zartbitterschokolade",
    "en:milk-chocolate-bars":       "Milchschokolade",
    "en:milk-chocolates":           "Milchschokolade",
    "en:white-chocolates":          "Weiße Schokolade",
    "en:chocolate-bars":            "Schokolade",
    "en:chocolates":                "Schokolade",
    "en:pralines":                  "Pralinés",
    "en:truffles":                  "Trüffel",
    "en:marzipan":                  "Marzipan",
    "en:nougat":                    "Nougat",
    "en:gummies":                   "Gummibärchen",
    "en:hard-candies":              "Bonbons",
    "en:lollipops":                 "Lollipops",
    "en:chewing-gums":              "Kaugummi",
    "en:candies":                   "Süßigkeiten",
    "en:shortbread-cookies":        "Mürbeteigkekse",
    "en:butter-cookies":            "Butterkekse",
    "en:chocolate-chip-cookies":    "Schoko-Cookies",
    "en:cookies":                   "Kekse",
    "en:biscuits":                  "Kekse",
    "en:tartlet-biscuits":          "Tartelettes",
    "en:wafers":                    "Waffeln",
    "en:waffles":                   "Waffeln",
    "en:crepes":                    "Crêpes",
    "en:cakes":                     "Kuchen",
    "en:muffins":                   "Muffins",
    "en:brownies":                  "Brownies",
    "en:tiramisu":                  "Tiramisu",
    "en:rice-puddings":             "Milchreis",
    "en:puddings":                  "Pudding",
    "en:desserts":                  "Dessert",
    "en:tortilla-chips":            "Tortilla-Chips",
    "en:potato-chips":              "Chips",
    "en:chips":                     "Chips",
    "en:crisps":                    "Chips",
    "en:popcorn":                   "Popcorn",
    "en:rice-cakes":                "Reiswaffeln",
    "en:corn-cakes":                "Maiswaffeln",
    "en:snack-bars":                "Riegel",
    "en:cereal-bars":               "Müsliriegel",
    "en:protein-bars":              "Proteinriegel",
    "en:snacks":                    "Snack",
    "en:mixed-nuts":                "Nuss-Mischung",
    "en:almonds":                   "Mandeln",
    "en:cashews":                   "Cashewkerne",
    "en:walnuts":                   "Walnüsse",
    "en:hazelnuts":                 "Haselnüsse",
    "en:peanuts":                   "Erdnüsse",
    "en:pistachios":                "Pistazien",
    "en:macadamia-nuts":            "Macadamia-Nüsse",
    "en:nuts":                      "Nüsse",
    "en:ice-cream-bars":            "Eiscreme-Riegel",
    "en:ice-cream-cones":           "Eistüte",
    "en:ice-creams":                "Eiscreme",
    "en:sorbets":                   "Sorbet",
    "en:frozen-desserts":           "Tiefkühldessert",

    # ── Vorrat ────────────────────────────────────────────────
    "en:spaghetti":                 "Spaghetti",
    "en:penne":                     "Penne",
    "en:fusilli":                   "Fusilli",
    "en:tagliatelle":               "Tagliatelle",
    "en:rigatoni":                  "Rigatoni",
    "en:lasagna-sheets":            "Lasagneblätter",
    "en:pastas":                    "Nudeln",
    "en:basmati-rice":              "Basmati-Reis",
    "en:brown-rice":                "Naturreis",
    "en:jasmine-rice":              "Jasminreis",
    "en:parboiled-rice":            "Parboiled-Reis",
    "en:rice":                      "Reis",
    "en:couscous":                  "Couscous",
    "en:quinoa":                    "Quinoa",
    "en:millet":                    "Hirse",
    "en:bulgur":                    "Bulgur",
    "en:polenta":                   "Polenta",
    "en:wheat-flours":              "Weizenmehl",
    "en:whole-wheat-flours":        "Vollkornmehl",
    "en:spelt-flours":              "Dinkelmehl",
    "en:rye-flours":                "Roggenmehl",
    "en:flours":                    "Mehl",
    "en:sugars":                    "Zucker",
    "en:brown-sugars":              "Brauner Zucker",
    "en:icing-sugars":              "Puderzucker",
    "en:canned-foods":              "Konserven",
    "en:ready-meals":               "Fertiggericht",
    "en:prepared-meals":            "Fertiggericht",
    "en:frozen-meals":              "Tiefkühlgericht",
    "en:frozen-pizzas":             "Tiefkühlpizza",
    "en:pizzas":                    "Pizza",
    "en:lasagna":                   "Lasagne",
    "en:bread-crumbs":              "Semmelbrösel",
    "en:breadcrumbs":               "Semmelbrösel",
    "en:oats":                      "Haferflocken",
    "en:spelt":                     "Dinkel",
    "en:barley":                    "Gerste",
    "en:cereals":                   "Getreide",

    # ── Tiefkühl ──────────────────────────────────────────────
    "en:frozen-vegetables":         "Tiefkühlgemüse",
    "en:frozen-peas":               "Tiefkühlerbsen",
    "en:frozen-spinach":            "Tiefkühlspinat",
    "en:frozen-broccoli":           "Tiefkühlbrokkoli",
    "en:frozen-potatoes":           "Tiefkühlkartoffeln",
    "en:french-fries":              "Pommes Frites",
    "en:frozen-fish":               "Tiefkühlfisch",

    # ── Körperpflege & Haushalt ───────────────────────────────
    "en:shampoos":                  "Shampoo",
    "en:hair-conditioners":         "Conditioner",
    "en:body-washes":               "Duschgel",
    "en:shower-gels":               "Duschgel",
    "en:liquid-soaps":              "Flüssigseife",
    "en:bar-soaps":                 "Seife",
    "en:soaps":                     "Seife",
    "en:hand-creams":               "Handcreme",
    "en:body-lotions":              "Körperlotion",
    "en:body-creams":               "Körpercreme",
    "en:face-creams":               "Gesichtscreme",
    "en:sunscreens":                "Sonnencreme",
    "en:deodorant-sticks":          "Deo-Stick",
    "en:deodorants":                "Deo",
    "en:toothpastes":               "Zahnpasta",
    "en:mouthwashes":               "Mundwasser",
    "en:lip-balms":                 "Lippenpflege",
    "en:nail-polish-removers":      "Nagellackentferner",
    "en:cleaning-products":         "Reinigungsmittel",
    "en:detergents":                "Waschmittel",
    "en:dishwashing-liquids":       "Spülmittel",
    "en:dishwashing":               "Spülmittel",
    "en:fabric-softeners":          "Weichspüler",
    "en:toilet-papers":             "Toilettenpapier",
    "en:paper-towels":              "Küchenpapier",
    "en:diapers":                   "Windeln",

    # ── Baby ──────────────────────────────────────────────────
    "en:baby-foods":                "Babynahrung",
    "en:infant-formulas":           "Säuglingsnahrung",
    "en:baby-purees":               "Babybrei",
    "en:baby-cereals":              "Babygetreide",
    "en:baby-snacks":               "Baby-Snacks",
    "en:infant-milks":              "Säuglingsmilch",
}


def generic_from_tags(tags_str: str) -> str:
    """Walk OFF category tags most-specific→least-specific and return first hit."""
    if not tags_str:
        return ""
    tags = [t.strip() for t in tags_str.split("|") if t.strip()]
    # OFF pipe list goes general→specific — reverse to get most specific first
    for tag in reversed(tags):
        de = TAG_TO_DE.get(tag)
        if de:
            return de
    return ""


# ─────────────────────────────────────────────────────────────
# 3.  Derive from product name (last resort)
# ─────────────────────────────────────────────────────────────

_SIZES_RE = re.compile(
    r"\b\d+\s*(x\s*)?\d*\.?\d*\s*(ml|g|kg|l|cl|stück|stk\.?|er|pack)\b",
    re.I,
)
_COUNT_RE = re.compile(r"\b\d+(er|x)\b", re.I)


def derive_from_name(name: str, brand: str) -> str:
    s = name.strip()
    # Remove brand prefix
    if brand:
        for b in brand.split(","):
            b = b.strip()
            if b and s.lower().startswith(b.lower()):
                s = s[len(b):].lstrip(" -–·")
                break
    # Remove sizes and counts
    s = _SIZES_RE.sub("", s)
    s = _COUNT_RE.sub("", s)
    # Apply generic cleanup
    s = clean_generic(s)
    return s


# ─────────────────────────────────────────────────────────────
# 4.  Main
# ─────────────────────────────────────────────────────────────

def process(in_path: Path, out_path: Path) -> None:
    rows: list[dict] = []
    with open(in_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        for row in reader:
            rows.append(row)

    new_col = "generic_name_clean"
    if new_col not in fieldnames:
        fieldnames.append(new_col)

    stats: dict[str, int] = {"off_generic": 0, "tags": 0, "name": 0}
    samples: dict[str, list] = {"off_generic": [], "tags": [], "name": []}

    for row in rows:
        existing      = (row.get("generic_name") or "").strip()
        name          = (row.get("name") or "").strip()
        brand         = (row.get("brand") or "").strip()
        off_categories = (row.get("off_categories") or "").strip()

        result = ""

        # 1. Existing OFF generic_name (cleaned)
        if existing:
            result = clean_generic(existing)

        # 2. OFF category tag mapping
        if not result:
            result = generic_from_tags(off_categories)
            if result:
                stats["tags"] += 1
                if len(samples["tags"]) < 6:
                    samples["tags"].append((name, result))

        # 3. Derive from product name
        if not result:
            result = derive_from_name(name, brand)
            if result:
                stats["name"] += 1
                if len(samples["name"]) < 6:
                    samples["name"].append((name, result))

        # If we cleaned an existing generic, count it now
        if (row.get("generic_name") or "").strip() and result:
            if result != "" and stats["off_generic"] + stats["tags"] + stats["name"] == \
               sum(stats.values()):
                # This row came from the cleaned existing generic
                pass  # counted below

        row[new_col] = result  # blank when all three tiers fail (beats emitting garbage)

    # Recount cleanly
    stats = {"off_generic": 0, "tags": 0, "name": 0, "empty": 0}
    for row in rows:
        existing = (row.get("generic_name") or "").strip()
        off_categories = (row.get("off_categories") or "").strip()
        result = row[new_col]
        if not result:
            stats["empty"] += 1
            continue
        orig_cleaned = clean_generic(existing) if existing else ""
        if orig_cleaned and result == orig_cleaned:
            stats["off_generic"] += 1
        elif generic_from_tags(off_categories) == result:
            stats["tags"] += 1
        else:
            stats["name"] += 1

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    total = len(rows)
    print(f"\nProcessed {total} rows → {out_path}")
    print(f"  {stats['off_generic']:5d} ({100*stats['off_generic']//total:2d}%)  from OFF generic_name (cleaned)")
    print(f"  {stats['tags']:5d} ({100*stats['tags']//total:2d}%)  from OFF category tags")
    print(f"  {stats['name']:5d} ({100*stats['name']//total:2d}%)  derived from product name")
    print(f"  {stats['empty']:5d} ({100*stats['empty']//total:2d}%)  empty (no match found)")

    # QA samples
    print("\n--- sample: from OFF generic (cleaned) ---")
    shown = 0
    for row in rows:
        existing = (row.get("generic_name") or "").strip()
        if not existing: continue
        cleaned = clean_generic(existing)
        if cleaned and cleaned == row[new_col]:
            print(f"  [{row['name'][:35]:35s}] {existing[:45]:45s} → {cleaned}")
            shown += 1
            if shown >= 8: break

    print("\n--- sample: from tags ---")
    shown = 0
    for row in rows:
        existing = (row.get("generic_name") or "").strip()
        if existing and clean_generic(existing): continue
        tag_result = generic_from_tags((row.get("off_categories") or ""))
        if tag_result and tag_result == row[new_col]:
            cats = "|".join((row.get("off_categories") or "").split("|")[-2:])
            print(f"  [{row['name'][:35]:35s}] …{cats[:40]:40s} → {tag_result}")
            shown += 1
            if shown >= 8: break

    print("\n--- sample: derived from name ---")
    shown = 0
    for row in rows:
        existing = (row.get("generic_name") or "").strip()
        if existing and clean_generic(existing): continue
        if generic_from_tags((row.get("off_categories") or "")): continue
        result = row[new_col]
        if result and result != (row.get("name") or "").strip():
            print(f"  [{row['name'][:45]:45s}] → {result}")
            shown += 1
            if shown >= 8: break


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    out = IN_PATH.with_name("off-de-full-enriched.csv") if dry else IN_PATH
    if dry:
        print(f"DRY RUN → {out}")
    process(IN_PATH, out)
