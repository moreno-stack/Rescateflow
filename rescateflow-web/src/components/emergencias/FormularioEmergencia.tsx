import { useMemo, useState, type FormEvent } from 'react';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { tituloDeError, useAccion } from '../../hooks/useAccion';
import { apiService } from '../../services/apiService';
import { TIPOS_EMERGENCIA, type NuevaEmergencia, type TipoEmergencia } from '../../types/dominio';
import { ETIQUETA_PRIORIDAD, ETIQUETA_TIPO, TEXTO_ADVERTENCIA } from '../../utils/etiquetas';
import { COBERTURA, LUGARES_CONOCIDOS } from '../../utils/lugares';
import { estimarPrioridad } from '../../utils/prioridad';
import { componerDescripcion } from '../../utils/titulo';
import { Spinner } from '../comunes/Spinner';

interface EstadoFormulario {
  titulo: string;
  tipo: TipoEmergencia;
  detalle: string;
  direccion: string;
  usarCoordenadas: boolean;
  latitud: string;
  longitud: string;
  telefono: string;
  nombre: string;
  afectados: string;
  riesgoVital: boolean;
  heridos: boolean;
  propagacion: boolean;
}

const INICIAL: EstadoFormulario = {
  titulo: '',
  tipo: 'EMERGENCIA_MEDICA',
  detalle: '',
  direccion: '',
  usarCoordenadas: false,
  latitud: '',
  longitud: '',
  telefono: '',
  nombre: '',
  afectados: '1',
  riesgoVital: false,
  heridos: false,
  propagacion: false,
};

type Errores = Partial<Record<'titulo' | 'detalle' | 'direccion' | 'telefono' | 'afectados' | 'latitud' | 'longitud', string>>;

/** Validacion en el navegador (espejo de RN-01). El backend vuelve a validar todo. */
function validar(f: EstadoFormulario): Errores {
  const errores: Errores = {};
  const titulo = f.titulo.trim();
  const descripcion = componerDescripcion(f.titulo, f.detalle);
  if (titulo.length < 5) errores.titulo = 'Escriba un título de al menos 5 caracteres.';
  else if (titulo.length > 120) errores.titulo = 'El título no puede superar 120 caracteres.';
  if (descripcion.length < 10) errores.detalle = 'Entre título y descripción se necesitan al menos 10 caracteres.';
  if (descripcion.length > 1000) errores.detalle = 'La descripción no puede superar 1000 caracteres.';
  const direccion = f.direccion.trim();
  if (direccion.length < 5) errores.direccion = 'Indique la dirección o un punto de referencia (mínimo 5 caracteres).';
  if (direccion.length > 250) errores.direccion = 'La dirección no puede superar 250 caracteres.';
  const telefono = f.telefono.replace(/[\s-]/g, '');
  if (!/^\+?\d{7,15}$/.test(telefono)) errores.telefono = 'Use entre 7 y 15 dígitos; puede empezar con +.';
  const afectados = Number(f.afectados);
  if (f.afectados.trim() === '' || !Number.isInteger(afectados) || afectados < 0 || afectados > 500) {
    errores.afectados = 'Número entero entre 0 y 500.';
  }
  if (f.usarCoordenadas) {
    const lat = Number(f.latitud);
    const lon = Number(f.longitud);
    if (f.latitud.trim() === '' || !Number.isFinite(lat)) errores.latitud = 'Latitud numérica, por ejemplo 1.21447.';
    else if (lat < COBERTURA.latMin || lat > COBERTURA.latMax) errores.latitud = `Fuera de Pasto: entre ${COBERTURA.latMin} y ${COBERTURA.latMax}.`;
    if (f.longitud.trim() === '' || !Number.isFinite(lon)) errores.longitud = 'Longitud numérica, por ejemplo -77.27861.';
    else if (lon < COBERTURA.lonMin || lon > COBERTURA.lonMax) errores.longitud = `Fuera de Pasto: entre ${COBERTURA.lonMin} y ${COBERTURA.lonMax}.`;
  }
  return errores;
}

/** Traduce los campos de un 400 del backend a los campos del formulario. */
const CAMPO_SERVIDOR: Record<string, keyof Errores> = {
  descripcion: 'detalle',
  direccionReportada: 'direccion',
  telefonoReportante: 'telefono',
  numeroAfectados: 'afectados',
  latitud: 'latitud',
  longitud: 'longitud',
};

