import { supabaseClient } from "./supabaseClient.js";
import { showToast } from "./ui/toast.js";

let statsCache = new Map();

export async function loadReviewStats() {
  const { data } = await supabaseClient
    .from("Review")
    .select("shop_id, rating, stars, quality, price, quirk, location, comment, user_id");
  const reviews = data || [];

  const { data: userData } = await supabaseClient.auth.getUser();
  const myId = userData.user ? userData.user.id : null;

  const compareFields = ["quality", "price", "quirk", "location", "rating", "stars"];

  const grouped = new Map();
  reviews.forEach((r) => {
    const entry = grouped.get(r.shop_id) || {
      ratingTotal: 0,
      ratingCount: 0,
      starsTotal: 0,
      starsCount: 0,
      count: 0,
      myScores: null,
      othersTotals: Object.fromEntries(compareFields.map((k) => [k, 0])),
      othersCounts: Object.fromEntries(compareFields.map((k) => [k, 0]))
    };

    entry.count += 1;
    if (r.rating != null) {
      entry.ratingTotal += r.rating;
      entry.ratingCount += 1;
    }
    if (r.stars != null) {
      entry.starsTotal += r.stars;
      entry.starsCount += 1;
    }

    if (myId && r.user_id === myId) {
      entry.myScores = {
        quality: r.quality,
        price: r.price,
        quirk: r.quirk,
        location: r.location,
        rating: r.rating,
        stars: r.stars,
        comment: r.comment
      };
    } else {
      compareFields.forEach((k) => {
        if (r[k] != null) {
          entry.othersTotals[k] += r[k];
          entry.othersCounts[k] += 1;
        }
      });
    }

    grouped.set(r.shop_id, entry);
  });

  statsCache = new Map(
    [...grouped].map(([shopId, e]) => {
      const othersAvg = Object.fromEntries(
        compareFields.map((k) => [k, e.othersCounts[k] ? e.othersTotals[k] / e.othersCounts[k] : null])
      );
      return [
        shopId,
        {
          avgRating: e.ratingCount ? e.ratingTotal / e.ratingCount : null,
          avgStars: e.starsCount ? e.starsTotal / e.starsCount : null,
          count: e.count,
          myScores: e.myScores,
          othersAvg
        }
      ];
    })
  );
}

export function getStats(shopId) {
  return statsCache.get(shopId) || { avgRating: null, avgStars: null, count: 0, myScores: null, othersAvg: {} };
}

// Individual reviews for one shop, with the reviewer's name attached via the
// Review.user_id -> people.id foreign key.
export async function getShopReviews(shopId) {
  const { data, error } = await supabaseClient
    .from("Review")
    .select(
      "quality, price, quirk, location, stars, rating, comment, created_at, updated_at, user_id, people(display_name)"
    )
    .eq("shop_id", shopId)
    .order("rating", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("getShopReviews failed:", error);
    return [];
  }

  return data || [];
}

// scores: { quality, price, quirk, location, stars } -- never includes
// `rating`, which is a Postgres generated column and can't be written to.
export async function submitReview(shopId, scores) {
  const { data } = await supabaseClient.auth.getUser();

  if (!data.user) {
    showToast("Sign in first");
    return;
  }

  const { error } = await supabaseClient.from("Review").upsert(
    { shop_id: shopId, user_id: data.user.id, ...scores },
    { onConflict: "shop_id,user_id" }
  );

  if (error) {
    console.error("submitReview failed:", error);
    showToast(`Couldn't save rating: ${error.message}`);
    return;
  }

  showToast("Rating saved!");
  await loadReviewStats();
}
