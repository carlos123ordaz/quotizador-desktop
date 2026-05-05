import './App.css'
import { Route, Routes } from 'react-router-dom'
import RegisterScreen from './pages/RegisterScreen'
import ReportGenerator from './pages/ReportGenerator'
import MainLayout from './layout/MainLayout'
import { MainContextApp } from './contexts/MainContext'
import LoginScreen from './pages/LoginScreen'
import ReportHistory from './pages/ReportHistory'
import { BitrixHistory } from './pages/BitrixHistory'
import { BitrixDashboard } from './pages/BitrixDashboard'
import { BitrixIntegration } from './pages/BitrixIntegration'
import EmployeesPage from './pages/EmployeesPage'
import ProductsPage from './pages/ProductsPage'
import ProfilePage from './pages/ProfilePage'
import TemplateVersionsPage from './pages/TemplateVersionsPage'

function App() {

  return (
    <>
      <MainContextApp>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<BitrixIntegration />} />
            <Route path="/bitrix/history" element={<BitrixHistory />} />
            <Route path="/bitrix/dashboard" element={<BitrixDashboard />} />
            <Route path="/bitrix/send" element={<BitrixIntegration />} />
            <Route path="/reports/generate" element={<ReportGenerator />} />
            <Route path="/reports/history" element={<ReportHistory />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/users" element={<EmployeesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/template-versions" element={<TemplateVersionsPage />} />
          </Route>
        </Routes>

      </MainContextApp>
    </>
  )
}

export default App
