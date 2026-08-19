import { openModal, closeModal, switchModal, backdropClose } from "./ui/modal.js";
import { applyGateState, submitGatePassword } from "./gate.js";
import {
  openPicker,
  backToPickerList,
  showNewPersonForm,
  submitPin,
  submitNewPerson,
  toggleDropdown,
  logout,
  checkSession
} from "./people.js";
import { map, initMap, startPinMode, cancelPinMode } from "./map.js";
import { loadShops, addShop, filterShops } from "./shops.js";
import { rate } from "./reviews.js";
import { switchTab } from "./ui/tabs.js";

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
  switchTab
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
