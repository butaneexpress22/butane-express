import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Charge la liste des livreurs actifs d'une boutique, et permet de la rafraîchir.
export function useLivreurs(boutiqueId) {
  const [livreurs, setLivreurs] = useState([])
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    if (!boutiqueId) return
    setChargement(true)
    const { data } = await supabase
      .from('livreurs')
      .select('*')
      .eq('boutique_id', boutiqueId)
      .eq('supprime', false)
      .order('nom')
    setLivreurs(data || [])
    setChargement(false)
  }, [boutiqueId])

  useEffect(() => {
    charger()
  }, [charger])

  return { livreurs, chargement, rafraichir: charger }
}
