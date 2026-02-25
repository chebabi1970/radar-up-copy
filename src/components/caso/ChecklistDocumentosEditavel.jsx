/**
 * Checklist Editável de Documentos
 * Permite ao usuário marcar manualmente quais documentos são obrigatórios
 */

import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  Circle,
  FileText,
  Upload,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { getDocumentosAplicaveis } from '@/config/documentosPorHipotese';

export default function ChecklistDocumentosEditavel({ casoId, hipotese, documentos, onViewClick, onUploadClick }) {
  const queryClient = useQueryClient();
  const [expandidas, setExpandidas] = useState({});
  const [documentosObrigatorios, setDocumentosObrigatorios] = useState({});

  // Obter documentos aplicáveis à hipótese
  const documentosAplicaveis = useMemo(() => {
    return getDocumentosAplicaveis(hipotese);
  }, [hipotese]);

  // Agrupar documentos enviados por tipo
  const documentosPorTipo = useMemo(() => {
    const grupos = {};
    documentos?.forEach(doc => {
      if (!grupos[doc.tipo]) {
        grupos[doc.tipo] = [];
      }
      grupos[doc.tipo].push(doc);
    });
    return grupos;
  }, [documentos]);

  // Mutation para salvar status de obrigatório
  const salvarObrigatorioMutation = useMutation({
    mutationFn: async ({ tipo, obrigatorio }) => {
      // Salvar no banco (você precisará criar esta entidade)
      await base44.entities.DocumentoObrigatorio.upsert({
        caso_id: casoId,
        tipo_documento: tipo,
        obrigatorio: obrigatorio
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documentos-obrigatorios', casoId]);
      toast.success('Status atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status');
      console.error(error);
    }
  });

  const toggleObrigatorio = (tipo) => {
    const novoStatus = !documentosObrigatorios[tipo];
    setDocumentosObrigatorios(prev => ({
      ...prev,
      [tipo]: novoStatus
    }));
    salvarObrigatorioMutation.mutate({ tipo, obrigatorio: novoStatus });
  };

  const toggleCategoria = (categoriaId) => {
    setExpandidas(prev => ({
      ...prev,
      [categoriaId]: !prev[categoriaId]
    }));
  };

  // Estatísticas
  const stats = useMemo(() => {
    const total = documentosAplicaveis.length;
    const enviados = documentosAplicaveis.filter(doc => documentosPorTipo[doc.tipo]).length;
    const obrigatoriosMarcados = Object.values(documentosObrigatorios).filter(Boolean).length;
    const obrigatoriosEnviados = documentosAplicaveis.filter(doc => 
      documentosObrigatorios[doc.tipo] && documentosPorTipo[doc.tipo]
    ).length;

    return {
      total,
      enviados,
      obrigatoriosMarcados,
      obrigatoriosEnviados,
      percentual: total > 0 ? Math.round((enviados / total) * 100) : 0
    };
  }, [documentosAplicaveis, documentosPorTipo, documentosObrigatorios]);

  // Agrupar por categoria
  const categorias = useMemo(() => {
    const cats = {};
    documentosAplicaveis.forEach(doc => {
      if (!cats[doc.categoria]) {
        cats[doc.categoria] = {
          nome: doc.categoriaNome,
          cor: doc.categoriaCor,
          documentos: []
        };
      }
      cats[doc.categoria].documentos.push(doc);
    });
    return Object.entries(cats).map(([id, data]) => ({
      id,
      ...data
    }));
  }, [documentosAplicaveis]);

  return (
    <div className="space-y-4">
      {/* Cabeçalho com estatísticas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Checklist de Documentos</h3>
              <p className="text-sm text-gray-600">
                Marque quais documentos são obrigatórios para este caso
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {stats.enviados}/{stats.total}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.obrigatoriosMarcados}</div>
              <div className="text-xs text-gray-600">Marcados como Obrigatórios</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.obrigatoriosEnviados}</div>
              <div className="text-xs text-gray-600">Obrigatórios Enviados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.percentual}%</div>
              <div className="text-xs text-gray-600">Progresso Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de categorias */}
      <div className="space-y-3">
        {categorias.map(categoria => {
          const expandida = expandidas[categoria.id];
          const docsCategoria = categoria.documentos;
          const enviados = docsCategoria.filter(doc => documentosPorTipo[doc.tipo]).length;

          return (
            <Card key={categoria.id}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategoria(categoria.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className={`h-5 w-5 text-${categoria.cor}-600`} />
                    <div>
                      <CardTitle className="text-base">{categoria.nome}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {enviados}/{docsCategoria.length} documentos
                      </p>
                    </div>
                  </div>
                  {expandida ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </CardHeader>

              {expandida && (
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {docsCategoria.map(doc => {
                      const presente = documentosPorTipo[doc.tipo];
                      const quantidade = presente ? presente.length : 0;
                      const obrigatorio = documentosObrigatorios[doc.tipo];

                      return (
                        <div
                          key={doc.tipo}
                          className={`border rounded-lg p-4 ${
                            presente ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox Obrigatório */}
                            <div className="flex items-center pt-1">
                              <Checkbox
                                checked={obrigatorio}
                                onCheckedChange={() => toggleObrigatorio(doc.tipo)}
                                id={`obrigatorio-${doc.tipo}`}
                              />
                            </div>

                            {/* Ícone de status */}
                            <div className="pt-1">
                              {presente ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400" />
                              )}
                            </div>

                            {/* Informações do documento */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <label
                                  htmlFor={`obrigatorio-${doc.tipo}`}
                                  className={`text-sm font-medium cursor-pointer ${
                                    presente ? 'text-green-900' : 'text-gray-700'
                                  }`}
                                >
                                  {doc.nome}
                                </label>
                                {obrigatorio && (
                                  <Badge variant="destructive" className="text-xs">
                                    Obrigatório
                                  </Badge>
                                )}
                                {quantidade > 1 && (
                                  <Badge variant="outline" className="text-xs">
                                    {quantidade} arquivos
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {doc.descricao}
                              </p>
                              {doc.periodo && (
                                <p className="text-xs text-blue-600 mt-1">
                                  📅 {doc.periodo}
                                </p>
                              )}
                            </div>

                            {/* Botões de ação */}
                            <div className="flex items-center gap-2">
                              {presente ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => onViewClick && onViewClick(doc.tipo)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => onUploadClick && onUploadClick(doc.tipo)}
                                >
                                  <Upload className="h-4 w-4" />
                                  Enviar
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
