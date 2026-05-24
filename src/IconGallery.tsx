import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ICONS } from './icons-library';
import { DOODLE_ICONS } from './icons-library-doodle';
import { LUCIDE_PROTOTYPE } from './icons-library-lucide';
import { CURATED_CATALOG } from './catalog';

/**
 * Dev/review gallery for the icon sets. Mounted by main.tsx when
 * `location.hash === '#icons'` — unlinked from the app UI, reachable by
 * typing the hash (works on a phone too, so icons can be eyeballed at
 * real rendered size on the actual target device).
 *
 * Renders every icon name in both line + doodle, at row size (26) and
 * avatar size (40), grouped by coverage so missing doodle variants are
 * obvious at a glance. This is the verification surface for the icon
 * expansion — author a batch, open #icons, spot the duds, fix, repeat.
 */

type Renderer = () => ReactNode;

function Glyph({ render, size, doodle }: { render: Renderer; size: number; doodle: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={doodle ? 1.8 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      {render()}
    </svg>
  );
}

function Cell({ name }: { name: string }) {
  const line = ICONS[name];
  const doodle = DOODLE_ICONS[name];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 8px',
        border: '1px solid #e2ddd2',
        borderRadius: 12,
        background: '#fff',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#2d2a24' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, opacity: 0.6 }}>line</span>
          {line ? (
            <>
              <Glyph render={line} size={40} doodle={false} />
              <Glyph render={line} size={26} doodle={false} />
            </>
          ) : (
            <Missing />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, opacity: 0.6 }}>doodle</span>
          {doodle ? (
            <>
              <Glyph render={doodle} size={40} doodle />
              <Glyph render={doodle} size={26} doodle />
            </>
          ) : (
            <Missing />
          )}
        </div>
      </div>
      <code style={{ fontSize: 11, color: '#6b6557', wordBreak: 'break-all', textAlign: 'center' }}>
        {name}
      </code>
    </div>
  );
}

function Missing() {
  return (
    <div
      style={{
        width: 40,
        height: 66,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#c8412e',
        fontSize: 10,
        textAlign: 'center',
        border: '1px dashed #e0b4ab',
        borderRadius: 8,
      }}
    >
      —
    </div>
  );
}

export function IconGallery() {
  const [q, setQ] = useState('');

  const { both, lineOnly, doodleOnly, stats } = useMemo(() => {
    const lineNames = new Set(Object.keys(ICONS));
    const doodleNames = new Set(Object.keys(DOODLE_ICONS));
    const all = [...new Set([...lineNames, ...doodleNames])].sort();

    const both: string[] = [];
    const lineOnly: string[] = [];
    const doodleOnly: string[] = [];
    for (const n of all) {
      const l = lineNames.has(n);
      const d = doodleNames.has(n);
      if (l && d) both.push(n);
      else if (l) lineOnly.push(n);
      else doodleOnly.push(n);
    }

    // How many catalog items resolve to a dedicated icon vs. fall back to
    // the category default. Items reference icons by the `icon` field.
    const catalogWithIcon = CURATED_CATALOG.filter((p) => p.icon && lineNames.has(p.icon)).length;

    return {
      both,
      lineOnly,
      doodleOnly,
      stats: {
        line: lineNames.size,
        doodle: doodleNames.size,
        catalogTotal: CURATED_CATALOG.length,
        catalogWithIcon,
      },
    };
  }, []);

  return (
    <div
      style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: '24px 16px 80px',
        fontFamily: 'system-ui, sans-serif',
        color: '#2d2a24',
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Icon gallery</h1>
      <p style={{ fontSize: 13, color: '#6b6557', marginTop: 6 }}>
        {stats.line} line · {stats.doodle} doodle · {stats.catalogWithIcon}/{stats.catalogTotal}{' '}
        catalog items have a dedicated icon. Each cell: 40 px + 26 px, line left / doodle right. A
        dashed “—” marks a missing variant.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter by name…"
        style={{
          marginTop: 12,
          width: '100%',
          padding: '8px 12px',
          fontSize: 14,
          border: '1px solid #d8d2c5',
          borderRadius: 10,
        }}
      />
      <PrototypeCompare />
      <Section title="Line only — doodle missing" names={lineOnly} query={q} tone="#c8412e" />
      <Section title="Doodle only — line missing" names={doodleOnly} query={q} tone="#c8412e" />
      <Section title="Both styles" names={both} query={q} />
    </div>
  );
}

/**
 * Side-by-side: our hand-drawn line icon (left) vs the Lucide equivalent
 * (right) for the same item. Lucide is drawn for stroke-2, so it's rendered
 * a touch heavier here to show how it'd actually look. Purely a decision
 * aid — if the Lucide column wins, we paste those paths into ICONS.
 */
function PrototypeCompare() {
  const names = Object.keys(LUCIDE_PROTOTYPE);
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#2d6a4f', margin: '0 0 4px' }}>
        Prototype — hand-drawn vs Lucide
      </h2>
      <p style={{ fontSize: 12, color: '#6b6557', margin: '0 0 12px' }}>
        Left = current hand-drawn (stroke 1.5). Right = Lucide library (stroke 1.9).
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        {names.map((n) => (
          <div
            key={n}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '12px 8px',
              border: '1px solid #cfe3d6',
              borderRadius: 12,
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#2d2a24' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, opacity: 0.55 }}>mine</span>
                {ICONS[n] ? <Glyph render={ICONS[n]} size={44} doodle={false} /> : <span>—</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: '#2d6a4f' }}>lucide</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width={44}
                  height={44}
                >
                  {LUCIDE_PROTOTYPE[n]()}
                </svg>
              </div>
            </div>
            <code style={{ fontSize: 11, color: '#6b6557' }}>{n}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

function Section({
  title,
  names,
  query,
  tone,
}: {
  title: string;
  names: string[];
  query: string;
  tone?: string;
}) {
  const shown = query
    ? names.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    : names;
  if (shown.length === 0) return null;
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: tone ?? '#2d2a24', margin: '0 0 12px' }}>
        {title} <span style={{ opacity: 0.5, fontWeight: 400 }}>({shown.length})</span>
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 10,
        }}
      >
        {shown.map((n) => (
          <Cell key={n} name={n} />
        ))}
      </div>
    </section>
  );
}
