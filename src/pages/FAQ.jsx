import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  BookOpen, 
  ChevronDown,
  DollarSign,
  FileText,
  Settings,
  AlertCircle
} from 'lucide-react';

const faqData = [
  {
    categoria: "Habilitação Inicial",
    icon: <FileText className="h-5 w-5" />,
    cor: "blue",
    perguntas: [
      {
        pergunta: "Quanto tempo demora para obter a habilitação?",
        resposta: "Depende da modalidade:\n• Expressa: Até 5 dias (automática)\n• Limitada: 10 a 15 dias (análise documental)\n• Ilimitada: 15 a 30 dias (análise completa)",
        referencias: "Arts. 56 e 57, IN RFB nº 1.984/2020"
      },
      {
        pergunta: "Posso operar enquanto aguardo a habilitação?",
        resposta: "Não. É necessário aguardar a concessão da habilitação para registrar operações no Siscomex.",
        referencias: "Art. 4º, IN RFB nº 1.984/2020"
      },
      {
        pergunta: "É possível solicitar habilitação em modalidade superior?",
        resposta: "Sim, desde que comprove capacidade financeira adequada através de revisão de estimativa.",
        referencias: "Arts. 26 a 37, IN RFB nº 1.984/2020"
      }
    ]
  },
  {
    categoria: "Capacidade Financeira",
    icon: <DollarSign className="h-5 w-5" />,
    cor: "green",
    perguntas: [
      {
        pergunta: "Como calcular a capacidade financeira necessária?",
        resposta: "Geralmente 50% dos saldos bancários e aplicações, convertidos pela taxa de câmbio oficial (R$ 5,2208 por dólar conforme Portaria Coana nº 167/2025).\n\nFórmula: Capacidade = (Saldos Bancários + Aplicações) × 0,5",
        referencias: "Art. 2º, Portaria Coana nº 72/2020"
      },
      {
        pergunta: "Posso usar recursos de terceiros?",
        resposta: "Sim, através de contratos de mútuo registrados em cartório ou empréstimos bancários devidamente documentados.",
        referencias: "Art. 6º, Portaria Coana nº 72/2020"
      },
      {
        pergunta: "AFAC é aceito como capacidade financeira?",
        resposta: "Sim, o Adiantamento para Futuro Aumento de Capital (AFAC) é aceito e não gera IOF, sendo uma alternativa vantajosa que evita tributação e alterações contratuais.",
        referencias: "Art. 1.055, § 2º, Código Civil"
      }
    ]
  },
  {
    categoria: "Documentação",
    icon: <BookOpen className="h-5 w-5" />,
    cor: "purple",
    perguntas: [
      {
        pergunta: "Quais documentos são obrigatórios?",
        resposta: "Varia por modalidade, mas sempre inclui:\n• Contrato social atualizado\n• Certidão da Junta Comercial (máximo 90 dias)\n• CPF dos sócios em situação regular\n• Adesão ao DTE (Domicílio Tributário Eletrônico)",
        referencias: "Arts. 6º e 7º, Portaria Coana nº 72/2020"
      },
      {
        pergunta: "Posso usar endereço de coworking?",
        resposta: "Sim, desde que tenha mesa fixa e infraestrutura física comprovada (energia, internet). Endereços fiscais puros não são aceitos.",
        referencias: "Art. 7º, § 1º, Portaria Coana nº 72/2020"
      },
      {
        pergunta: "Como nomear arquivos no e-CAC?",
        resposta: "Conforme Anexo Único da Portaria Coana nº 72/2020, com códigos específicos (DDA) para cada tipo de documento. Use a nomenclatura padronizada para facilitar a análise.",
        referencias: "Art. 8º e Anexo Único, Portaria Coana nº 72/2020"
      }
    ]
  },
  {
    categoria: "Manutenção da Habilitação",
    icon: <Settings className="h-5 w-5" />,
    cor: "orange",
    perguntas: [
      {
        pergunta: "Como evitar desabilitação por inatividade?",
        resposta: "Registre pelo menos uma operação a cada 12 meses no Siscomex. A desabilitação por inatividade ocorre automaticamente após 12 meses consecutivos sem operações.",
        referencias: "Art. 47, IN RFB nº 1.984/2020"
      },
      {
        pergunta: "O que fazer se o CNPJ ficar suspenso?",
        resposta: "Regularize imediatamente na RFB e protocole novo requerimento de habilitação. A habilitação é desabilitada automaticamente quando o CNPJ não está ativo.",
        referencias: "Art. 46, inciso I, IN RFB nº 1.984/2020"
      },
      {
        pergunta: "Como monitorar intimações da RFB?",
        resposta: "Verifique o e-CAC semanalmente e mantenha o DTE ativo. Configure alertas por e-mail para receber notificações de novas mensagens. O prazo para resposta é de 10 dias úteis.",
        referencias: "Art. 39, § 4º, IN RFB nº 1.984/2020"
      }
    ]
  },
  {
    categoria: "Problemas e Soluções",
    icon: <AlertCircle className="h-5 w-5" />,
    cor: "red",
    perguntas: [
      {
        pergunta: "Minha habilitação foi indeferida. O que fazer?",
        resposta: "Analise os motivos do indeferimento, corrija as pendências apontadas e protocole novo requerimento ou impugnação dentro do prazo de 30 dias.",
        referencias: "Arts. 56 a 62, IN RFB nº 1.984/2020"
      },
      {
        pergunta: "Posso operar com habilitação de terceiros?",
        resposta: "Não. Cada empresa deve ter sua própria habilitação. Usar habilitação de terceiros configura interposição fraudulenta, passível de desabilitação e sanções penais.",
        referencias: "Art. 2º e Art. 46, IN RFB nº 1.984/2020"
      },
      {
        pergunta: "Como aumentar os limites operacionais?",
        resposta: "Através de revisão de estimativa, comprovando maior capacidade financeira com extratos bancários, balancetes e documentação adicional conforme a hipótese escolhida.",
        referencias: "Arts. 26 a 37, IN RFB nº 1.984/2020"
      }
    ]
  }
];

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (categoria, index) => {
    const key = `${categoria}-${index}`;
    setExpandedIndex(expandedIndex === key ? null : key);
  };

  const filteredFAQ = faqData.map(categoria => ({
    ...categoria,
    perguntas: categoria.perguntas.filter(
      p => 
        p.pergunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.resposta.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.perguntas.length > 0);

  const corClasses = {
    blue: "from-blue-50 to-blue-100 border-blue-200",
    green: "from-green-50 to-green-100 border-green-200",
    purple: "from-purple-50 to-purple-100 border-purple-200",
    orange: "from-orange-50 to-orange-100 border-orange-200",
    red: "from-red-50 to-red-100 border-red-200"
  };

  const iconCorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    red: "text-red-600"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Perguntas Frequentes - RADAR 2025
          </h1>
          <p className="text-slate-600">
            Dúvidas sobre habilitação no Siscomex baseadas no Livro RADAR 2025
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar perguntas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white shadow-lg"
            />
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {filteredFAQ.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center text-slate-500">
                Nenhuma pergunta encontrada
              </CardContent>
            </Card>
          ) : (
            filteredFAQ.map((categoria) => (
              <div key={categoria.categoria}>
                <div className={`bg-gradient-to-r ${corClasses[categoria.cor]} border rounded-xl p-4 mb-4`}>
                  <div className="flex items-center gap-3">
                    <div className={iconCorClasses[categoria.cor]}>
                      {categoria.icon}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {categoria.categoria}
                    </h2>
                    <Badge variant="outline" className="ml-auto">
                      {categoria.perguntas.length} {categoria.perguntas.length === 1 ? 'pergunta' : 'perguntas'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {categoria.perguntas.map((item, index) => {
                    const key = `${categoria.categoria}-${index}`;
                    const isExpanded = expandedIndex === key;

                    return (
                      <Card 
                        key={index}
                        className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                        onClick={() => toggleExpand(categoria.categoria, index)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <CardTitle className="text-base font-semibold text-slate-900 flex-1">
                              {item.pergunta}
                            </CardTitle>
                            <ChevronDown 
                              className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </CardHeader>
                        
                        {isExpanded && (
                          <CardContent className="pt-0">
                            <div className="border-t border-slate-100 pt-4">
                              <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                                {item.resposta}
                              </p>
                              {item.referencias && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                  <p className="text-xs text-slate-500">
                                    📖 Referência Legal: {item.referencias}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Fonte */}
        <Card className="mt-8 border-0 bg-slate-900 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <BookOpen className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Fonte</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Conteúdo baseado no <strong>Livro RADAR 2025</strong> de Rogério Zarattini Chebabi,
                  elaborado conforme IN RFB nº 1.984/2020 e Portaria Coana nº 72/2020.
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  Última atualização: Agosto 2025
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}