
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

// Các biến này sẽ được cấu hình trên Vercel sau này
const supabaseUrl = (window as any).process?.env?.SUPABASE_URL || '';
const supabaseAnonKey = (window as any).process?.env?.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
