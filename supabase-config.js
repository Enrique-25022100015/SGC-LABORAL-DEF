// Credenciales de tu proyecto en Supabase
const SUPABASE_URL = 'https://exrqcfmdptagjszmaymw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aLIsje3jmCrXU9gISEr_nA_UKCxZHF3';

// Inicializar cliente global de Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);