import type { ReactNode } from "react";

type ArcadeFrameProps = {
  children: ReactNode;
  onA?: () => void;
  onB?: () => void;
  onMove?: (offset: number) => void;
};

export function ArcadeFrame({ children, onA, onB, onMove }: ArcadeFrameProps) {
  return (
    <main className="arcade">
      <header className="arcade-header">
        <span className="brand-mark" aria-hidden="true">✦</span>
        <span className="brand">PIXEL<span> EXPRESS</span></span>
        <span className="power" aria-label="Console ligado" />
      </header>
      <div className="bezel">
        <div className="bezel-label"><span>OPERATIONS TERMINAL</span><span>PX—01</span></div>
        <div className="display">{children}</div>
      </div>
      <div className="hardware">
        <div className="d-pad" role="group" aria-label="Controle direcional">
          <button type="button" className="up" aria-label="Acima" disabled={!onMove} onClick={() => onMove?.(-3)}>▲</button>
          <button type="button" className="left" aria-label="Esquerda" disabled={!onMove} onClick={() => onMove?.(-1)}>◀</button>
          <span aria-hidden="true" />
          <button type="button" className="right" aria-label="Direita" disabled={!onMove} onClick={() => onMove?.(1)}>▶</button>
          <button type="button" className="down" aria-label="Abaixo" disabled={!onMove} onClick={() => onMove?.(3)}>▼</button>
        </div>
        <div className="action-buttons" role="group" aria-label="Controles do console">
          <button type="button" aria-label="B — Voltar" disabled={!onB} onClick={onB}>B</button>
          <button type="button" aria-label="A — Confirmar" disabled={!onA} onClick={onA}>A</button>
        </div>
      </div>
      <div className="speaker" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    </main>
  );
}
