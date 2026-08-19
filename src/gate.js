import { supabaseClient } from "./supabaseClient.js";

const UNLOCK_KEY = "siteUnlocked";

function isUnlocked() {
  return localStorage.getItem(UNLOCK_KEY) === "true";
}

// Reflects current unlock state onto the gate screen. Called on load and
// again right after a successful password check.
export function applyGateState() {
  document.getElementById("gateScreen").classList.toggle("hidden", isUnlocked());
}

export async function submitGatePassword() {
  const input = document.getElementById("gatePasswordInput");
  const errorEl = document.getElementById("gateError");
  const pw = input.value;

  errorEl.classList.add("hidden");

  if (!pw) return;

  const { data, error } = await supabaseClient.rpc("verify_site_password", { pw });

  if (error) {
    console.error("verify_site_password failed:", error);
    errorEl.innerText = `Could not check password: ${error.message}`;
    errorEl.classList.remove("hidden");
    input.value = "";
    input.focus();
    return;
  }

  if (!data) {
    errorEl.innerText = "Incorrect password";
    errorEl.classList.remove("hidden");
    input.value = "";
    input.focus();
    return;
  }

  localStorage.setItem(UNLOCK_KEY, "true");
  input.value = "";
  applyGateState();
}
