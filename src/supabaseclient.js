import { createClient } from "@supabase/supabase-js";

// Replace these with your actual Supabase credentials
const supabaseUrl = "https://dsamhjzwboedajgtpmzo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzYW1oanp3Ym9lZGFqZ3RwbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MTk4OTEsImV4cCI6MjA4NzE5NTg5MX0.4oKT-ZEO5brXqP84aYQCJYyQ6l3_u53SHqaahBQqsLQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);