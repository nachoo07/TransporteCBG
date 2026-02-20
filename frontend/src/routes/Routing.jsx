import React from 'react'
import { Routes, Route } from "react-router-dom"
import PageLogin from '../pages/login/PageLogin'
import PageHome from '../pages/home/PageHome'
import PagePanelUser from '../pages/panelUser/PagePanelUser'
import ProtectedRoute from './protectRouter/ProtectedRoute'
import PageDriver from '../pages/driver/PageDriver'
import PageDriverDetail from '../pages/driver/PageDriverDetail'
import PageChassis from '../pages/chasis/PageChassis'
import PageCompany from '../pages/company/PageCompany'
import PageTravel from '../pages/travel/PageTravel'
import PageCompanyPayments from '../pages/companyPayments/PageCompanyPayments'
import PageDriverPayments from '../pages/driverPayments/PageDriverPayments'
import PageBilling from '../pages/billing/PageBilling'
const Routing = () => {

  return (
   <Routes>
     {/* RUTA PÚBLICA (Cualquiera puede entrar) */}
          <Route
            path="/login"
            element={
              <ProtectedRoute redirectIfAuthenticated>
                <PageLogin />
              </ProtectedRoute>
            }
          />
          {/* RUTAS PROTEGIDAS (Solo con sesión activa) */}
          <Route element={<ProtectedRoute />}>
              <Route path="/" element={<PageHome />} />
              <Route path="/panel-user" element={<PagePanelUser />} />
              <Route path="/panel-driver" element={<PageDriver />} />
              <Route path="/choferes" element={<PageDriver />} />
              <Route path="/panel-driver/:id" element={<PageDriverDetail />} />
              <Route path="/chassis" element={<PageChassis/>} />
              <Route path="/company" element={<PageCompany/>} />
              <Route path="/travels" element={<PageTravel/>} />
              <Route path="/facturacion" element={<PageBilling/>} />
              <Route path="/company-payments" element={<PageCompanyPayments/>} />
              <Route path="/driver-payments" element={<PageDriverPayments/>} />
              <Route path="/pagos-choferes" element={<PageDriverPayments/>} />
          </Route>

   </Routes>
  )
}

export default Routing
