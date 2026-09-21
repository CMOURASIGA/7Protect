"use client";

import type { ReactNode } from "react";

type CrudDrawerProps = {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "wide";
};

/** Shared CRUD surface. Keeps record lists read-only and uses the HUB form hierarchy. */
export function CrudDrawer({ title, description, children, onClose, size = "default" }: CrudDrawerProps) {
  return (
    <div className="crud-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`crud-drawer ${size === "wide" ? "crud-drawer-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="crud-drawer-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="crud-drawer-header">
          <div>
            <p className="eyebrow">CADASTRO</p>
            <h2 id="crud-drawer-title">{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="drawer-close" aria-label="Fechar formulário" onClick={onClose}>×</button>
        </header>
        {children}
      </section>
    </div>
  );
}
