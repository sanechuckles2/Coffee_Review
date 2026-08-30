import { supabaseClient } from "./supabaseClient.js";
import { openModal } from "./ui/modal.js";
import { getStats, getShopReviews, submitReview } from "./reviews.js";

const CATEGORIES = [
  { key: "quality", label: "Quality" },
  { key: "price", label: "Price" },
  { key: "quirk", label: "Quirk" },
  { key: "location", label: "Location" }
];

let currentShop = null;
let currentUserId = null;
let pendingScores = { quality: 0, price: 0, quirk: 0, location: 0, stars: 0, comment: "" };

function formatReviewDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatScore(n) {
  return Number.isInteger(n) ? n : n.toFixed(2);
}

export async function openShopDetail(shop) {
  currentShop = shop;

  document.getElementById("detailShopName").innerText = shop.name;
  renderStats(getStats(shop.id));

  const { data } = await supabaseClient.auth.getUser();
  currentUserId = data.user ? data.user.id : null;

  renderReviewsList(shop.id);
  renderRatingControl(!!data.user, getStats(shop.id));

  openModal("shopPage");
}

function renderStats(stats) {
  const badge = document.getElementById("detailAvgBadge");
  const noRating = document.getElementById("detailNoRating");
  const countEl = document.getElementById("detailReviewCount");
  const starsBadge = document.getElementById("detailAvgStars");
  const myBadge = document.getElementById("detailMyBadge");

  if (stats.avgRating != null) {
    badge.classList.remove("hidden");
    document.getElementById("detailAvgValue").innerText = `Avg ${stats.avgRating.toFixed(1)}/20`;
    noRating.classList.add("hidden");
  } else {
    badge.classList.add("hidden");
    noRating.classList.remove("hidden");
  }

  countEl.innerText = stats.count > 0 ? `${stats.count} review${stats.count === 1 ? "" : "s"}` : "";

  if (stats.avgStars != null) {
    const rounded = Math.round(stats.avgStars);
    starsBadge.innerText = "Avg " + "★".repeat(rounded) + "☆".repeat(3 - rounded);
    starsBadge.classList.remove("hidden");
  } else {
    starsBadge.classList.add("hidden");
  }

  if (stats.myScores && stats.myScores.rating != null) {
    let text = `You ${stats.myScores.rating.toFixed(1)}/20`;
    if (stats.myScores.stars != null) {
      text += ` · ${"★".repeat(stats.myScores.stars)}${"☆".repeat(3 - stats.myScores.stars)}`;
    }
    document.getElementById("detailMyValue").innerText = text;
    myBadge.classList.remove("hidden");
  } else {
    myBadge.classList.add("hidden");
  }
}

async function renderReviewsList(shopId) {
  const listEl = document.getElementById("reviewsList");
  listEl.innerHTML = "";

  const reviews = (await getShopReviews(shopId)).filter((r) => r.user_id !== currentUserId);

  if (reviews.length === 0) {
    const empty = document.createElement("p");
    empty.className = "no-rating-text";
    empty.innerText = "No other reviews yet.";
    listEl.appendChild(empty);
    return;
  }

  reviews.forEach((r) => {
    listEl.appendChild(buildReviewItem(r));
  });
}

