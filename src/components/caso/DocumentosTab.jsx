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
  AlertCircle,
  History,
  MoreVertical
} from 'lucide-react';
import VisualizadorDocumento from './VisualizadorDocumento';
import VersionHistoricoPanel from './VersionHistoricoPanel';
import AdvancedFileUpload from '../upload/AdvancedFileUpload';
import EditarTipoDocumento from './EditarTipoDocumento';

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
  pendente: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", label: "Pendente", gradient: "from-amber-50 to-amber-50/50" },
  aprovado: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", label: "Aprovado", gradient: "from-emerald-50 to-emerald-50/50" },
  reprovado: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", label: "Reprovado", gradient: "from-red-50 to-red-50/50" },
  com_ressalvas: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200", label: "Com Ressalvas", gradient: "from-orange-50 to-orange-50/50" }
};

const fileTypeIcons = {
  pdf: 'text-red-500',
  jpg: 'text-blue-500',
  jpeg: 'text-blue-500',
  png: 'text-purple-500',
  doc: 'text-indigo-500',
  docx: 'text-indigo-500',
};

export default function DocumentosTab({ casoId, documentos, checklistItems, cliente }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [visualizadorOpen, setVisualizadorOpen] = useState(false);
  const [docParaVersoes, setDocParaVersoes] = useState(null);
  const [formData, setFormData] = useState({
    tipo_documento: '', nome_arquivo: '', data_documento: '', periodo_referencia: '', observacoes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const documentsToCreate = uploadedFiles.map(({ file, url }) => ({
        ...data, caso_id: casoId, file_uri: url, nome_arquivo: file.name, status_analise: 'pendente'
      }));
      return Promise.all(documentsToCreate.map(doc => base44.entities.Documento.create(doc)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', casoId] });
      queryClient.invalidateQueries({ queryKey: ['checklist', casoId] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => { alert('Erro ao enviar documento: ' + error.message); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Documento.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documentos', casoId] })
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Documento.update(id, { status_analise: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documentos', casoId] })
  });

  const resetForm = () => {
    setFormData({ tipo_documento: '', nome_arquivo: '', data_documento: '', periodo_referencia: '', observacoes: '' });
    setUploadedFiles([]);
  };

  const handleUploadComplete = (uploadData) => setUploadedFiles(prev => [...prev, uploadData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (uploadedFiles.length === 0) { alert('Faça upload de pelo menos um arquivo'); return; }
    if (!formData.tipo_documento) { alert('Selecione o tipo de documento'); return; }
    createMutation.mutate(formData);
  };

  const getFileExtension = (name) => name?.split('.').pop()?.toLowerCase() || '';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            Documentos Enviados
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">{documentos.length} documento(s)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Enviar Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-500" />
                Enviar Documento
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Tipo de Documento *</Label>
                <Select value={formData.tipo_documento} onValueChange={(value) => setFormData({...formData, tipo_documento: value})} required>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o tipo do documento" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoDocumentoLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!formData.tipo_documento && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Selecione o tipo de documento antes de fazer upload
                </div>
              )}

              {formData.tipo_documento && (
                <AdvancedFileUpload
                  onUploadComplete={handleUploadComplete}
                  maxSizeMB={50}
                  allowedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']}
                  multiple={true}
                  privateStorage={true}
                  label="Arquivo(s) *"
                  description="Arraste arquivos ou clique para selecionar"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Data do Documento</Label>
                  <Input type="date" value={formData.data_documento} onChange={(e) => setFormData({...formData, data_documento: e.target.value})} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Período de Referência</Label>
                  <Input value={formData.periodo_referencia} onChange={(e) => setFormData({...formData, periodo_referencia: e.target.value})} placeholder="Ex: Jan-Mar/2024" className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Observações</Label>
                <Textarea value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} rows={2} className="rounded-xl resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Document List */}
      {documentos.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mx-auto mb-4">
            <Upload className="h-8 w-8 text-slate-300" />
          </div>
          <p className="font-medium text-slate-700">Nenhum documento enviado ainda</p>
          <p className="text-sm text-slate-500 mt-1">Clique em "Enviar Documento" para começar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {documentos.map((doc) => {
            const statusConfig = statusAnaliseConfig[doc.status_analise] || statusAnaliseConfig.pendente;
            const StatusIcon = statusConfig.icon;
            const ext = getFileExtension(doc.nome_arquivo);
            const extColor = fileTypeIcons[ext] || 'text-slate-500';

            return (
              <div
                key={doc.id}
                className="group relative rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:shadow-lg hover:shadow-slate-100/50 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${statusConfig.bg} border ${statusConfig.border} flex-shrink-0`}>
                      <FileText className={`h-6 w-6 ${extColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.nome_arquivo}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {tipoDocumentoLabels[doc.tipo_documento] || doc.tipo_documento}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
                        <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                        {ext && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200">.{ext}</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Select
                      value={doc.status_analise}
                      onValueChange={(value) => updateStatusMutation.mutate({ id: doc.id, status: value })}
                    >
                      <SelectTrigger className="w-[130px] rounded-xl text-xs h-8">
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
                        variant="ghost" size="sm"
                        onClick={() => { setDocumentoSelecionado(doc); setVisualizadorOpen(true); }}
                        className="rounded-xl h-8 w-8 p-0"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4 text-slate-500" />
                      </Button>
                    )}

                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setDocParaVersoes(doc)}
                      className="rounded-xl h-8 w-8 p-0"
                      title="Histórico de versões"
                    >
                      <History className="h-4 w-4 text-slate-500" />
                    </Button>

                    <Button
                      variant="ghost" size="sm"
                      className="rounded-xl h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
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

      {docParaVersoes && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Histórico de Versões</h3>
              <Button variant="ghost" size="sm" onClick={() => setDocParaVersoes(null)} className="rounded-xl h-8 w-8 p-0">
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <VersionHistoricoPanel
                documentoId={docParaVersoes.id}
                casoId={casoId}
                cliente={cliente}
                onSelectVersion={() => setDocParaVersoes(null)}
                onViewDoc={(doc) => { setDocumentoSelecionado(doc); setVisualizadorOpen(true); setDocParaVersoes(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
