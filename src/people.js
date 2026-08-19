import { supabaseClient } from "./supabaseClient.js";
import { openModal, closeModal } from "./ui/modal.js";
import { showToast } from "./ui/toast.js";
import { loadShops } from "./shops.js";

const EMAIL_DOMAIN = "coffeemap.local";
const PIN_PATTERN = /^\d{6}$/;

let peopleCache = [];
let selectedPerson = null;
let currentPerson = null;

export function getCurrentPerson() {
  return currentPerson;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");
}

function uniqueSlug(base) {
  const taken = new Set(peopleCache.map((p) => p.login_slug));
  if (!taken.has(base) && base) return base;

  let candidate = base || "friend";
  while (taken.has(candidate)) {
    candidate = `${base || "friend"}${Math.floor(100 + Math.random() * 900)}`;
  }
  return candidate;
}

async function loadPeople() {
  const { data } = await supabaseClient.from("people").select("*").order("display_name");
  peopleCache = data || [];

  const list = document.getElementById("pickerListItems");
  list.innerHTML = "";

  peopleCache.forEach((person) => {
    const btn = document.createElement("button");
    btn.className = "picker-person";
    btn.innerText = person.display_name;
    btn.onclick = () => selectPerson(person.id);
    list.appendChild(btn);
  });
}

function selectPerson(personId) {
  selectedPerson = peopleCache.find((p) => p.id === personId) || null;
  if (!selectedPerson) return;

  document.getElementById("pickerPinName").innerText = selectedPerson.display_name;
  document.getElementById("pickerPinInput").value = "";
  document.getElementById("pickerPinError").classList.add("hidden");

  showPickerView("pickerPin");
}

function showPickerView(id) {
  ["pickerList", "pickerPin", "pickerNew"].forEach((viewId) => {
    document.getElementById(viewId).classList.toggle("hidden", viewId !== id);
  });
}

export function backToPickerList() {
  showPickerView("pickerList");
}

export function showNewPersonForm() {
  document.getElementById("pickerNewName").value = "";
  document.getElementById("pickerNewPin").value = "";
  document.getElementById("pickerNewError").classList.add("hidden");
  showPickerView("pickerNew");
}

export async function openPicker() {
  await loadPeople();
  showPickerView("pickerList");
  openModal("pickerModal");
}

export async function openAccountModal() {
  await loadPeople();
  renderAccountSwitchList();
  openModal("mobileAccountSheet");
}

function renderAccountSwitchList() {
  const others = peopleCache.filter((p) => !currentPerson || p.id !== currentPerson.id);

  document.getElementById("accountSwitchSection").classList.toggle("hidden", others.length === 0);

  const list = document.getElementById("accountSwitchList");
  list.innerHTML = "";

  others.forEach((person) => {
    const btn = document.createElement("button");
    btn.className = "picker-person";
    btn.innerText = person.display_name;
    btn.onclick = () => switchToPerson(person.id);
    list.appendChild(btn);
  });
}

function switchToPerson(personId) {
  closeModal("mobileAccountSheet");
  selectPerson(personId);
  openModal("pickerModal");
}

export async function submitPin() {
  const pin = document.getElementById("pickerPinInput").value;
  const errorEl = document.getElementById("pickerPinError");
  errorEl.classList.add("hidden");

  if (!selectedPerson || !PIN_PATTERN.test(pin)) {
    errorEl.innerText = "Enter the 6-digit PIN";
    errorEl.classList.remove("hidden");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: `${selectedPerson.login_slug}@${EMAIL_DOMAIN}`,
    password: pin
  });

  if (error) {
    errorEl.innerText = "Incorrect PIN";
    errorEl.classList.remove("hidden");
    return;
  }

  closeModal("pickerModal");
  showUserMenu(selectedPerson);
  showToast(`Welcome back, ${selectedPerson.display_name}`);
  loadShops();
}

export async function submitNewPerson() {
  const name = document.getElementById("pickerNewName").value.trim();
  const pin = document.getElementById("pickerNewPin").value;
  const errorEl = document.getElementById("pickerNewError");
  errorEl.classList.add("hidden");

  if (!name) {
    errorEl.innerText = "Enter a name";
    errorEl.classList.remove("hidden");
    return;
  }

  if (peopleCache.some((p) => p.display_name.toLowerCase() === name.toLowerCase())) {
    errorEl.innerText = "That name is taken, try adding an initial";
    errorEl.classList.remove("hidden");
    return;
  }

  if (!PIN_PATTERN.test(pin)) {
    errorEl.innerText = "PIN must be 6 digits";
    errorEl.classList.remove("hidden");
    return;
  }

  const slug = uniqueSlug(slugify(name));

  const { data, error } = await supabaseClient.auth.signUp({
    email: `${slug}@${EMAIL_DOMAIN}`,
    password: pin
  });

  if (error || !data.user) {
    errorEl.innerText = error ? error.message : "Could not create account";
    errorEl.classList.remove("hidden");
    return;
  }

  const person = { id: data.user.id, display_name: name, login_slug: slug };
  const { error: insertError } = await supabaseClient.from("people").insert(person);

  if (insertError) {
    errorEl.innerText = insertError.message;
    errorEl.classList.remove("hidden");
    return;
  }

  closeModal("pickerModal");
  showUserMenu(person);
  showToast(`Welcome, ${person.display_name}`);
  loadShops();
}

export async function checkSession() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data.user) return;

  const { data: person } = await supabaseClient
    .from("people")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (person) showUserMenu(person);
}

function showUserMenu(person) {
  currentPerson = person;
  const initial = person.display_name[0].toUpperCase();

  document.getElementById("authActions").classList.add("hidden");
  document.getElementById("userMenu").classList.remove("hidden");
  document.getElementById("userName").innerText = person.display_name;
  document.getElementById("avatarInitial").innerText = initial;

  document.getElementById("mobileAccountIcon").classList.add("hidden");
  document.getElementById("mobileAccountAvatar").classList.remove("hidden");
  document.getElementById("mobileAccountAvatar").innerText = initial;
  document.getElementById("userNameMobile").innerText = person.display_name;
}

export function toggleDropdown() {
  document.getElementById("dropdown").classList.toggle("hidden");
}

export async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}