function buildReviewItem(r) {
  const item = document.createElement("div");
  item.className = "review-item";

  const top = document.createElement("div");
  top.className = "review-item-top";

  const nameGroup = document.createElement("span");
  nameGroup.className = "review-item-name-group";

  const name = document.createElement("span");
  name.className = "review-item-name";
  name.innerText = (r.people && r.people.display_name) || "Someone";
  nameGroup.appendChild(name);

  if (r.comment) {
    const commentIcon = document.createElement("span");
    commentIcon.className = "review-item-comment-icon";
    commentIcon.innerText = "💬";
    nameGroup.appendChild(commentIcon);
  }

  top.appendChild(nameGroup);

  if (r.rating != null) {
    const ratingEl = document.createElement("span");
    ratingEl.className = "review-item-rating";
    ratingEl.innerText = `${formatScore(r.rating)}/20`;
    top.appendChild(ratingEl);
  }

  item.appendChild(top);

  if (r.created_at) {
    const dateEl = document.createElement("p");
    dateEl.className = "review-item-date";
    dateEl.innerText = formatReviewDate(r.created_at);
    item.appendChild(dateEl);
  }

  const scores = document.createElement("p");
  scores.className = "review-item-scores";
  scores.innerText = [
    `Quality ${r.quality != null ? formatScore(r.quality) : "–"}`,
    `Price ${r.price != null ? formatScore(r.price) : "–"}`,
    `Quirk ${r.quirk != null ? formatScore(r.quirk) : "–"}`,
    `Location ${r.location != null ? formatScore(r.location) : "–"}`
  ].join(" · ");
  item.appendChild(scores);

  if (r.stars != null) {
    const starsEl = document.createElement("p");
    starsEl.className = "review-item-michelin";
    starsEl.innerText = "★".repeat(r.stars) + "☆".repeat(3 - r.stars);
    item.appendChild(starsEl);
  }

  if (r.comment) {
    const comment = document.createElement("p");
    comment.className = "review-item-comment hidden";
    comment.innerText = r.comment;
    item.appendChild(comment);

    item.classList.add("has-comment");
    item.onclick = () => comment.classList.toggle("hidden");
  }

  return item;
}

function renderRatingControl(signedIn, stats) {
  const formEl = document.getElementById("detailRatingForm");
  const nudgeEl = document.getElementById("detailSignInNudge");
  const toggleBtn = document.getElementById("reviewFormToggle");
  const summaryEl = document.getElementById("myReviewSummary");

  if (!signedIn) {
    formEl.classList.add("hidden");
    toggleBtn.classList.add("hidden");
    summaryEl.classList.add("hidden");
    nudgeEl.classList.remove("hidden");
    return;
  }

  const myScores = stats.myScores;

  nudgeEl.classList.add("hidden");
  toggleBtn.classList.remove("hidden");
  formEl.classList.add("hidden");
  document.getElementById("detailRatingError").classList.add("hidden");

  if (myScores) {
    renderMyReviewSummary(myScores, stats.othersAvg);
    summaryEl.classList.remove("hidden");
  } else {
    summaryEl.classList.add("hidden");
  }

  pendingScores = {
    quality: (myScores && myScores.quality) || 0,
    price: (myScores && myScores.price) || 0,
    quirk: (myScores && myScores.quirk) || 0,
    location: (myScores && myScores.location) || 0,
    stars: (myScores && myScores.stars) || 0,
    comment: (myScores && myScores.comment) || ""
  };

  document.getElementById("reviewComment").value = pendingScores.comment;

  CATEGORIES.forEach((cat) => renderFractionalStarRow(cat.key, 5));
  renderStarRow("stars", 3);

  toggleBtn.innerText = myScores ? "Edit your review" : "Write a review";
  toggleBtn.onclick = () => {
    formEl.classList.remove("hidden");
    toggleBtn.classList.add("hidden");
  };
}

function renderMyReviewSummary(myScores, othersAvg) {
  const el = document.getElementById("myReviewSummary");
  el.innerHTML = "";

  el.appendChild(buildCompareHeader());

  CATEGORIES.forEach((cat) => {
    el.appendChild(buildCompareRow(cat.label, myScores[cat.key], othersAvg[cat.key]));
  });

  el.appendChild(buildCompareRow("Rating", myScores.rating, othersAvg.rating, "/20"));

  if (myScores.stars != null) {
    el.appendChild(buildMichelinCompareRow(myScores.stars, othersAvg.stars));
  }

  if (myScores.comment) {
    const comment = document.createElement("p");
    comment.className = "review-item-comment";
    comment.innerText = myScores.comment;
    el.appendChild(comment);
  }
}

function buildCompareHeader() {
  const row = document.createElement("div");
  row.className = "compare-row compare-header";

  row.appendChild(document.createElement("span"));

  const mineEl = document.createElement("span");
  mineEl.className = "compare-mine compare-col-label";
  mineEl.innerText = "You";
  row.appendChild(mineEl);

  const avgEl = document.createElement("span");
  avgEl.className = "compare-avg compare-col-label";
  avgEl.innerText = "Avg";
  row.appendChild(avgEl);

  return row;
}

