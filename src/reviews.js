import { supabaseClient } from "./supabaseClient.js";
import { showToast } from "./ui/toast.js";

export async function rate(shopId, rating) {
  const { data } = await supabaseClient.auth.getUser();

  if (!data.user) {
    showToast("Sign in first");
    return;
  }

  await supabaseClient.from("Review").insert({
    shop_id: shopId,
    rating: rating,
    user_id: data.user.id
  });

  showToast("Rating saved!");
}
