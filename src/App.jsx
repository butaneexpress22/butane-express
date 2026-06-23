import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AppLayout from './components/AppLayout'
import TableauDeBord from './pages/TableauDeBord'
import Ventes from './pages/Ventes'
import Clients from './pages/Clients'
import Stock from './pages/Stock'
import Achats from './pages/Achats'
import Depenses from './pages/Depenses'
import HistoriqueConsommation from './pages/HistoriqueConsommation'
import SuiviClients from './pages/SuiviClients'
import Sav from './pages/Sav'
import Boutiques from './pages/Boutiques'
import TableauDeBordGeneral from './pages/TableauDeBordGeneral'
import Utilisateurs from './pages/Utilisateurs'
import Comptabilite from './pages/Comptabilite'
import Parametres from './pages/Parametres'

function RouteProtegee({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">Chargement…</div>
  if (!user) return <Navigate to="/connexion" replace />
  return children
}

function RouteAdmin({ children }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/tableau-de-bord" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/connexion"
        element={user ? <Navigate to="/tableau-de-bord" replace /> : <Login />}
      />

      <Route
        path="/"
        element={
          <RouteProtegee>
            <AppLayout />
          </RouteProtegee>
        }
      >
        <Route index element={<Navigate to="/tableau-de-bord" replace />} />
        <Route path="tableau-de-bord" element={<TableauDeBord />} />
        <Route path="ventes" element={<Ventes />} />
        <Route path="achats" element={<Achats />} />
        <Route path="depenses" element={<Depenses />} />
        <Route path="clients" element={<Clients />} />
        <Route path="stock" element={<Stock />} />
        <Route path="historique-consommation" element={<HistoriqueConsommation />} />
        <Route path="suivi-clients" element={<SuiviClients />} />
        <Route path="sav" element={<Sav />} />

        <Route
          path="boutiques"
          element={
            <RouteAdmin>
              <Boutiques />
            </RouteAdmin>
          }
        />
        <Route
          path="tableau-de-bord-general"
          element={
            <RouteAdmin>
              <TableauDeBordGeneral />
            </RouteAdmin>
          }
        />
        <Route
          path="utilisateurs"
          element={
            <RouteAdmin>
              <Utilisateurs />
            </RouteAdmin>
          }
        />
        <Route
          path="comptabilite"
          element={
            <RouteAdmin>
              <Comptabilite />
            </RouteAdmin>
          }
        />
        <Route
          path="parametres"
          element={
            <RouteAdmin>
              <Parametres />
            </RouteAdmin>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/tableau-de-bord" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
