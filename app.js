const supabaseUrl = "https://snlwwmvhhjulnpdpehpt.supabase.co";
const supabaseKey = "sb_publishable_RMyAFpqjmEeVrvHoaiK8aA_9zYgX_B1";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

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
      <div>
        <b>${shop.name}</b>
        <button onclick="rate('${shop.id}', 5)">Rate 5</button>
      </div>
    `;

    if (shop.lat && shop.long) {
        addMarker(shop.lat, shop.long, shop.name);
    }
  });
}

async function addShop() {
    const name = document.getElementById("shopName").value;
  
    const { error } = await supabaseClient
      .from("Coffee shops")
      .insert({ name });
  
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

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);
}

function addMarker(lat, lng, name) {
  L.marker([lat, lng]).addTo(map)
    .bindPopup(name)
    .openPopup();
}

// ----------------------
// Initialize
// ----------------------

checkUser();
loadShops();
navigator.geolocation.getCurrentPosition(pos => {
    initMap(pos.coords.latitude, pos.coords.longitude);
});