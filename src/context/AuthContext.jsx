import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const aujourdhui = () => new Date().toISOString().slice(0, 10)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [boutiqueActive, setBoutiqueActive] = useState(null)
  const [boutiques, setBoutiques] = useState([])
  const [loading, setLoading] = useState(true)
  const [fondCaisseRequis, setFondCaisseRequis] = useState(false)

  // Au chargement, on regarde si une session existe déjà (stockée localement)
  useEffect(() => {
    const saved = sessionStorage.getItem('butane_user')
    if (saved) {
      const parsed = JSON.parse(saved)
      setUser(parsed)
      restoreBoutique(parsed)
    }
    setLoading(false)
  }, [])

  async function restoreBoutique(userData) {
    if (userData.role === 'admin') {
      const { data } = await supabase.from('boutiques').select('*').eq('active', true)
      setBoutiques(data || [])
      const savedBoutique = sessionStorage.getItem('butane_boutique_active')
      if (savedBoutique) {
        setBoutiqueActive(JSON.parse(savedBoutique))
      } else if (data && data.length > 0) {
        setBoutiqueActive(data[0])
      }
    } else {
      const { data } = await supabase
        .from('boutiques')
        .select('*')
        .eq('id', userData.boutique_id)
        .single()
      setBoutiqueActive(data)
      setBoutiques(data ? [data] : [])

      // Vérifie si le fond de caisse du jour a déjà été défini pour cette boutique.
      // Seulement pour les caissiers — l'admin n'est jamais bloqué par cette vérification.
      if (data) {
        const { data: fond } = await supabase
          .from('fonds_caisse')
          .select('id')
          .eq('boutique_id', data.id)
          .eq('date_jour', aujourdhui())
          .maybeSingle()
        setFondCaisseRequis(!fond)
      }
    }
  }

  async function login(code, motDePasse) {
    const { data: utilisateur, error } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('actif', true)
      .single()

    if (error || !utilisateur) {
      return { success: false, message: 'Code utilisateur introuvable ou compte suspendu.' }
    }

    // ⚠️ Vérification simplifiée pour la V1.
    // À remplacer par une vraie vérification de hash (bcrypt) côté Edge Function
    // pour ne jamais comparer de mot de passe en clair côté client.
    if (utilisateur.mot_de_passe_hash !== motDePasse) {
      return { success: false, message: 'Mot de passe incorrect.' }
    }

    setUser(utilisateur)
    sessionStorage.setItem('butane_user', JSON.stringify(utilisateur))
    await restoreBoutique(utilisateur)
    return { success: true }
  }

  function logout() {
    setUser(null)
    setBoutiqueActive(null)
    setBoutiques([])
    setFondCaisseRequis(false)
    sessionStorage.removeItem('butane_user')
    sessionStorage.removeItem('butane_boutique_active')
  }

  function changerBoutiqueActive(boutique) {
    setBoutiqueActive(boutique)
    sessionStorage.setItem('butane_boutique_active', JSON.stringify(boutique))
  }

  // Appelé une fois le fond de caisse saisi par le caissier, pour débloquer l'accès à l'app
  function fondCaisseDefini() {
    setFondCaisseRequis(false)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        boutiqueActive,
        boutiques,
        login,
        logout,
        changerBoutiqueActive,
        fondCaisseRequis,
        fondCaisseDefini,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>')
  return ctx
}
