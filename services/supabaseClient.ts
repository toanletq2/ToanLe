
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

/**
 * Hàm hỗ trợ lấy biến môi trường an toàn trong trình duyệt
 */
const getEnv = (key: string): string => {
  try {
    return (typeof process !== 'undefined' && process.env) ? process.env[key] || '' : '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    "Phone Pawn Manager: Supabase chưa được cấu hình. Ứng dụng đang chạy ở chế độ Local Storage. " +
    "Để dùng Cloud, hãy thiết lập SUPABASE_URL và SUPABASE_ANON_KEY trong Environment Variables."
  );
}
