import { openModal, closeModal } from "./ui/modal.js";
import { openShopDetail } from "./shopDetail.js";

export let map = null;

let shopMarkers = [];
let pinMarker = [];
let pinMode = false;

let selectedLat = null;
let selectedLng = null;

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

  const marker = L.marker([shop.lat, shop.long]).addTo(map);
  marker.on("click", () => openShopDetail(shop));
  shopMarkers.push(marker);
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
