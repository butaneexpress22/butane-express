import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Charge la liste des catégories de dépenses actives, et permet de la rafraîchir.
export function useCategoriesDepenses() {
  const [categories, setCategories] = useState([])
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    setChargement(true)
    const { data } = await supabase
      .from('categories_depenses')
      .select('*')
      .eq('actif', true)
      .order('nom')
    setCategories(data || [])
    setChargement(false)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  return { categories, chargement, rafraichir: charger }
}
