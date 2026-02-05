import AssignmentsProvider from './context/assignment/AssignmentsContext'
import ChasisProvider from './context/chasis/ChasisContext'
import CoupledProvider from './context/coupled/CoupledContext'
import DriverProvider from './context/driver/DriverContext'
import { LoginProvider } from './context/login/LoginContext'
import UsersProvider from './context/users/UserContext'
import { TravelProvider } from './context/travel/TravelContext'
import { CompanyProvider } from './context/company/CompanyContext'
import Routing from './routes/Routing'

import { Toaster } from 'sonner'; // <--- IMPORTAR

function App() {


  // Importo el hook de login para mostrar loader y badge
  // (Evito doble render, así que lo hago dentro de LoginProvider)
  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3000}
      />
      <LoginProvider>
        <UsersProvider>
          <DriverProvider>
            <ChasisProvider>
              <CoupledProvider>
                <AssignmentsProvider>
                  <CompanyProvider>
                    <TravelProvider>
                      <AppContent />
                    </TravelProvider>  
                  </CompanyProvider>    
                </AssignmentsProvider>
              </CoupledProvider>
            </ChasisProvider>
          </DriverProvider>
        </UsersProvider>
      </LoginProvider>
    </>
  )
}

// Nuevo componente para mostrar loader y badge de conexión
import { useAuth } from './context/login/LoginContext';
import Spinner from './components/ui/Spinner';
import { toast } from 'sonner';

function AppContent() {
  const { loading, connectionStatus } = useAuth();
  // Loader visual
  if (loading) {
    return <Spinner message="Verificando sesión..." />;
  }
  // Badge visual de conexión
  return <>
    {connectionStatus === 'offline' && (
      <div style={{position:'fixed',top:10,right:10,background:'#d9534f',color:'#fff',padding:'6px 16px',borderRadius:8,zIndex:9999,fontWeight:600}}>Sin conexión</div>
    )}
    {connectionStatus === 'reconnected' && (
      <div style={{position:'fixed',top:10,right:10,background:'#5cb85c',color:'#fff',padding:'6px 16px',borderRadius:8,zIndex:9999,fontWeight:600}}>¡Conectado nuevamente!</div>
    )}
    <Routing />
  </>;
}


export default App
