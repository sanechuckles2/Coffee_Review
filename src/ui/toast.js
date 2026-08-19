let hideTimer = null;

export function showToast(message) {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.classList.remove("hidden");

  // reflow so the "show" transition re-triggers on repeated calls
  void toast.offsetWidth;
  toast.classList.add("show");

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}
