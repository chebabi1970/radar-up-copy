import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  Upload, 
  FileText, 
  Eye, 
  Trash2, 
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VisualizadorDocumento from './VisualizadorDocumento';

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

const statusAnaliseConfig = {
  pendente: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", label: "Pendente" },
  aprovado: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "Aprovado" },
  reprovado: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Reprovado" },
  com_ressalvas: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-100", label: "Com Ressalvas" }
};

export default function DocumentosTab({ casoId, documentos, checklistItems }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [visualizadorOpen, setVisualizadorOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo_documento: '',
    nome_arquivo: '',
    data_documento: '',
    periodo_referencia: '',
    observacoes: ''
  });
  const [files, setFiles] = useState([]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      setUploading(true);
      const documentsToCreate = [];
      
      for (const file of files) {
        let fileUri = '';
        
        if (file) {
          const uploadResult = await base44.integrations.Core.UploadPrivateFile({ file });
          fileUri = uploadResult.file_uri;
        }
        
        documentsToCreate.push({
          ...data,
          caso_id: casoId,
          file_uri: fileUri,
          nome_arquivo: file.name,
          status_analise: 'pendente'
        });
      }
      
      // Criar todos os documentos
      return Promise.all(documentsToCreate.map(doc => base44.entities.Documento.create(doc)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', casoId] });
      setIsDialogOpen(false);
      resetForm();
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Documento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', casoId] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Documento.update(id, { status_analise: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', casoId] });
    }
  });

  const resetForm = () => {
    setFormData({
      tipo_documento: '',
      nome_arquivo: '',
      data_documento: '',
      periodo_referencia: '',
      observacoes: ''
    });
    setFiles([]);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (files.length === 0) {
      alert('Selecione pelo menos um arquivo');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">
          Documentos Enviados
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" /> Enviar Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar Documento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Tipo de Documento *</Label>
                <Select
                  value={formData.tipo_documento}
                  onValueChange={(value) => setFormData({...formData, tipo_documento: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoDocumentoLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Arquivo</Label>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>

              <div>
                <Label>Nome do Arquivo</Label>
                <Input
                  value={formData.nome_arquivo}
                  onChange={(e) => setFormData({...formData, nome_arquivo: e.target.value})}
                  placeholder="Nome do documento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data do Documento</Label>
                  <Input
                    type="date"
                    value={formData.data_documento}
                    onChange={(e) => setFormData({...formData, data_documento: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Período de Referência</Label>
                  <Input
                    value={formData.periodo_referencia}
                    onChange={(e) => setFormData({...formData, periodo_referencia: e.target.value})}
                    placeholder="Ex: Jan-Mar/2024"
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={uploading}
                >
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {documentos.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
          <Upload className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p>Nenhum documento enviado ainda</p>
          <p className="text-sm mt-1">Clique em "Enviar Documento" para começar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {documentos.map((doc) => {
            const statusConfig = statusAnaliseConfig[doc.status_analise];
            const StatusIcon = statusConfig.icon;

            return (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{doc.nome_arquivo}</p>
                    <p className="text-sm text-slate-500">
                      {tipoDocumentoLabels[doc.tipo_documento] || doc.tipo_documento}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Select 
                    value={doc.status_analise} 
                    onValueChange={(value) => updateStatusMutation.mutate({ id: doc.id, status: value })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <StatusIcon className={`h-4 w-4 mr-2 ${statusConfig.color}`} />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="reprovado">Reprovado</SelectItem>
                      <SelectItem value="com_ressalvas">Com Ressalvas</SelectItem>
                    </SelectContent>
                  </Select>

                  {(doc.file_uri || doc.file_url) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setDocumentoSelecionado(doc);
                        setVisualizadorOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteMutation.mutate(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VisualizadorDocumento
        isOpen={visualizadorOpen}
        onClose={() => setVisualizadorOpen(false)}
        documento={documentoSelecionado}
        casoId={casoId}
      />
    </div>
  );
}