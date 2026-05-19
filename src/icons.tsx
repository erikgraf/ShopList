import type { Category } from './types';

const COLORS: Record<Category, [string, string]> = {
  'obst-gemuese': ['#16a34a', '#dcfce7'],
  'brot-gebaeck': ['#b45309', '#fed7aa'],
  'milch-eier': ['#3b82f6', '#dbeafe'],
  'fleisch-fisch': ['#ef4444', '#fee2e2'],
  tiefkuehl: ['#0891b2', '#cffafe'],
  vorrat: ['#a16207', '#fef3c7'],
  'gewuerze-saucen': ['#ea580c', '#ffedd5'],
  'fruehstueck-aufstrich': ['#d97706', '#fef3c7'],
  'suesses-knabberei': ['#db2777', '#fbcfe8'],
  getraenke: ['#0ea5e9', '#bae6fd'],
  koerperpflege: ['#8b5cf6', '#ede9fe'],
  haushalt: ['#475569', '#e2e8f0'],
  baby: ['#f472b6', '#fce7f3'],
  sonstiges: ['#64748b', '#e2e8f0'],
};

const GLYPH: Record<Category, string> = {
  'obst-gemuese': '🥬',
  'brot-gebaeck': '🥖',
  'milch-eier': '🥛',
  'fleisch-fisch': '🍖',
  tiefkuehl: '🧊',
  vorrat: '🌾',
  'gewuerze-saucen': '🧂',
  'fruehstueck-aufstrich': '🍯',
  'suesses-knabberei': '🍫',
  getraenke: '🥤',
  koerperpflege: '🧴',
  haushalt: '🧽',
  baby: '🍼',
  sonstiges: '🛒',
};

export function CategoryAvatar({ category, size = 44 }: { category: Category; size?: number }) {
  const [fg, bg] = COLORS[category];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl text-xl"
      style={{ width: size, height: size, background: bg, color: fg }}
      aria-hidden
    >
      <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{GLYPH[category]}</span>
    </div>
  );
}

export function ProductImage({
  src,
  category,
  size = 44,
  eager = false,
}: {
  src?: string;
  category: Category;
  size?: number;
  eager?: boolean;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : 'auto'}
        className="shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size, background: '#f1ede4' }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return <CategoryAvatar category={category} size={size} />;
}
