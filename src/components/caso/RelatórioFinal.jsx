import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

export default function RelatórioFinal({ casoId, documentos = [], historico = [], cliente = {}, caso = {} }) {
  const [relatorio, setRelatorio] = useState(null);

  // Gerar relatório final
  const gerarRelatorio = () => {
    // Agrupar análises por tipo de documento
    const analisesPorTipo = {};
    historico.forEach(h => {
      if (!analisesPorTipo[h.documento_tipo]) {
        analisesPorTipo[h.documento_tipo] = [];
      }
      analisesPorTipo[h.documento_tipo].push(h);
    });

    // Contar status
    let aprovados = 0;
    let inconsistentes = 0;
    let erros = 0;
    let discrepanciasCriticas = 0;
    let discrepanciasMedias = 0;
    let discrepanciasLeves = 0;

    Object.values(analisesPorTipo).forEach(analises => {
      const ultima = analises[analises.length - 1];
      if (ultima.status_resultado === 'sem_discrepancias') {
        aprovados++;
      } else if (ultima.status_resultado === 'com_discrepancias') {
        inconsistentes++;
      } else {
        erros++;
      }
      discrepanciasCriticas += ultima.discrepancias_criticas || 0;
      discrepanciasMedias += ultima.discrepancias_medias || 0;
      discrepanciasLeves += ultima.discrepancias_leves || 0;
    });

    // Checklist de documentos obrigatórios (conforme Portaria Coana 72)
    const documentosObrigatorios = [
      'requerimento_das',
      'documento_identificacao_responsavel',
      'procuracao',
      'contrato_social',
      'certidao_junta_comercial',
      'conta_energia',
      'extrato_bancario_corrente',
      'balancete_verificacao'
    ];

    const documentosFaltantes = documentosObrigatorios.filter(tipo => 
      !documentos.find(d => d.tipo_documento === tipo)
    );

    // Status geral
    const isApto = documentosFaltantes.length === 0 && inconsistentes === 0 && erros === 0;

    setRelatorio({
      dataGeracao: new Date().toLocaleString('pt-BR'),
      statusGeral: isApto ? 'APTO' : 'NÃO APTO',
      isApto,
      resumo: {
        total: Object.keys(analisesPorTipo).length,
        aprovados,
        inconsistentes,
        erros
      },
      discrepancias: {
        criticas: discrepanciasCriticas,
        medias: discrepanciasMedias,
        leves: discrepanciasLeves
      },
      documentosFaltantes,
      documentosAnalisados: Object.entries(analisesPorTipo).map(([tipo, analises]) => ({
        tipo,
        status: analises[analises.length - 1].status_resultado === 'sem_discrepancias' ? 'APROVADO' : 'INCONSISTENTE',
        discrepancias: analises[analises.length - 1].total_discrepancias || 0,
        criticas: analises[analises.length - 1].discrepancias_criticas || 0,
        medias: analises[analises.length - 1].discrepancias_medias || 0,
        leves: analises[analises.length - 1].discrepancias_leves || 0
      }))
    });
  };

  useEffect(() => {
    if (historico.length > 0) {
      gerarRelatorio();
    }
  }, [historico, documentos]);

  const exportarPDF = () => {
    if (!relatorio) return;
    
    // Simples export como texto - pode ser melhorado com jsPDF
    let texto = `RELATÓRIO FINAL DE ANÁLISE DOCUMENTAL
=====================================
Data: ${relatorio.dataGeracao}

CASO: ${caso.numero_caso || 'N/A'}
CLIENTE: ${cliente.razao_social}
CNPJ: ${cliente.cnpj}
ENDEREÇO: ${cliente.endereco}

STATUS GERAL: ${relatorio.statusGeral}
=====================================

RESUMO EXECUTIVO:
- Documentos analisados: ${relatorio.resumo.total}
- Aprovados: ${relatorio.resumo.aprovados}
- Inconsistentes: ${relatorio.resumo.inconsistentes}
- Erros: ${relatorio.resumo.erros}

DISCREPÂNCIAS ENCONTRADAS:
- Críticas: ${relatorio.discrepancias.criticas}
- Médias: ${relatorio.discrepancias.medias}
- Leves: ${relatorio.discrepancias.leves}

${relatorio.documentosFaltantes.length > 0 ? `DOCUMENTOS FALTANTES:
${relatorio.documentosFaltantes.map(d => `- ${d}`).join('\n')}` : 'Sem documentos faltantes obrigatórios'}

ANÁLISE POR DOCUMENTO:
${relatorio.documentosAnalisados.map(d => 
`${d.tipo}: ${d.status} (Críticas: ${d.criticas}, Médias: ${d.medias}, Leves: ${d.leves})`
).join('\n')}`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(texto));
    element.setAttribute('download', `relatorio_${cliente.cnpj}_${new Date().getTime()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!relatorio) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-slate-500">
          Nenhuma análise realizada ainda
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Geral */}
      <Card className={relatorio.isApto ? 'border-2 border-green-300 bg-green-50' : 'border-2 border-red-300 bg-red-50'}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Relatório Final</CardTitle>
            <Button size="sm" variant="outline" onClick={exportarPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            {relatorio.isApto ? (
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            ) : (
              <AlertCircle className="h-10 w-10 text-red-600" />
            )}
            <div>
              <h3 className="text-2xl font-bold">
                {relatorio.statusGeral}
              </h3>
              <p className="text-sm text-slate-600">
                {relatorio.isApto 
                  ? 'Documentação completa e consistente' 
                  : 'Existem inconsistências ou documentos faltantes'}
              </p>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{relatorio.resumo.total}</div>
              <div className="text-xs text-slate-600">Analisados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{relatorio.resumo.aprovados}</div>
              <div className="text-xs text-slate-600">Aprovados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{relatorio.resumo.inconsistentes}</div>
              <div className="text-xs text-slate-600">Inconsistentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{relatorio.resumo.erros}</div>
              <div className="text-xs text-slate-600">Erros</div>
            </div>
          </div>

          <div className="text-sm text-slate-600">
            Gerado em: {relatorio.dataGeracao}
          </div>
        </CardContent>
      </Card>

      {/* Discrepâncias */}
      {relatorio.discrepancias.criticas > 0 || relatorio.discrepancias.medias > 0 ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Discrepâncias Encontradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {relatorio.discrepancias.criticas > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span><strong>{relatorio.discrepancias.criticas}</strong> crítica(s)</span>
                </div>
              )}
              {relatorio.discrepancias.medias > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span><strong>{relatorio.discrepancias.medias}</strong> média(s)</span>
                </div>
              )}
              {relatorio.discrepancias.leves > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                  <span><strong>{relatorio.discrepancias.leves}</strong> leve(s)</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-700">Nenhuma discrepância encontrada</span>
          </CardContent>
        </Card>
      )}

      {/* Documentos Faltantes */}
      {relatorio.documentosFaltantes.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-800">Documentos Obrigatórios Faltantes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {relatorio.documentosFaltantes.map(doc => (
                <li key={doc} className="flex items-center gap-2 text-red-700">
                  <span>•</span>
                  {doc.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Checklist por Documento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status por Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {relatorio.documentosAnalisados.map(doc => (
              <div key={doc.tipo} className="flex items-center justify-between p-2 rounded bg-slate-50 text-sm">
                <span className="font-medium text-slate-900">{doc.tipo.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <Badge className={doc.status === 'APROVADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {doc.status}
                  </Badge>
                  {doc.discrepancias > 0 && (
                    <span className="text-xs text-slate-600">
                      {doc.criticas > 0 && <span className="text-red-600">C:{doc.criticas} </span>}
                      {doc.medias > 0 && <span className="text-yellow-600">M:{doc.medias} </span>}
                      {doc.leves > 0 && <span className="text-blue-600">L:{doc.leves}</span>}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}