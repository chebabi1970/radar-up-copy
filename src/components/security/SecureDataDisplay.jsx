import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Componente para exibir dados sensíveis com proteção contra cópia/seleção
 * 
 * Uso:
 * <SecureDataDisplay type="cnpj" value="12.345.678/0001-90" />
 * <SecureDataDisplay type="cpf" value="123.456.789-00" />
 * <SecureDataDisplay sensitive value="Dado confidencial" />
 */
export default function SecureDataDisplay({ 
  children, 
  value, 
  type, 
  sensitive = false,
  className,
  ...props 
}) {
  const content = value || children;
  const isSensitive = sensitive || ['cnpj', 'cpf', 'rg', 'senha'].includes(type);
  
  return (
    <span
      data-sensitive={isSensitive}
      data-type={type}
      className={cn(
        "inline-block",
        isSensitive && "select-none cursor-default",
        className
      )}
      onCopy={(e) => {
        if (isSensitive) {
          e.preventDefault();
          return false;
        }
      }}
      onCut={(e) => {
        if (isSensitive) {
          e.preventDefault();
          return false;
        }
      }}
      onDragStart={(e) => {
        if (isSensitive) {
          e.preventDefault();
          return false;
        }
      }}
      {...props}
    >
      {content}
    </span>
  );
}

/**
 * Componente para exibir imagens sensíveis (documentos, etc)
 * com proteção contra arrastar/copiar
 */
export function SecureImage({ src, alt, className, ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      data-sensitive="true"
      className={cn("select-none pointer-events-none", className)}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      {...props}
    />
  );
}

/**
 * Componente container para áreas que não devem ser impressas
 */
export function NoPrintArea({ children, className, ...props }) {
  return (
    <div className={cn("no-print", className)} {...props}>
      {children}
    </div>
  );
}