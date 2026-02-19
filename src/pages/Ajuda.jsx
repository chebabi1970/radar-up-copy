import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  Search
} from 'lucide-react';
import { Input } from "@/components/ui/input";

export default function Ajuda() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqItems = [
    {
      id: 1,
      categoria: "Geral",
      pergunta: "O que é o RADAR UP?",
      resposta: "O RADAR UP é uma plataforma de Inteligência Artificial que automatiza a análise de documentos para processos de revisão de capacidade financeira no Siscomex, com base na IN RFB 1984/2020 e Portaria Coana 72/2020."
    },
    {
      id: 2,
      categoria: "Geral",
      pergunta: "O RADAR UP substitui um analista?",
      resposta: "Não. O RADAR UP é uma ferramenta de apoio à decisão. Ele automatiza o trabalho repetitivo, identifica inconsistências e fornece uma análise robusta para que o analista possa tomar a melhor decisão de forma rápida e segura."
    },
    {
      id: 3,
      categoria: "Geral",
      pergunta: "Os meus dados estão seguros?",
      resposta: "Sim. A segurança é nossa prioridade máxima. Usamos criptografia de ponta-a-ponta, controle de acesso rigoroso e seguimos as melhores práticas de segurança do mercado, incluindo conformidade com a LGPD."
    },
    {
      id: 4,
      categoria: "Funcionalidades",
      pergunta: "Como funciona o Score de Conformidade?",
      resposta: "O score é um algoritmo proprietário que analisa mais de 50 fatores, incluindo a quantidade de documentos, o resultado da análise individual, as inconsistências encontradas na análise cruzada e a criticidade de cada alerta. Ele é uma representação numérica da 'saúde' do seu caso."
    },
    {
      id: 5,
      categoria: "Funcionalidades",
      pergunta: "O que a Análise Automática faz?",
      resposta: "Ela monitora o caso e, sempre que um novo documento é adicionado, executa automaticamente a análise individual e a análise cruzada, atualizando o dashboard em tempo real. Isso economiza tempo e garante que nenhuma análise seja esquecida."
    },
    {
      id: 6,
      categoria: "Funcionalidades",
      pergunta: "Posso fazer upload de qualquer tipo de arquivo?",
      resposta: "O sistema é otimizado para arquivos PDF e imagens (JPG, PNG). A IA consegue extrair dados de documentos escaneados, mas a qualidade da imagem impacta na precisão. Recomendamos sempre usar documentos com boa legibilidade."
    },
    {
      id: 7,
      categoria: "Funcionalidades",
      pergunta: "O que acontece se a IA não conseguir identificar um documento?",
      resposta: "Se a IA não tiver certeza sobre o tipo de documento, ela o marcará como 'Não Identificado'. Você poderá então atribuir o tipo correto manualmente na aba 'Documentos'."
    },
    {
      id: 8,
      categoria: "Análise e Resultados",
      pergunta: "O que significa uma inconsistência 'Crítica' na análise cruzada?",
      resposta: "Significa que foi encontrada uma divergência grave que provavelmente resultaria em um questionamento ou indeferimento pela Receita Federal. Exemplos: CNPJ diferente entre documentos, ou grande diferença entre o saldo do balancete e dos extratos."
    },
    {
      id: 9,
      categoria: "Análise e Resultados",
      pergunta: "O cálculo da capacidade financeira é 100% preciso?",
      resposta: "O cálculo é uma estimativa baseada nos dados extraídos dos documentos e na fórmula da Portaria Coana 72/2020. Ele é extremamente preciso, mas depende da qualidade e completude dos documentos fornecidos."
    },
    {
      id: 10,
      categoria: "Análise e Resultados",
      pergunta: "Posso exportar os resultados da análise?",
      resposta: "Sim. Em breve, você poderá gerar um relatório completo em PDF com todos os resultados da análise, gráficos e tabelas, ideal para apresentar ao seu cliente ou para arquivamento."
    },
    {
      id: 11,
      categoria: "Solução de Problemas",
      pergunta: "Um documento não foi analisado. O que eu faço?",
      resposta: "Primeiro, verifique se o documento está legível. Se estiver, você pode ir ao Dashboard e clicar em 'Forçar Reanálise'. Se o problema persistir, entre em contato com o suporte."
    },
    {
      id: 12,
      categoria: "Solução de Problemas",
      pergunta: "O Score de Conformidade está baixo. Como posso melhorá-lo?",
      resposta: "Siga as 'Próximas Ações Recomendadas' no Dashboard. Geralmente, um score baixo é causado por documentos faltantes ou inconsistências críticas. Resolva os alertas na aba 'Cruzada' e envie os documentos pendentes na 'Lista Docs'."
    }
  ];

  const filteredFaq = faqItems.filter(item =>
    item.pergunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.resposta.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categorias = [...new Set(faqItems.map(item => item.categoria))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Central de Ajuda
          </h1>
          <p className="text-slate-600">
            Encontre respostas e aprenda a usar o RADAR UP
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Pesquisar na ajuda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manual" className="text-base">
              <BookOpen className="h-4 w-4 mr-2" />
              Manual de Uso
            </TabsTrigger>
            <TabsTrigger value="faq" className="text-base">
              <HelpCircle className="h-4 w-4 mr-2" />
              FAQ
            </TabsTrigger>
          </TabsList>

          {/* Manual de Uso */}
          <TabsContent value="manual">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 md:p-8 prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Manual de Uso Completo do RADAR UP</h2>
                
                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">1. Introdução</h3>
                <p className="text-slate-700 leading-relaxed">
                  Bem-vindo ao <strong>RADAR UP</strong>, a plataforma de IA mais avançada para gestão e análise de processos de revisão de capacidade financeira para operadores de comércio exterior. Este manual guiará você por todas as funcionalidades do sistema, garantindo que você aproveite ao máximo nossa tecnologia para otimizar seu trabalho, reduzir riscos e acelerar aprovações.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  O RADAR UP automatiza a análise de conformidade conforme a <strong>IN RFB 1984/2020</strong> e a <strong>Portaria Coana 72/2020</strong>, transformando um processo de horas em minutos.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">2. Primeiros Passos: Criando um Caso</h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-700">
                  <li>Acesse a tela de "Casos" no menu principal.</li>
                  <li>Clique em <strong>"Novo Caso"</strong>.</li>
                  <li>Selecione o Cliente (ou crie um novo).</li>
                  <li>Escolha a Hipótese de Revisão que se aplica ao caso.</li>
                  <li>Clique em <strong>"Criar Caso"</strong>.</li>
                </ol>
                <p className="text-slate-700 leading-relaxed mt-3">
                  Pronto! Seu caso foi criado e você será redirecionado para a tela de detalhes do caso, onde a mágica acontece.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">3. A Tela de Detalhes do Caso: Seu Cockpit de Análise</h3>
                <p className="text-slate-700 leading-relaxed">
                  Esta é a tela principal onde você gerenciará todo o processo. Ela é organizada em <strong>7 abas inteligentes</strong>:
                </p>

                <h4 className="text-lg font-semibold text-slate-800 mt-5 mb-2">3.1. Aba "Dashboard" (Visão Geral)</h4>
                <p className="text-slate-700 leading-relaxed">
                  Esta é sua tela inicial. Ela fornece uma visão consolidada e inteligente do status do caso:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Score de Conformidade:</strong> Uma pontuação de 0 a 100 que resume a saúde do seu caso.</li>
                  <li><strong>Progresso Geral:</strong> Uma barra de progresso que mostra o quão perto você está de finalizar o caso.</li>
                  <li><strong>Próxima Ação Recomendada:</strong> A IA sugere a ação mais importante que você deve tomar.</li>
                  <li><strong>Resumo de Alertas:</strong> Quantidade de inconsistências críticas, altas, médias e baixas encontradas.</li>
                </ul>

                <h4 className="text-lg font-semibold text-slate-800 mt-5 mb-2">3.2. Aba "Guia" (Wizard do Processo)</h4>
                <p className="text-slate-700 leading-relaxed">
                  Não sabe por onde começar? Use o Guia! Ele mostra as 4 etapas macro do processo e o status de cada uma.
                </p>

                <h4 className="text-lg font-semibold text-slate-800 mt-5 mb-2">3.3. Aba "Lista Docs" (Checklist Interativo)</h4>
                <p className="text-slate-700 leading-relaxed">
                  Aqui você tem um checklist completo com os <strong>19 tipos de documentos</strong> que podem ser necessários. O sistema indica quais são obrigatórios para a hipótese do seu caso.
                </p>

                <h4 className="text-lg font-semibold text-slate-800 mt-5 mb-2">3.4. Aba "Upload" (Upload Inteligente)</h4>
                <p className="text-slate-700 leading-relaxed">
                  Fazer upload de documentos nunca foi tão fácil:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Arrastar e Soltar (Drag & Drop):</strong> Simplesmente arraste os arquivos do seu computador.</li>
                  <li><strong>Detecção Automática:</strong> A IA identifica o tipo de documento automaticamente.</li>
                  <li><strong>Upload em Lote:</strong> Envie múltiplos arquivos de uma vez.</li>
                </ul>

                <h4 className="text-lg font-semibold text-slate-800 mt-5 mb-2">3.5-3.8. Outras Abas</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Checklist:</strong> Gerenciamento detalhado de cada item.</li>
                  <li><strong>Documentos:</strong> Visualizador de todos os documentos enviados.</li>
                  <li><strong>Cruzada:</strong> Análise de inconsistências entre documentos.</li>
                  <li><strong>Resumo:</strong> Cálculo final da capacidade financeira.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4. Entendendo a Análise Automática</h3>
                <p className="text-slate-700 leading-relaxed">
                  O RADAR UP trabalha para você em segundo plano. Assim que um documento é enviado, o sistema:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 ml-4">
                  <li>Inicia a Análise Individual</li>
                  <li>Executa a Análise Cruzada</li>
                  <li>Atualiza o Dashboard</li>
                  <li>Notifica Você</li>
                </ol>

                <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-blue-900 font-semibold">
                    Parabéns! Você está pronto para usar o RADAR UP e transformar sua análise de conformidade.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq">
            <div className="space-y-4">
              {categorias.map(categoria => {
                const itemsCategoria = filteredFaq.filter(item => item.categoria === categoria);
                if (itemsCategoria.length === 0) return null;

                return (
                  <Card key={categoria} className="border-0 shadow-lg">
                    <CardHeader className="bg-slate-50 border-b">
                      <CardTitle className="text-lg font-semibold text-slate-800">
                        {categoria}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {itemsCategoria.map(item => (
                        <div key={item.id} className="border-b last:border-b-0">
                          <button
                            onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                            className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
                          >
                            <span className="font-medium text-slate-900 pr-4">
                              {item.pergunta}
                            </span>
                            {expandedFaq === item.id ? (
                              <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                            )}
                          </button>
                          {expandedFaq === item.id && (
                            <div className="px-6 pb-4 text-slate-700 leading-relaxed">
                              {item.resposta}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}

              {filteredFaq.length === 0 && (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">
                      Nenhum resultado encontrado para "{searchTerm}"
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
