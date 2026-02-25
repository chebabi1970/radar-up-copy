import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const DOCUMENTOS_OBRIGATORIOS = {
  todos: [
    'requerimento', 'documento_identificacao_responsavel', 'procuracao',
    'documento_identificacao_procurador', 'contrato_social', 'certidao_junta_comercial',
    'conta_energia', 'plano_internet', 'guia_iptu', 'escritura_imovel',
    'contrato_locacao', 'comprovante_espaco_armazenamento', 'extrato_bancario_corrente',
    'extrato_bancario_integralizacao', 'extrato_bancario_aplicacoes', 'balancete_verificacao',
    'balanco_patrimonial_integralizacao', 'comprovante_transferencia_integralizacao',
    'das_simples_nacional', 'darf_cprb', 'contrato_mutuo', 'balancete_mutuante', 'comprovante_iof'
  ]
};

export default function AnalisadorDocumentos() {
  const [formData, setFormData] = useState({
    numero_caso: '',
    cliente_nome: '',
    cliente_cnpj: '',
    modalidade: 'limitada_150k'
  });
  const [arquivos, setArquivos] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [casoAtual, setCasoAtual] = useState(null);

  const queryClient = useQueryClient();

  const criarCasoMutation = useMutation({
    mutationFn: async (data) => {
      const caso = await base44.entities.CasoAnalise.create(data);
      return caso;
    },
    onSuccess: (caso) => {
      setCasoAtual(caso);
      queryClient.invalidateQueries({ queryKey: ['casosAnalise'] });
    }
  });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setArquivos([...arquivos, ...files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAnalisando(true);

    try {
      // Criar caso
      const novoCaso = await criarCasoMutation.mutateAsync({
        ...formData,
        documentos_obrigatorios: DOCUMENTOS_OBRIGATORIOS.todos,
        status_analise: 'em_progresso',
        data_analise: new Date().toISOString().split('T')[0]
      });

      // Processar cada arquivo
      for (const arquivo of arquivos) {
        // Upload do arquivo
        const uploadResult = await base44.integrations.Core.UploadFile({ file: arquivo });
        
        // Criar documento com URL
        const doc = await base44.entities.DocumentoAnalise.create({
          caso_id: novoCaso.id,
          nome_arquivo: arquivo.name,
          file_url: uploadResult.file_url,
          tipo_documento: detectarTipoDocumento(arquivo.name),
          status_extracao: 'processando'
        });

        // Extrair dados com IA
        setTimeout(() => analisarDocumento(novoCaso.id, doc.id, uploadResult.file_url), 500);
      }

      setArquivos([]);
      setFormData({ numero_caso: '', cliente_nome: '', cliente_cnpj: '', modalidade: 'limitada_150k' });
    } catch (error) {
      console.error('Erro ao criar caso:', error);
    } finally {
      setAnalisando(false);
    }
  };

  const analisarDocumento = async (casoId, docId, fileUrl) => {
    try {
      const prompt = `Analise este documento de habilitação para comércio exterior (baseado em IN RFB 1984/2020 e Portaria Coana 72/2020).
      
      Extraia os seguintes dados:
      - Tipo de documento (extrato bancário, balancete, contrato, etc)
      - Data do documento
      - Saldos/valores principais (se houver)
      - CPF/CNPJ mencionados
      - Poderes concedidos (se for procuração)
      - Qualquer informação anômala ou preocupante
      
      Retorne como JSON estruturado.`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: fileUrl,
        response_json_schema: {
          type: 'object',
          properties: {
            tipo_documento: { type: 'string' },
            data_documento: { type: 'string' },
            valores_principais: { type: 'object' },
            cpf_cnpj: { type: 'array', items: { type: 'string' } },
            poderes: { type: 'array', items: { type: 'string' } },
            anomalias: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      // Atualizar documento com dados extraídos
      await base44.entities.DocumentoAnalise.update(docId, {
        dados_extraidos: resultado,
        status_extracao: 'sucesso'
      });

      // Verificar discrepâncias
      await verificarDiscrepancias(casoId);
    } catch (error) {
      console.error('Erro ao analisar documento:', error);
      await base44.entities.DocumentoAnalise.update(docId, {
        status_extracao: 'erro',
        erros_extracao: [error.message]
      });
    }
  };

  const verificarDiscrepancias = async (casoId) => {
    try {
      const documentos = await base44.entities.DocumentoAnalise.filter({ caso_id: casoId });
      const caso = await base44.entities.CasoAnalise.filter({ id: casoId });
      
      if (!caso[0]) return;

      let alertas = [];
      const documentosEncontrados = documentos.map(d => d.tipo_documento);
      const documentosFaltantes = DOCUMENTOS_OBRIGATORIOS.todos.filter(
        doc => !documentosEncontrados.includes(doc)
      );

      // 1. Verificar documentação obrigatória
      if (documentosFaltantes.length > 0) {
        alertas.push({
          tipo: 'falta_documento',
          descricao: `Faltam ${documentosFaltantes.length} documentos: ${documentosFaltantes.join(', ')}`,
          severidade: 'critica'
        });
      }

      // 2. Verificar se há mútuo sem IOF
      const temMutuo = documentosEncontrados.includes('contrato_mutuo');
      const temIOF = documentosEncontrados.includes('comprovante_iof');
      if (temMutuo && !temIOF) {
        alertas.push({
          tipo: 'falta_iof',
          descricao: 'Contrato de mútuo identificado: OBRIGATÓRIO apresentar IOF em DARF recolhido',
          severidade: 'critica'
        });
      }

      // 3. Verificar inconsistências de saldos (se houver extrato e balancete)
      const extratos = documentos.filter(d => d.tipo_documento?.includes('extrato'));
      const balancetes = documentos.filter(d => d.tipo_documento?.includes('balancete'));
      
      if (extratos.length > 0 && balancetes.length > 0) {
        alertas.push({
          tipo: 'inconsistencia_saldo',
          descricao: 'Verificar consistência entre saldos em extrato bancário e balancete',
          severidade: 'media'
        });
      }

      // Atualizar caso
      await base44.entities.CasoAnalise.update(caso[0].id, {
        documentos_encontrados: documentosEncontrados,
        documentos_faltantes: documentosFaltantes,
        alertas: alertas,
        total_discrepancias: alertas.length,
        status_analise: documentosFaltantes.length === 0 ? 'concluida' : 'com_problemas'
      });

      queryClient.invalidateQueries({ queryKey: ['casosAnalise'] });
    } catch (error) {
      console.error('Erro ao verificar discrepâncias:', error);
    }
  };

  const detectarTipoDocumento = (nomeArquivo) => {
    const nome = nomeArquivo.toLowerCase();
    if (nome.includes('extrato')) return 'extrato_bancario_corrente';
    if (nome.includes('balancete')) return 'balancete_verificacao';
    if (nome.includes('procuracao') || nome.includes('procuração')) return 'procuracao';
    if (nome.includes('contrato')) return 'contrato_social';
    if (nome.includes('iof')) return 'comprovante_iof';
    return 'outro';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Analisador Inteligente de Documentos</h1>
        <p className="text-slate-600 mb-8">Upload de documentos para análise automática conforme IN RFB 1984/2020</p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Novo Caso de Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Número do Caso"
                  value={formData.numero_caso}
                  onChange={(e) => setFormData({...formData, numero_caso: e.target.value})}
                  required
                />
                <Input
                  placeholder="CNPJ da Empresa"
                  value={formData.cliente_cnpj}
                  onChange={(e) => setFormData({...formData, cliente_cnpj: e.target.value})}
                  required
                />
              </div>
              <Input
                placeholder="Nome da Empresa"
                value={formData.cliente_nome}
                onChange={(e) => setFormData({...formData, cliente_nome: e.target.value})}
                required
              />
              <select
                value={formData.modalidade}
                onChange={(e) => setFormData({...formData, modalidade: e.target.value})}
                className="w-full p-2 border rounded-lg"
              >
                <option value="limitada_50k">Limitada até USD 50.000</option>
                <option value="limitada_150k">Limitada até USD 150.000</option>
                <option value="ilimitada">Ilimitada</option>
              </select>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <label className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-slate-400" />
                    <span className="font-semibold text-slate-700">Arraste ou clique para upload</span>
                    <span className="text-sm text-slate-500">PDF, imagens (máx 15MB cada)</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </label>
              </div>

              {arquivos.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">{arquivos.length} arquivo(s) selecionado(s)</p>
                  {arquivos.map((arquivo, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-100 rounded">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{arquivo.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="submit"
                disabled={analisando || !formData.numero_caso || arquivos.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {analisando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  'Iniciar Análise'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {casoAtual && <RelatorioAnalise casoId={casoAtual.id} />}
      </div>
    </div>
  );
}

function RelatorioAnalise({ casoId }) {
  const { data: caso } = useQuery({
    queryKey: ['caso', casoId],
    queryFn: async () => {
      const result = await base44.entities.CasoAnalise.filter({ id: casoId });
      return result[0];
    },
    refetchInterval: 2000
  });

  if (!caso) return null;

  const temErros = caso.alertas?.some(a => a.severidade === 'critica');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Resultado da Análise</CardTitle>
          <Badge className={temErros ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
            {caso.status_analise?.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 mb-2">Documentação</h3>
          <div className="space-y-2">
            <p className="text-sm"><strong>Encontrados:</strong> {caso.documentos_encontrados?.length || 0}</p>
            <p className="text-sm"><strong>Obrigatórios:</strong> {caso.documentos_obrigatorios?.length || 0}</p>
            {caso.documentos_faltantes?.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="font-semibold text-red-800 mb-1">Faltam:</p>
                <ul className="text-sm text-red-700 list-disc pl-5">
                  {caso.documentos_faltantes.map((doc, idx) => (
                    <li key={idx}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {caso.alertas && caso.alertas.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Alertas ({caso.alertas.length})</h3>
            <div className="space-y-2">
              {caso.alertas.map((alerta, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    alerta.severidade === 'critica'
                      ? 'bg-red-50 border-red-200'
                      : alerta.severidade === 'media'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {alerta.severidade === 'critica' ? (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{alerta.tipo.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm mt-1">{alerta.descricao}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}