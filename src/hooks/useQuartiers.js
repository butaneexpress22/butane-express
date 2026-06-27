import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Charge la liste des quartiers configurés pour une boutique, et permet de la rafraîchir.
export function useQuartiers(boutiqueId) {
  const [quartiers, setQuartiers] = useState([])
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    if (!boutiqueId) return
    setChargement(true)
    const { data } = await supabase
      .from('quartiers')
      .select('*')
      .eq('boutique_id', boutiqueId)
      .order('nom')
    setQuartiers(data || [])
    setChargement(false)
  }, [boutiqueId])

  useEffect(() => {
    charger()
  }, [charger])

  return { quartiers, chargement, rafraichir: charger }
}
