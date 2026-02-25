import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Circle, 
  FileText, 
  AlertCircle,
  Clock,
  Zap,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import AnaliseDocumentoModal from './AnaliseDocumentoModal';
import VisualizadorDocumento from './VisualizadorDocumento';

const statusConfig = {
  pendente: { icon: Circle, color: "text-slate-400", bg: "bg-slate-100", label: "Pendente" },
  enviado: { icon: Clock, color: "text-blue-600", bg: "bg-blue-100", label: "Enviado" },
  aprovado: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "Aprovado" },
  nao_aplicavel: { icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-50", label: "N/A" }
};

export default function ChecklistTab({ casoId, checklistItems, documentos, cliente }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [documentoVisualizar, setDocumentoVisualizar] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [expandido, setExpandido] = useState({});
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, status }) => base44.entities.ChecklistItem.update(itemId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', casoId] });
    }
  });

  const getLinkedDocuments = (item) => {
    return documentos.filter(d => d.tipo_documento === item.tipo_documento);
  };

  const handleAnalisar = (item) => {
    setItemSelecionado(item);
    setModalOpen(true);
  };

  // Calcular progresso
  const progresso = useMemo(() => {
    if (checklistItems.length === 0) return 0;
    const concluidos = checklistItems.filter(i => i.status === 'aprovado' || i.status === 'nao_aplicavel').length;
    return Math.round((concluidos / checklistItems.length) * 100);
  }, [checklistItems]);

  // Filtrar itens
  const itensFiltrados = useMemo(() => {
    if (filtroStatus === 'todos') return checklistItems;
    return checklistItems.filter(i => i.status === filtroStatus);
  }, [checklistItems, filtroStatus]);

  // Agrupar por categoria (baseado no código DDA)
  const itensAgrupados = useMemo(() => {
    const grupos = {};
    itensFiltrados.forEach(item => {
      const codigo = item.codigo_dda?.split('-')[0] || 'Outros';
      if (!grupos[codigo]) {
        grupos[codigo] = [];
      }
      grupos[codigo].push(item);
    });
    return grupos;
  }, [itensFiltrados]);

  return (
    <>
      <div className="space-y-4">
        {/* Header com progresso e filtros */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-base md:text-lg mb-2">
                Documentação Instrutória
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Progress value={progresso} className="h-2 flex-1" />
                  <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                    {progresso}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium">{checklistItems.filter(i => i.status === 'aprovado' || i.status === 'nao_aplicavel').length}</span>
                  <span>de</span>
                  <span className="font-medium">{checklistItems.length}</span>
                  <span>concluídos</span>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="enviado">Enviados</SelectItem>
                    <SelectItem value="aprovado">Aprovados</SelectItem>
                    <SelectItem value="nao_aplicavel">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Legenda de status */}
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
            {Object.entries(statusConfig).map(([key, config]) => {
              const StatusIcon = config.icon;
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <div className={`h-5 w-5 rounded flex items-center justify-center ${config.bg}`}>
                    <StatusIcon className={`h-3 w-3 ${config.color}`} />
                  </div>
                  <span className="text-slate-600">{config.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de itens agrupados */}
        {itensFiltrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm bg-slate-50 rounded-lg">
            {filtroStatus === 'todos' ? 'Nenhum item no checklist' : `Nenhum item com status "${statusConfig[filtroStatus]?.label}"`}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(itensAgrupados).map(([grupo, items]) => {
              const isExpanded = expandido[grupo] !== false;
              const grupoAprovados = items.filter(i => i.status === 'aprovado' || i.status === 'nao_aplicavel').length;
              
              return (
                <div key={grupo} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  {/* Header do grupo */}
                  <button
                    onClick={() => setExpandido(prev => ({ ...prev, [grupo]: !isExpanded }))}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium text-slate-900 text-sm">
                          Categoria {grupo}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {grupoAprovados}/{items.length} itens concluídos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {items.length}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Conteúdo do grupo */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {items.map((item) => {
                        const config = statusConfig[item.status];
                        const StatusIcon = config.icon;
                        const linkedDocs = getLinkedDocuments(item);
                        const itemExpandido = expandido[item.id];

                        return (
                          <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              {/* Conteúdo principal */}
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                                  <StatusIcon className={`h-4 w-4 ${config.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-2 flex-wrap mb-1">
                                    <span className="font-medium text-slate-900 text-sm break-words">
                                      {item.descricao}
                                    </span>
                                    {item.obrigatorio && (
                                      <Badge variant="destructive" className="text-xs flex-shrink-0">
                                        Obrigatório
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                                      {item.codigo_dda}
                                    </span>
                                    {item.base_legal && (
                                      <>
                                        <span>•</span>
                                        <span>{item.base_legal}</span>
                                      </>
                                    )}
                                  </div>

                                  {/* Documentos anexados */}
                                  {linkedDocs.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1 w-fit">
                                        <FileText className="h-3 w-3" />
                                        {linkedDocs.length} documento(s) anexado(s)
                                      </Badge>
                                      <div className="flex flex-col gap-1 ml-1">
                                        {linkedDocs.map((doc) => (
                                          <button
                                            key={doc.id}
                                            onClick={() => setDocumentoVisualizar(doc)}
                                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium text-left flex items-center gap-1"
                                          >
                                            <FileText className="h-3 w-3" />
                                            {doc.nome_arquivo}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Detalhes expandidos */}
                                  {itemExpandido && (
                                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
                                      {item.aplicavel_hipotese && item.aplicavel_hipotese.length > 0 && (
                                        <div>
                                          <span className="font-medium">Aplicável em:</span>
                                          <span className="ml-1">{item.aplicavel_hipotese.join(', ')}</span>
                                        </div>
                                      )}
                                      {item.documento_id && (
                                        <div>
                                          <span className="font-medium">Documento vinculado:</span>
                                          <span className="ml-1 font-mono">{item.documento_id.slice(0, 8)}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Botão expandir detalhes */}
                                  <button
                                    onClick={() => setExpandido(prev => ({ ...prev, [item.id]: !itemExpandido }))}
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    {itemExpandido ? (
                                      <>
                                        <ChevronUp className="h-3 w-3" />
                                        Menos detalhes
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3" />
                                        Mais detalhes
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Ações */}
                              <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-start">
                                {linkedDocs.length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAnalisar(item)}
                                    className="h-9 px-3 text-xs gap-1.5 flex-shrink-0"
                                  >
                                    <Zap className="h-3.5 w-3.5" />
                                    Analisar
                                  </Button>
                                )}
                                <Select 
                                  value={item.status} 
                                  onValueChange={(value) => updateStatusMutation.mutate({ itemId: item.id, status: value })}
                                >
                                  <SelectTrigger className="w-[140px] h-9 text-xs flex-shrink-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pendente">
                                      <div className="flex items-center gap-2">
                                        <Circle className="h-3 w-3 text-slate-400" />
                                        Pendente
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="enviado">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3 text-blue-600" />
                                        Enviado
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="aprovado">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                        Aprovado
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="nao_aplicavel">
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3 text-slate-400" />
                                        N/A
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <AnaliseDocumentoModal
          item={itemSelecionado}
          documentos={documentos}
          casoId={casoId}
          cliente={cliente}
          onClose={() => {
            setModalOpen(false);
            setItemSelecionado(null);
          }}
        />
      )}

      {documentoVisualizar && (
        <VisualizadorDocumento
          isOpen={true}
          documento={documentoVisualizar}
          onClose={() => setDocumentoVisualizar(null)}
        />
      )}
    </>
  );
}