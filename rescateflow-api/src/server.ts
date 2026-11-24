import { crearApp } from './app';
import { cargarConfiguracion } from './config/entorno';
import { crearContenedor } from './contenedor';
import { conectarBaseDatos } from './infrastructure/database/conexion';

/** Punto de entrada: conecta con MongoDB, arma las dependencias y levanta el servidor HTTP. */
async function iniciar(): Promise<void> {
  const config = cargarConfiguracion();
  const conexion = await conectarBaseDatos(config.mongodbUri, config.mongodbBaseDatos);
  const contenedor = crearContenedor(conexion, config);
  const app = crearApp(contenedor, { corsOrigen: config.corsOrigen });

  const servidor = app.listen(config.puerto, () => {
    console.log(`[RescateFlow] API escuchando en http://localhost:${config.puerto}/api`);
    console.log(
      `[RescateFlow] MongoDB: ${config.mongodbUri}/${config.mongodbBaseDatos} ` +
        `(transacciones: ${conexion.soportaTransacciones ? 'si, replica set' : 'no, servidor independiente'}) ` +
        `| Geocodificacion: ${config.proveedorGeocodificacion}`,
    );
  });

  const apagar = (senal: string) => {
    console.log(`[RescateFlow] ${senal} recibido, cerrando...`);
    servidor.close(() => {
      void conexion.cerrar().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => apagar('SIGINT'));
  process.on('SIGTERM', () => apagar('SIGTERM'));
}

iniciar().catch((error: unknown) => {
  console.error(`[RescateFlow] No se pudo iniciar: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
