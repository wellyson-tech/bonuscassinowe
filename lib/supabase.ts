
import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DO SUPABASE
 * 
 * 1. Acesse: https://supabase.com/dashboard
 * 2. Vá em: Settings (Engrenagem) > API
 * 3. Copie o 'Project URL' e a 'anon' public key.
 */

// COLE SUA URL AQUI (Ex: 'https://xyz.supabase.co')
const supabaseUrl = 'https://ufqhxtfsoxzrofjpvhpk.supabase.co'; 

// COLE SUA CHAVE ANON AQUI
const supabaseAnonKey = 'sb_secret_E7O2C4lt23a-kHKSXhOk2w_YXARpSnF';

/**
 * Validação de segurança para evitar erros de inicialização.
 * Não altere o código abaixo.
 */
const getValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    // Verifica se o usuário trocou o placeholder padrão
    if (url.includes('SUA_URL_AQUI')) throw new Error('URL não configurada');
    return parsed.origin;
  } catch {
    // Retorna um link temporário para não quebrar a construção do objeto URL
    return 'https://placeholder-project.supabase.co';
  }
};

const isConfigured = supabaseUrl !== 'SUA_URL_AQUI' && supabaseAnonKey !== 'SUA_CHAVE_ANON_AQUI';

export const supabase = createClient(
  getValidUrl(supabaseUrl),
  isConfigured ? supabaseAnonKey : 'no-key-provided'
);
