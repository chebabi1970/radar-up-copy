import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function UploadNovaVersao({ documentoAtual, casoId, onClose, onSuccess }) {
  const [arquivo, setArquivo] = useState(null);
  const [tags, setTags] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!arquivo) {
        throw new Error('Selecione um arquivo');
      }

      const user = await base44.auth.me();
      const novaVersao = documentoAtual.versao_numero + 1;
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

      // Upload do arquivo
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: arquivo
      });

      // Criar novo registro de documento (nova versão)
      const novoDoc = await base44.entities.Documento.create({
        caso_id: casoId,
        tipo_documento: documentoAtual.tipo_documento,
        nome_arquivo: arquivo.name,
        file_url: uploadResult.file_url,
        data_documento: documentoAtual.data_documento,
        periodo_referencia: documentoAtual.periodo_referencia,
        versao_numero: novaVersao,
        documento_pai_id: documentoAtual.id,
        status_versao: 'em_analise',
        tags_versao: tagsArray,
        usuario_upload: user.email,
        observacoes: observacoes
      });

      // Se houver observações, tentar gerar resumo de alterações com IA
      if (observacoes || tagsArray.includes('corrigido')) {
        try {
          const resumoIA = await base44.integrations.Core.InvokeLLM({
            prompt: `Baseado na descrição de mudanças fornecida, crie um resumo conciso (máximo 3 linhas) das alterações em um documento:
Descrição: ${observacoes || 'Documento corrigido/atualizado'}
Tipo de documento: ${documentoAtual.tipo_documento?.replace(/_/g, ' ')}
Versão anterior: ${documentoAtual.versao_numero}
Versão nova: ${novaVersao}

Retorne apenas o resumo das principais alterações.`
          });

          // Atualizar com resumo gerado
          await base44.entities.Documento.update(novoDoc.id, {
            resumo_alteracoes: resumoIA
          });
        } catch (e) {
          console.log('Não foi possível gerar resumo automático');
        }
      }

      // Marcar versão anterior como obsoleta
      await base44.entities.Documento.update(documentoAtual.id, {
        status_versao: 'obsoleta'
      });

      return novoDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', casoId] });
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      setErro(error.message);
    }
  });

  if (!documentoAtual) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle>Nova Versão do Documento</CardTitle>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {/* Documento Atual */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 font-semibold">Documento Base</p>
            <p className="text-sm font-medium text-blue-900 mt-1">{documentoAtual.nome_arquivo}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-blue-100 text-blue-800">
                v{documentoAtual.versao_numero}
              </Badge>
              <Badge className={
                documentoAtual.status_versao === 'ativa'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-100 text-slate-800'
              }>
                {documentoAtual.status_versao}
              </Badge>
            </div>
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-900">
              Novo Arquivo da Versão
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={(e) => {
                  setArquivo(e.target.files?.[0] || null);
                  setErro(null);
                }}
                disabled={uploadMutation.isPending}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-900">
                  {arquivo ? arquivo.name : 'Clique ou arraste um arquivo'}
                </p>
                <p className="text-xs text-slate-500 mt-1">PDF, Imagem ou Documento</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-900">
              Tags (separadas por vírgula)
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ex: corrigido, completo, final"
              disabled={uploadMutation.isPending}
              className="text-sm"
            />
            <p className="text-xs text-slate-500">
              Sugestões: corrigido, completo, final, atualizado, revisado
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-900">
              Descrição das Alterações
            </label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva as mudanças realizadas nesta versão..."
              disabled={uploadMutation.isPending}
              className="text-sm h-20 resize-none"
            />
            <p className="text-xs text-slate-500">
              A IA gerará um resumo automático das alterações
            </p>
          </div>

          {/* Erro */}
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{erro}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={uploadMutation.isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!arquivo || uploadMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Criar Nova Versão'
              )}
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            A versão anterior será marcada como obsoleta. Você pode restaurá-la depois se necessário.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}