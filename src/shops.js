import { supabaseClient } from "./supabaseClient.js";
import { closeModal } from "./ui/modal.js";
import { showToast } from "./ui/toast.js";
import { map, addMarker, clearShopMarkers, getSelectedLocation, clearSelectedLocation } from "./map.js";
import { loadReviewStats, getStats } from "./reviews.js";
import { openShopDetail } from "./shopDetail.js";

let shopsCache = [];

export async function loadShops() {
  clearShopMarkers();

  const { data } = await supabaseClient.from("Coffee shops").select("*");
  shopsCache = data || [];

  await loadReviewStats();

  shopsCache.forEach((shop) => {
    if (map && shop.lat && shop.long) addMarker(shop);
  });

  renderShopCards(shopsCache, false);
}

export function filterShops(query) {
  const q = query.trim().toLowerCase();
  const isFiltered = q.length > 0;
  const filtered = isFiltered ? shopsCache.filter((s) => s.name.toLowerCase().includes(q)) : shopsCache;
  renderShopCards(filtered, isFiltered);
}

function renderShopCards(shops, isFiltered) {
  document.getElementById("emptyState").classList.toggle("hidden", shopsCache.length !== 0 || isFiltered);
  document.getElementById("noSearchResults").classList.toggle("hidden", !(isFiltered && shops.length === 0));

  const container = document.getElementById("shops");
  container.innerHTML = "";

  shops.forEach((shop) => {
    container.appendChild(buildShopCard(shop));
  });

  document.getElementById("shopCount").innerText = `${shops.length} shop${shops.length === 1 ? "" : "s"}`;
}

function buildShopCard(shop) {
  const stats = getStats(shop.id);

  const card = document.createElement("div");
  card.className = "shop-card";
  card.onclick = () => openShopDetail(shop);

  const top = document.createElement("div");
  top.className = "shop-card-top";

  const title = document.createElement("h3");
  title.className = "shop-name";
  title.innerText = shop.name;
  top.appendChild(title);

  if (stats.avgRating != null) {
    const badge = document.createElement("span");
    badge.className = "avg-badge";
    badge.innerText = `${stats.avgRating.toFixed(1)}/20`;
    top.appendChild(badge);
  } else {
    const noRating = document.createElement("span");
    noRating.className = "no-rating-text";
    noRating.innerText = "No ratings yet";
    top.appendChild(noRating);
  }

  card.appendChild(top);

  if (stats.count > 0) {
    const countEl = document.createElement("p");
    countEl.className = "review-count";
    countEl.innerText = `${stats.count} review${stats.count === 1 ? "" : "s"}`;
    card.appendChild(countEl);
  }

  return card;
}

export async function addShop() {
  const nameInput = document.getElementById("shopName");
  const name = nameInput.value.trim();
  const errorEl = document.getElementById("addShopError");
  errorEl.classList.add("hidden");

  const { lat, lng } = getSelectedLocation();

  if (!lat) {
    errorEl.innerText = "Pin a location on the map first";
    errorEl.classList.remove("hidden");
    return;
  }

  if (!name) {
    errorEl.innerText = "Enter a shop name";
    errorEl.classList.remove("hidden");
    return;
  }

  await supabaseClient.from("Coffee shops").insert({
    name,
    lat,
    long: lng
  });

  nameInput.value = "";
  clearSelectedLocation();
  closeModal("addShopModal");
  showToast("Shop added");
  loadShops();
}
