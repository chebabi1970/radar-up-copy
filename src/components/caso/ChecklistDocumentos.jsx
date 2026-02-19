/**
 * Checklist Interativo de Documentos
 * Lista de verificação visual e interativa dos documentos necessários
 */

import React, { useState, useMemo } from 'react';
import { isDocumentoObrigatorio, isDocumentoAplicavel, getPeriodoDocumento } from '@/config/documentosPorHipotese';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  FileText,
  Upload,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * Definição dos documentos necessários por categoria
 */
const CATEGORIAS_DOCUMENTOS = [
  {
    id: 'identificacao',
    nome: 'Identificação e Representação',
    cor: 'blue',
    documentos: [
      {
        tipo: 'requerimento_das',
        nome: 'Requerimento DAS',
        descricao: 'Formulário de requerimento preenchido e assinado',
        obrigatorio: true
      },
      {
        tipo: 'documento_identificacao_responsavel',
        nome: 'Documento de Identificação do Responsável',
        descricao: 'RG, CNH ou documento oficial com foto',
        obrigatorio: true
      },
      {
        tipo: 'procuracao',
        nome: 'Procuração',
        descricao: 'Se houver procurador representando a empresa',
        obrigatorio: false
      },
      {
        tipo: 'documento_identificacao_procurador',
        nome: 'Documento de Identificação do Procurador',
        descricao: 'Necessário se houver procuração',
        obrigatorio: false
      }
    ]
  },
  {
    id: 'constitutivos',
    nome: 'Documentos Constitutivos',
    cor: 'purple',
    documentos: [
      {
        tipo: 'contrato_social',
        nome: 'Contrato Social e Alterações',
        descricao: 'Contrato social consolidado ou com todas as alterações',
        obrigatorio: true
      },
      {
        tipo: 'certidao_junta_comercial',
        nome: 'Certidão da Junta Comercial',
        descricao: 'Certidão simplificada atualizada',
        obrigatorio: true
      }
    ]
  },
  {
    id: 'endereco',
    nome: 'Comprovantes de Endereço',
    cor: 'yellow',
    documentos: [
      {
        tipo: 'conta_energia',
        nome: 'Conta de Energia',
        descricao: 'Últimos 3 meses',
        obrigatorio: true
      },
      {
        tipo: 'plano_internet',
        nome: 'Plano de Internet',
        descricao: 'Últimos 3 meses',
        obrigatorio: false
      },
      {
        tipo: 'guia_iptu',
        nome: 'Guia de IPTU',
        descricao: 'Ano corrente',
        obrigatorio: false
      },
      {
        tipo: 'contrato_locacao',
        nome: 'Contrato de Locação',
        descricao: 'Se o imóvel for alugado',
        obrigatorio: false
      }
    ]
  },
  {
    id: 'financeiros',
    nome: 'Documentos Financeiros',
    cor: 'green',
    documentos: [
      {
        tipo: 'extrato_bancario_corrente',
        nome: 'Extratos Bancários - Conta Corrente',
        descricao: 'Últimos 3 meses de todas as contas',
        obrigatorio: true
      },
      {
        tipo: 'balancete_verificacao',
        nome: 'Balancete de Verificação',
        descricao: 'Balancete mais recente (máx. 6 meses)',
        obrigatorio: true
      },
      {
        tipo: 'balanco_patrimonial_integralizacao',
        nome: 'Balanço Patrimonial',
        descricao: 'Se houver integralização de capital',
        obrigatorio: false
      },
      {
        tipo: 'extrato_bancario_integralizacao',
        nome: 'Extratos - Integralização de Capital',
        descricao: 'Se houver integralização',
        obrigatorio: false
      }
    ]
  },
  {
    id: 'tributos',
    nome: 'Comprovantes de Tributos',
    cor: 'red',
    documentos: [
      {
        tipo: 'das_simples_nacional',
        nome: 'DAS - Simples Nacional',
        descricao: 'Últimos 12 meses',
        obrigatorio: true
      },
      {
        tipo: 'darf_cprb',
        nome: 'DARF CPRB',
        descricao: 'Se aplicável',
        obrigatorio: false
      }
    ]
  },
  {
    id: 'especiais',
    nome: 'Documentos Especiais',
    cor: 'orange',
    documentos: [
      {
        tipo: 'contrato_mutuo',
        nome: 'Contrato de Mútuo',
        descricao: 'Se houver empréstimo de sócio',
        obrigatorio: false
      },
      {
        tipo: 'comprovante_iof',
        nome: 'Comprovante de IOF',
        descricao: 'Necessário se houver contrato de mútuo',
        obrigatorio: false
      },
      {
        tipo: 'balancete_mutuante',
        nome: 'Balancete do Mutuante',
        descricao: 'Se o mutuante for pessoa jurídica',
        obrigatorio: false
      }
    ]
  }
];

