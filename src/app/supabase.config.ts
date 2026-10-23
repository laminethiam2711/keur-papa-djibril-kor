// Paramètres du projet Supabase.
// Dans Supabase : Project Settings → API (ou « Connect »), copier :
//   - Project URL           → url
//   - anon / publishable key → cleAnon
// Cette clé est faite pour être publique : la sécurité est assurée par les règles (RLS) de schema.sql.
// Tant que ces deux valeurs sont vides, le site fonctionne en mode simple (contenu fixe + WhatsApp).
export const SUPABASE_CONFIG = {
  url: 'https://gjzrcjmsiddhcskqbbwn.supabase.co',
  cleAnon: 'sb_publishable_JiYFA_YCze-ApOoTXNFP-w_OElBlweL',
};
