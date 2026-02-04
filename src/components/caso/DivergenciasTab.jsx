import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sparkles
} from 'lucide-react';

const tiposDivergencia = [
  { value: "cnpj_divergente", label: "CNPJ Divergente" },
  { value: "razao_social_divergente", label: "Razão Social Divergente" },
  { value: "endereco_divergente", label: "Endereço Divergente" },
  { value: "valor_divergente", label: "Valor Divergente" },
  { value: "data_divergente", label: "Data Divergente" },
  { value: "assinatura_faltante", label: "Assinatura Faltante" },
  { value: "documento_vencido", label: "Documento Vencido" },
  { value: "informacao_incompleta", label: "Informação Incompleta" },
  { value: "outro", label: "Outro" }
];

export default function DivergenciasTab({ caso, documentos }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    tipo: '',
    descricao: '',
    documento1: '',
    documento2: ''
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
    }
  });

  const removeDivergencia = useMutation({
    mutationFn: async (index) => {
      const updatedDivergencias = divergencias.filter((_, i) => i !== index);
      return base44.entities.Caso.update(caso.id, { divergencias_encontradas: updatedDivergencias });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
    }
  });

  const analisarDocumentos = async () => {
    if (documentos.length < 2) return;
    
    setIsAnalyzing(true);
    
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

Retorne apenas divergências reais que você identificou ou que são comuns neste tipo de análise.`;

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
              documento2: { type: "string" }
            }
          }
        }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    if (result.divergencias && result.divergencias.length > 0) {
      const novasDivergencias = result.divergencias.map(d => ({
        ...d,
        resolvida: false
      }));
      
      const updatedDivergencias = [...divergencias, ...novasDivergencias];
      await base44.entities.Caso.update(caso.id, { divergencias_encontradas: updatedDivergencias });
      queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
    }
    
    setIsAnalyzing(false);
  };

  const resetForm = () => {
    setFormData({
      tipo: '',
      descricao: '',
      documento1: '',
      documento2: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addDivergenciaMutation.mutate(formData);
  };

  const unresolvedCount = divergencias.filter(d => !d.resolvida).length;
  const resolvedCount = divergencias.filter(d => d.resolvida).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">
            Análise de Divergências
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Identifique inconsistências entre os documentos do caso
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={analisarDocumentos}
            disabled={isAnalyzing || documentos.length < 2}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Analisar com IA
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Divergência</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label>Tipo de Divergência *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({...formData, tipo: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposDivergencia.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Descrição *</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Descreva a divergência encontrada..."
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Documento 1</Label>
                    <Select
                      value={formData.documento1}
                      onValueChange={(value) => setFormData({...formData, documento1: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {documentos.map(d => (
                          <SelectItem key={d.id} value={d.nome_arquivo}>{d.nome_arquivo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Documento 2</Label>
                    <Select
                      value={formData.documento2}
                      onValueChange={(value) => setFormData({...formData, documento2: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {documentos.map(d => (
                          <SelectItem key={d.id} value={d.nome_arquivo}>{d.nome_arquivo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Registrar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      {divergencias.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <span className="text-slate-700">
              <strong>{unresolvedCount}</strong> pendente{unresolvedCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-slate-700">
              <strong>{resolvedCount}</strong> resolvida{resolvedCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Divergences List */}
      {divergencias.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-300" />
          <p>Nenhuma divergência registrada</p>
          <p className="text-sm mt-1">Use a análise com IA ou adicione manualmente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {divergencias.map((div, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-xl border ${div.resolvida ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={div.resolvida}
                    onCheckedChange={() => toggleResolvida.mutate(index)}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={div.resolvida ? "outline" : "destructive"}>
                        {tiposDivergencia.find(t => t.value === div.tipo)?.label || div.tipo}
                      </Badge>
                      {div.resolvida && (
                        <Badge className="bg-green-100 text-green-700">Resolvida</Badge>
                      )}
                    </div>
                    <p className={`mt-2 ${div.resolvida ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                      {div.descricao}
                    </p>
                    {(div.documento1 || div.documento2) && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                        <FileText className="h-3 w-3" />
                        <span>{div.documento1}</span>
                        {div.documento2 && (
                          <>
                            <span>↔</span>
                            <span>{div.documento2}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-slate-400 hover:text-red-600"
                  onClick={() => removeDivergencia.mutate(index)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}