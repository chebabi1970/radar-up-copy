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

const statusConfig = {
  pendente: { icon: Circle, color: "text-slate-400", bg: "bg-slate-100", label: "Pendente" },
  enviado: { icon: Clock, color: "text-blue-600", bg: "bg-blue-100", label: "Enviado" },
  aprovado: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "Aprovado" },
  nao_aplicavel: { icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-50", label: "N/A" }
};

export default function ChecklistTab({ casoId, checklistItems, documentos, cliente }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, status }) => base44.entities.ChecklistItem.update(itemId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', casoId] });
    }
  });

  const getLinkedDocument = (item) => {
    return documentos.find(d => d.tipo_documento === item.tipo_documento);
  };

  const handleAnalisar = (item) => {
    setItemSelecionado(item);
    setModalOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            Documentação Instrutória - Anexo Único Portaria Coana 72/2020
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{checklistItems.filter(i => i.status !== 'pendente').length} de {checklistItems.length} concluídos</span>
          </div>
        </div>

      {checklistItems.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          Nenhum item no checklist
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {checklistItems.map((item) => {
            const config = statusConfig[item.status];
            const StatusIcon = config.icon;
            const linkedDoc = getLinkedDocument(item);

            return (
              <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                    <StatusIcon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{item.descricao}</span>
                      {item.obrigatorio && (
                        <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span>Código: {item.codigo_dda}</span>
                      <span>•</span>
                      <span>{item.base_legal}</span>
                    </div>
                    {linkedDoc && (
                      <a
                        href={linkedDoc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{linkedDoc.nome_arquivo}</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {linkedDoc && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalisar(item)}
                      className="h-9 px-3 text-xs gap-1"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Analisar
                    </Button>
                  )}
                  <Select 
                    value={item.status} 
                    onValueChange={(value) => updateStatusMutation.mutate({ itemId: item.id, status: value })}
                  >
                    <SelectTrigger className="w-[140px]">
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
    </>
  );
}