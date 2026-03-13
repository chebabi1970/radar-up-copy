import React, { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2,
  X, RefreshCw, Send, HelpCircle, ChevronRight, FolderOpen
} from 'lucide-react';

// ── Mapa dos 23 tipos documentais ────────────────────────────────────────────
const TIPOS_DOCUMENTO = [
  { value: 'requerimento_das',                     label: 'Requerimento Disponibilidade Ativo Circulante', codigo: '1100', base: 'Art. 5º' },
  { value: 'documento_identificacao_responsavel',  label: 'Documento de identificação do responsável',      codigo: '2100', base: 'Art. 5º, § 2º' },
  { value: 'procuracao',                           label: 'Procuração',                                     codigo: '2110', base: 'Art. 5º, § 3º' },
  { value: 'documento_identificacao_procurador',   label: 'Documento de identificação do procurador',       codigo: '2120', base: 'Art. 5º, § 3º' },
  { value: 'contrato_social',                      label: 'Contrato Social e Alterações',                   codigo: '3100', base: 'Art. 7º, I' },
  { value: 'certidao_junta_comercial',             label: 'Certidão Junta Comercial',                       codigo: '3110', base: 'Art. 7º, I' },
  { value: 'conta_energia',                        label: 'Conta de energia dos últimos 3 meses',           codigo: '4100', base: 'Art. 7º, III' },
  { value: 'plano_internet',                       label: 'Plano de internet dos últimos 3 meses',          codigo: '4110', base: 'Art. 7º, III' },
  { value: 'guia_iptu',                            label: 'Guia de IPTU',                                   codigo: '3120', base: 'Art. 7º, IV, a' },
  { value: 'escritura_imovel',                     label: 'Escritura do imóvel',                            codigo: '3130', base: 'Art. 7º, IV, b' },
  { value: 'contrato_locacao',                     label: 'Contrato de locação e pagamentos (3 meses)',     codigo: '3140', base: 'Art. 7º, IV, c' },
  { value: 'comprovante_espaco_armazenamento',     label: 'Comprovante Espaço Armazenagem',                 codigo: '3150', base: 'Art. 7º, V' },
  { value: 'extrato_bancario_corrente',            label: 'Extratos Bancários dos últimos 3 meses',         codigo: '5100', base: 'Art. 6º, I, a' },
  { value: 'balancete_verificacao',                label: 'Balancete de Verificação dos últimos 3 meses',   codigo: '6100', base: 'Art. 6º, I, b' },
  { value: 'comprovante_transferencia_integralizacao', label: 'Comprovante de transferência de recursos',   codigo: '5160', base: 'Art. 6º, I, c' },
  { value: 'extrato_bancario_integralizacao',      label: 'Contrato de Empréstimo Bancário',                codigo: '5130', base: 'Art. 6º, I, d' },
  { value: 'contrato_mutuo',                       label: 'Contrato de Mútuo Registrado em Cartório',       codigo: '5120', base: 'Art. 6º, I, e' },
  { value: 'certidao_junta_comercial',             label: 'Contrato Social do Mutuante',                    codigo: '2130', base: 'Art. 6º, § 3º, I' },
  { value: 'balancete_mutuante',                   label: 'Balancete do Mutuante PJ (3 meses)',             codigo: '6110', base: 'Art. 6º, § 3º, II' },
  { value: 'comprovante_iof',                      label: 'Comprovante Recolhimento IOF Contrato Mútuo PJ', codigo: '5140', base: 'Art. 6º, § 3º, III' },
  { value: 'extrato_bancario_corrente',            label: 'Extratos Bancários no mês do aporte',            codigo: '5150', base: 'Art. 7º, II, a' },
  { value: 'balanco_patrimonial_integralizacao',   label: 'Balanço Patrimonial - Integralização/Aumento Capital', codigo: '6120', base: 'Art. 7º, II, b' },
  { value: 'outro',                                label: 'Documento indefinido / Outro',                   codigo: '9999', base: '-' },
];

