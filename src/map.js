import { openModal, closeModal } from "./ui/modal.js";
import { openShopDetail } from "./shopDetail.js";

export let map = null;

let shopMarkers = [];
let pinMarker = [];
let pinMode = false;

let selectedLat = null;
let selectedLng = null;

const NAME_LABEL_ZOOM = 16;
const MOBILE_BREAKPOINT = "(max-width: 900px)";

const MARKER_ICON_HTML =
  '<div class="coffee-marker-pill">' +
  '<span class="coffee-marker-icon">☕</span>' +
  '<span class="coffee-marker-name"></span>' +
  "</div>";

// Mirrors the app's own mobile breakpoint rather than checking for touch
// hardware, so it also behaves correctly when testing by resizing a desktop
// browser window instead of on a real device.
function isMobileViewport() {
  return window.matchMedia(MOBILE_BREAKPOINT).matches;
}

function updateNameVisibility() {
  if (!map) return;
  const show = isMobileViewport() && map.getZoom() >= NAME_LABEL_ZOOM;
  shopMarkers.forEach((m) => {
    const el = m.getElement();
    if (el) el.classList.toggle("show-name", show);
  });
}

export function getSelectedLocation() {
  return { lat: selectedLat, lng: selectedLng };
}

export function initMap(lat = 53.3498, lng = -6.2603) {
  map = L.map("map").setView([lat, lng], 13);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(map);

  // On mobile there's no hover, so name labels only appear once zoomed in
  // enough to not clutter the map.
  map.on("zoomend", updateNameVisibility);
  window.addEventListener("resize", updateNameVisibility);

  map.on("click", function (e) {
    if (!pinMode) return;

    const { lat, lng } = e.latlng;

    document.getElementById("coordDisplay").innerHTML = `${lat.toFixed(5)},${lng.toFixed(5)}`;

    selectedLat = lat;
    selectedLng = lng;

    pinMarker.forEach((m) => map.removeLayer(m));
    pinMarker = [L.marker([lat, lng]).addTo(map)];

    cancelPinMode();
  });
}

export function clearShopMarkers() {
  shopMarkers.forEach((m) => map.removeLayer(m));
  shopMarkers = [];
}

export function addMarker(shop) {
  if (!map) return;

  const icon = L.divIcon({
    className: "coffee-marker",
    html: MARKER_ICON_HTML,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  const marker = L.marker([shop.lat, shop.long], { icon }).addTo(map);
  marker.on("click", () => openShopDetail(shop));
  shopMarkers.push(marker);

  // Set via innerText (not baked into the icon HTML above) to avoid
  // rendering a raw shop name as HTML.
  const nameEl = marker.getElement()?.querySelector(".coffee-marker-name");
  if (nameEl) nameEl.innerText = shop.name;

  if (isMobileViewport() && map.getZoom() >= NAME_LABEL_ZOOM) {
    marker.getElement()?.classList.add("show-name");
  }
}

export function startPinMode() {
  pinMode = true;
  document.getElementById("pinBanner").classList.remove("hidden");
  closeModal("addShopModal");
}

export function cancelPinMode() {
  pinMode = false;
  document.getElementById("pinBanner").classList.add("hidden");
  openModal("addShopModal");
}
