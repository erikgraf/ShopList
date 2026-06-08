/**
 * Local runner for the Phase-1 weekly-offers fetchers.
 *
 *   node scripts/run-offers.ts
 *
 * Why: Akamai (ALDI Süd, Netto MD) detects Cloudflare Worker egress IPs
 * and returns 403, so the scheduled-worker path doesn't work for those
 * chains. Running the *same* `runOffers()` from a residential macOS IP
 * sidesteps the block entirely while we figure out the longer-term
 * runtime question (CF Worker + proxy vs. GitHub Actions vs. VPS).
 *
 * Uses Node 22+ type-stripping (`node --experimental-strip-types` on
 * older versions; native on Node 23.6+). Imports straight from
 * `worker/offers.ts` so the worker and CLI never drift.
 *
 * Output: aggregated normalized offers as one JSON object on stdout
 * for easy `| jq ...` piping. Per-chain diagnostic logs go to stderr.
 */
import { runOffers, type Offer } from '../worker/offers.ts';

const offers: Offer[] = await runOffers();

// Aggregated JSON for piping. By-chain counts are already in the
// console.log() output from runOffers(); this adds the full list so
// downstream tools can grep / jq through the actual records.
process.stdout.write(
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      total: offers.length,
      by_store: offers.reduce<Record<string, number>>((acc, o) => {
        acc[o.store] = (acc[o.store] ?? 0) + 1;
        return acc;
      }, {}),
      offers,
    },
    null,
    2,
  ) + '\n',
);
