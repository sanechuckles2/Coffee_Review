const supabaseUrl = "https://snlwwmvhhjulnpdpehpt.supabase.co";
const supabaseKey = "sb_publishable_RMyAFpqjmEeVrvHoaiK8aA_9zYgX_B1";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let map = null;

let shopMarkers = [];
let reviewMarker = [];

let selectedLat = null;
let selectedLng = null;

let pinMode = false;

// ----------------------
// Auth
// ----------------------

async function signup() {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  const {data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if(data.user){
    showUserMenu(data.user);
  }

  if (error) {
    alert(error.message);
    return;
  }

  alert("User created!");
  closeModal("signupModal");
}

async function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const { error, data } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  closeModal("loginModal");
  showUserMenu(data.user);
  loadShops();
}

async function checkUser() {
    const { data } = await supabaseClient.auth.getUser();
    const user = data.user;
  
    if (user) {
      showUserMenu(user);
    }
}

function showUserMenu(user){
    document.getElementById("authActions")
        .classList.add("hidden");

    document.getElementById("userMenu")
        .classList.remove("hidden");

    document.getElementById("userEmail")
        .innerText = user.email;

    document.getElementById("avatarInitial")
        .innerText = user.email[0].toUpperCase();
}

async function logout() {
    await supabaseClient.auth.signOut();
  
    location.reload();
}

function toggleDropdown(){
    document.getElementById("dropdown").classList.toggle("hidden");
}

// ----------------------
// coffee shops
// ----------------------

async function loadShops() {
  shopMarkers.forEach(m=>map.removeLayer(m));
  shopMarkers=[];

  const emptyState = document.getElementById("emptyState");

  const { data } = await supabaseClient
    .from("Coffee shops")
    .select("*");

  if (emptyState) {
    if(data.length===0){
      emptyState.classList.remove("hidden");
    }
    else{
      emptyState.classList.add("hidden");
    }
  }

  const container = document.getElementById("shops");
  container.innerHTML = "";

  data.forEach(shop => {
    container.innerHTML += `
      <div class="shop-card">
        <h3>${shop.name}</h3>
      </div>
    `;

    if (map && shop.lat && shop.long) {
      addMarker(shop);
    }
  });

  document.getElementById("shopCount").innerText=`${data.length} shops`;
}

async function addShop() {
  const name=document.getElementById("shopName").value;

  if(!selectedLat){
    alert("Pin location first");
    return;
  }

  await supabaseClient.from("Coffee shops").insert({
    name:name,
    lat:selectedLat,
    long:selectedLng
  });

  closeModal("addShopModal");

  loadShops();
}

// ----------------------
// Add rating
// ----------------------

async function rate(shopId, rating) {
  const user = await supabaseClient.auth.getUser();

  if (!user.data.user) {
    alert("Login first");
    return;
  }

  await supabaseClient.from("Review").insert({
    shop_id: shopId,
    rating: rating,
    user_id: user.data.user.id
  });

  alert("Rating saved!");
}

// ----------------------
// map
// ----------------------

function initMap(lat = 53.3498, lng = -6.2603) {
    map = L.map("map").setView([lat, lng], 13);
    shopMarkers.forEach(m => map.removeLayer(m));

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);

    // Click map to select location
    map.on("click",function(e){
      if(!pinMode) return;

      const {lat,lng}=e.latlng;

      document.getElementById("coordDisplay").innerHTML=`${lat.toFixed(5)},${lng.toFixed(5)}`;

      selectedLat=lat;
      selectedLng=lng;

      reviewMarker.forEach(m => map.removeLayer(m));
      reviewMarker = [];

      reviewMarker.push(
          L.marker([lat,lng]).addTo(map)
      );

      cancelPinMode();
    });
}

function addMarker(shop) {
    if (!map) return;

    const marker = L.marker([shop.lat, shop.long])
        .addTo(map)
        .bindPopup(`<b>${shop.name}</b><br>`);

    shopMarkers.push(marker);
}

// ----------------------
// Modal functions
// ----------------------

function openModal(id){
  document.getElementById(id).classList.remove("hidden");
}


function closeModal(id){
  document.getElementById(id).classList.add("hidden");
}



function switchModal(a,b){
  closeModal(a);
  openModal(b);
}


function backdropClose(e,id){
  if(e.target.id===id){
    closeModal(id);
  }
}

// ----------------------
// Pin mode functions
// ----------------------

function startPinMode(){
  pinMode=true;
  document.getElementById("pinBanner").classList.remove("hidden");
  closeModal("addShopModal");
}

function cancelPinMode(){
  pinMode=false;
  document.getElementById("pinBanner").classList.add("hidden");
  openModal("addShopModal");
}

// ----------------------
// Initialize
// ----------------------

window.addEventListener("load", async () => {
    initMap();

    navigator.geolocation.getCurrentPosition(
        pos => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 13);
        },
        err => {
            console.log("Geolocation failed, using default location");
        }
    );

    await checkUser();
    await loadShops();
});