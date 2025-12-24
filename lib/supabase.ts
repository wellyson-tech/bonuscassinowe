
import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DO SUPABASE - ROYAL STAKES
 * 
 * URL e Chave ANON inseridas conforme solicitado.
 * Certifique-se de que a tabela 'links' foi criada no SQL Editor do Supabase.
 */

const supabaseUrl = 'https://ufqhxtfsoxzrofjpvhpk.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_pfMYcQnDWH_Gk8uK8ftIMw_suSco3Vt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
