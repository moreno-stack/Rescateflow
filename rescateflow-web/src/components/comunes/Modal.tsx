import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icono } from './Icono';

interface PropsModal {
  abierto: boolean;
  titulo: string;
  subtitulo?: string;
  alCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: 'normal' | 'amplio';
}

/** Ventana modal accesible basada en <dialog> nativo (foco atrapado y Escape para cerrar). */
export function Modal({ abierto, titulo, subtitulo, alCerrar, children, pie, ancho = 'normal' }: PropsModal) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={referencia}
      className={`modal modal--${ancho}`}
      aria-labelledby={idTitulo}
      onCancel={(evento) => {
        evento.preventDefault();
        alCerrar();
      }}
      onClick={(evento) => {
        if (evento.target === referencia.current) alCerrar();
      }}
    >
      {abierto && (
        <div className="modal__contenido">
          <header className="modal__encabezado">
            <div>
              <h2 id={idTitulo} className="modal__titulo">{titulo}</h2>
              {subtitulo && <p className="modal__subtitulo">{subtitulo}</p>}
            </div>
            <button type="button" className="boton-icono" onClick={alCerrar} aria-label="Cerrar ventana">
              <Icono nombre="cerrar" />
            </button>
          </header>
          <div className="modal__cuerpo">{children}</div>
          {pie && <footer className="modal__pie">{pie}</footer>}
        </div>
      )}
    </dialog>
  );
}
