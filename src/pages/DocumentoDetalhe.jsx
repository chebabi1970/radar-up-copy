import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from 'lucide-react';
import DocumentoNavegacao from '../components/documento/DocumentoNavegacao';
import VisualizadorDocumento from '../components/caso/VisualizadorDocumento';
import ChatContestaçãoAnálise from '../components/caso/ChatContestaçãoAnálise';

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
  pendente: { color: "bg-yellow-100", textColor: "text-yellow-800", label: "Pendente" },
  aprovado: { color: "bg-green-100", textColor: "text-green-800", label: "Aprovado" },
  reprovado: { color: "bg-red-100", textColor: "text-red-800", label: "Reprovado" },
  com_ressalvas: { color: "bg-orange-100", textColor: "text-orange-800", label: "Com Ressalvas" }
};

export default function DocumentoDetalhe() {
  const urlParams = new URLSearchParams(window.location.search);
  const documentoId = urlParams.get('documentoId');
  const casoId = urlParams.get('casoId');
  const navigate = useNavigate();

  const { data: documento, isLoading: docLoading } = useQuery({
    queryKey: ['documento', documentoId],
    queryFn: () => documentoId ? base44.entities.Documento.read(documentoId) : null,
    enabled: !!documentoId
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos', casoId],
    queryFn: () => casoId ? base44.entities.Documento.filter({ caso_id: casoId }) : [],
    enabled: !!casoId
  });

  const { data: caso } = useQuery({
    queryKey: ['caso', casoId],
    queryFn: () => casoId ? base44.entities.Caso.read(casoId) : null,
    enabled: !!casoId
  });

  const { data: cliente } = useQuery({
    queryKey: ['cliente', caso?.cliente_id],
    queryFn: () => caso?.cliente_id ? base44.entities.Cliente.read(caso.cliente_id) : null,
    enabled: !!caso?.cliente_id
  });

  const { data: analiseHistorico = [] } = useQuery({
    queryKey: ['analiseHistorico', documentoId],
    queryFn: () => documentoId ? base44.entities.AnaliseHistorico.filter({ caso_id: casoId }) : [],
    enabled: !!documentoId && !!casoId
  });

  const documentoIndex = useMemo(() => 
    documentos.findIndex(d => d.id === documentoId),
    [documentos, documentoId]
  );

  const handleNavegar = (docId) => {
    navigate(`${createPageUrl('DocumentoDetalhe')}?documentoId=${docId}&casoId=${casoId}`);
  };

  if (docLoading) {
    return <div className="p-6 text-center text-slate-600">Carregando...</div>;
  }

  if (!documento) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-600">Documento não encontrado</div>
      </div>
    );
  }

  const statusConfig = statusAnaliseConfig[documento.status_analise];
  const analisesFiltradas = analiseHistorico.filter(a => a.documento_tipo === documento.tipo_documento);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to={createPageUrl('CasoDetalhe') + `?casoId=${casoId}`}>
            <Button variant="ghost" size="sm" className="text-slate-600">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Caso
            </Button>
          </Link>
        </div>

        {/* Document Navigation Bar */}
        {documentos.length > 0 && (
          <DocumentoNavegacao
            documentos={documentos}
            documentoAtualId={documentoId}
            documentoIndex={documentoIndex}
            onNavegar={handleNavegar}
          />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Document Title & Status */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{documento.nome_arquivo}</h1>
              <p className="text-slate-600 mt-1">
                {tipoDocumentoLabels[documento.tipo_documento] || documento.tipo_documento}
              </p>
            </div>
            {statusConfig && (
              <Badge className={`${statusConfig.color} ${statusConfig.textColor}`}>
                {statusConfig.label}
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="visualizacao" className="w-full">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="visualizacao">Visualização</TabsTrigger>
            <TabsTrigger value="dados">Dados Extraídos</TabsTrigger>
            <TabsTrigger value="analises">Análises</TabsTrigger>
            <TabsTrigger value="contestacao">Contestação</TabsTrigger>
          </TabsList>

          {/* Aba Visualização */}
          <TabsContent value="visualizacao" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Visualização do Documento</CardTitle>
              </CardHeader>
              <CardContent>
                {documento.file_uri || documento.file_url ? (
                  <iframe
                    src={documento.file_uri ? `https://docs.google.com/gview?url=${encodeURIComponent(documento.file_uri)}&embedded=true` : documento.file_url}
                    className="w-full h-[600px] rounded-lg border border-slate-200"
                    title={documento.nome_arquivo}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <p>Arquivo não disponível para visualização</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Dados Extraídos */}
          <TabsContent value="dados" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados Extraídos</CardTitle>
                <CardDescription>
                  Informações extraídas do documento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documento.dados_extraidos ? (
                  <div className="space-y-4">
                    {Object.entries(documento.dados_extraidos).map(([chave, valor]) => (
                      <div key={chave} className="border-l-4 border-blue-500 pl-4">
                        <p className="text-sm font-medium text-slate-600">{chave}</p>
                        <p className="text-slate-900 mt-1">
                          {typeof valor === 'object' ? JSON.stringify(valor, null, 2) : String(valor)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">Nenhum dado extraído ainda</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Análises */}
          <TabsContent value="analises" className="space-y-4">
            {analisesFiltradas.length > 0 ? (
              <div className="space-y-4">
                {analisesFiltradas.map((analise) => (
                  <Card key={analise.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{analise.tipo_analise}</CardTitle>
                      <CardDescription>
                        {new Date(analise.data_hora_analise).toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-slate-600">Total de Discrepâncias</p>
                          <p className="text-2xl font-bold text-slate-900">{analise.total_discrepancias}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Discrepâncias Críticas</p>
                          <p className="text-2xl font-bold text-red-600">{analise.discrepancias_criticas}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Status</p>
                          <Badge className="mt-1">{analise.status_resultado}</Badge>
                        </div>
                      </div>
                      {analise.observacoes && (
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-sm text-slate-700">{analise.observacoes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  Nenhuma análise realizada ainda
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aba Contestação */}
          <TabsContent value="contestacao" className="space-y-4">
            <Card className="h-[600px]">
              <ChatContestaçãoAnálise
                casoId={casoId}
                casoData={caso}
                documentosAnálise={[documento]}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}