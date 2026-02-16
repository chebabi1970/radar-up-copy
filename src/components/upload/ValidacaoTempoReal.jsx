import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ValidacaoTempoReal({ 
  arquivo, 
  tipoDocumento, 
  casoId, 
  cliente,
  onValidacaoConcluida 
}) {
  const [etapaAtual, setEtapaAtual] = useState('upload');
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [erros, setErros] = useState([]);
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    if (arquivo) {
      validarArquivo();
    }
  }, [arquivo]);

  const validarArquivo = async () => {
    try {
      // Etapa 1: Upload
      setEtapaAtual('upload');
      setProgresso(10);

      const uploadResult = await base44.integrations.Core.UploadPrivateFile({
        file: arquivo
      });

      const fileUri = uploadResult.file_uri;
      setProgresso(30);

      // Etapa 2: Extração de dados
      setEtapaAtual('extracao');
      
      const signedResult = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: fileUri,
        expires_in: 3600
      });
      const fileUrl = signedResult.signed_url;

      // Schema básico conforme tipo
      const schemas = {
        extrato_bancario: {
          banco: { type: 'string' },
          conta: { type: 'string' },
          saldo_final: { type: 'number' },
          periodo: { type: 'string' },
          data: { type: 'string' }
        },
        balancete_verificacao: {
          data: { type: 'string' },
          total_caixa: { type: 'number' },
          saldos_caixa: { type: 'object' }
        },
        contrato_social: {
          razao_social: { type: 'string' },
          cnpj: { type: 'string' },
          data_constituicao: { type: 'string' },
          socios: { type: 'array' }
        }
      };

      const schema = schemas[tipoDocumento] || {
        dados_gerais: { type: 'object' },
        data_documento: { type: 'string' }
      };

      setProgresso(50);

      const dadosExtraidos = await base44.integrations.Core.InvokeLLM({
        prompt: `Extraia dados deste documento: ${tipoDocumento}. APENAS dados visíveis no documento.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: 'object',
          properties: schema
        }
      });

      setProgresso(70);

      // Etapa 3: Validação
      setEtapaAtual('validacao');
      
      const errosEncontrados = [];
      const avisosEncontrados = [];

      // Validações específicas por tipo
      if (tipoDocumento === 'extrato_bancario') {
        if (!dadosExtraidos.banco || dadosExtraidos.banco.trim() === '') {
          errosEncontrados.push({
            tipo: 'campo_obrigatorio',
            campo: 'banco',
            mensagem: 'Nome do banco não identificado'
          });
        }
        if (!dadosExtraidos.saldo_final || dadosExtraidos.saldo_final === 0) {
          avisosEncontrados.push({
            tipo: 'campo_vazio',
            campo: 'saldo_final',
            mensagem: 'Saldo final não identificado ou zerado'
          });
        }
        if (!dadosExtraidos.periodo) {
          errosEncontrados.push({
            tipo: 'campo_obrigatorio',
            campo: 'periodo',
            mensagem: 'Período de referência não identificado'
          });
        }
      }

      if (tipoDocumento === 'contrato_social') {
        if (!dadosExtraidos.cnpj) {
          errosEncontrados.push({
            tipo: 'campo_obrigatorio',
            campo: 'cnpj',
            mensagem: 'CNPJ não identificado no contrato'
          });
        } else if (cliente?.cnpj && dadosExtraidos.cnpj.replace(/\D/g, '') !== cliente.cnpj.replace(/\D/g, '')) {
          errosEncontrados.push({
            tipo: 'inconsistencia',
            campo: 'cnpj',
            mensagem: `CNPJ do documento (${dadosExtraidos.cnpj}) diferente do cliente (${cliente.cnpj})`
          });
        }

        if (!dadosExtraidos.razao_social) {
          errosEncontrados.push({
            tipo: 'campo_obrigatorio',
            campo: 'razao_social',
            mensagem: 'Razão social não identificada'
          });
        }
      }

      setProgresso(90);

      // Etapa 4: Análise de qualidade
      setEtapaAtual('qualidade');

      // Verificar legibilidade
      const prompt = `Avalie rapidamente a LEGIBILIDADE e QUALIDADE deste documento.
      
Responda em JSON:
{
  "legivel": true/false,
  "qualidade": "otima|boa|aceitavel|ruim",
  "problemas": ["lista de problemas visuais se houver"]
}`;

      const qualidade = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [fileUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            legivel: { type: 'boolean' },
            qualidade: { type: 'string' },
            problemas: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      if (!qualidade.legivel) {
        errosEncontrados.push({
          tipo: 'qualidade',
          campo: 'legibilidade',
          mensagem: 'Documento ilegível ou com qualidade ruim'
        });
      }

      if (qualidade.qualidade === 'ruim') {
        avisosEncontrados.push({
          tipo: 'qualidade',
          campo: 'qualidade',
          mensagem: 'Qualidade do documento pode dificultar análise'
        });
      }

      if (qualidade.problemas && qualidade.problemas.length > 0) {
        qualidade.problemas.forEach(problema => {
          avisosEncontrados.push({
            tipo: 'qualidade',
            campo: 'visual',
            mensagem: problema
          });
        });
      }

      setProgresso(100);
      setErros(errosEncontrados);
      setAvisos(avisosEncontrados);

      const resultadoFinal = {
        aprovado: errosEncontrados.length === 0,
        dadosExtraidos,
        qualidade,
        fileUri,
        erros: errosEncontrados,
        avisos: avisosEncontrados
      };

      setResultado(resultadoFinal);
      
      if (onValidacaoConcluida) {
        onValidacaoConcluida(resultadoFinal);
      }

    } catch (error) {
      console.error('Erro na validação:', error);
      setResultado({
        aprovado: false,
        erro: error.message
      });
    }
  };

  const etapas = [
    { id: 'upload', nome: 'Upload', icon: '📤' },
    { id: 'extracao', nome: 'Extração', icon: '🔍' },
    { id: 'validacao', nome: 'Validação', icon: '✓' },
    { id: 'qualidade', nome: 'Qualidade', icon: '⭐' }
  ];

  const etapaIndex = etapas.findIndex(e => e.id === etapaAtual);

  if (!resultado) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validando documento...
        </div>

        <Progress value={progresso} className="h-2" />

        <div className="flex items-center justify-between text-xs">
          {etapas.map((etapa, idx) => (
            <div
              key={etapa.id}
              className={`flex items-center gap-1 ${
                idx <= etapaIndex ? 'text-blue-600 font-medium' : 'text-slate-400'
              }`}
            >
              <span>{etapa.icon}</span>
              <span>{etapa.nome}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Resultado geral */}
      <div
        className={`p-4 rounded-lg border-2 ${
          resultado.aprovado
            ? 'bg-green-50 border-green-300'
            : 'bg-red-50 border-red-300'
        }`}
      >
        <div className="flex items-start gap-3">
          {resultado.aprovado ? (
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">
              {resultado.aprovado ? 'Documento Validado ✓' : 'Validação Falhou'}
            </h4>
            <p className="text-xs text-slate-600">
              {resultado.aprovado
                ? 'Documento pronto para ser adicionado ao caso'
                : 'Corrija os erros antes de prosseguir'}
            </p>
          </div>
        </div>
      </div>

      {/* Erros */}
      {erros.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-red-700">
            <XCircle className="h-4 w-4" />
            {erros.length} Erro(s) Crítico(s)
          </div>
          {erros.map((erro, idx) => (
            <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs">
              <Badge className="bg-red-100 text-red-800 mb-1">{erro.campo}</Badge>
              <p className="text-slate-700">{erro.mensagem}</p>
            </div>
          ))}
        </div>
      )}

      {/* Avisos */}
      {avisos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-yellow-700">
            <AlertTriangle className="h-4 w-4" />
            {avisos.length} Aviso(s)
          </div>
          {avisos.map((aviso, idx) => (
            <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
              <Badge className="bg-yellow-100 text-yellow-800 mb-1">{aviso.campo}</Badge>
              <p className="text-slate-700">{aviso.mensagem}</p>
            </div>
          ))}
        </div>
      )}

      {/* Dados extraídos */}
      {resultado.dadosExtraidos && (
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">Dados Extraídos</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Button>
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            {Object.entries(resultado.dadosExtraidos)
              .slice(0, 3)
              .map(([chave, valor]) => (
                <div key={chave} className="flex items-center gap-2">
                  <span className="font-medium">{chave}:</span>
                  <span className="truncate">
                    {typeof valor === 'object' ? JSON.stringify(valor).slice(0, 30) : String(valor).slice(0, 30)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}