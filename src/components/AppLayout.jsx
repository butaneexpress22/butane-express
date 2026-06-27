import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_PRINCIPAL = [
  { to: '/tableau-de-bord', icon: '📊', label: 'Tableau de bord' },
  { to: '/ventes', icon: '🛒', label: 'Ventes' },
  { to: '/achats', icon: '🛍️', label: 'Achats' },
  { to: '/depenses', icon: '💸', label: 'Dépenses' },
  { to: '/clients', icon: '👥', label: 'Clients' },
  { to: '/stock', icon: '📦', label: 'Stock' },
]

const NAV_OPERATIONS = [
  { to: '/historique-consommation', icon: '📈', label: 'Historique consommation' },
  { to: '/suivi-clients', icon: '⚠️', label: 'Suivi clients' },
  { to: '/sav', icon: '🔧', label: 'SAV' },
]

const NAV_ADMIN = [
  { to: '/boutiques', icon: '🏪', label: 'Mes Boutiques' },
  { to: '/tableau-de-bord-general', icon: '🌐', label: 'Tableau de bord général' },
  { to: '/utilisateurs', icon: '👤', label: 'Utilisateurs' },
  { to: '/comptabilite', icon: '📒', label: 'Comptabilité' },
  { to: '/parametres', icon: '⚙️', label: 'Paramètres' },
]

export default function AppLayout() {
  const { user, isAdmin, boutiqueActive, boutiques, changerBoutiqueActive, logout } = useAuth()

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">🔥</div>
            <div className="logo-text">
              <strong>Butane Express</strong>
              <span>Gestion Multi-Boutiques</span>
            </div>
          </div>
        </div>

        <div className="shop-pill">
          <label>Boutique active</label>
          {isAdmin && boutiques.length > 1 ? (
            <select
              className="shop-pill-select"
              value={boutiqueActive?.id || ''}
              onChange={(e) => {
                const b = boutiques.find((bt) => bt.id === e.target.value)
                changerBoutiqueActive(b)
              }}
            >
              {boutiques.map((b) => (
                <option key={b.id} value={b.id}>
                  🏪 {b.nom}
                </option>
              ))}
            </select>
          ) : (
            <span className="shop-pill-static">🏪 {boutiqueActive?.nom || '—'}</span>
          )}
        </div>

        <nav className="nav-group">
          <div className="nav-label">Principal</div>
          {NAV_PRINCIPAL.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>

        <nav className="nav-group">
          <div className="nav-label">Opérations</div>
          {NAV_OPERATIONS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>

        {isAdmin && (
          <nav className="nav-group">
            <div className="nav-label">Administration</div>
            {NAV_ADMIN.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                <span className="nav-icon">{item.icon}</span> {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="u-av">{user?.nom?.slice(0, 2).toUpperCase()}</div>
            <div className="user-info">
              <strong>{user?.nom}</strong>
              <span>{isAdmin ? 'Administrateur' : 'Caissier'}</span>
            </div>
            <button className="logout-btn" onClick={logout} title="Se déconnecter">
              ✕
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <Outlet />
      </div>
    </div>
  )
}
