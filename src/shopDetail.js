import { supabaseClient } from "./supabaseClient.js";
import { openModal } from "./ui/modal.js";
import { getStats, rate } from "./reviews.js";

let currentShop = null;

export async function openShopDetail(shop) {
  currentShop = shop;

  document.getElementById("detailShopName").innerText = shop.name;
  renderStats(getStats(shop.id));

  const { data } = await supabaseClient.auth.getUser();
  renderRatingControl(!!data.user, getStats(shop.id).myRating);

  openModal("shopDetailModal");
}

function renderStats(stats) {
  const badge = document.getElementById("detailAvgBadge");
  const noRating = document.getElementById("detailNoRating");
  const countEl = document.getElementById("detailReviewCount");

  if (stats.count > 0) {
    badge.classList.remove("hidden");
    document.getElementById("detailAvgValue").innerText = stats.avg.toFixed(1);
    noRating.classList.add("hidden");
    countEl.innerText = `${stats.count} review${stats.count === 1 ? "" : "s"}`;
  } else {
    badge.classList.add("hidden");
    noRating.classList.remove("hidden");
    countEl.innerText = "";
  }
}

function renderRatingControl(signedIn, myRating) {
  const starsEl = document.getElementById("detailStars");
  const nudgeEl = document.getElementById("detailSignInNudge");

  if (!signedIn) {
    starsEl.innerHTML = "";
    starsEl.classList.add("hidden");
    nudgeEl.classList.remove("hidden");
    return;
  }

  nudgeEl.classList.add("hidden");
  starsEl.classList.remove("hidden");
  renderStars(myRating || 0);
}

function renderStars(activeValue) {
  const starsEl = document.getElementById("detailStars");
  starsEl.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.className = "star" + (i <= activeValue ? " lit" : "");
    star.innerText = "★";
    star.onclick = () => submitRating(i);
    starsEl.appendChild(star);
  }
}

async function submitRating(value) {
  if (!currentShop) return;
  await rate(currentShop.id, value);
  renderStats(getStats(currentShop.id));
  renderStars(value);
}