function buildCompareRow(label, mine, avgOthers, suffix = "") {
  const row = document.createElement("div");
  row.className = "compare-row";

  const labelEl = document.createElement("span");
  labelEl.className = "compare-label";
  labelEl.innerText = label;
  row.appendChild(labelEl);

  const mineEl = document.createElement("span");
  mineEl.className = "compare-mine";
  mineEl.innerText = `${formatScore(mine)}${suffix}`;
  row.appendChild(mineEl);

  const avgEl = document.createElement("span");
  avgEl.className = "compare-avg";
  avgEl.innerText = avgOthers != null ? `${formatScore(avgOthers)}${suffix}` : "–";
  row.appendChild(avgEl);

  return row;
}

function buildMichelinCompareRow(mine, avgOthers) {
  const row = document.createElement("div");
  row.className = "compare-row";

  const labelEl = document.createElement("span");
  labelEl.className = "compare-label";
  labelEl.innerText = "Michelin";
  row.appendChild(labelEl);

  const mineEl = document.createElement("span");
  mineEl.className = "compare-mine";
  mineEl.innerText = "★".repeat(mine) + "☆".repeat(3 - mine);
  row.appendChild(mineEl);

  const avgEl = document.createElement("span");
  avgEl.className = "compare-avg";
  if (avgOthers != null) {
    const rounded = Math.round(avgOthers);
    avgEl.innerText = "★".repeat(rounded) + "☆".repeat(3 - rounded);
  } else {
    avgEl.innerText = "–";
  }
  row.appendChild(avgEl);

  return row;
}

// Whole-star row (Michelin stars only, 0-3).
function renderStarRow(key, max) {
  const rowEl = document.getElementById(`detailStars_${key}`);
  rowEl.innerHTML = "";
  const activeValue = pendingScores[key];

  for (let i = 1; i <= max; i++) {
    const star = document.createElement("span");
    star.className = "star" + (i <= activeValue ? " lit" : "");
    star.innerText = "★";
    star.onclick = () => {
      pendingScores[key] = i;
      renderStarRow(key, max);
    };
    rowEl.appendChild(star);
  }
}

// Quarter-star row (the four 0-5 rating categories). Clicking a position
// within a star sets that star's fill to the nearest quarter.
function renderFractionalStarRow(key, max) {
  const rowEl = document.getElementById(`detailStars_${key}`);
  rowEl.innerHTML = "";
  const value = pendingScores[key];

  for (let i = 1; i <= max; i++) {
    const cell = document.createElement("span");
    cell.className = "star-cell";

    const bg = document.createElement("span");
    bg.className = "star-bg";
    bg.innerText = "★";
    cell.appendChild(bg);

    const fill = document.createElement("span");
    fill.className = "star-fill";
    const fillFraction = Math.max(0, Math.min(1, value - (i - 1)));
    fill.style.width = `${fillFraction * 100}%`;
    fill.innerText = "★";
    cell.appendChild(fill);

    cell.onclick = (e) => {
      const rect = cell.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      const quarter = Math.max(0.25, Math.ceil(relativeX * 4) / 4);
      pendingScores[key] = i - 1 + quarter;
      renderFractionalStarRow(key, max);
    };

    rowEl.appendChild(cell);
  }
}

export async function saveRating() {
  if (!currentShop) return;

  const errorEl = document.getElementById("detailRatingError");
  const { quality, price, quirk, location } = pendingScores;

  if (!quality || !price || !quirk || !location) {
    errorEl.innerText = "Rate all four categories to save";
    errorEl.classList.remove("hidden");
    return;
  }
  errorEl.classList.add("hidden");

  pendingScores.comment = document.getElementById("reviewComment").value.trim();

  await submitReview(currentShop.id, pendingScores);
  renderStats(getStats(currentShop.id));
  renderReviewsList(currentShop.id);
  renderRatingControl(true, getStats(currentShop.id));
}
