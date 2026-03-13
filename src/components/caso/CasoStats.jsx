/**
 * Componente modularizado para exibir cards de estatísticas do caso
 * Reduz complexidade do CasoDetalhe
 */
import React from 'react';
import { FileText, CheckSquare, AlertTriangle, Calculator } from 'lucide-react';

export default function CasoStats({ documentos = [], checklistItems = [], caso }) {
  const pendingItems = checklistItems.filter(i => i.status === 'pendente').length;
  const completedItems = checklistItems.filter(i => i.status !== 'pendente').length;

  const stats = [
    { 
      icon: FileText, 
      label: 'Documentos', 
      value: documentos.length, 
      color: 'blue', 
      gradient: 'from-blue-500 to-indigo-600' 
    },
    { 
      icon: CheckSquare, 
      label: 'Checklist', 
      value: `${completedItems}/${checklistItems.length}`, 
      color: 'emerald', 
      gradient: 'from-emerald-500 to-teal-600' 
    },
    { 
      icon: AlertTriangle, 
      label: 'Pendentes', 
      value: pendingItems, 
      color: 'amber', 
      gradient: 'from-amber-500 to-orange-600' 
    },
    { 
      icon: Calculator, 
      label: 'Estimativa', 
      value: caso?.estimativa_calculada && typeof caso.estimativa_calculada === 'number' && caso.estimativa_calculada > 0
        ? `R$ ${caso.estimativa_calculada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'Pendente', 
      color: 'violet', 
      gradient: 'from-violet-500 to-purple-600' 
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
      {stats.map((card, idx) => (
        <div 
          key={idx} 
          className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-2.5 transition-all hover:shadow-lg hover:shadow-slate-100/50 hover:-translate-y-0.5"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-slate-50/80 to-transparent rounded-full -translate-y-1/3 translate-x-1/3 group-hover:from-slate-100/80 transition-colors" />
          <div className="relative flex items-center gap-2 md:gap-3">
            <div className={`h-9 w-9 md:h-11 md:w-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center flex-shrink-0 shadow-lg shadow-${card.color}-200/50`}>
              <card.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</p>
              <p className="text-lg md:text-xl font-bold text-slate-900 truncate">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}