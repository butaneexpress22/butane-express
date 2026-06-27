import { supabase } from './supabase'

// Enregistre une action sensible dans le journal d'activité.
// Usage : journaliser({ boutiqueId, utilisateurId, action: 'suppression_client', cibleType: 'client', cibleId, detail: 'Client CLT-0087 supprimé' })
export async function journaliser({ boutiqueId, utilisateurId, action, cibleType, cibleId, detail }) {
  try {
    await supabase.from('journal_activite').insert({
      boutique_id: boutiqueId || null,
      utilisateur_id: utilisateurId || null,
      action,
      cible_type: cibleType || null,
      cible_id: cibleId || null,
      detail: detail || null,
    })
  } catch (e) {
    // Le journal ne doit jamais bloquer l'action principale en cas d'échec d'écriture
    console.error('Erreur journal activité:', e)
  }
}
