import mongoose from 'mongoose';
import Listing from '../models/Listing.js';

// ── Weight constants ──────────────────────────────────────────
const W = {
  PINNED: 40,
  PPC: 20,
  BOOST: 15,
  FAVORITES: 10,
  CLICKS: 8,
  VIEWS: 5,
  RECENCY: 2,
};

/**
 * log-normalized score
 * @param {number} value  — actual count
 * @param {number} maxVal — max value across all listings (for normalization)
 * @param {number} maxPts — weight for this dimension
 */
const logNorm = (value, maxVal, maxPts) => {
  if (!maxVal || maxVal === 0) return 0;
  return (Math.log1p(value) / Math.log1p(maxVal)) * maxPts;
};

/**
 * Recency score — exponential decay
 * half-life = 7 days → after 7 days listing পায় maxPts/2
 * @param {Date} createdAt
 * @param {number} maxPts
 */
const recencyScore = (createdAt, maxPts) => {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const halfLifeDays = 7;
  return maxPts * Math.pow(0.5, ageDays / halfLifeDays);
};

/**
 * calculateAndUpdateScores()
 * ─────────────────────────────────────────────────────────────
 * 1. সব approved listing fetch করে
 * 2. normalization-এর জন্য max values বের করে
 * 3. প্রতিটির score ক্যালকুলেট করে
 * 4. bulkWrite দিয়ে DB আপডেট করে
 */
export const calculateAndUpdateScores = async () => {
  const startTime = Date.now();
  console.log('[ScoreCalc] Starting listing score calculation...');

  try {
    // ── Step 1: Fetch all approved listings (শুধু score-relevant fields) ──
    const listings = await Listing.find(
      { status: 'approved' },
      {
        _id: 1,
        createdAt: 1,
        favorites: 1,
        views: 1,
        promotion: 1,
      }
    ).lean();

    if (!listings.length) {
      console.log('[ScoreCalc] No approved listings found. Skipping.');
      return;
    }

    // ── Step 2: Max values for normalization ──────────────────
    let maxFavorites = 0;
    let maxClicks = 0;
    let maxViews = 0;

    for (const l of listings) {
      const fav = Array.isArray(l.favorites) ? l.favorites.length : 0;
      const clicks = l.promotion?.ppc?.totalClicks ?? 0;
      const views = l.views ?? 0;

      if (fav > maxFavorites) maxFavorites = fav;
      if (clicks > maxClicks) maxClicks = clicks;
      if (views > maxViews) maxViews = views;
    }

    // ── Step 3: Score each listing & build bulkWrite ops ──────
    const bulkOps = listings.map((l) => {
      const prom = l.promotion ?? {};

      // Pinned bonus — যে position যত ছোট, bonus তত বেশি
      const pinnedPos = prom.pinnedPosition; // 1, 2, 3, 4 বা null
      const pinnedBonus = pinnedPos
        ? W.PINNED * ((5 - pinnedPos) / 4) // pos 1 → 40, pos 4 → 10
        : 0;

      // PPC bonus
      const ppcActive = prom.ppc?.isActive === true && prom.ppc?.isPaused !== true;
      const ppcBonus = ppcActive ? W.PPC : 0;

      // Boost bonus
      const boostActive = prom.boost?.isActive === true && prom.boost?.isPaused !== true;
      const boostBonus = boostActive ? W.BOOST : 0;

      // Favorites
      const favCount = Array.isArray(l.favorites) ? l.favorites.length : 0;
      const favScore = logNorm(favCount, maxFavorites, W.FAVORITES);

      // PPC clicks
      const clicks = prom.ppc?.totalClicks ?? 0;
      const clickScore = logNorm(clicks, maxClicks, W.CLICKS);

      // Views
      const views = l.views ?? 0;
      const viewScore = logNorm(views, maxViews, W.VIEWS);

      // Recency
      const recency = recencyScore(l.createdAt, W.RECENCY);

      // Final score (rounded to 4 decimal places)
      const score = parseFloat(
        (pinnedBonus + ppcBonus + boostBonus + favScore + clickScore + viewScore + recency).toFixed(
          4
        )
      );

      return {
        updateOne: {
          filter: { _id: l._id },
          update: { $set: { score } },
        },
      };
    });

    // ── Step 4: Bulk update ───────────────────────────────────
    const result = await Listing.bulkWrite(bulkOps, { ordered: false });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[ScoreCalc] Done. Updated ${result.modifiedCount}/${listings.length} listings in ${elapsed}s`
    );
  } catch (err) {
    console.error('[ScoreCalc] Error during score calculation:', err);
  }
};
