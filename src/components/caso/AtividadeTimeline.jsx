import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Activity,
  Clock,
  Search,
  ArrowRight,
  Zap
} from 'lucide-react';

const eventConfig = {
  documento_upload: {
    icon: Upload,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Documento enviado'
  },
  documento_aprovado: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: 'Documento aprovado'
  },
  documento_reprovado: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Documento reprovado'
  },
  analise_realizada: {
    icon: Search,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    label: 'Análise realizada'
  },
  analise_critica: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Divergência crítica'
  },
  analise_cruzada: {
    icon: Shield,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    label: 'Análise cruzada'
  },
  status_alterado: {
    icon: ArrowRight,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Status alterado'
  },
  caso_criado: {
    icon: Zap,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    label: 'Caso criado'
  }
};

const defaultEvent = {
  icon: Activity,
  color: 'text-slate-500',
  bg: 'bg-slate-50',
  border: 'border-slate-200',
  label: 'Atividade'
};

function formatarDataRelativa(dataStr) {
  const data = new Date(dataStr);
  const agora = new Date();
  const diffMs = agora - data;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHoras < 24) return `${diffHoras}h atrás`;
  if (diffDias < 7) return `${diffDias}d atrás`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatarDataCompleta(dataStr) {
  return new Date(dataStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function AtividadeTimeline({ casoId, documentos = [], caso }) {
  const { data: analisesHistorico = [] } = useQuery({
    queryKey: ['analises-historico', casoId],
    queryFn: () => base44.entities.AnaliseHistorico.filter({ caso_id: casoId }),
    enabled: !!casoId
  });

  const eventos = useMemo(() => {
    const lista = [];

    // Evento de criação do caso
    if (caso?.created_date) {
      lista.push({
        tipo: 'caso_criado',
        data: caso.created_date,
        titulo: 'Caso criado',
        descricao: caso.numero_caso || `#${caso.id?.slice(0, 8)}`
      });
    }

    // Eventos de documentos
    documentos.forEach(doc => {
      lista.push({
        tipo: 'documento_upload',
        data: doc.created_date,
        titulo: doc.nome_arquivo || 'Documento',
        descricao: doc.tipo_documento?.replace(/_/g, ' ')
      });

      if (doc.status_analise === 'aprovado') {
        lista.push({
          tipo: 'documento_aprovado',
          data: doc.updated_date || doc.created_date,
          titulo: `${doc.nome_arquivo} aprovado`,
          descricao: 'Documento validado'
        });
      } else if (doc.status_analise === 'reprovado') {
        lista.push({
          tipo: 'documento_reprovado',
          data: doc.updated_date || doc.created_date,
          titulo: `${doc.nome_arquivo} reprovado`,
          descricao: 'Correção necessária'
        });
      }
    });

    // Eventos de análises
    analisesHistorico.forEach(analise => {
      const temCritica = analise.discrepancias_criticas > 0;
      lista.push({
        tipo: temCritica ? 'analise_critica' : 'analise_realizada',
        data: analise.data_hora_analise || analise.created_date,
        titulo: analise.tipo_analise === 'cruzada' ? 'Análise cruzada' : (analise.documento_nome || 'Análise de documento'),
        descricao: temCritica
          ? `${analise.discrepancias_criticas} divergência(s) crítica(s)`
          : analise.status_resultado === 'sem_discrepancias'
            ? 'Sem divergências'
            : `${analise.total_discrepancias || 0} divergência(s)`
      });
    });

    // Ordenar por data (mais recente primeiro)
    lista.sort((a, b) => new Date(b.data) - new Date(a.data));

    return lista;
  }, [caso, documentos, analisesHistorico]);

  // Agrupar por dia
  const eventosPorDia = useMemo(() => {
    const grupos = {};
    eventos.forEach(ev => {
      const dia = new Date(ev.data).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      if (!grupos[dia]) grupos[dia] = [];
      grupos[dia].push(ev);
    });
    return grupos;
  }, [eventos]);

  if (eventos.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mx-auto mb-3">
          <Clock className="h-7 w-7 text-slate-300" />
        </div>
        <p className="font-medium text-slate-600">Nenhuma atividade registrada</p>
        <p className="text-sm text-slate-400 mt-1">As atividades aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-300/50">
          <Activity className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Atividade Recente</h3>
          <p className="text-xs text-slate-500">{eventos.length} evento(s)</p>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(eventosPorDia).map(([dia, eventosNoDia]) => (
          <div key={dia}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2">{dia}</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="relative">
              {/* Linha vertical de conexão */}
              <div className="absolute left-[18px] top-3 bottom-3 w-px bg-slate-100" />

              <div className="space-y-3">
                {eventosNoDia.map((evento, idx) => {
                  const config = eventConfig[evento.tipo] || defaultEvent;
                  const Icon = config.icon;

                  return (
                    <div key={idx} className="relative flex items-start gap-3 group">
                      <div className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-xl ${config.bg} border ${config.border} flex-shrink-0 transition-transform group-hover:scale-110`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate">{evento.titulo}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0" title={formatarDataCompleta(evento.data)}>
                            {formatarDataRelativa(evento.data)}
                          </span>
                        </div>
                        {evento.descricao && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{evento.descricao}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
