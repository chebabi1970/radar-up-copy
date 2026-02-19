import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2 } from 'lucide-react';

const tipoDocumentoLabels = {
  requerimento_das: "REQUERIMENTO",
  documento_identificacao_responsavel: "Documento de Identificação do Responsável",
  procuracao: "Procuração",
  documento_identificacao_procurador: "Documento de Identificação do Procurador",
  contrato_social: "Contrato Social e Alterações",
  certidao_junta_comercial: "Certidão Junta Comercial",
  conta_energia: "Conta de Energia (3 meses)",
  plano_internet: "Plano de Internet (3 meses)",
  guia_iptu: "Guia de IPTU",
  escritura_imovel: "Escritura do Imóvel",
  contrato_locacao: "Contrato de Locação",
  comprovante_espaco_armazenamento: "Comprovante Espaço Armazenamento",
  extrato_bancario_corrente: "Extratos Bancários - Conta Corrente (3 meses)",
  extrato_bancario_integralizacao: "Extratos Bancários - Integralização Capital",
  extrato_bancario_aplicacoes: "Extratos Bancários - Aplicações Financeiras",
  balancete_verificacao: "Balancete de Verificação",
  balanco_patrimonial_integralizacao: "Balanço Patrimonial - Integralização",
  comprovante_transferencia_integralizacao: "Comprovante Transferência - Integralização",
  das_simples_nacional: "DAS - Simples Nacional",
  darf_cprb: "DARF CPRB",
  contrato_mutuo: "Contrato de Mútuo",
  balancete_mutuante: "Balancete do Mutuante",
  comprovante_iof: "Comprovante IOF",
  outro: "Outro"
};

export default function EditarTipoDocumento({ documento, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [novoTipo, setNovoTipo] = useState(documento.tipo_documento);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Documento.update(documento.id, {
        tipo_documento: novoTipo
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      setIsOpen(false);
      if (onSuccess) onSuccess();
    }
  });

  const handleSave = () => {
    if (novoTipo !== documento.tipo_documento) {
      updateMutation.mutate();
    } else {
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-blue-600 hover:text-blue-700"
          title="Editar tipo de documento"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Tipo de Documento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-2">Arquivo: <strong>{documento.nome_arquivo}</strong></p>
            <Label>Tipo Atual: <strong>{tipoDocumentoLabels[documento.tipo_documento] || documento.tipo_documento}</strong></Label>
          </div>

          <div>
            <Label htmlFor="tipo">Novo Tipo</Label>
            <Select value={novoTipo} onValueChange={setNovoTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                {Object.entries(tipoDocumentoLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}