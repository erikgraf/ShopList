import type { Product } from './types';

/**
 * Curated German staples — drugstore items where Open Food Facts coverage is thin,
 * plus common branded products that users frequently type by brand name (Nutella,
 * Tempo, Haribo…). Items here always rank above Open Food Facts results in
 * suggestions and remain available offline / when Open Food Facts rate-limits us.
 */
export const CURATED_CATALOG: Product[] = [
  // Branded staples — searchable by brand name even without Open Food Facts
  { id: 'local:brand:nutella', name: 'Nutella', brand: 'Ferrero', category: 'fruehstueck-aufstrich', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:tempo', name: 'Tempo Taschentücher', brand: 'Tempo', category: 'koerperpflege', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:haribo', name: 'Haribo Goldbären', brand: 'Haribo', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:milka', name: 'Milka Schokolade', brand: 'Milka', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:rittersport', name: 'Ritter Sport', brand: 'Ritter Sport', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:lindt', name: 'Lindt Schokolade', brand: 'Lindt', category: 'suesses-knabberei', stores: ['rewe', 'edeka'] },
  { id: 'local:brand:kinder', name: 'Kinder Schokolade', brand: 'Ferrero', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:coca-cola', name: 'Coca-Cola', brand: 'Coca-Cola', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:fanta', name: 'Fanta', brand: 'Coca-Cola', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:sprite', name: 'Sprite', brand: 'Coca-Cola', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:redbull', name: 'Red Bull', brand: 'Red Bull', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:knorr', name: 'Knorr Fix', brand: 'Knorr', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:maggi', name: 'Maggi Würze', brand: 'Maggi', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:droetker', name: 'Dr. Oetker Backmischung', brand: 'Dr. Oetker', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:barilla', name: 'Barilla Nudeln', brand: 'Barilla', category: 'vorrat', stores: ['rewe', 'edeka'] },
  { id: 'local:brand:miracoli', name: 'Miracoli', brand: 'Mars', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:landliebe', name: 'Landliebe Joghurt', brand: 'Landliebe', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:mueller', name: 'Müller Milch', brand: 'Müller', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:activia', name: 'Activia', brand: 'Danone', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:persil', name: 'Persil Waschmittel', brand: 'Persil', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:ariel', name: 'Ariel Waschmittel', brand: 'Ariel', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:frosch', name: 'Frosch Reiniger', brand: 'Frosch', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka'] },
  { id: 'local:brand:pampers', name: 'Pampers', brand: 'Pampers', category: 'baby', stores: ['dm', 'rossmann'] },
  { id: 'local:brand:nivea', name: 'Nivea Creme', brand: 'Nivea', category: 'koerperpflege', stores: ['dm', 'rossmann', 'rewe', 'edeka'] },
  { id: 'local:brand:labello', name: 'Labello', brand: 'Nivea', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:brand:tampax', name: 'Tampax Tampons', brand: 'Tampax', category: 'koerperpflege', stores: ['dm', 'rossmann'] },


  // Körperpflege
  { id: 'local:zahnpasta', name: 'Zahnpasta', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:zahnbuerste', name: 'Zahnbürste', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:zahnseide', name: 'Zahnseide', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:mundwasser', name: 'Mundwasser', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:shampoo', name: 'Shampoo', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:spuelung', name: 'Haarspülung', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:duschgel', name: 'Duschgel', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:seife', name: 'Seife', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:deo', name: 'Deo', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:rasierer', name: 'Rasierer', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:rasierschaum', name: 'Rasierschaum', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:bodylotion', name: 'Bodylotion', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:handcreme', name: 'Handcreme', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:gesichtscreme', name: 'Gesichtscreme', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:sonnencreme', name: 'Sonnencreme', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:wattepads', name: 'Wattepads', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:wattestaebchen', name: 'Wattestäbchen', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:taschentuecher', name: 'Taschentücher', category: 'koerperpflege', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:damenbinden', name: 'Damenbinden', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:tampons', name: 'Tampons', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:kondome', name: 'Kondome', category: 'koerperpflege', stores: ['dm', 'rossmann'] },
  { id: 'local:pflaster', name: 'Pflaster', category: 'koerperpflege', stores: ['dm', 'rossmann'] },

  // Haushalt
  { id: 'local:waschmittel', name: 'Waschmittel', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:weichspueler', name: 'Weichspüler', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka'] },
  { id: 'local:spuelmittel', name: 'Spülmittel', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:spuelmaschinentabs', name: 'Spülmaschinentabs', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:klarspueler', name: 'Klarspüler', category: 'haushalt', stores: ['dm', 'rossmann'] },
  { id: 'local:regeneriersalz', name: 'Regeneriersalz', category: 'haushalt', stores: ['dm', 'rossmann'] },
  { id: 'local:allzweckreiniger', name: 'Allzweckreiniger', category: 'haushalt', stores: ['dm', 'rossmann'] },
  { id: 'local:badreiniger', name: 'Badreiniger', category: 'haushalt', stores: ['dm', 'rossmann'] },
  { id: 'local:wcreiniger', name: 'WC-Reiniger', category: 'haushalt', stores: ['dm', 'rossmann'] },
  { id: 'local:glasreiniger', name: 'Glasreiniger', category: 'haushalt', stores: ['dm', 'rossmann'] },
  { id: 'local:toilettenpapier', name: 'Toilettenpapier', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kuechenrolle', name: 'Küchenrolle', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:muellbeutel', name: 'Müllbeutel', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka'] },
  { id: 'local:gefrierbeutel', name: 'Gefrierbeutel', category: 'haushalt', stores: ['dm', 'rossmann', 'rewe', 'edeka'] },
  { id: 'local:alufolie', name: 'Alufolie', category: 'haushalt', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:frischhaltefolie', name: 'Frischhaltefolie', category: 'haushalt', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:backpapier', name: 'Backpapier', category: 'haushalt', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:schwaemme', name: 'Schwämme', category: 'haushalt', stores: ['dm', 'rossmann'] },
  { id: 'local:batterien', name: 'Batterien', category: 'haushalt', stores: ['dm', 'rossmann'] },
  { id: 'local:gluehbirne', name: 'Glühbirne', category: 'haushalt', stores: ['dm', 'rossmann'] },

  // Baby
  { id: 'local:windeln', name: 'Windeln', category: 'baby', stores: ['dm', 'rossmann'] },
  { id: 'local:feuchttuecher', name: 'Feuchttücher', category: 'baby', stores: ['dm', 'rossmann'] },
  { id: 'local:babynahrung', name: 'Babynahrung', category: 'baby', stores: ['dm', 'rossmann', 'rewe', 'edeka'] },

  // Obst & Gemüse
  { id: 'local:aepfel', name: 'Äpfel', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:bananen', name: 'Bananen', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tomaten', name: 'Tomaten', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:gurken', name: 'Gurken', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:salat', name: 'Salat', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:karotten', name: 'Karotten', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kartoffeln', name: 'Kartoffeln', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:zwiebeln', name: 'Zwiebeln', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:knoblauch', name: 'Knoblauch', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:paprika', name: 'Paprika', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:zitronen', name: 'Zitronen', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:avocado', name: 'Avocado', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:beeren', name: 'Beeren', category: 'obst-gemuese', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Milchprodukte
  { id: 'local:milch', name: 'Milch', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:vollmilch', name: 'Vollmilch', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:milch-fettarm', name: 'Milch fettarm', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:milch-laktosefrei', name: 'Milch laktosefrei', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:h-milch', name: 'H-Milch', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:hafermilch', name: 'Hafermilch', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sojamilch', name: 'Sojamilch', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mandelmilch', name: 'Mandelmilch', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:butter', name: 'Butter', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:margarine', name: 'Margarine', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:joghurt', name: 'Joghurt', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:naturjoghurt', name: 'Naturjoghurt', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:griechischer-joghurt', name: 'Griechischer Joghurt', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:griechischer-joghurt-laktosefrei', name: 'Griechischer Joghurt laktosefrei', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:quark', name: 'Quark', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:skyr', name: 'Skyr', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kaese', name: 'Käse', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:gouda', name: 'Gouda', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:emmentaler', name: 'Emmentaler', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:bergkaese', name: 'Bergkäse', category: 'milch-eier', stores: ['rewe', 'edeka'] },
  { id: 'local:camembert', name: 'Camembert', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brie', name: 'Brie', category: 'milch-eier', stores: ['rewe', 'edeka'] },
  { id: 'local:feta', name: 'Feta', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:huettenkaese', name: 'Hüttenkäse', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:schmelzkaese', name: 'Schmelzkäse', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:reibekaese', name: 'Reibekäse', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sahne', name: 'Sahne', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:schmand', name: 'Schmand', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:creme-fraiche', name: 'Crème fraîche', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:frischkaese', name: 'Frischkäse', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mozzarella', name: 'Mozzarella', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:parmesan', name: 'Parmesan', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:eier', name: 'Eier', category: 'milch-eier', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Brot
  { id: 'local:brot', name: 'Brot', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:vollkornbrot', name: 'Vollkornbrot', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:roggenbrot', name: 'Roggenbrot', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sauerteigbrot', name: 'Sauerteigbrot', category: 'brot-gebaeck', stores: ['rewe', 'edeka'] },
  { id: 'local:weissbrot', name: 'Weißbrot', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mehrkornbrot', name: 'Mehrkornbrot', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:pumpernickel', name: 'Pumpernickel', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:broetchen', name: 'Brötchen', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:vollkornbroetchen', name: 'Vollkornbrötchen', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:laugenbrezel', name: 'Laugenbrezel', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:croissant', name: 'Croissant', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:toast', name: 'Toastbrot', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:knaeckebrot', name: 'Knäckebrot', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:zwieback', name: 'Zwieback', category: 'brot-gebaeck', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Fleisch
  { id: 'local:haehnchen', name: 'Hähnchen', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:haehnchenbrust', name: 'Hähnchenbrust', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:haehnchenschenkel', name: 'Hähnchenschenkel', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:pute', name: 'Pute', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:rinderhack', name: 'Rinderhack', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:hackfleisch', name: 'Hackfleisch', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:schweinefleisch', name: 'Schweinefleisch', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:rindfleisch', name: 'Rindfleisch', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:steak', name: 'Steak', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:schnitzel', name: 'Schnitzel', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:schinken', name: 'Schinken', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kochschinken', name: 'Kochschinken', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:salami', name: 'Salami', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:wurst', name: 'Wurst', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:bratwurst', name: 'Bratwurst', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:wiener', name: 'Wiener Würstchen', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:leberwurst', name: 'Leberwurst', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mortadella', name: 'Mortadella', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:aufschnitt', name: 'Aufschnitt', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:speck', name: 'Speck', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:lachs', name: 'Lachs', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:raeucherlachs', name: 'Räucherlachs', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:thunfisch', name: 'Thunfisch', category: 'fleisch-fisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:forelle', name: 'Forelle', category: 'fleisch-fisch', stores: ['rewe', 'edeka'] },
  { id: 'local:garnelen', name: 'Garnelen', category: 'fleisch-fisch', stores: ['rewe', 'edeka'] },

  // Getränke
  { id: 'local:wasser', name: 'Wasser', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mineralwasser', name: 'Mineralwasser', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sprudelwasser', name: 'Sprudelwasser', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:apfelsaft', name: 'Apfelsaft', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:orangensaft', name: 'Orangensaft', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:multivitaminsaft', name: 'Multivitaminsaft', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:schorle', name: 'Schorle', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:limonade', name: 'Limonade', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kaffee', name: 'Kaffee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:espresso', name: 'Espresso', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:cappuccino', name: 'Cappuccino', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:milchkaffee', name: 'Milchkaffee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:filterkaffee', name: 'Filterkaffee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kaffeebohnen', name: 'Kaffeebohnen', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kaffeepads', name: 'Kaffeepads', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kaffeekapseln', name: 'Kaffeekapseln', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tee', name: 'Tee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:schwarztee', name: 'Schwarztee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:gruentee', name: 'Grüntee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kraeutertee', name: 'Kräutertee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:pfefferminztee', name: 'Pfefferminztee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kamillentee', name: 'Kamillentee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:fruechtetee', name: 'Früchtetee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:bier', name: 'Bier', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:weizenbier', name: 'Weizenbier', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:pils', name: 'Pils', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:wein', name: 'Wein', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:rotwein', name: 'Rotwein', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:weisswein', name: 'Weißwein', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sekt', name: 'Sekt', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:cola', name: 'Cola', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Trockenwaren
  { id: 'local:nudeln', name: 'Nudeln', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:spaghetti', name: 'Spaghetti', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:penne', name: 'Penne', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tagliatelle', name: 'Tagliatelle', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:fusilli', name: 'Fusilli', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:lasagne-platten', name: 'Lasagne-Platten', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:ravioli', name: 'Ravioli', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tortellini', name: 'Tortellini', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:reis', name: 'Reis', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:basmatireis', name: 'Basmatireis', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:risottoreis', name: 'Risottoreis', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:couscous', name: 'Couscous', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:bulgur', name: 'Bulgur', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:linsen', name: 'Linsen', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kichererbsen', name: 'Kichererbsen', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:bohnen-dose', name: 'Bohnen (Dose)', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tomaten-dose', name: 'Tomaten (Dose)', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mehl', name: 'Mehl', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:zucker', name: 'Zucker', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:backpulver', name: 'Backpulver', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:hefe', name: 'Hefe', category: 'vorrat', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:salz', name: 'Salz', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:pfeffer', name: 'Pfeffer', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:olivenoel', name: 'Olivenöl', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:rapsoel', name: 'Rapsöl', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sonnenblumenoel', name: 'Sonnenblumenöl', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sesamoel', name: 'Sesamöl', category: 'gewuerze-saucen', stores: ['rewe', 'edeka'] },
  { id: 'local:kokosoel', name: 'Kokosöl', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'dm', 'rossmann'] },
  { id: 'local:butterschmalz', name: 'Butterschmalz', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:essig', name: 'Essig', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:balsamico', name: 'Balsamico', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:haferflocken', name: 'Haferflocken', category: 'fruehstueck-aufstrich', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:muesli', name: 'Müsli', category: 'fruehstueck-aufstrich', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:cornflakes', name: 'Cornflakes', category: 'fruehstueck-aufstrich', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:honig', name: 'Honig', category: 'fruehstueck-aufstrich', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:marmelade', name: 'Marmelade', category: 'fruehstueck-aufstrich', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:nutella', name: 'Nuss-Nougat-Creme', category: 'fruehstueck-aufstrich', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tomatensauce', name: 'Tomatensauce', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:senf', name: 'Senf', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:ketchup', name: 'Ketchup', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mayo', name: 'Mayonnaise', category: 'gewuerze-saucen', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Tiefkühl
  { id: 'local:pizza', name: 'Pizza', category: 'tiefkuehl', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:eis', name: 'Eis', category: 'tiefkuehl', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tk-gemuese', name: 'TK-Gemüse', category: 'tiefkuehl', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:pommes', name: 'Pommes', category: 'tiefkuehl', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Süßes
  { id: 'local:schokolade', name: 'Schokolade', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:vollmilchschokolade', name: 'Vollmilchschokolade', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:dunkle-schokolade', name: 'Dunkle Schokolade', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:zartbitterschokolade', name: 'Zartbitterschokolade', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:weisse-schokolade', name: 'Weiße Schokolade', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kekse', name: 'Kekse', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:chips', name: 'Chips', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:gummibaerchen', name: 'Gummibärchen', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:nuesse', name: 'Nüsse', category: 'suesses-knabberei', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
];

const norm = (s: string): string =>
  s.toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function searchCatalog(query: string, limit = 8): Product[] {
  if (!query.trim()) return [];
  const qNorm = norm(query);
  const qTokens = qNorm.split(' ').filter(Boolean);
  if (!qTokens.length) return [];
  const qJoined = qTokens.join('');

  const exact: Product[] = [];
  const prefix: Product[] = [];
  const allTokens: Product[] = [];
  const contains: Product[] = [];

  for (const p of CURATED_CATALOG) {
    const n = norm(p.name);
    const nJoined = n.replace(/ /g, '');
    if (n === qNorm || nJoined === qJoined) {
      exact.push(p);
    } else if (n.startsWith(qNorm) || nJoined.startsWith(qJoined)) {
      prefix.push(p);
    } else if (qTokens.every((t) => nJoined.includes(t))) {
      allTokens.push(p);
    } else if (nJoined.includes(qJoined)) {
      contains.push(p);
    }
  }
  return [...exact, ...prefix, ...allTokens, ...contains].slice(0, limit);
}
