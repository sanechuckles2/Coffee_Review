export function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

export function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

export function switchModal(a, b) {
  closeModal(a);
  openModal(b);
}

export function backdropClose(e, id) {
  if (e.target.id === id) {
    closeModal(id);
  }
}
