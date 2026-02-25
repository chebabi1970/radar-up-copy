import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  Sparkles,
  Shield,
  Zap,
  ArrowRight
} from 'lucide-react';

const tiposDivergencia = [
  { value: "cnpj_divergente", label: "CNPJ Divergente", icon: "shield" },
  { value: "razao_social_divergente", label: "Razão Social Divergente", icon: "building" },
  { value: "endereco_divergente", label: "Endereço Divergente", icon: "map" },
  { value: "valor_divergente", label: "Valor Divergente", icon: "dollar" },
  { value: "data_divergente", label: "Data Divergente", icon: "calendar" },
  { value: "assinatura_faltante", label: "Assinatura Faltante", icon: "pen" },
  { value: "documento_vencido", label: "Documento Vencido", icon: "clock" },
  { value: "informacao_incompleta", label: "Informação Incompleta", icon: "alert" },
  { value: "outro", label: "Outro", icon: "circle" }
];

const severidadeConfig = {
  critica: { label: 'Crítica', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  media: { label: 'Média', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  baixa: { label: 'Baixa', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
};

export default function DivergenciasTab({ caso, documentos }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({ tipo: '', descricao: '', documento1: '', documento2: '' });

  const queryClient = useQueryClient();
  const divergencias = caso.divergencias_encontradas || [];

  const addDivergenciaMutation = useMutation({
    mutationFn: async (novaDivergencia) => {
      const updatedDivergencias = [...divergencias, { ...novaDivergencia, resolvida: false }];
      return base44.entities.Caso.update(caso.id, { divergencias_encontradas: updatedDivergencias });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const toggleResolvida = useMutation({
    mutationFn: async (index) => {
      const updatedDivergencias = [...divergencias];
      updatedDivergencias[index].resolvida = !updatedDivergencias[index].resolvida;
      return base44.entities.Caso.update(caso.id, { divergencias_encontradas: updatedDivergencias });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caso', caso.id] })
  });

  const removeDivergencia = useMutation({
    mutationFn: async (index) => {
      const updatedDivergencias = divergencias.filter((_, i) => i !== index);
      return base44.entities.Caso.update(caso.id, { divergencias_encontradas: updatedDivergencias });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caso', caso.id] })
  });

  const analisarDocumentos = async () => {
    if (documentos.length < 2) return;
    setIsAnalyzing(true);

    try {
      const prompt = `Analise os seguintes documentos de um processo de revisão de estimativa para comércio exterior e identifique possíveis divergências entre eles:

Documentos disponíveis:
${documentos.map(d => `- ${d.nome_arquivo} (${d.tipo_documento})`).join('\n')}

Busque por divergências como:
- CNPJ diferente entre documentos
- Razão social com grafia diferente
- Endereços inconsistentes
- Valores que não batem
- Datas incompatíveis
- Informações faltantes
- Assinaturas ou reconhecimentos de firma ausentes

Para cada divergência, classifique a severidade:
- "critica": impede aprovação do processo
- "media": requer atenção mas não impede
- "baixa": observação para melhoria

Retorne apenas divergências reais que você identificou.`;

      const schema = {
        type: "object",
        properties: {
          divergencias: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string" },
                descricao: { type: "string" },
                documento1: { type: "string" },
                documento2: { type: "string" },
                severidade: { type: "string", enum: ["critica", "media", "baixa"] }
              }
            }
          }
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });

      if (result.divergencias && result.divergencias.length > 0) {
        const novasDivergencias = result.divergencias.map(d => ({ ...d, resolvida: false }));
        const updatedDivergencias = [...divergencias, ...novasDivergencias];
        await base44.entities.Caso.update(caso.id, { divergencias_encontradas: updatedDivergencias });
        queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
      }
    } catch (error) {
      console.error('Erro na análise:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => setFormData({ tipo: '', descricao: '', documento1: '', documento2: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    addDivergenciaMutation.mutate(formData);
  };

  const unresolvedCount = divergencias.filter(d => !d.resolvida).length;
  const resolvedCount = divergencias.filter(d => d.resolvida).length;
  const criticasCount = divergencias.filter(d => !d.resolvida && d.severidade === 'critica').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-400" />
            Análise de Divergências
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Inconsistências identificadas entre documentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={analisarDocumentos}
            disabled={isAnalyzing || documentos.length < 2}
            className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Detectar com IA
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Registrar Divergência
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Tipo de Divergência *</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})} required>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {tiposDivergencia.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Descrição *</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Descreva a divergência encontrada..."
                    rows={3}
                    required
                    className="rounded-xl resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">Documento 1</Label>
                    <Select value={formData.documento1} onValueChange={(value) => setFormData({...formData, documento1: value})}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {documentos.map(d => (
                          <SelectItem key={d.id} value={d.nome_arquivo}>{d.nome_arquivo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">Documento 2</Label>
                    <Select value={formData.documento2} onValueChange={(value) => setFormData({...formData, documento2: value})}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {documentos.map(d => (
                          <SelectItem key={d.id} value={d.nome_arquivo}>{d.nome_arquivo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                  <Button type="submit" className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl">Registrar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      {divergencias.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50/80 border border-red-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{unresolvedCount}</p>
              <p className="text-xs text-red-600">Pendentes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{resolvedCount}</p>
              <p className="text-xs text-emerald-600">Resolvidas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{criticasCount}</p>
              <p className="text-xs text-amber-600">Críticas</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {divergencias.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="font-medium text-slate-700">Nenhuma divergência registrada</p>
          <p className="text-sm text-slate-500 mt-1">Use a detecção com IA ou adicione manualmente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {divergencias.map((div, index) => {
            const sev = severidadeConfig[div.severidade] || severidadeConfig.media;
            return (
              <div
                key={index}
                className={`group relative rounded-2xl border transition-all ${
                  div.resolvida
                    ? 'bg-emerald-50/50 border-emerald-100'
                    : `${sev.bg} ${sev.border}`
                } hover:shadow-md hover:shadow-slate-100/50`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={div.resolvida}
                      onCheckedChange={() => toggleResolvida.mutate(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Badge className={div.resolvida ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : sev.badge} variant="outline">
                          {tiposDivergencia.find(t => t.value === div.tipo)?.label || div.tipo}
                        </Badge>
                        {!div.resolvida && div.severidade && (
                          <Badge className={sev.badge} variant="outline">
                            <div className={`w-1.5 h-1.5 rounded-full ${sev.dot} mr-1.5`} />
                            {sev.label}
                          </Badge>
                        )}
                        {div.resolvida && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolvida
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${div.resolvida ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {div.descricao}
                      </p>
                      {(div.documento1 || div.documento2) && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <FileText className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{div.documento1}</span>
                          {div.documento2 && (
                            <>
                              <ArrowRight className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{div.documento2}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 -mr-2 -mt-1"
                      onClick={() => removeDivergencia.mutate(index)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
