const supabaseUrl = "https://snlwwmvhhjulnpdpehpt.supabase.co";
const supabaseKey = "sb_publishable_RMyAFpqjmEeVrvHoaiK8aA_9zYgX_B1";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let shopMarkers = [];
let reviewMarker = [];

// ----------------------
// Auth
// ----------------------

async function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) alert(error.message);
  else alert("User created!");
}

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
  
    const { error, data } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
  
    if (error) {
      alert(error.message);
      return;
    }
  
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

function showUserMenu(user) {
    document.getElementById("authCard").style.display = "none";
    document.getElementById("userMenu").classList.remove("hidden");
    document.getElementById("userEmail").innerText = user.email;
}

async function logout() {
    await supabaseClient.auth.signOut();
  
    location.reload();
}

function toggleMenu() {
    const menu = document.getElementById("dropdown");
    menu.classList.toggle("hidden");
}

// ----------------------
// coffee shops
// ----------------------

async function loadShops() {
  const { data } = await supabaseClient
    .from("Coffee shops")
    .select("*");

  const container = document.getElementById("shops");
  container.innerHTML = "";

  data.forEach(shop => {
    container.innerHTML += `
    <div class="bg-white p-4 rounded-xl shadow">
      <b>${shop.name}</b>
      <div class="mt-2">
        Rate:
        <button onclick="rate('${shop.id}',1)">⭐</button>
        <button onclick="rate('${shop.id}',2)">⭐⭐</button>
        <button onclick="rate('${shop.id}',3)">⭐⭐⭐</button>
        <button onclick="rate('${shop.id}',4)">⭐⭐⭐⭐</button>
        <button onclick="rate('${shop.id}',5)">⭐⭐⭐⭐⭐</button>
      </div>
    </div>
  `;

    if (shop.lat && shop.long) {
        addMarker(shop);
    }
  });
}

async function addShop() {
    const name = document.getElementById("shopName").value;
    const lat = parseFloat(document.getElementById("lat").value);
    const lng = parseFloat(document.getElementById("lng").value);
  
    if (!name || !lat || !lng) {
      alert("Please enter name and select location on the map");
      return;
    }
  
    const { error } = await supabaseClient
      .from("Coffee shops")
      .insert({
        name,
        lat: lat,
        long: lng
      });
  
    if (error) {
      alert(error.message);
      return;
    }
  
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

let map;

function initMap(lat = 53.3498, lng = -6.2603) {
    map = L.map("map").setView([lat, lng], 13);
    shopMarkers.forEach(m => map.removeLayer(m));

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);

    // Click map to select location
    map.on("click", function (e) {
        const { lat, lng } = e.latlng;

        document.getElementById("lat").value = lat.toFixed(12);
        document.getElementById("lng").value = lng.toFixed(12);

        reviewMarker.forEach(m => map.removeLayer(m));

        //L.marker([lat, lng]).addTo(map);
        reviewMarker.push(L.marker([lat, lng]).addTo(map));
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
// Initialize
// ----------------------

window.addEventListener("load", async () => {

    initMap();

    navigator.geolocation.getCurrentPosition(
        pos => {
            initMap(pos.coords.latitude, pos.coords.longitude);
        },
        err => {
            console.log("Geolocation failed, using default location");
        }
    );

    await checkUser();
    await loadShops();
});