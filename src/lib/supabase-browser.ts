/**
 * Browser-only Supabase singleton.
 * EVERY client component must import this instead of calling
 * createClient() directly. Multiple GoTrueClient instances under the same
 * storage key cause undefined auth behavior (stale sessions, token races).
 *
 * NOTE: never import supabaseAdmin here — the service-role key must never
 * enter the browser bundle. Server API routes use @/lib/supabase instead.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);