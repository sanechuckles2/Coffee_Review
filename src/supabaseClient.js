// Relies on the Supabase UMD build loaded via <script> in index.html,
// which exposes the global `supabase` factory.
const supabaseUrl = "https://snlwwmvhhjulnpdpehpt.supabase.co";
const supabaseKey = "sb_publishable_RMyAFpqjmEeVrvHoaiK8aA_9zYgX_B1";

export const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
