import type { Product } from './types';

/**
 * Curated German staples — drugstore items where Open Food Facts coverage is thin,
 * plus common branded products that users frequently type by brand name (Nutella,
 * Tempo, Haribo…). Items here always rank above Open Food Facts results in
 * suggestions and remain available offline / when Open Food Facts rate-limits us.
 */
export const CURATED_CATALOG: Product[] = [
  // Branded staples — searchable by brand name even without Open Food Facts
  { id: 'local:brand:nutella', name: 'Nutella', brand: 'Ferrero', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:tempo', name: 'Tempo Taschentücher', brand: 'Tempo', category: 'koerperpflege', stores: ['dm', 'rossmann', 'rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:haribo', name: 'Haribo Goldbären', brand: 'Haribo', category: 'suesses', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:milka', name: 'Milka Schokolade', brand: 'Milka', category: 'suesses', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:rittersport', name: 'Ritter Sport', brand: 'Ritter Sport', category: 'suesses', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:lindt', name: 'Lindt Schokolade', brand: 'Lindt', category: 'suesses', stores: ['rewe', 'edeka'] },
  { id: 'local:brand:kinder', name: 'Kinder Schokolade', brand: 'Ferrero', category: 'suesses', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:coca-cola', name: 'Coca-Cola', brand: 'Coca-Cola', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:fanta', name: 'Fanta', brand: 'Coca-Cola', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:sprite', name: 'Sprite', brand: 'Coca-Cola', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:redbull', name: 'Red Bull', brand: 'Red Bull', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:knorr', name: 'Knorr Fix', brand: 'Knorr', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:maggi', name: 'Maggi Würze', brand: 'Maggi', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:droetker', name: 'Dr. Oetker Backmischung', brand: 'Dr. Oetker', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:barilla', name: 'Barilla Nudeln', brand: 'Barilla', category: 'trocken', stores: ['rewe', 'edeka'] },
  { id: 'local:brand:miracoli', name: 'Miracoli', brand: 'Mars', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:landliebe', name: 'Landliebe Joghurt', brand: 'Landliebe', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:mueller', name: 'Müller Milch', brand: 'Müller', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:brand:activia', name: 'Activia', brand: 'Danone', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
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
  { id: 'local:milch', name: 'Milch', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:butter', name: 'Butter', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:joghurt', name: 'Joghurt', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:quark', name: 'Quark', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kaese', name: 'Käse', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sahne', name: 'Sahne', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:frischkaese', name: 'Frischkäse', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mozzarella', name: 'Mozzarella', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:parmesan', name: 'Parmesan', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:eier', name: 'Eier', category: 'milch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Brot
  { id: 'local:brot', name: 'Brot', category: 'brot', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:broetchen', name: 'Brötchen', category: 'brot', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:toast', name: 'Toastbrot', category: 'brot', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:knaeckebrot', name: 'Knäckebrot', category: 'brot', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Fleisch
  { id: 'local:haehnchen', name: 'Hähnchen', category: 'fleisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:hackfleisch', name: 'Hackfleisch', category: 'fleisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:schinken', name: 'Schinken', category: 'fleisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:salami', name: 'Salami', category: 'fleisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:wurst', name: 'Wurst', category: 'fleisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:lachs', name: 'Lachs', category: 'fleisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:thunfisch', name: 'Thunfisch', category: 'fleisch', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Getränke
  { id: 'local:wasser', name: 'Wasser', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:apfelsaft', name: 'Apfelsaft', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:orangensaft', name: 'Orangensaft', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kaffee', name: 'Kaffee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tee', name: 'Tee', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:bier', name: 'Bier', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:wein', name: 'Wein', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:cola', name: 'Cola', category: 'getraenke', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Trockenwaren
  { id: 'local:nudeln', name: 'Nudeln', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:reis', name: 'Reis', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mehl', name: 'Mehl', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:zucker', name: 'Zucker', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:salz', name: 'Salz', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:pfeffer', name: 'Pfeffer', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:olivenoel', name: 'Olivenöl', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:rapsoel', name: 'Rapsöl', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sonnenblumenoel', name: 'Sonnenblumenöl', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:sesamoel', name: 'Sesamöl', category: 'trocken', stores: ['rewe', 'edeka'] },
  { id: 'local:kokosoel', name: 'Kokosöl', category: 'trocken', stores: ['rewe', 'edeka', 'dm', 'rossmann'] },
  { id: 'local:butterschmalz', name: 'Butterschmalz', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:essig', name: 'Essig', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:balsamico', name: 'Balsamico', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:haferflocken', name: 'Haferflocken', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:muesli', name: 'Müsli', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:cornflakes', name: 'Cornflakes', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:honig', name: 'Honig', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:marmelade', name: 'Marmelade', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:nutella', name: 'Nuss-Nougat-Creme', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tomatensauce', name: 'Tomatensauce', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:senf', name: 'Senf', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:ketchup', name: 'Ketchup', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:mayo', name: 'Mayonnaise', category: 'trocken', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Tiefkühl
  { id: 'local:pizza', name: 'Pizza', category: 'tiefkuehl', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:eis', name: 'Eis', category: 'tiefkuehl', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:tk-gemuese', name: 'TK-Gemüse', category: 'tiefkuehl', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:pommes', name: 'Pommes', category: 'tiefkuehl', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },

  // Süßes
  { id: 'local:schokolade', name: 'Schokolade', category: 'suesses', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:kekse', name: 'Kekse', category: 'suesses', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:chips', name: 'Chips', category: 'suesses', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:gummibaerchen', name: 'Gummibärchen', category: 'suesses', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
  { id: 'local:nuesse', name: 'Nüsse', category: 'suesses', stores: ['rewe', 'edeka', 'aldi', 'lidl'] },
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
