import { openModal, closeModal, switchModal, backdropClose } from "./ui/modal.js";
import { showToast } from "./ui/toast.js";
import { applyGateState, submitGatePassword } from "./gate.js";
import {
  openPicker,
  openAccountModal,
  backToPickerList,
  showNewPersonForm,
  submitPin,
  submitNewPerson,
  toggleDropdown,
  logout,
  checkSession,
  getCurrentPerson
} from "./people.js";
import { map, initMap, startPinMode, cancelPinMode, pinMyLocation, clearSelectedLocation } from "./map.js";
import { loadShops, addShop, filterShops } from "./shops.js";
import { rate } from "./reviews.js";
import { switchTab } from "./ui/tabs.js";
import { searchPlaces } from "./places.js";

function mobileAddShop() {
  if (!getCurrentPerson()) {
    showToast("Sign in first");
    openPicker();
    return;
  }
  openModal("addShopModal");
}

function mobileAccountTap() {
  if (!getCurrentPerson()) {
    openPicker();
    return;
  }
  openAccountModal();
}

// Cancelling the add-shop modal (X or backdrop) should discard any pin
// that was placed, rather than leaving it on the map for next time.
function closeAddShopModal() {
  clearSelectedLocation();
  document.getElementById("shopName").value = "";
  document.getElementById("addShopError").classList.add("hidden");
  document.getElementById("shopSearchQuery").value = "";
  document.getElementById("placeResults").classList.add("hidden");
  closeModal("addShopModal");
}

// Referenced by inline onclick/onkeydown attributes in index.html.
Object.assign(window, {
  openModal,
  closeModal,
  switchModal,
  backdropClose,
  submitGatePassword,
  openPicker,
  backToPickerList,
  showNewPersonForm,
  submitPin,
  submitNewPerson,
  toggleDropdown,
  logout,
  startPinMode,
  cancelPinMode,
  addShop,
  filterShops,
  rate,
  switchTab,
  mobileAddShop,
  mobileAccountTap,
  pinMyLocation,
  searchPlaces,
  closeAddShopModal
});

applyGateState();

window.addEventListener("load", async () => {
  initMap();

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 13);
    },
    () => {
      console.log("Geolocation failed, using default location");
    }
  );

  await checkSession();
  await loadShops();
});
