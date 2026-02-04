import React, { useState } from 'react';
import { 
  ChevronDown, 
  HelpCircle, 
  BookOpen,
  AlertCircle,
  DollarSign,
  FileText,
  Clock,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const faqs = [
  {
    categoria: "Habilitação Inicial",
    icone: <FileText className="h-5 w-5" />,
    perguntas: [
      {
        pergunta: "Quanto tempo demora para obter habilitação?",
        resposta: "O prazo varia conforme a modalidade:\n• Expressa: Até 5 dias (automática)\n• Limitada: 10 a 15 dias (análise documental)\n• Ilimitada: 15 a 30 dias (análise completa)\n\nReferência: Art. 56 e 57, IN RFB 1984/2020"
      },
      {
        pergunta: "Posso operar enquanto aguardo a habilitação?",
        resposta: "Não. É necessário aguardar a concessão da habilitação para registrar operações no Siscomex. A habilitação é um pré-requisito obrigatório (Art. 4º, IN RFB 1984/2020)."
      },
      {
        pergunta: "É possível solicitar habilitação em modalidade superior?",
        resposta: "Sim, desde que comprove capacidade financeira adequada através de revisão de estimativa, conforme Art. 26-37, IN RFB 1984/2020."
      },
      {
        pergunta: "Qual é o procedimento básico de habilitação?",
        resposta: "1. Preparar requisitos de admissibilidade (DTE, CNPJ, CPF dos sócios)\n2. Organizar documentação de capacidade operacional e financeira\n3. Acessar Portal Habilita via certificado digital\n4. Selecionar modalidade e preencher formulário\n5. Submeter documentos via e-CAC\n6. Aguardar análise pela RFB\n\nReferência: Art. 21-25, IN RFB 1984/2020"
      }
    ]
  },
  {
    categoria: "Capacidade Financeira",
    icone: <DollarSign className="h-5 w-5" />,
    perguntas: [
      {
        pergunta: "Como calcular a capacidade financeira necessária?",
        resposta: "A fórmula básica é:\nCapacidade = (Saldos Bancários + Aplicações) × 0,5 ÷ Taxa de Câmbio\n\nExemplo: R$ 1.000.000 × 0,5 ÷ 5,2208 = USD 95.785\n\nTaxa vigente: R$ 5,2208 (Portaria Coana 167/2025)\nReferência: Art. 6º, Portaria Coana 72/2020"
      },
      {
        pergunta: "Posso usar recursos de terceiros?",
        resposta: "Sim, através de:\n• Contratos de mútuo registrados em cartório\n• Empréstimos bancários devidamente documentados\n• AFAC (Adiantamento para Futuro Aumento de Capital)\n\nTodos os recursos devem ser comprovados com extratos bancários e transferências identificadas.\nReferência: Art. 6º, §2º, Portaria Coana 72/2020"
      },
      {
        pergunta: "AFAC é aceito como capacidade financeira?",
        resposta: "Sim, o Adiantamento para Futuro Aumento de Capital é aceito e NÃO gera IOF, tornando-o mais vantajoso que mútuo convencional. Exige contrato registrado em cartório.\n\nReferência: Livro RADAR 2025, Cap. 6, Observação 6.3.3"
      },
      {
        pergunta: "Qual é o período considerado para extratos e balancetes?",
        resposta: "Para revisão de estimativa, deve-se apresentar:\n• Extratos bancários dos últimos 3 meses completos\n• Balancetes mensais dos últimos 3 meses\n• Saldo no último dia do mês anterior ao protocolo\n\nReferência: Art. 6º, inciso I, Portaria Coana 72/2020"
      }
    ]
  },
  {
    categoria: "Documentação",
    icone: <BookOpen className="h-5 w-5" />,
    perguntas: [
      {
        pergunta: "Quais documentos são obrigatórios?",
        resposta: "Sempre inclui:\n• Contrato social atualizado e todas as alterações\n• Certidão da Junta Comercial (máximo 90 dias)\n• CPF regular dos sócios\n• Adesão ao DTE (obrigatória)\n\nPara capacidade financeira:\n• Extratos bancários 3 meses\n• Balancetes mensais\n• Comprovantes de endereço\n\nReferência: Art. 21, I e II, IN RFB 1984/2020"
      },
      {
        pergunta: "Posso usar endereço de coworking?",
        resposta: "Sim, desde que tenha:\n• Mesa fixa comprovada\n• Infraestrutura física (energia, internet)\n• Contrato com cláusulas de uso físico\n• Comprovantes de pagamento (últimos 3 meses)\n\nEndereços fiscais puros (sem estrutura) NÃO são aceitos.\nReferência: Art. 7º, §1º, Portaria Coana 72/2020"
      },
      {
        pergunta: "Como nomear arquivos no e-CAC?",
        resposta: "Conforme Anexo Único da Portaria Coana 72/2020, use códigos específicos para cada tipo de documento.\n\nExemplos:\n• Contrato Social: CS ou atas\n• Certidão Junta: CJC\n• Extratos: EXT + banco + período\n• Balancetes: BAL + mês/ano\n\nArquivos em PDF, máximo 10MB cada."
      },
      {
        pergunta: "O que fazer se não tiver todos os documentos?",
        resposta: "A RFB pode intimar para complementação. Você terá:\n• 10 dias úteis para responder intimações básicas\n• 30 dias para regularizações complexas (Art. 39, §4º)\n\nDocumentos faltantes podem resultar em arquivamento do pedido se não forem entregues no prazo."
      }
    ]
  },
  {
    categoria: "Manutenção da Habilitação",
    icone: <Shield className="h-5 w-5" />,
    perguntas: [
      {
        pergunta: "Como evitar desabilitação por inatividade?",
        resposta: "Registre pelo menos UMA operação a cada 12 meses no Siscomex.\n\nSe não houver operações por 12 meses consecutivos, a RFB pode desabilitar automaticamente por inatividade (Art. 47, IN RFB 1984/2020).\n\nPara reativar, é necessário solicitar nova habilitação."
      },
      {
        pergunta: "O que fazer se o CNPJ ficar suspenso?",
        resposta: "1. Regularize imediatamente na RFB (SRF ou presencialmente)\n2. Protocole novo requerimento de habilitação após regularização\n3. Aguarde análise com prazos normais\n\nCNPJ suspenso causa desabilitação automática (Art. 46, I).\nReferência: Art. 38-46, IN RFB 1984/2020"
      },
      {
        pergunta: "Como monitorar intimações da RFB?",
        resposta: "1. Verifique o e-CAC semanalmente\n2. Mantenha o DTE ativo e monitorado\n3. Configure alertas por email se disponível\n4. Responda SEMPRE dentro do prazo (mínimo 10 dias úteis)\n\nFalta de resposta pode resultar em arquivamento ou desabilitação.\nReferência: Art. 39, IN RFB 1984/2020"
      },
      {
        pergunta: "A habilitação é permanente?",
        resposta: "NÃO. A habilitação é concedida em caráter PRECÁRIO (Art. 3º, parágrafo único).\n\nA RFB pode a qualquer momento:\n• Revisar a habilitação\n• Desabilitar por irregularidades\n• Suspender ou cancelar por infrações\n\nPor isso é importante manter SEMPRE os requisitos atualizados."
      }
    ]
  },
  {
    categoria: "Problemas e Soluções",
    icone: <AlertCircle className="h-5 w-5" />,
    perguntas: [
      {
        pergunta: "Minha habilitação foi indeferida. O que fazer?",
        resposta: "1. Analise os motivos do indeferimento notificado pela RFB\n2. Corrija as pendências apontadas\n3. Protocole novo requerimento OR\n4. Protocole impugnação (prazo: 30 dias)\n\nImpugnação deve conter:\n• Fundamentação jurídica e fática\n• Documentos probatórios\n• Pedido específico de revisão\n\nReferência: Art. 56-62, IN RFB 1984/2020"
      },
      {
        pergunta: "Posso operar com habilitação de terceiros?",
        resposta: "NÃO. Usar habilitação de terceiros configura INTERPOSIÇÃO FRAUDULENTA (Art. 2º).\n\nConsequências:\n• Desabilitação imediata\n• Sanções administrativas\n• Possível representação penal\n\nCada empresa deve ter sua própria habilitação."
      },
      {
        pergunta: "Como aumentar os limites operacionais?",
        resposta: "Através de REVISÃO DE ESTIMATIVA, apresentando:\n• Extratos bancários mais recentes\n• Balancetes atualizados\n• Justificativa para aumento\n• Comprovantes de capacidade maior\n\nPrazo de análise: 30 dias úteis\nReferência: Art. 26-37, IN RFB 1984/2020"
      },
      {
        pergunta: "O que é interposição fraudulenta?",
        resposta: "É usar outra pessoa/empresa como 'laranja' para:\n• Ocultar o verdadeiro operador\n• Esconder origem dos recursos\n• Evitar tributos ou sanções\n\nDetecção: Cruzamento de dados, e-Financeira, análise de DI/DE.\nPenalidade: Desabilitação, sanções, representação penal (Art. 2º, IN 1984/2020)."
      }
    ]
  },
  {
    categoria: "Prazos Importantes",
    icone: <Clock className="h-5 w-5" />,
    perguntas: [
      {
        pergunta: "Qual é o prazo para a RFB analisar meu pedido?",
        resposta: "• Habilitação: 10 dias úteis\n• Revisão de Estimativa: 30 dias úteis\n• Análise de Regularização: 30 dias úteis\n\nPrazos podem ser prorrogados por igual período em casos complexos ou com perícia técnica.\nReferência: Art. 56-57, IN RFB 1984/2020"
      },
      {
        pergunta: "Qual é o prazo para responder intimações?",
        resposta: "• Geral: 10 dias úteis (Art. 39, §4º)\n• Documentos complementares: 10 dias úteis\n• Esclarecimentos: 10 dias úteis\n• Desabilitação imediata: 30 dias para regularização\n\nOs prazos começam no dia seguinte à notificação no e-CAC."
      },
      {
        pergunta: "Qual é o prazo para impugnar uma decisão?",
        resposta: "• Impugnação: 30 dias da notificação\n• Recurso voluntário: 30 dias da decisão\n• Recurso especial: 15 dias da decisão do CARF\n\nTodos os prazos são CONTADOS DIFERENTEMENTE:\n• Dias úteis (excluem fins de semana e feriados)\n• Começam no dia SEGUINTE à notificação\n\nReferência: Art. 56-62, IN RFB 1984/2020"
      }
    ]
  }
];

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredFaqs = faqs.map(faq => ({
    ...faq,
    perguntas: faq.perguntas.filter(q => 
      q.pergunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.resposta.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(faq => 
    faq.perguntas.length > 0 && 
    (!selectedCategory || faq.categoria === selectedCategory)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-8 w-8" />
            <h1 className="text-4xl font-bold">Perguntas Frequentes</h1>
          </div>
          <p className="text-blue-100">
            Base de conhecimento sobre habilitação no RADAR conforme IN 1984/2020 e Portaria Coana 72/2020
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Input
          type="text"
          placeholder="Pesquise por palavra-chave..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-6"
        />

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={!selectedCategory ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
          >
            Todas as Categorias
          </Button>
          {faqs.map(faq => (
            <Button
              key={faq.categoria}
              variant={selectedCategory === faq.categoria ? "default" : "outline"}
              onClick={() => setSelectedCategory(faq.categoria)}
              className="flex items-center gap-2"
            >
              {faq.icone}
              {faq.categoria}
            </Button>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((categoria, catIdx) => (
            <div key={catIdx} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                {categoria.icone}
                <h2 className="text-2xl font-bold text-slate-900">{categoria.categoria}</h2>
              </div>

              <div className="space-y-3">
                {categoria.perguntas.map((item, idx) => (
                  <Card 
                    key={idx} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setExpandedIndex(
                      expandedIndex === `${catIdx}-${idx}` ? null : `${catIdx}-${idx}`
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-base text-slate-900">
                          {item.pergunta}
                        </CardTitle>
                        <ChevronDown 
                          className={`h-5 w-5 text-slate-400 transition-transform flex-shrink-0 ${
                            expandedIndex === `${catIdx}-${idx}` ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </CardHeader>

                    {expandedIndex === `${catIdx}-${idx}` && (
                      <CardContent className="pt-0">
                        <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                          {item.resposta}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <Card className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">
              Nenhuma pergunta encontrada para "{searchTerm}"
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}