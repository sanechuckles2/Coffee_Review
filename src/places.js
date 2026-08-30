import { map, setSelectedLocation } from "./map.js";
import { showToast } from "./ui/toast.js";

// OSM tags to filter to (server-side, via Photon's repeatable osm_tag param).
const SHOP_TAGS = [
  "amenity:cafe",
  "amenity:restaurant",
  "amenity:fast_food",
  "amenity:bar",
  "amenity:pub",
  "shop:coffee",
  "shop:bakery"
];

function getCurrentPositionAsync() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { timeout: 3000, maximumAge: 60000 }
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

function formatAddress(p) {
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ");
  return [line1, p.city, p.state, p.country].filter(Boolean).join(", ");
}

async function fetchPlaces(query, coords) {
  const params = new URLSearchParams({ q: query, limit: "8" });
  SHOP_TAGS.forEach((tag) => params.append("osm_tag", tag));

  if (coords) {
    params.set("lat", coords.latitude);
    params.set("lon", coords.longitude);
  }

  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
  const data = await res.json();
  return data.features || [];
}

export async function searchPlaces() {
  const query = document.getElementById("shopSearchQuery").value.trim();
  const resultsEl = document.getElementById("placeResults");

  resultsEl.innerHTML = "";
  resultsEl.classList.add("hidden");

  if (!query) return;

  let features;
  let coords;
  try {
    coords = await getCurrentPositionAsync();
    features = await fetchPlaces(query, coords);
  } catch {
    showToast("Search failed, try again");
    return;
  }

  if (coords) {
    features.forEach((f) => {
      const [lon, lat] = f.geometry.coordinates;
      f._distanceKm = distanceKm(coords.latitude, coords.longitude, lat, lon);
    });
    features.sort((a, b) => a._distanceKm - b._distanceKm);
  }

  features = features.slice(0, 5);

  if (features.length === 0) {
    showToast("No shops found");
    return;
  }

  features.forEach((feature) => {
    const p = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    const shortName = p.name || formatAddress(p) || "Unnamed place";

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
    address.innerText = formatAddress(p);
    main.appendChild(address);

    btn.appendChild(main);

    if (feature._distanceKm != null) {
      const dist = document.createElement("span");
      dist.className = "place-result-distance";
      dist.innerText = formatDistance(feature._distanceKm);
      btn.appendChild(dist);
    }

    btn.onclick = () => selectPlace(lat, lon, shortName);
    resultsEl.appendChild(btn);
  });

  resultsEl.classList.remove("hidden");
}

function selectPlace(lat, lng, shortName) {
  setSelectedLocation(lat, lng);
  map.setView([lat, lng], 17);

  document.getElementById("shopName").value = shortName;
  document.getElementById("placeResults").classList.add("hidden");
}
