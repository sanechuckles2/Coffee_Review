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

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) alert(error.message);
  else {
    alert("Logged in!")
    loadShops();
  }
}

// ----------------------
// Load coffee shops
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
        <button onclick="rate('${shop.id}', 5)">⭐ Rate 5</button>
      </div>
    `;
  });
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

loadShops();