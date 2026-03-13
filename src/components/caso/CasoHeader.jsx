/**
 * Componente modularizado para o header do caso
 * Extrai a lógica de edição de nome e status do CasoDetalhe
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Edit2, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logError, logInfo } from '@/components/utils/logger';

const statusLabels = {
  novo: "Novo",
  em_analise: "Em Análise",
  aguardando_documentos: "Aguardando Documentos",
  documentacao_completa: "Documentação Completa",
  protocolado: "Protocolado",
  deferido: "Deferido",
  indeferido: "Indeferido",
  arquivado: "Arquivado"
};

const statusColors = {
  novo: "bg-blue-100 text-blue-800 border-blue-200",
  em_analise: "bg-yellow-100 text-yellow-800 border-yellow-200",
  aguardando_documentos: "bg-orange-100 text-orange-800 border-orange-200",
  documentacao_completa: "bg-green-100 text-green-800 border-green-200",
  protocolado: "bg-purple-100 text-purple-800 border-purple-200",
  deferido: "bg-emerald-100 text-emerald-800 border-emerald-200",
  indeferido: "bg-red-100 text-red-800 border-red-200",
  arquivado: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function CasoHeader({ caso, cliente, hipoteseLabel, onStatusChange }) {
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState(caso?.numero_caso || '');
  const [dialogEmail, setDialogEmail] = useState(false);
  const [novoStatus, setNovoStatus] = useState(null);
  const queryClient = useQueryClient();

  const updateNomeMutation = useMutation({
    mutationFn: (newNome) => base44.entities.Caso.update(caso.id, { numero_caso: newNome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
      setEditandoNome(false);
      logInfo('Nome do caso atualizado', { casoId: caso.id });
    },
    onError: (error) => {
      logError('Erro ao atualizar nome do caso', error, { casoId: caso.id });
      toast.error('Erro ao atualizar nome');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ newStatus, enviarEmail }) => {
      const transicoes_validas = {
        novo: ['em_analise', 'aguardando_documentos'],
        em_analise: ['aguardando_documentos', 'documentacao_completa'],
        aguardando_documentos: ['em_analise', 'documentacao_completa'],
        documentacao_completa: ['protocolado', 'indeferido'],
        protocolado: ['deferido', 'indeferido', 'arquivado'],
        deferido: ['arquivado'],
        indeferido: ['arquivado'],
        arquivado: []
      };

      if (!transicoes_validas[caso.status]?.includes(newStatus)) {
        throw new Error(`Transição inválida de ${statusLabels[caso.status]} para ${statusLabels[newStatus]}`);
      }

      await base44.entities.Caso.update(caso.id, { status: newStatus });
      
      if (enviarEmail && cliente?.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: cliente.email,
            subject: `Status do Caso ${caso.numero_caso || caso.id.slice(0, 8)} Atualizado`,
            body: `<h2>Atualização de Status</h2><p>Olá,</p><p>O status do seu caso <strong>${caso.numero_caso || `#${caso.id.slice(0, 8)}`}</strong> foi atualizado para:</p><h3 style="color: #3b82f6;">${statusLabels[newStatus]}</h3><p><strong>Cliente:</strong> ${cliente.razao_social}<br/><strong>CNPJ:</strong> ${cliente.cnpj}</p><p>Para mais detalhes, acesse o sistema.</p><p>Atenciosamente</p>`
          });
          toast.success('Email enviado');
          logInfo('Email de status enviado', { casoId: caso.id, novoStatus: newStatus });
        } catch (error) {
          logError('Erro ao enviar email', error, { casoId: caso.id });
          toast.error('Erro ao enviar email');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
      setDialogEmail(false);
      setNovoStatus(null);
      toast.success('Status atualizado');
      onStatusChange?.();
      logInfo('Status do caso atualizado', { casoId: caso.id });
    },
    onError: (error) => {
      logError('Erro ao atualizar status', error, { casoId: caso.id });
      toast.error(`Erro: ${error.message}`);
    }
  });

  const handleStatusChange = (value) => {
    setNovoStatus(value);
    setDialogEmail(true);
  };

  const confirmarAlteracao = (enviarEmail) => {
    updateStatusMutation.mutate({ newStatus: novoStatus, enviarEmail });
  };

  const handleSalvarNome = () => {
    if (novoNome.trim()) {
      updateNomeMutation.mutate(novoNome.trim());
    }
  };

  return (
    <div className="mb-3">
      <div className="flex flex-col gap-2">
        <div className="flex-1">
          {editandoNome ? (
            <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4">
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Digite o nome do caso"
                className="text-xl md:text-3xl font-bold h-9 md:h-10"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSalvarNome}
                disabled={updateNomeMutation.isPending}
                className="h-9 w-9 md:h-10 md:w-10"
              >
                <Check className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditandoNome(false)}
                className="h-9 w-9 md:h-10 md:w-10"
              >
                <X className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 flex-wrap">
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight break-words">
                {caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`}
              </h1>
              <Button
                size="icon"
                variant="ghost"
                className="text-slate-400 hover:text-slate-600 h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
                onClick={() => {
                  setNovoNome(caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`);
                  setEditandoNome(true);
                }}
              >
                <Edit2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2 flex-wrap">
            <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs md:text-sm text-slate-600 break-words">{cliente?.razao_social}</span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1 md:mt-1.5 line-clamp-2">
            {hipoteseLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <Select value={caso.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full md:w-[200px] h-9 md:h-10 text-xs md:text-sm rounded-xl border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge className={`${statusColors[caso.status]} border text-xs md:text-sm py-1 md:py-1.5 px-2.5 md:px-3 flex-shrink-0 rounded-lg font-medium`}>
            {statusLabels[caso.status]}
          </Badge>
        </div>
      </div>

      <Dialog open={dialogEmail} onOpenChange={setDialogEmail}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Notificar Cliente?</DialogTitle>
            <DialogDescription>
              Deseja enviar um email para <strong>{cliente?.email}</strong> notificando sobre a mudança de status para <strong>{statusLabels[novoStatus]}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => confirmarAlteracao(false)}
              disabled={updateStatusMutation.isPending}
              className="rounded-xl"
            >
              Não enviar
            </Button>
            <Button
              onClick={() => confirmarAlteracao(true)}
              disabled={updateStatusMutation.isPending}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
            >
              {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}