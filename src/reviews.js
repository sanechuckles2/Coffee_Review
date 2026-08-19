import { supabaseClient } from "./supabaseClient.js";
import { showToast } from "./ui/toast.js";

let statsCache = new Map();

export async function loadReviewStats() {
  const { data } = await supabaseClient.from("Review").select("shop_id, rating, user_id");
  const reviews = data || [];

  const { data: userData } = await supabaseClient.auth.getUser();
  const myId = userData.user ? userData.user.id : null;

  const grouped = new Map();
  reviews.forEach((r) => {
    const entry = grouped.get(r.shop_id) || { total: 0, count: 0, myRating: null };
    entry.total += r.rating;
    entry.count += 1;
    if (myId && r.user_id === myId) entry.myRating = r.rating;
    grouped.set(r.shop_id, entry);
  });

  statsCache = new Map(
    [...grouped].map(([shopId, e]) => [shopId, { avg: e.total / e.count, count: e.count, myRating: e.myRating }])
  );
}

export function getStats(shopId) {
  return statsCache.get(shopId) || { avg: null, count: 0, myRating: null };
}

export async function rate(shopId, rating) {
  const { data } = await supabaseClient.auth.getUser();

  if (!data.user) {
    showToast("Sign in first");
    return;
  }

  await supabaseClient.from("Review").upsert(
    { shop_id: shopId, rating, user_id: data.user.id },
    { onConflict: "shop_id,user_id" }
  );

  showToast("Rating saved!");
  await loadReviewStats();
}
