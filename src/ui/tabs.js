import { map } from "../map.js";

export function switchTab(tab) {
  document.getElementById("listPane").classList.toggle("active", tab === "list");
  document.getElementById("mapPane").classList.toggle("active", tab === "map");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  if (tab === "map" && map) {
    setTimeout(() => map.invalidateSize(), 0);
  }
}
