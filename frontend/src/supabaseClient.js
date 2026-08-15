import { createClient } from "@supabase/supabase-js";

// ─── Replace these with your own Supabase project credentials ───
const SUPABASE_URL = "https://rhuaycudhxnjokiiloye.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_uJzWQdRys1Ordo9fAvHj8w_KGU6RbV0";

// ─── Supabase client (ready to use throughout your app) ───
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
