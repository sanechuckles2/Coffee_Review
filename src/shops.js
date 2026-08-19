import { supabaseClient } from "./supabaseClient.js";
import { closeModal } from "./ui/modal.js";
import { showToast } from "./ui/toast.js";
import { map, addMarker, clearShopMarkers, getSelectedLocation } from "./map.js";

export async function loadShops() {
  clearShopMarkers();

  const { data } = await supabaseClient.from("Coffee shops").select("*");
  const shops = data || [];

  const emptyState = document.getElementById("emptyState");
  emptyState.classList.toggle("hidden", shops.length !== 0);

  const container = document.getElementById("shops");
  container.innerHTML = "";

  shops.forEach((shop) => {
    const card = document.createElement("div");
    card.className = "shop-card";

    const title = document.createElement("h3");
    title.innerText = shop.name;
    card.appendChild(title);

    container.appendChild(card);

    if (map && shop.lat && shop.long) {
      addMarker(shop);
    }
  });

  document.getElementById("shopCount").innerText = `${shops.length} shops`;
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
  closeModal("addShopModal");
  showToast("Shop added");
  loadShops();
}
