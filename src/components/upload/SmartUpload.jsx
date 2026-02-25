/**
 * Componente de Upload Inteligente com Drag & Drop
 * Detecta automaticamente o tipo de documento e faz upload em lote
 */

import React, { useState, useCallback, useImperativeHandle } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/utils/logger';

const tipoDocumentoLabels = {
  requerimento_das: "Requerimento DAS",
  documento_identificacao_responsavel: "Documento de Identificação do Responsável",
  procuracao: "Procuração",
  documento_identificacao_procurador: "Documento de Identificação do Procurador",
  contrato_social: "Contrato Social e Alterações",
  certidao_junta_comercial: "Certidão Junta Comercial",
  conta_energia: "Conta de Energia",
  plano_internet: "Plano de Internet",
  guia_iptu: "Guia de IPTU",
  escritura_imovel: "Escritura do Imóvel",
  contrato_locacao: "Contrato de Locação",
  comprovante_espaco_armazenamento: "Comprovante Espaço Armazenamento",
  extrato_bancario_corrente: "Extratos Bancários - Conta Corrente",
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

/**
 * Detecta tipo de documento baseado no nome do arquivo
 * Em produção, isso seria feito pela IA do Base44
 */
const detectarTipoDocumento = (nomeArquivo) => {
  const nome = nomeArquivo.toLowerCase();
  
  // Mapeamento de palavras-chave para tipos
  const mapeamento = {
    'contrato social': 'contrato_social',
    'contrato_social': 'contrato_social',
    'balancete': 'balancete_verificacao',
    'balanço': 'balanco_patrimonial_integralizacao',
    'balanco': 'balanco_patrimonial_integralizacao',
    'extrato': 'extrato_bancario_corrente',
    'procuracao': 'procuracao',
    'procuração': 'procuracao',
    'rg': 'documento_identificacao_responsavel',
    'cnh': 'documento_identificacao_responsavel',
    'cpf': 'documento_identificacao_responsavel',
    'identidade': 'documento_identificacao_responsavel',
    'energia': 'conta_energia',
    'luz': 'conta_energia',
    'internet': 'plano_internet',
    'iptu': 'guia_iptu',
    'das': 'das_simples_nacional',
    'darf': 'darf_cprb',
    'mutuo': 'contrato_mutuo',
    'mútuo': 'contrato_mutuo',
    'iof': 'comprovante_iof',
    'certidao': 'certidao_junta_comercial',
    'certidão': 'certidao_junta_comercial',
    'junta comercial': 'certidao_junta_comercial',
    'locacao': 'contrato_locacao',
    'locação': 'contrato_locacao',
    'aluguel': 'contrato_locacao'
  };

  for (const [palavra, tipo] of Object.entries(mapeamento)) {
    if (nome.includes(palavra)) {
      return tipo;
    }
  }

  return 'outro';
};

const SmartUpload = React.forwardRef(function SmartUpload({ casoId, onUploadComplete, triggerAnalise, tipoPreSelecionado }, ref) {
  const [arquivos, setArquivos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const onDrop = useCallback((acceptedFiles) => {
    logger.logDocumento('arquivos_selecionados', {
      casoId,
      quantidade: acceptedFiles.length
    });

    const novosArquivos = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      nome: file.name,
      tamanho: file.size,
      tipoDetectado: tipoPreSelecionado || detectarTipoDocumento(file.name),
      status: 'pendente', // pendente, uploading, processando, concluido, erro
      progresso: 0,
      url: null,
      erro: null
    }));

    setArquivos(prev => [...prev, ...novosArquivos]);
  }, [casoId]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.tiff'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    noClick: false
  });

  useImperativeHandle(ref, () => ({
    open
  }), [open]);

  const removerArquivo = (id) => {
    setArquivos(prev => prev.filter(a => a.id !== id));
  };

  const alterarTipo = (id, novoTipo) => {
    setArquivos(prev => prev.map(a => 
      a.id === id ? { ...a, tipoDetectado: novoTipo } : a
    ));
  };

  const uploadMutation = useMutation({
    mutationFn: async (arquivo) => {
      // 1. Upload do arquivo para o Base44
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: arquivo.file
      });
      
      // 2. Criar documento no banco
      const documento = await base44.entities.Documento.create({
        caso_id: casoId,
        tipo_documento: arquivo.tipoDetectado,
        nome_arquivo: arquivo.nome,
        file_uri: uploadResult.file_url,
        status_analise: 'pendente',
        data_documento: new Date().toISOString().split('T')[0]
      });

      return { arquivo, documento, url: uploadResult.file_url };
    },
    onSuccess: ({ arquivo, documento }) => {
      setArquivos(prev => prev.map(a =>
        a.id === arquivo.id
          ? { ...a, status: 'concluido', progresso: 100, documentoId: documento.id }
          : a
      ));
      
      logger.logDocumento('upload_concluido', {
        casoId,
        documentoId: documento.id,
        tipo: arquivo.tipoDetectado
      });
    },
    onError: (error, arquivo) => {
      setArquivos(prev => prev.map(a =>
        a.id === arquivo.id
          ? { ...a, status: 'erro', erro: error.message }
          : a
      ));
      
      logger.error('DOCUMENTO', 'Erro no upload', error, {
        casoId,
        arquivo: arquivo.nome
      });
      
      toast.error(`Erro ao fazer upload de ${arquivo.nome}`);
    }
  });

  const iniciarUpload = async () => {
    if (arquivos.length === 0) return;

    setUploading(true);
    logger.logDocumento('upload_lote_iniciado', {
      casoId,
      quantidade: arquivos.length
    });

    try {
      // Upload sequencial para melhor controle
      for (const arquivo of arquivos) {
        if (arquivo.status === 'pendente') {
          setArquivos(prev => prev.map(a =>
            a.id === arquivo.id ? { ...a, status: 'uploading', progresso: 50 } : a
          ));
          
          await uploadMutation.mutateAsync(arquivo);
        }
      }

      // Atualiza lista de documentos
      queryClient.invalidateQueries(['documentos', casoId]);
      
      toast.success(`${arquivos.length} documento(s) enviado(s) com sucesso!`);
      
      if (onUploadComplete) {
        onUploadComplete();
      }

      // Trigger análise automática se disponível
      if (triggerAnalise) {
        setTimeout(() => {
          triggerAnalise();
        }, 1000);
      }

      // Limpa lista após 2 segundos
      setTimeout(() => {
        setArquivos([]);
      }, 2000);

    } catch (error) {
      toast.error('Erro ao fazer upload dos documentos');
    } finally {
      setUploading(false);
    }
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'pendente':
        return <FileText className="h-5 w-5 text-gray-400" />;
      case 'uploading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'processando':
        return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'concluido':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'erro':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'pendente':
        return 'bg-gray-100 text-gray-800';
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      case 'processando':
        return 'bg-yellow-100 text-yellow-800';
      case 'concluido':
        return 'bg-green-100 text-green-800';
      case 'erro':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatarTamanho = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Inteligente de Documentos
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Área de Drop */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          {isDragActive ? (
            <p className="text-lg font-medium text-blue-600">
              Solte os arquivos aqui...
            </p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                A IA detectará automaticamente o tipo de documento
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Formatos aceitos: PDF, JPG, PNG, TIFF, DOC, DOCX (máx. 50MB)
              </p>
            </>
          )}
        </div>

        {/* Lista de Arquivos */}
        {arquivos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                Arquivos Selecionados ({arquivos.length})
              </h3>
              {!uploading && (
                <Button
                  onClick={iniciarUpload}
                  size="sm"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Enviar Todos
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {arquivos.map(arquivo => (
                <div
                  key={arquivo.id}
                  className="border rounded-lg p-3 space-y-2 bg-white"
                >
                  <div className="flex items-start gap-3">
                    {statusIcon(arquivo.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {arquivo.nome}
                        </p>
                        {arquivo.status === 'pendente' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerArquivo(arquivo.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatarTamanho(arquivo.tamanho)}
                        </span>
                        <Badge variant="outline" className={statusColor(arquivo.status)}>
                          {arquivo.status === 'pendente' && 'Aguardando'}
                          {arquivo.status === 'uploading' && 'Enviando...'}
                          {arquivo.status === 'processando' && 'Processando...'}
                          {arquivo.status === 'concluido' && 'Concluído'}
                          {arquivo.status === 'erro' && 'Erro'}
                        </Badge>
                      </div>

                      {/* Tipo Detectado */}
                      {arquivo.status === 'pendente' && (
                        <div className="mt-2">
                          <select
                            value={arquivo.tipoDetectado}
                            onChange={(e) => alterarTipo(arquivo.id, e.target.value)}
                            className="text-xs border rounded px-2 py-1 w-full"
                          >
                            {Object.entries(tipoDocumentoLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {arquivo.status === 'concluido' && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {tipoDocumentoLabels[arquivo.tipoDetectado]}
                        </p>
                      )}

                      {arquivo.erro && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {arquivo.erro}
                        </p>
                      )}

                      {/* Barra de Progresso */}
                      {(arquivo.status === 'uploading' || arquivo.status === 'processando') && (
                        <Progress value={arquivo.progresso} className="mt-2" />
                      )}
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
});

export default SmartUpload;
