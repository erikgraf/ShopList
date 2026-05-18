import type { Category } from './types';

const COLORS: Record<Category, [string, string]> = {
  'obst-gemuese': ['#16a34a', '#bbf7d0'],
  milch: ['#3b82f6', '#dbeafe'],
  fleisch: ['#ef4444', '#fecaca'],
  brot: ['#b45309', '#fed7aa'],
  getraenke: ['#0ea5e9', '#bae6fd'],
  tiefkuehl: ['#0891b2', '#cffafe'],
  trocken: ['#a16207', '#fde68a'],
  suesses: ['#db2777', '#fbcfe8'],
  koerperpflege: ['#8b5cf6', '#ddd6fe'],
  haushalt: ['#475569', '#e2e8f0'],
  baby: ['#f472b6', '#fce7f3'],
  sonstiges: ['#64748b', '#cbd5e1'],
};

const GLYPH: Record<Category, string> = {
  'obst-gemuese': '🥬',
  milch: '🥛',
  fleisch: '🍖',
  brot: '🥖',
  getraenke: '🥤',
  tiefkuehl: '🧊',
  trocken: '🌾',
  suesses: '🍫',
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
}: {
  src?: string;
  category: Category;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className="shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size, background: '#1e293b' }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return <CategoryAvatar category={category} size={size} />;
}