// Unique list for selector (some share the same value)
const TIPOS_UNICOS = [
  { value: 'requerimento_das',                    label: 'Requerimento Disponibilidade Ativo Circulante' },
  { value: 'documento_identificacao_responsavel', label: 'Doc. identificação do responsável' },
  { value: 'procuracao',                          label: 'Procuração' },
  { value: 'documento_identificacao_procurador',  label: 'Doc. identificação do procurador' },
  { value: 'contrato_social',                     label: 'Contrato Social e Alterações' },
  { value: 'certidao_junta_comercial',            label: 'Certidão Junta Comercial' },
  { value: 'conta_energia',                       label: 'Conta de energia (3 meses)' },
  { value: 'plano_internet',                      label: 'Plano de internet (3 meses)' },
  { value: 'guia_iptu',                           label: 'Guia de IPTU' },
  { value: 'escritura_imovel',                    label: 'Escritura do imóvel' },
  { value: 'contrato_locacao',                    label: 'Contrato de locação (3 meses)' },
  { value: 'comprovante_espaco_armazenamento',    label: 'Comprovante Espaço Armazenagem' },
  { value: 'extrato_bancario_corrente',           label: 'Extratos Bancários (3 meses)' },
  { value: 'balancete_verificacao',               label: 'Balancete de Verificação (3 meses)' },
  { value: 'comprovante_transferencia_integralizacao', label: 'Comprovante de transferência de recursos' },
  { value: 'extrato_bancario_integralizacao',     label: 'Contrato de Empréstimo Bancário' },
  { value: 'contrato_mutuo',                      label: 'Contrato de Mútuo Registrado em Cartório' },
  { value: 'balancete_mutuante',                  label: 'Balancete do Mutuante PJ' },
  { value: 'comprovante_iof',                     label: 'Comprovante Recolhimento IOF' },
  { value: 'balanco_patrimonial_integralizacao',  label: 'Balanço Patrimonial' },
  { value: 'outro',                               label: 'Documento indefinido / Outro' },
];

const PROMPT_CLASSIFICACAO = (nomeArquivo) => `
Você é um classificador de documentos para processos de revisão de estimativa RADAR perante a Receita Federal do Brasil (IN RFB 1984/2020, Portaria Coana 72/2020).

Analise o documento PDF cujo nome é: "${nomeArquivo}"

Com base no conteúdo visual e textual do documento, classifique-o em UMA das categorias abaixo:

requerimento_das - Requerimento de Disponibilidade Ativo Circulante (DAS / formulário RFB)
documento_identificacao_responsavel - RG, CNH, passaporte do responsável legal
procuracao - Procuração (instrumento de mandato)
documento_identificacao_procurador - RG, CNH do procurador
contrato_social - Contrato Social, Estatuto ou alterações contratuais
certidao_junta_comercial - Certidão da Junta Comercial ou DREI
conta_energia - Conta de energia elétrica
plano_internet - Fatura/plano de internet ou telefone
guia_iptu - Guia/carnê de IPTU
escritura_imovel - Escritura pública de imóvel
contrato_locacao - Contrato de locação comercial ou comprovante de pagamento de aluguel
comprovante_espaco_armazenamento - Comprovante de espaço de armazenagem/armazém
extrato_bancario_corrente - Extrato bancário de conta corrente ou conta poupança
balancete_verificacao - Balancete de verificação contábil
comprovante_transferencia_integralizacao - Comprovante de TED/PIX/transferência bancária de integralização ou aporte
extrato_bancario_integralizacao - Contrato de empréstimo bancário (CCB, CCP)
contrato_mutuo - Contrato de mútuo registrado em cartório
balancete_mutuante - Balancete de verificação do mutuante
comprovante_iof - DARF de IOF ou comprovante de recolhimento IOF
balanco_patrimonial_integralizacao - Balanço patrimonial (integralização ou aumento de capital)
outro - Não identificado / outro tipo

Retorne JSON com:
{
  "tipo_documento": "<valor exato acima>",
  "confianca": <número 0-100>,
  "justificativa": "<breve explicação de por que classificou assim>",
  "dados_relevantes": {
    "cnpj": "<se encontrado>",
    "razao_social": "<se encontrada>",
    "data": "<data principal do documento>",
    "valor": "<valor monetário principal, se houver>"
  }
}
`;

