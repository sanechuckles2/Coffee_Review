import { openModal, closeModal } from "./ui/modal.js";
import { showToast } from "./ui/toast.js";
import { openShopDetail } from "./shopDetail.js";

export let map = null;

let shopMarkers = [];
let pinMarker = [];
let pinMode = false;

let selectedLat = null;
let selectedLng = null;

let previewMap = null;
let previewMarker = [];

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

// Standard OpenStreetMap tiles: busier look than CartoDB/Esri, but no API
// key, no watermark risk, and full zoom detail everywhere.
function addBasemap(targetMap) {
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(targetMap);
}

export function getSelectedLocation() {
  return { lat: selectedLat, lng: selectedLng };
}

// Shared by manual map clicks, "use my location," and search-result picks.
export function setSelectedLocation(lat, lng) {
  selectedLat = lat;
  selectedLng = lng;

  const coordDisplay = document.getElementById("coordDisplay");
  coordDisplay.innerText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  coordDisplay.classList.remove("coord-empty");
  coordDisplay.classList.add("coord-set");

  pinMarker.forEach((m) => map.removeLayer(m));
  pinMarker = [L.marker([lat, lng]).addTo(map)];

  showPinPreview(lat, lng);
}

// Clears any in-progress location selection, e.g. when the add-shop modal
// is cancelled rather than submitted.
export function clearSelectedLocation() {
  selectedLat = null;
  selectedLng = null;

  const coordDisplay = document.getElementById("coordDisplay");
  coordDisplay.innerText = "No location set";
  coordDisplay.classList.add("coord-empty");
  coordDisplay.classList.remove("coord-set");

  pinMarker.forEach((m) => map.removeLayer(m));
  pinMarker = [];

  previewMarker.forEach((m) => previewMap && previewMap.removeLayer(m));
  previewMarker = [];
  document.getElementById("pinPreviewMap").classList.add("hidden");
}

// Small non-interactive map inside the add-shop modal so you can confirm
// the pin without the modal covering the real map underneath it.
function showPinPreview(lat, lng) {
  const previewEl = document.getElementById("pinPreviewMap");
  previewEl.classList.remove("hidden");

  if (!previewMap) {
    previewMap = L.map("pinPreviewMap", {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: false
    });

    addBasemap(previewMap);
  }

  previewMap.setView([lat, lng], 16);

  previewMarker.forEach((m) => previewMap.removeLayer(m));
  previewMarker = [L.marker([lat, lng]).addTo(previewMap)];

  // The container may have just been unhidden, so its size wasn't known
  // when the map/tiles were first laid out.
  setTimeout(() => previewMap.invalidateSize(), 0);
}

export function pinMyLocation() {
  if (!map) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      setSelectedLocation(latitude, longitude);
      map.setView([latitude, longitude], 16);
    },
    () => {
      showToast("Couldn't get your location");
    }
  );
}

export function initMap(lat = 53.3498, lng = -6.2603) {
  map = L.map("map", { zoomControl: false }).setView([lat, lng], 13);

  addBasemap(map);

  // On mobile there's no hover, so name labels only appear once zoomed in
  // enough to not clutter the map.
  map.on("zoomend", updateNameVisibility);
  window.addEventListener("resize", updateNameVisibility);

  // #map's size now comes from flex layout rather than a fixed calc(), so
  // Leaflet can init before that layout settles (e.g. late font reflow) and
  // never repaint correctly. Re-measure whenever the container's actual box
  // size changes instead of guessing at timing.
  new ResizeObserver(() => map.invalidateSize()).observe(document.getElementById("map"));

  map.on("click", function (e) {
    if (!pinMode) return;

    setSelectedLocation(e.latlng.lat, e.latlng.lng);
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