export default function ChecklistDocumentos({ documentos = [], onUploadClick, onViewClick, hipotese = 'I' }) {
  const [categoriasExpandidas, setCategoriasExpandidas] = useState(
    CATEGORIAS_DOCUMENTOS.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );

  // Mapeia documentos presentes por tipo
  const documentosPorTipo = useMemo(() => {
    const mapa = {};
    documentos.forEach(doc => {
      if (!mapa[doc.tipo_documento]) {
        mapa[doc.tipo_documento] = [];
      }
      mapa[doc.tipo_documento].push(doc);
    });
    return mapa;
  }, [documentos]);

  // Filtra documentos aplicáveis à hipótese
  const categoriasFiltradas = useMemo(() => {
    return CATEGORIAS_DOCUMENTOS.map(categoria => ({
      ...categoria,
      documentos: categoria.documentos.filter(doc => 
        isDocumentoAplicavel(doc.tipo, hipotese)
      ).map(doc => ({
        ...doc,
        obrigatorio: isDocumentoObrigatorio(doc.tipo, hipotese),
        periodo: getPeriodoDocumento(doc.tipo, hipotese)
      }))
    })).filter(categoria => categoria.documentos.length > 0);
  }, [hipotese]);

  // Calcula estatísticas
  const estatisticas = useMemo(() => {
    let totalObrigatorios = 0;
    let obrigatoriosPresentes = 0;
    let totalOpcionais = 0;
    let opcionaisPresentes = 0;

    categoriasFiltradas.forEach(categoria => {
      categoria.documentos.forEach(doc => {
        if (doc.obrigatorio) {
          totalObrigatorios++;
          if (documentosPorTipo[doc.tipo]) {
            obrigatoriosPresentes++;
          }
        } else {
          totalOpcionais++;
          if (documentosPorTipo[doc.tipo]) {
            opcionaisPresentes++;
          }
        }
      });
    });

    const progressoObrigatorios = totalObrigatorios > 0 
      ? (obrigatoriosPresentes / totalObrigatorios) * 100 
      : 100;

    return {
      totalObrigatorios,
      obrigatoriosPresentes,
      totalOpcionais,
      opcionaisPresentes,
      progressoObrigatorios,
      completo: obrigatoriosPresentes === totalObrigatorios
    };
  }, [documentosPorTipo]);

  const toggleCategoria = (categoriaId) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoriaId]: !prev[categoriaId]
    }));
  };

  const expandirTodas = () => {
    const todasExpandidas = categoriasFiltradas.reduce(
      (acc, cat) => ({ ...acc, [cat.id]: true }), 
      {}
    );
    setCategoriasExpandidas(todasExpandidas);
  };

  const recolherTodas = () => {
    const todasRecolhidas = categoriasFiltradas.reduce(
      (acc, cat) => ({ ...acc, [cat.id]: false }), 
      {}
    );
    setCategoriasExpandidas(todasRecolhidas);
  };

  return (
    <div className="space-y-6">
      {/* Header com Progresso */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Checklist de Documentos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandirTodas}>
                Expandir Todas
              </Button>
              <Button variant="ghost" size="sm" onClick={recolherTodas}>
                Recolher Todas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progresso Obrigatórios */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Documentos Obrigatórios
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {estatisticas.obrigatoriosPresentes}/{estatisticas.totalObrigatorios}
                </span>
              </div>
              <Progress value={estatisticas.progressoObrigatorios} className="h-3" />
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Obrigatórios</p>
                <p className="text-2xl font-bold text-blue-900">
                  {estatisticas.obrigatoriosPresentes}/{estatisticas.totalObrigatorios}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium">Opcionais</p>
                <p className="text-2xl font-bold text-green-900">
                  {estatisticas.opcionaisPresentes}/{estatisticas.totalOpcionais}
                </p>
              </div>
            </div>

            {/* Status Geral */}
            {estatisticas.completo ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-900">
                  Todos os documentos obrigatórios foram enviados!
                </span>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-900">
                  Faltam {estatisticas.totalObrigatorios - estatisticas.obrigatoriosPresentes} documento(s) obrigatório(s)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categorias */}
      {categoriasFiltradas.map(categoria => {
        const expandida = categoriasExpandidas[categoria.id];
        const docsCategoria = categoria.documentos;
        const docsPresentes = docsCategoria.filter(d => documentosPorTipo[d.tipo]).length;
        const docsObrigatorios = docsCategoria.filter(d => d.obrigatorio).length;
        const obrigatoriosPresentes = docsCategoria.filter(d => 
          d.obrigatorio && documentosPorTipo[d.tipo]
        ).length;

        return (
          <Card key={categoria.id} className={`border-2 border-${categoria.cor}-200`}>
            <CardHeader 
              className={`cursor-pointer bg-${categoria.cor}-50 hover:bg-${categoria.cor}-100 transition-colors`}
              onClick={() => toggleCategoria(categoria.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${categoria.cor}-100`}>
                    <FileText className={`h-5 w-5 text-${categoria.cor}-600`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{categoria.nome}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {docsPresentes}/{docsCategoria.length} documentos
                      {docsObrigatorios > 0 && ` (${obrigatoriosPresentes}/${docsObrigatorios} obrigatórios)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {obrigatoriosPresentes === docsObrigatorios && docsObrigatorios > 0 && (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  )}
                  {expandida ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandida && (
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {categoria.documentos.map(doc => {
                    const presente = documentosPorTipo[doc.tipo];
                    const quantidade = presente ? presente.length : 0;

                    return (
                      <div
                        key={doc.tipo}
                        className={`border rounded-lg p-3 ${
                          presente ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            {presente ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${
                                  presente ? 'text-green-900' : 'text-gray-700'
                                }`}>
                                  {doc.nome}
                                </span>
                                {doc.obrigatorio && (
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
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {presente ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewClick && onViewClick(doc.tipo)}
                                className="gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUploadClick && onUploadClick(doc.tipo)}
                                className="gap-1"
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
  );
}