// ── Estado por arquivo ────────────────────────────────────────────────────────
function criarItemArquivo(file) {
  return {
    id: Math.random().toString(36).slice(2),
    file,
    nome: file.name,
    tamanho: file.size,
    status: 'pendente', // pendente | classificando | sugerido | aprovado | enviado | erro
    tipo_sugerido: null,
    confianca: null,
    justificativa: null,
    dados_relevantes: {},
    tipo_final: null,
    caso_id: null,
    file_uri: null,
    erro: null,
  };
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function UploadInteligente() {
  const [itens, setItens] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [casoSelecionado, setCasoSelecionado] = useState('');
  const inputRef = useRef();

  const { data: casos = [] } = useQuery({
    queryKey: ['casos'],
    queryFn: () => base44.entities.Caso.list('-created_date', 50)
  });
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const nomeCliente = (casoId) => {
    const caso = casos.find(c => c.id === casoId);
    if (!caso) return '';
    const cli = clientes.find(c => c.id === caso.cliente_id);
    return cli ? cli.razao_social : caso.numero_caso || casoId;
  };

  const atualizarItem = (id, patch) =>
    setItens(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const adicionarArquivos = useCallback((files) => {
    const novos = Array.from(files)
      .filter(f =>
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') ||
        f.type === 'image/jpeg' || f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg') ||
        f.type === 'image/png' || f.name.toLowerCase().endsWith('.png')
      )
      .map(criarItemArquivo);
    if (!novos.length) return;
    setItens(prev => [...prev, ...novos]);
    novos.forEach(item => classificarItem(item));
  }, []);

  const classificarItem = async (item) => {
    atualizarItem(item.id, { status: 'classificando' });
    try {
      // Upload primeiro
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: item.file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 3600 });

      // Classificar via LLM
      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: PROMPT_CLASSIFICACAO(item.nome),
        file_urls: [signed_url],
        response_json_schema: {
          type: 'object',
          properties: {
            tipo_documento: { type: 'string' },
            confianca: { type: 'number' },
            justificativa: { type: 'string' },
            dados_relevantes: { type: 'object' }
          }
        }
      });

      atualizarItem(item.id, {
        status: 'sugerido',
        file_uri,
        tipo_sugerido: resultado.tipo_documento || 'outro',
        tipo_final: resultado.tipo_documento || 'outro',
        confianca: resultado.confianca || 0,
        justificativa: resultado.justificativa || '',
        dados_relevantes: resultado.dados_relevantes || {},
      });
    } catch (e) {
      atualizarItem(item.id, { status: 'erro', erro: e.message });
    }
  };

  const aprovarItem = async (id) => {
    const item = itens.find(i => i.id === id);
    if (!item || !item.file_uri) return;

    atualizarItem(id, { status: 'enviando' });
    try {
      const caso_id = casoSelecionado || null;
      await base44.entities.Documento.create({
        caso_id,
        tipo_documento: item.tipo_final || 'outro',
        nome_arquivo: item.nome,
        file_uri: item.file_uri,
        dados_extraidos: item.dados_relevantes,
        status_analise: 'pendente',
        observacoes: item.justificativa ? `Classificado por IA (${item.confianca}% confiança): ${item.justificativa}` : ''
      });
      atualizarItem(id, { status: 'enviado', caso_id });
    } catch (e) {
      atualizarItem(id, { status: 'erro', erro: e.message });
    }
  };

  const removerItem = (id) => setItens(prev => prev.filter(i => i.id !== id));

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    adicionarArquivos(e.dataTransfer.files);
  }, [adicionarArquivos]);

  const pendentes = itens.filter(i => i.status === 'sugerido').length;
  const enviados = itens.filter(i => i.status === 'enviado').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Upload Inteligente</h1>
            <p className="text-sm text-slate-500 mt-1">IA classifica cada PDF automaticamente conforme Portaria Coana 72</p>
          </div>
          {itens.length > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{pendentes} aguardando aprovação</span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">{enviados} enviados</span>
            </div>
          )}
        </div>

        {/* Caso selector */}
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Vincular ao caso:</span>
              </div>
              <Select value={casoSelecionado} onValueChange={setCasoSelecionado}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Selecione um caso (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {casos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.numero_caso || c.id} — {nomeCliente(c.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {casoSelecionado && (
                <Button variant="ghost" size="sm" onClick={() => setCasoSelecionado('')} className="text-slate-400 h-8">
                  <X className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf,.jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => adicionarArquivos(e.target.files)}
          />
          <Upload className={`h-10 w-10 mx-auto mb-3 ${dragging ? 'text-blue-500' : 'text-slate-300'}`} />
          <p className="text-slate-600 font-medium">Arraste PDFs aqui ou clique para selecionar</p>
          <p className="text-xs text-slate-400 mt-1">Vários arquivos de uma vez • Sem limite de tamanho por arquivo</p>
        </div>

        {/* Lista de itens */}
        {itens.length > 0 && (
          <div className="space-y-3">
            {itens.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                casos={casos}
                clientes={clientes}
                casoSelecionado={casoSelecionado}
                onAprovar={() => aprovarItem(item.id)}
                onReclassificar={(tipo) => atualizarItem(item.id, { tipo_final: tipo })}
                onReprocessar={() => classificarItem(item)}
                onRemover={() => removerItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, onAprovar, onReclassificar, onReprocessar, onRemover, casoSelecionado }) {
  const tipoInfo = TIPOS_UNICOS.find(t => t.value === item.tipo_final) || TIPOS_UNICOS.find(t => t.value === 'outro');
  const indefinido = item.tipo_final === 'outro';
  const confiancaAlta = item.confianca >= 80;

  const formatBytes = (b) => b > 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : (b / 1024).toFixed(0) + ' KB';

  return (
    <Card className={`border transition-all ${
      item.status === 'enviado' ? 'border-emerald-200 bg-emerald-50/30' :
      item.status === 'erro' ? 'border-red-200 bg-red-50/20' :
      indefinido && item.status === 'sugerido' ? 'border-amber-200 bg-amber-50/20' :
      'border-slate-100 bg-white'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            item.status === 'enviado' ? 'bg-emerald-100' :
            item.status === 'erro' ? 'bg-red-100' :
            item.status === 'classificando' || item.status === 'enviando' ? 'bg-blue-100' :
            indefinido ? 'bg-amber-100' : 'bg-slate-100'
          }`}>
            {item.status === 'classificando' || item.status === 'enviando'
              ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              : item.status === 'enviado' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              : item.status === 'erro' ? <AlertCircle className="h-5 w-5 text-red-500" />
              : indefinido ? <HelpCircle className="h-5 w-5 text-amber-500" />
              : <FileText className="h-5 w-5 text-slate-400" />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{item.nome}</p>
                <p className="text-[11px] text-slate-400">{formatBytes(item.tamanho)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onRemover} className="h-7 w-7 p-0 text-slate-300 hover:text-red-400 flex-shrink-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Status labels */}
            {item.status === 'pendente' && <p className="text-xs text-slate-400">Aguardando upload...</p>}
            {item.status === 'classificando' && <p className="text-xs text-blue-500 animate-pulse">Classificando com IA...</p>}
            {item.status === 'enviando' && <p className="text-xs text-blue-500 animate-pulse">Enviando documento...</p>}
            {item.status === 'enviado' && <p className="text-xs text-emerald-600 font-medium">✓ Documento enviado com sucesso</p>}
            {item.status === 'erro' && <p className="text-xs text-red-500">{item.erro}</p>}

            {/* Sugestão */}
            {item.status === 'sugerido' && (
              <div className="space-y-2">
                {/* Tipo sugerido */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${indefinido ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-100'}`}>
                  {indefinido
                    ? <HelpCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{tipoInfo?.label}</p>
                    {item.justificativa && <p className="text-[10px] text-slate-500 truncate">{item.justificativa}</p>}
                  </div>
                  {item.confianca !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      confiancaAlta ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{item.confianca}%</span>
                  )}
                </div>

                {/* Dados relevantes */}
                {Object.values(item.dados_relevantes || {}).some(v => v) && (
                  <div className="flex flex-wrap gap-2">
                    {item.dados_relevantes.cnpj && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">CNPJ: {item.dados_relevantes.cnpj}</span>}
                    {item.dados_relevantes.razao_social && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full truncate max-w-[200px]">{item.dados_relevantes.razao_social}</span>}
                    {item.dados_relevantes.data && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.dados_relevantes.data}</span>}
                    {item.dados_relevantes.valor && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.dados_relevantes.valor}</span>}
                  </div>
                )}

                {/* Reclassificar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={item.tipo_final} onValueChange={onReclassificar}>
                    <SelectTrigger className="h-8 text-xs rounded-xl flex-1 max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_UNICOS.map(t => (
                        <SelectItem key={t.value + t.label} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={onAprovar}
                    className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Aprovar e Enviar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReprocessar}
                    className="h-8 w-8 p-0 rounded-xl text-slate-400"
                    title="Reclassificar"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}