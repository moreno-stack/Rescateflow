import { crearApp } from './app';
import { cargarConfiguracion } from './config/entorno';
import { crearContenedor } from './contenedor';
import { abrirBaseDatos } from './infrastructure/database/conexion';

/** Punto de entrada: abre la base de datos, arma las dependencias y levanta el servidor HTTP. */
function iniciar(): void {
  const config = cargarConfiguracion();
  const db = abrirBaseDatos(config.rutaBaseDatos);
  const contenedor = crearContenedor(db, config);
  const app = crearApp(contenedor, { corsOrigen: config.corsOrigen });

  const servidor = app.listen(config.puerto, () => {
    console.log(`[RescateFlow] API escuchando en http://localhost:${config.puerto}/api`);
    console.log(`[RescateFlow] Base de datos: ${config.rutaBaseDatos} | Geocodificacion: ${config.proveedorGeocodificacion}`);
  });

  const apagar = (senal: string) => {
    console.log(`[RescateFlow] ${senal} recibido, cerrando...`);
    servidor.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => apagar('SIGINT'));
  process.on('SIGTERM', () => apagar('SIGTERM'));
}

iniciar();
