
import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DO SUPABASE
 * 
 * ATENÇÃO:
 * - Use a chave 'anon' (pública).
 * - NUNCA use a chave 'service_role' aqui, ou você receberá o erro "Forbidden use of secret API key".
 */

// 1. Cole aqui a 'Project URL'
const supabaseUrl = 'https://ufqhxtfsoxzrofjpvhpk.supabase.co'; 

// 2. Cole aqui a chave 'anon' / 'public' (NÃO USE A SERVICE_ROLE!)
const supabaseAnonKey = 'sb_publishable_pfMYcQnDWH_Gk8uK8ftIMw_suSco3Vt';

/**
 * Validação automática para ajudar o desenvolvedor
 */
const isSecretKey = (key: string) => {
  // Verificação simples: chaves service_role costumam ser identificadas pelo Supabase no erro
  // mas aqui garantimos que o usuário saiba se esqueceu de trocar o texto.
  return key.includes('SUA_CHAVE_ANON_AQUI');
};

const getValidUrl = (url: string) => {
  try {
    if (url.includes('SUA_URL_AQUI')) return 'https://placeholder-project.supabase.co';
    return new URL(url).origin;
  } catch {
    return 'https://placeholder-project.supabase.co';
  }
};

export const supabase = createClient(
  getValidUrl(supabaseUrl),
  isSecretKey(supabaseAnonKey) ? 'invalid-key' : supabaseAnonKey
);
