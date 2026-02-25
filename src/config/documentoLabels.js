/**
 * Constantes compartilhadas para documentos
 * Centraliza labels, categorias e configs de status usados em múltiplos componentes
 */

import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

export const CATEGORIAS_DOCUMENTOS = [
  {
    id: 'identificacao', nome: 'Identificação e Representação',
    gradiente: 'from-blue-500 to-indigo-500',
    documentos: [
      { tipo: 'requerimento_das', nome: 'Requerimento DAS', descricao: 'Formulário de requerimento preenchido e assinado', obrigatorio: true },
      { tipo: 'documento_identificacao_responsavel', nome: 'Documento de Identificação do Responsável', descricao: 'RG, CNH ou documento oficial com foto', obrigatorio: true },
      { tipo: 'procuracao', nome: 'Procuração', descricao: 'Se houver procurador representando a empresa', obrigatorio: false },
      { tipo: 'documento_identificacao_procurador', nome: 'Documento de Identificação do Procurador', descricao: 'Necessário se houver procuração', obrigatorio: false }
    ]
  },
  {
    id: 'constitutivos', nome: 'Documentos Constitutivos',
    gradiente: 'from-violet-500 to-purple-500',
    documentos: [
      { tipo: 'contrato_social', nome: 'Contrato Social e Alterações', descricao: 'Contrato social consolidado ou com todas as alterações', obrigatorio: true },
      { tipo: 'certidao_junta_comercial', nome: 'Certidão da Junta Comercial', descricao: 'Certidão simplificada atualizada', obrigatorio: true }
    ]
  },
  {
    id: 'endereco', nome: 'Comprovantes de Endereço',
    gradiente: 'from-amber-500 to-orange-500',
    documentos: [
      { tipo: 'conta_energia', nome: 'Conta de Energia', descricao: 'Últimos 3 meses', obrigatorio: true },
      { tipo: 'plano_internet', nome: 'Plano de Internet', descricao: 'Últimos 3 meses', obrigatorio: false },
      { tipo: 'guia_iptu', nome: 'Guia de IPTU', descricao: 'Ano corrente', obrigatorio: false },
      { tipo: 'contrato_locacao', nome: 'Contrato de Locação', descricao: 'Se o imóvel for alugado', obrigatorio: false }
    ]
  },
  {
    id: 'financeiros', nome: 'Documentos Financeiros',
    gradiente: 'from-emerald-500 to-teal-500',
    documentos: [
      { tipo: 'extrato_bancario_corrente', nome: 'Extratos Bancários - Conta Corrente', descricao: 'Últimos 3 meses de todas as contas', obrigatorio: true },
      { tipo: 'balancete_verificacao', nome: 'Balancete de Verificação', descricao: 'Balancete mais recente (máx. 6 meses)', obrigatorio: true },
      { tipo: 'balanco_patrimonial_integralizacao', nome: 'Balanço Patrimonial', descricao: 'Se houver integralização de capital', obrigatorio: false },
      { tipo: 'extrato_bancario_integralizacao', nome: 'Extratos - Integralização de Capital', descricao: 'Se houver integralização', obrigatorio: false }
    ]
  },
  {
    id: 'tributos', nome: 'Comprovantes de Tributos',
    gradiente: 'from-rose-500 to-pink-500',
    documentos: [
      { tipo: 'das_simples_nacional', nome: 'DAS - Simples Nacional', descricao: 'Últimos 12 meses', obrigatorio: true },
      { tipo: 'darf_cprb', nome: 'DARF CPRB', descricao: 'Se aplicável', obrigatorio: false }
    ]
  },
  {
    id: 'especiais', nome: 'Documentos Especiais',
    gradiente: 'from-cyan-500 to-sky-500',
    documentos: [
      { tipo: 'contrato_mutuo', nome: 'Contrato de Mútuo', descricao: 'Se houver empréstimo de sócio', obrigatorio: false },
      { tipo: 'comprovante_iof', nome: 'Comprovante de IOF', descricao: 'Necessário se houver contrato de mútuo', obrigatorio: false },
      { tipo: 'balancete_mutuante', nome: 'Balancete do Mutuante', descricao: 'Se o mutuante for pessoa jurídica', obrigatorio: false }
    ]
  }
];

export const tipoDocumentoLabels = {
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

export const statusAnaliseConfig = {
  pendente: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", label: "Pendente", gradient: "from-amber-50 to-amber-50/50" },
  aprovado: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", label: "Aprovado", gradient: "from-emerald-50 to-emerald-50/50" },
  reprovado: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", label: "Reprovado", gradient: "from-red-50 to-red-50/50" },
  com_ressalvas: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200", label: "Com Ressalvas", gradient: "from-orange-50 to-orange-50/50" }
};

export const fileTypeIcons = {
  pdf: 'text-red-500',
  jpg: 'text-blue-500',
  jpeg: 'text-blue-500',
  png: 'text-purple-500',
  doc: 'text-indigo-500',
  docx: 'text-indigo-500',
};
