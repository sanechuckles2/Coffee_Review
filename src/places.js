import { map, setSelectedLocation } from "./map.js";
import { showToast } from "./ui/toast.js";

// OSM category:type combos that count as a "shop" for filtering search results.
const SHOP_TAGS = new Set([
  "amenity:cafe",
  "amenity:restaurant",
  "amenity:fast_food",
  "amenity:bar",
  "amenity:pub",
  "shop:coffee",
  "shop:bakery"
]);

function isShopLike(place) {
  return SHOP_TAGS.has(`${place.category}:${place.type}`);
}

function getCurrentPositionAsync() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { timeout: 4000 }
    );
  });
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

async function fetchPlaces(query) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&namedetails=1&limit=10&q=" +
    encodeURIComponent(query);
  const res = await fetch(url);
  return res.json();
}

export async function searchPlaces() {
  const query = document.getElementById("shopSearchQuery").value.trim();
  const resultsEl = document.getElementById("placeResults");

  resultsEl.innerHTML = "";
  resultsEl.classList.add("hidden");

  if (!query) return;

  let rawResults;
  let coords;
  try {
    [rawResults, coords] = await Promise.all([fetchPlaces(query), getCurrentPositionAsync()]);
  } catch {
    showToast("Search failed, try again");
    return;
  }

  let results = (rawResults || []).filter(isShopLike);

  if (coords) {
    results.forEach((place) => {
      place._distanceKm = distanceKm(coords.latitude, coords.longitude, parseFloat(place.lat), parseFloat(place.lon));
    });
    results.sort((a, b) => a._distanceKm - b._distanceKm);
  }

  results = results.slice(0, 5);

  if (results.length === 0) {
    showToast("No shops found");
    return;
  }

  results.forEach((place) => {
    const shortName = (place.namedetails && place.namedetails.name) || place.display_name.split(",")[0];

    const btn = document.createElement("button");
    btn.className = "place-result";

    const main = document.createElement("div");
    main.className = "place-result-main";

    const name = document.createElement("span");
    name.className = "place-result-name";
    name.innerText = shortName;
    main.appendChild(name);

    const address = document.createElement("span");
    address.className = "place-result-address";
    address.innerText = place.display_name;
    main.appendChild(address);

    btn.appendChild(main);

    if (place._distanceKm != null) {
      const dist = document.createElement("span");
      dist.className = "place-result-distance";
      dist.innerText = formatDistance(place._distanceKm);
      btn.appendChild(dist);
    }

    btn.onclick = () => selectPlace(place, shortName);
    resultsEl.appendChild(btn);
  });

  resultsEl.classList.remove("hidden");
}

function selectPlace(place, shortName) {
  const lat = parseFloat(place.lat);
  const lng = parseFloat(place.lon);

  setSelectedLocation(lat, lng);
  map.setView([lat, lng], 17);

  document.getElementById("shopName").value = shortName;
  document.getElementById("placeResults").classList.add("hidden");
}
