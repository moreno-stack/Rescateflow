import { useState } from 'react';
import { Notificaciones } from './components/comunes/Notificaciones';
import { FormularioEmergencia } from './components/emergencias/FormularioEmergencia';
import { ListaEmergencias } from './components/emergencias/ListaEmergencias';
import { Encabezado } from './components/layout/Encabezado';
import { TarjetasResumen } from './components/resumen/TarjetasResumen';
import { PanelUnidades } from './components/unidades/PanelUnidades';
import { NotificacionesProvider } from './context/NotificacionesContext';
import { PanelProvider } from './context/PanelContext';
import { SesionProvider } from './context/SesionContext';
import type { FiltrosEmergencias } from './types/dominio';

/**
 * Panel operativo:
 *   encabezado
 *   resumen (4 tarjetas)
 *   [ registrar emergencia | cola de emergencias | unidades de respuesta ]
 */
export default function App() {
  const [filtros, setFiltros] = useState<FiltrosEmergencias>({});

  return (
    <SesionProvider>
      <NotificacionesProvider>
        <PanelProvider filtros={filtros}>
          <a className="saltar-contenido" href="#titulo-cola">Ir a la cola de emergencias</a>
          <div className="aplicacion">
            <Encabezado />
            <main className="tablero">
              <TarjetasResumen />
              <div className="tablero__columnas">
                <FormularioEmergencia />
                <ListaEmergencias filtros={filtros} alCambiarFiltros={setFiltros} />
                <PanelUnidades />
              </div>
            </main>
          </div>
          <Notificaciones />
        </PanelProvider>
      </NotificacionesProvider>
    </SesionProvider>
  );
}
