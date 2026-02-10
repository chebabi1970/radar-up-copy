import React, { useState } from 'react';
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
import { 
  CheckCircle2, 
  Circle, 
  FileText, 
  AlertCircle,
  Clock,
  Zap,
  Loader2
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

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900 text-sm md:text-base">
            Documentação Instrutória
          </h3>
          <div className="text-xs text-slate-500 whitespace-nowrap">
            {checklistItems.filter(i => i.status !== 'pendente').length} de {checklistItems.length} concluídos
          </div>
        </div>

      {checklistItems.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          Nenhum item no checklist
        </div>
      ) : (
        <div className="divide-y divide-slate-100 space-y-0">
          {checklistItems.map((item) => {
            const config = statusConfig[item.status];
            const StatusIcon = config.icon;
            const linkedDocs = getLinkedDocuments(item);

            return (
              <div key={item.id} className="py-3 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <StatusIcon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 text-sm break-words">{item.descricao}</span>
                      {item.obrigatorio && (
                        <Badge variant="outline" className="text-xs flex-shrink-0 mt-0.5">Obrigatório</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-slate-500 flex-wrap">
                      <span>Código: {item.codigo_dda}</span>
                      <span className="hidden md:inline">•</span>
                      <span className="hidden md:inline">{item.base_legal}</span>
                    </div>
                    {linkedDocs.length > 0 ? (
                      <div className="flex items-start gap-2 mt-2">
                        <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1 flex-shrink-0">
                          <FileText className="h-3 w-3" />
                          Anexado
                        </Badge>
                        <div className="flex flex-col gap-1">
                          {linkedDocs.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => setDocumentoVisualizar(doc)}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                            >
                              {doc.nome_arquivo}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
                  {linkedDocs.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalisar(item)}
                      className="h-8 px-2 md:h-9 md:px-3 text-xs gap-1 flex-shrink-0"
                    >
                      <Zap className="h-3 w-3" />
                      <span className="hidden sm:inline">Analisar</span>
                    </Button>
                  )}
                  <Select 
                    value={item.status} 
                    onValueChange={(value) => updateStatusMutation.mutate({ itemId: item.id, status: value })}
                  >
                    <SelectTrigger className="w-24 md:w-[140px] h-8 md:h-9 text-xs flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="nao_aplicavel">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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