import React, { useState } from 'react';
import { ChevronDown, FileText, Link2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = {
  documentos: [
    {
      titulo: 'Procuração',
      pontos: [
        { item: 'Outorgado (procurador) obrigatoriamente indicado', critico: true },
        { item: 'Nome deve ser idêntico ao documento de identidade', critico: true },
        { item: 'Reconhecimento de firma em cartório', critico: false },
        { item: 'Poderes para atos de revisão de estimativa de capacidade financeira', critico: true }
      ]
    },
    {
      titulo: 'Extratos Bancários',
      pontos: [
        { item: '3 últimos meses imediatamente anteriores ao protocolo', critico: true },
        { item: 'Saldo final do último dia do mês identificado', critico: true },
        { item: 'Aceitar múltiplos bancos e aplicações', critico: false },
        { item: 'Todos os depósitos com origem rastreável', critico: true }
      ]
    },
    {
      titulo: 'Balancete de Verificação',
      pontos: [
        { item: '3 últimos meses anteriores ao protocolo', critico: true },
        { item: 'Conta Bancos idêntica ao saldo final do extrato (tolerância zero)', critico: true },
        { item: 'Balancete equilibrado (débitos = créditos)', critico: true },
        { item: 'Contas de capital social compatíveis', critico: false }
      ]
    },
    {
      titulo: 'Contrato Social / Ato Constitutivo',
      pontos: [
        { item: 'Todos os contratos e alterações (não apenas consolidado)', critico: true },
        { item: 'Capital inicial identificado', critico: true },
        { item: 'Datas de aportes mapeadas', critico: true },
        { item: 'Se capital nos últimos 60 meses: integralização comprovada bancariamente', critico: true },
        { item: 'Alertar sobre integralização em bens', critico: false }
      ]
    },
    {
      titulo: 'Contrato de Mútuo',
      pontos: [
        { item: 'Obrigatoriamente registrado em cartório', critico: true },
        { item: 'Valor correspondente exatamente ao depósito no extrato (tolerância zero)', critico: true },
        { item: 'Se mutuante é PJ: IOF obrigatoriamente recolhido', critico: true },
        { item: 'Prazo, juros e garantias definidos', critico: false }
      ]
    },
    {
      titulo: 'Comprovante IOF',
      pontos: [
        { item: 'Exigido quando mutuante for Pessoa Jurídica', critico: true },
        { item: 'DARF ou comprovante oficial', critico: true },
        { item: 'Código de receita correto', critico: true },
        { item: 'Data próxima ao contrato (máximo 30 dias)', critico: true },
        { item: 'Valor corresponde ao mútuo (tolerância zero)', critico: true }
      ]
    },
    {
      titulo: 'Comprovantes de Domicílio (Energia/Internet/Locação)',
      pontos: [
        { item: '3 últimos meses presentes', critico: true },
        { item: 'Sempre em nome da empresa', critico: true },
        { item: 'Endereço idêntico ao registrado no CNPJ', critico: true },
        { item: 'Sem débitos pendentes', critico: false },
        { item: 'Serviço ativo (para internet)', critico: false }
      ]
    },
    {
      titulo: 'Certidão da Junta Comercial',
      pontos: [
        { item: 'Certidão recente (menos de 3 meses)', critico: true },
        { item: 'CNPJ correto e válido', critico: true },
        { item: 'Razão social idêntica à cadastrada', critico: true },
        { item: 'Endereço correto e consistente', critico: true },
        { item: 'Sócios = contrato social (mesmo número e identificação)', critico: true }
      ]
    },
    {
      titulo: 'Documento de Identificação do Procurador',
      pontos: [
        { item: 'Documento válido (não expirado)', critico: true },
        { item: 'Nome idêntico à procuração', critico: true },
        { item: 'CPF idêntico à procuração', critico: true },
        { item: 'Foto legível e identificável', critico: false },
        { item: 'Original ou cópia autenticada', critico: true }
      ]
    }
  ],
  cruzamentos: [
    {
      doc1: 'Procuração',
      doc2: 'Documento de Identidade do Procurador',
      validacao: 'Nome do procurador deve ser IDÊNTICO',
      severidade: 'crítica'
    },
    {
      doc1: 'Contrato Social',
      doc2: 'Certidão da Junta Comercial',
      validacao: 'CNPJ + razão social + número de sócios deve coincidir exatamente',
      severidade: 'crítica'
    },
    {
      doc1: 'Balancete',
      doc2: 'Extratos Bancários',
      validacao: 'Saldos de caixa devem ser idênticos (tolerância zero)',
      severidade: 'crítica'
    },
    {
      doc1: 'Contrato de Mútuo',
      doc2: 'Comprovante IOF',
      validacao: 'Validar recolhimento de IOF (obrigatório para PJ mutuante)',
      severidade: 'crítica'
    },
    {
      doc1: 'Comprovantes de Domicílio',
      doc2: 'CNPJ Cadastrado',
      validacao: 'Endereços devem corresponder (não apenas rua, mas número e complemento)',
      severidade: 'crítica'
    },
    {
      doc1: 'Contrato de Locação',
      doc2: 'Comprovante de Domicílio',
      validacao: 'Endereços consistentes entre documentos',
      severidade: 'média'
    }
  ]
};

function FAQSection({ titulo, pontos, tipo = 'documento' }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Card className="border-0 shadow-sm">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {tipo === 'documento' ? (
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Link2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <CardTitle className="text-base">{titulo}</CardTitle>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
          </div>
        </CardHeader>
      </button>

      {aberto && (
        <CardContent className="pt-0 pb-4 space-y-2">
          {tipo === 'documento' ? (
            // Pontos de validação
            pontos.map((ponto, idx) => (
              <div key={idx} className="flex gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex gap-2 items-start flex-1">
                  {ponto.critico ? (
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-blue-200 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{ponto.item}</p>
                    {ponto.critico && (
                      <p className="text-xs text-red-600 mt-1 font-semibold">⚠️ CRÍTICO</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Cruzamento
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 mb-1">VALIDAÇÃO:</p>
                <p className="text-sm text-blue-800">{pontos.validacao}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded text-xs text-slate-600">
                <p><strong>Documentos envolvidos:</strong></p>
                <p className="mt-1">✓ {pontos.doc1}</p>
                <p>✓ {pontos.doc2}</p>
              </div>
              {pontos.severidade === 'crítica' && (
                <div className="p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-red-700"><strong>🔴 Severidade: CRÍTICA</strong></p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function FAQ() {
  const [abaDocs, setAbaDocs] = useState(true);

  // FAQ é acessível para todos - sem autenticação necessária

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            FAQ - Validação de Documentos
          </h1>
          <p className="text-slate-600">
            Guia completo sobre os requisitos de análise para habilitação em comércio exterior
          </p>
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setAbaDocs(true)}
            className={`px-4 py-2 font-semibold text-sm sm:text-base border-b-2 transition-colors ${
              abaDocs
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Por Documento
          </button>
          <button
            onClick={() => setAbaDocs(false)}
            className={`px-4 py-2 font-semibold text-sm sm:text-base border-b-2 transition-colors ${
              !abaDocs
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="h-4 w-4 inline mr-2" />
            Cruzamentos
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="space-y-3">
          {abaDocs ? (
            // Documentos
            faqs.documentos.map((doc, idx) => (
              <FAQSection key={idx} titulo={doc.titulo} pontos={doc.pontos} tipo="documento" />
            ))
          ) : (
            // Cruzamentos
            faqs.cruzamentos.map((cruz, idx) => (
              <FAQSection key={idx} titulo={`${cruz.doc1} ↔ ${cruz.doc2}`} pontos={cruz} tipo="cruzamento" />
            ))
          )}
        </div>

        {/* Dicas Gerais */}
        <Card className="mt-8 border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Dicas Importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-amber-900">
              <strong>Tolerância Zero:</strong> Alguns campos (saldos, valores, CNPJs) têm tolerância zero. Qualquer discrepância é crítica.
            </p>
            <p className="text-sm text-amber-900">
              <strong>Datas:</strong> Documentos devem ser recentes (geralmente últimos 3 meses) e consistentes entre si.
            </p>
            <p className="text-sm text-amber-900">
              <strong>Identificação:</strong> Nomes, CPFs e CNPJs devem ser idênticos quando os mesmos sujeitos aparecem em diferentes documentos.
            </p>
            <p className="text-sm text-amber-900">
              <strong>Cruzamento:</strong> A análise automática verifica automaticamente inconsistências entre documentos relacionados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}