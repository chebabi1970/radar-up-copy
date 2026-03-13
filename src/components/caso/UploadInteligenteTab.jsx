import React, { useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2,
  X, RefreshCw, Send, HelpCircle, ChevronRight
} from 'lucide-react';

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
Analise o documento cujo nome é: "${nomeArquivo}"
Classifique em UMA das categorias:
requerimento_das, documento_identificacao_responsavel, procuracao, documento_identificacao_procurador, contrato_social, certidao_junta_comercial, conta_energia, plano_internet, guia_iptu, escritura_imovel, contrato_locacao, comprovante_espaco_armazenamento, extrato_bancario_corrente, balancete_verificacao, comprovante_transferencia_integralizacao, extrato_bancario_integralizacao, contrato_mutuo, balancete_mutuante, comprovante_iof, balanco_patrimonial_integralizacao, outro.
Retorne JSON: {"tipo_documento":"<valor>","confianca":<0-100>,"justificativa":"<breve>","dados_relevantes":{"cnpj":"","razao_social":"","data":"","valor":""}}
`;

function criarItem(file) {
  return {
    id: Math.random().toString(36).slice(2),
    file, nome: file.name, tamanho: file.size,
    status: 'pendente', tipo_sugerido: null, confianca: null,
    justificativa: null, dados_relevantes: {}, tipo_final: null,
    file_uri: null, erro: null,
  };
}

export default function UploadInteligenteTab({ casoId, onDocumentosChange }) {
  const [itens, setItens] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const atualizar = (id, patch) =>
    setItens(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const classificar = async (item) => {
    atualizar(item.id, { status: 'classificando' });
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: item.file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 3600 });
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
      atualizar(item.id, {
        status: 'sugerido', file_uri,
        tipo_sugerido: resultado.tipo_documento || 'outro',
        tipo_final: resultado.tipo_documento || 'outro',
        confianca: resultado.confianca || 0,
        justificativa: resultado.justificativa || '',
        dados_relevantes: resultado.dados_relevantes || {},
      });
    } catch (e) {
      atualizar(item.id, { status: 'erro', erro: e.message });
    }
  };

  const aprovar = async (id) => {
    const item = itens.find(i => i.id === id);
    if (!item?.file_uri) return;
    atualizar(id, { status: 'enviando' });
    try {
      await base44.entities.Documento.create({
        caso_id: casoId,
        tipo_documento: item.tipo_final || 'outro',
        nome_arquivo: item.nome,
        file_uri: item.file_uri,
        dados_extraidos: item.dados_relevantes,
        status_analise: 'pendente',
        observacoes: item.justificativa ? `IA (${item.confianca}% conf.): ${item.justificativa}` : ''
      });
      atualizar(id, { status: 'enviado' });
      onDocumentosChange?.();
    } catch (e) {
      atualizar(id, { status: 'erro', erro: e.message });
    }
  };

  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

  const adicionar = useCallback((files) => {
    const validos = Array.from(files).filter(f => f.type === 'application/pdf' || /\.(pdf|jpg|jpeg|png)$/i.test(f.name));
    const grandes = validos.filter(f => f.size > MAX_SIZE);
    if (grandes.length > 0) {
      alert(`${grandes.length} arquivo(s) excedem o limite de 50 MB e foram ignorados:\n${grandes.map(f => f.name).join('\n')}`);
    }
    const novos = validos.filter(f => f.size <= MAX_SIZE).map(criarItem);
    if (!novos.length) return;
    setItens(prev => [...prev, ...novos]);
    novos.forEach(item => classificar(item));
  }, []);

  const pendentes = itens.filter(i => i.status === 'sugerido').length;
  const enviados = itens.filter(i => i.status === 'enviado').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-800">Upload Inteligente com IA</h3>
          <p className="text-xs text-slate-500 mt-0.5">A IA classifica cada documento automaticamente conforme Portaria Coana 72</p>
        </div>
        {itens.length > 0 && (
          <div className="flex gap-2 text-xs flex-shrink-0">
            {pendentes > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{pendentes} aguardando</span>}
            {enviados > 0 && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">{enviados} enviados</span>}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); adicionar(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden"
          onChange={(e) => adicionar(e.target.files)} />
        <Upload className={`h-9 w-9 mx-auto mb-2 ${dragging ? 'text-blue-500' : 'text-slate-300'}`} />
        <p className="text-slate-600 font-medium text-sm">Arraste arquivos aqui ou clique para selecionar</p>
        <p className="text-xs text-slate-400 mt-1">PDF, JPG ou PNG • Múltiplos arquivos • Máx. 50 MB por arquivo</p>
      </div>

      {/* Lista */}
      {itens.length > 0 && (
        <div className="space-y-3">
          {itens.map(item => (
            <ItemCard
              key={item.id} item={item}
              onAprovar={() => aprovar(item.id)}
              onReclassificar={(tipo) => atualizar(item.id, { tipo_final: tipo })}
              onReprocessar={() => classificar(item)}
              onRemover={() => setItens(prev => prev.filter(i => i.id !== item.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, onAprovar, onReclassificar, onReprocessar, onRemover }) {
  const tipoInfo = TIPOS_UNICOS.find(t => t.value === item.tipo_final) || TIPOS_UNICOS.find(t => t.value === 'outro');
  const indefinido = item.tipo_final === 'outro';
  const formatBytes = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1024).toFixed(0) + ' KB';

  return (
    <Card className={`border transition-all ${
      item.status === 'enviado' ? 'border-emerald-200 bg-emerald-50/30' :
      item.status === 'erro' ? 'border-red-200 bg-red-50/20' :
      indefinido && item.status === 'sugerido' ? 'border-amber-200 bg-amber-50/20' :
      'border-slate-100 bg-white'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
            item.status === 'enviado' ? 'bg-emerald-100' :
            item.status === 'erro' ? 'bg-red-100' :
            item.status === 'classificando' || item.status === 'enviando' ? 'bg-blue-100' :
            indefinido ? 'bg-amber-100' : 'bg-slate-100'
          }`}>
            {item.status === 'classificando' || item.status === 'enviando'
              ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              : item.status === 'enviado' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              : item.status === 'erro' ? <AlertCircle className="h-4 w-4 text-red-500" />
              : indefinido ? <HelpCircle className="h-4 w-4 text-amber-500" />
              : <FileText className="h-4 w-4 text-slate-400" />}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{item.nome}</p>
                <p className="text-[11px] text-slate-400">{formatBytes(item.tamanho)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onRemover}
                className="h-7 w-7 p-0 text-slate-300 hover:text-red-400 flex-shrink-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {item.status === 'classificando' && <p className="text-xs text-blue-500 animate-pulse">Classificando com IA...</p>}
            {item.status === 'enviando' && <p className="text-xs text-blue-500 animate-pulse">Salvando documento...</p>}
            {item.status === 'enviado' && <p className="text-xs text-emerald-600 font-medium">✓ Documento salvo no caso</p>}
            {item.status === 'erro' && <p className="text-xs text-red-500">{item.erro}</p>}

            {item.status === 'sugerido' && (
              <div className="space-y-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${indefinido ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-100'}`}>
                  {indefinido
                    ? <HelpCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{tipoInfo?.label}</p>
                    {item.justificativa && <p className="text-[10px] text-slate-500 truncate">{item.justificativa}</p>}
                  </div>
                  {item.confianca !== null && (
                    <Badge className={`text-[10px] px-1.5 py-0.5 flex-shrink-0 ${item.confianca >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.confianca}%
                    </Badge>
                  )}
                </div>

                {Object.values(item.dados_relevantes || {}).some(v => v) && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.dados_relevantes.cnpj && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">CNPJ: {item.dados_relevantes.cnpj}</span>}
                    {item.dados_relevantes.razao_social && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full truncate max-w-[180px]">{item.dados_relevantes.razao_social}</span>}
                    {item.dados_relevantes.data && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.dados_relevantes.data}</span>}
                    {item.dados_relevantes.valor && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.dados_relevantes.valor}</span>}
                  </div>
                )}

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
                  <Button size="sm" onClick={onAprovar}
                    className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5">
                    <Send className="h-3.5 w-3.5" /> Salvar no Caso
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onReprocessar}
                    className="h-8 w-8 p-0 rounded-xl text-slate-400" title="Reclassificar">
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