/** Formulario para registrar una emergencia (POST /api/emergencias). */
export function FormularioEmergencia() {
  const [f, setF] = useState<EstadoFormulario>(INICIAL);
  const [errores, setErrores] = useState<Errores>({});
  const [intentado, setIntentado] = useState(false);
  const { ejecutar, cargando } = useAccion();
  const { notificar } = useNotificaciones();

  const estimacion = useMemo(
    () =>
      estimarPrioridad({
        tipo: f.tipo,
        numeroAfectados: Number(f.afectados) || 0,
        hayRiesgoVital: f.riesgoVital,
        hayHeridos: f.heridos,
        hayRiesgoPropagacion: f.propagacion,
      }),
    [f.tipo, f.afectados, f.riesgoVital, f.heridos, f.propagacion],
  );

  function actualizar<K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) {
    const siguiente = { ...f, [campo]: valor };
    setF(siguiente);
    if (intentado) setErrores(validar(siguiente));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setIntentado(true);
    const encontrados = validar(f);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      const primero = evento.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]');
      primero?.focus();
      return;
    }

    const datos: NuevaEmergencia = {
      tipo: f.tipo,
      descripcion: componerDescripcion(f.titulo, f.detalle),
      direccionReportada: f.direccion.trim(),
      nombreReportante: f.nombre.trim() || null,
      telefonoReportante: f.telefono.replace(/[\s-]/g, ''),
      numeroAfectados: Number(f.afectados),
      hayRiesgoVital: f.riesgoVital,
      hayHeridos: f.heridos,
      hayRiesgoPropagacion: f.propagacion,
      ...(f.usarCoordenadas ? { latitud: Number(f.latitud), longitud: Number(f.longitud) } : {}),
    };

    const resultado = await ejecutar(() => apiService.crearEmergencia(datos), {
      exito: (e) => `Emergencia ${e.codigo} registrada con prioridad ${ETIQUETA_PRIORIDAD[e.prioridad].toLowerCase()}`,
      notificarError: false,
    });

    if (resultado.ok) {
      for (const advertencia of resultado.datos.advertencias) {
        notificar({
          tipo: 'aviso',
          titulo: advertencia === 'POSIBLE_DUPLICADO' ? 'Posible duplicado' : 'Emergencia sin coordenadas',
          mensaje:
            TEXTO_ADVERTENCIA[advertencia] +
            (resultado.datos.posiblesDuplicados.length ? ` Revise: ${resultado.datos.posiblesDuplicados.join(', ')}.` : ''),
        });
      }
      setF({ ...INICIAL, tipo: f.tipo });
      setErrores({});
      setIntentado(false);
      return;
    }

    const { error } = resultado;
    if (error.esValidacion) {
      const delServidor: Errores = {};
      for (const [campo, mensaje] of Object.entries(error.camposInvalidos())) {
        const local = CAMPO_SERVIDOR[campo];
        if (local) delServidor[local] = mensaje;
      }
      setErrores(delServidor);
      notificar({ tipo: 'error', titulo: 'Datos inválidos', mensaje: 'Revise los campos marcados en el formulario.' });
    } else {
      notificar({ tipo: 'error', titulo: tituloDeError(error), mensaje: error.message });
      if (error.codigo === 'FUERA_DE_COBERTURA') setErrores({ latitud: error.message });
    }
  }

  const ayuda = (campo: keyof Errores) => (errores[campo] ? `error-${campo}` : undefined);

  return (
    <section className="panel panel--formulario" aria-labelledby="titulo-formulario">
      <header className="panel__encabezado">
        <h2 id="titulo-formulario" className="panel__titulo">Registrar emergencia</h2>
      </header>

      <form className="formulario" onSubmit={enviar} noValidate>
        <div className="campo">
          <label htmlFor="f-titulo">Título</label>
          <input
            id="f-titulo"
            value={f.titulo}
            maxLength={120}
            placeholder="Ej.: Adulto mayor inconsciente en la vía"
            onChange={(e) => actualizar('titulo', e.target.value)}
            aria-invalid={Boolean(errores.titulo)}
            aria-describedby={ayuda('titulo')}
          />
          {errores.titulo && <p id="error-titulo" className="campo__error">{errores.titulo}</p>}
        </div>

        <div className="campo">
          <label htmlFor="f-tipo">Tipo de emergencia</label>
          <select id="f-tipo" value={f.tipo} onChange={(e) => actualizar('tipo', e.target.value as TipoEmergencia)}>
            {TIPOS_EMERGENCIA.map((t) => (
              <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="f-detalle">Descripción <span className="campo__opcional">(opcional)</span></label>
          <textarea
            id="f-detalle"
            rows={3}
            value={f.detalle}
            placeholder="Qué ocurre, cuántas personas, qué ve el reportante"
            onChange={(e) => actualizar('detalle', e.target.value)}
            aria-invalid={Boolean(errores.detalle)}
            aria-describedby={ayuda('detalle')}
          />
          {errores.detalle && <p id="error-detalle" className="campo__error">{errores.detalle}</p>}
        </div>

        <div className="campo">
          <label htmlFor="f-direccion">Dirección o punto de referencia</label>
          <input
            id="f-direccion"
            list="lugares-conocidos"
            value={f.direccion}
            placeholder="Ej.: Plaza de Nariño, costado norte"
            onChange={(e) => actualizar('direccion', e.target.value)}
            aria-invalid={Boolean(errores.direccion)}
            aria-describedby={ayuda('direccion') ?? 'ayuda-direccion'}
          />
          <datalist id="lugares-conocidos">
            {LUGARES_CONOCIDOS.map((l) => <option key={l} value={l} />)}
          </datalist>
          {errores.direccion ? (
            <p id="error-direccion" className="campo__error">{errores.direccion}</p>
          ) : (
            <p id="ayuda-direccion" className="campo__ayuda">El sistema busca las coordenadas automáticamente.</p>
          )}
        </div>

        <label className="interruptor">
          <input type="checkbox" checked={f.usarCoordenadas} onChange={(e) => actualizar('usarCoordenadas', e.target.checked)} />
          <span>Ingresar coordenadas manualmente</span>
        </label>

        {f.usarCoordenadas && (
          <div className="campo-doble">
            <div className="campo">
              <label htmlFor="f-lat">Latitud</label>
              <input
                id="f-lat"
                inputMode="decimal"
                value={f.latitud}
                placeholder="1.21447"
                onChange={(e) => actualizar('latitud', e.target.value)}
                aria-invalid={Boolean(errores.latitud)}
                aria-describedby={ayuda('latitud')}
              />
              {errores.latitud && <p id="error-latitud" className="campo__error">{errores.latitud}</p>}
            </div>
            <div className="campo">
              <label htmlFor="f-lon">Longitud</label>
              <input
                id="f-lon"
                inputMode="decimal"
                value={f.longitud}
                placeholder="-77.27861"
                onChange={(e) => actualizar('longitud', e.target.value)}
                aria-invalid={Boolean(errores.longitud)}
                aria-describedby={ayuda('longitud')}
              />
              {errores.longitud && <p id="error-longitud" className="campo__error">{errores.longitud}</p>}
            </div>
          </div>
        )}

        <div className="campo-doble">
          <div className="campo">
            <label htmlFor="f-telefono">Teléfono del reportante</label>
            <input
              id="f-telefono"
              type="tel"
              inputMode="tel"
              value={f.telefono}
              placeholder="300 123 4567"
              onChange={(e) => actualizar('telefono', e.target.value)}
              aria-invalid={Boolean(errores.telefono)}
              aria-describedby={ayuda('telefono')}
            />
            {errores.telefono && <p id="error-telefono" className="campo__error">{errores.telefono}</p>}
          </div>
          <div className="campo">
            <label htmlFor="f-nombre">Nombre <span className="campo__opcional">(opcional)</span></label>
            <input id="f-nombre" value={f.nombre} maxLength={120} onChange={(e) => actualizar('nombre', e.target.value)} />
          </div>
        </div>

        <fieldset className="triaje">
          <legend>Triaje</legend>
          <div className="campo campo--corto">
            <label htmlFor="f-afectados">Personas afectadas</label>
            <input
              id="f-afectados"
              type="number"
              min={0}
              max={500}
              step={1}
              value={f.afectados}
              onChange={(e) => actualizar('afectados', e.target.value)}
              aria-invalid={Boolean(errores.afectados)}
              aria-describedby={ayuda('afectados')}
            />
            {errores.afectados && <p id="error-afectados" className="campo__error">{errores.afectados}</p>}
          </div>
          <label className="casilla">
            <input type="checkbox" checked={f.riesgoVital} onChange={(e) => actualizar('riesgoVital', e.target.checked)} />
            <span>Hay riesgo para la vida</span>
          </label>
          <label className="casilla">
            <input type="checkbox" checked={f.heridos} onChange={(e) => actualizar('heridos', e.target.checked)} />
            <span>Hay heridos</span>
          </label>
          <label className="casilla">
            <input type="checkbox" checked={f.propagacion} onChange={(e) => actualizar('propagacion', e.target.checked)} />
            <span>Puede propagarse (fuego, gas, agua)</span>
          </label>
        </fieldset>

        <div className={`prioridad-estimada prioridad-${estimacion.prioridad.toLowerCase()}`} aria-live="polite">
          <div className="prioridad-estimada__etiqueta" aria-hidden="true">
            <span className="prioridad-estimada__puntaje">{estimacion.puntaje}</span>
          </div>
          <div>
            <p className="prioridad-estimada__titulo">
              Prioridad estimada: <strong>{ETIQUETA_PRIORIDAD[estimacion.prioridad]}</strong>
            </p>
            <p className="prioridad-estimada__razones">{estimacion.razones.join('; ')}.</p>
            <p className="prioridad-estimada__nota">La asigna el sistema con las reglas de triaje; puede ajustarse al validar.</p>
          </div>
        </div>

        <button type="submit" className="boton boton--primario boton--ancho" disabled={cargando}>
          {cargando && <Spinner etiqueta="Registrando" />}
          {cargando ? 'Registrando' : 'Registrar emergencia'}
        </button>
      </form>
    </section>
  );
}
