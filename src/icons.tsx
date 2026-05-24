import type { Category } from './types';
import { ICONS, hasIcon } from './icons-library';
import { DOODLE_ICONS } from './icons-library-doodle';
import { useIconStyle, type IconStyle } from './store';

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

/** Map each category to a default catalog icon name, used when the item itself
 *  doesn't specify one. The library has these registered. Categories without
 *  a default fall back to the emoji glyph. */
const CATEGORY_DEFAULT_ICON: Partial<Record<Category, string>> = {
  'obst-gemuese': 'apfel',
  'brot-gebaeck': 'brot',
  'milch-eier': 'milch',
  'fleisch-fisch': 'fisch',
  tiefkuehl: 'pizza',
  vorrat: 'konserve',
  'gewuerze-saucen': 'salz',
  'fruehstueck-aufstrich': 'honig',
  'suesses-knabberei': 'schokolade',
  getraenke: 'wasser',
  koerperpflege: 'seife',
  haushalt: 'sprayflasche',
  baby: 'babyflasche',
  // sonstiges intentionally falls through to the shopping-cart emoji glyph.
};

export function CatalogIcon({
  name,
  size = 26,
  style,
}: {
  name: string;
  size?: number;
  /** Force a specific icon style (used by previews). Defaults to the user's
   *  active style from the store. */
  style?: IconStyle;
}) {
  const active = useIconStyle();
  const resolved = style ?? active;
  // Doodle set is a subset — fall back to line if it doesn't have this name.
  const Renderer =
    resolved === 'doodle' && DOODLE_ICONS[name] ? DOODLE_ICONS[name] : ICONS[name];
  if (!Renderer) return null;
  const isDoodle = resolved === 'doodle' && !!DOODLE_ICONS[name];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={isDoodle ? 1.8 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      <Renderer />
    </svg>
  );
}

export function CategoryAvatar({
  category,
  iconName,
  size = 44,
}: {
  category: Category;
  iconName?: string;
  size?: number;
}) {
  const [fg, bg] = COLORS[category];
  const effectiveIcon = iconName && hasIcon(iconName) ? iconName : CATEGORY_DEFAULT_ICON[category];

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, background: bg, color: fg }}
      aria-hidden
    >
      {effectiveIcon ? (
        <CatalogIcon name={effectiveIcon} size={Math.round(size * 0.82)} />
      ) : (
        <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>{GLYPH[category]}</span>
      )}
    </div>
  );
}

export function ProductImage({
  src,
  category,
  iconName,
  size = 44,
  eager = false,
}: {
  src?: string;
  category: Category;
  iconName?: string;
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
  return <CategoryAvatar category={category} iconName={iconName} size={size} />;
}
