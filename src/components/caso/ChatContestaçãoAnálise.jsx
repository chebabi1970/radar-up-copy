import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatContestaçãoAnálise({ casoId, casoData, documentosAnálise }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildContextoAnálise = () => {
    let contexto = `Caso ID: ${casoId}\n`;
    
    if (casoData) {
      contexto += `Cliente: ${casoData.cliente_id}\n`;
      contexto += `Status: ${casoData.status}\n`;
      contexto += `Hipótese: ${casoData.hipotese_revisao}\n`;
    }

    if (documentosAnálise && documentosAnálise.length > 0) {
      contexto += `\n## Documentos Analisados:\n`;
      documentosAnálise.forEach(doc => {
        contexto += `- ${doc.tipo_documento}: ${doc.status_analise || 'pendente'}\n`;
        if (doc.dados_extraidos) {
          contexto += `  Dados: ${JSON.stringify(doc.dados_extraidos).substring(0, 100)}...\n`;
        }
      });
    }

    return contexto;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const contexto = buildContextoAnálise();
      const conversaAnterior = newMessages
        .slice(0, -1)
        .map(m => `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.content}`)
        .join('\n\n');

      const prompt = `Você é um especialista em análise de conformidade tributária e revisão de habilitação no regime de apuração de lucro real (RLUR).

Contexto do Caso:
${contexto}

Conversa Anterior:
${conversaAnterior || 'Nenhuma'}

Questão do Usuário:
${userMessage}

Analise a questão levando em conta o contexto do caso e as análises já realizadas. Se o usuário está contestando uma análise, explique de forma técnica e fundamentada em normas do RLUR e da Portaria Coana 72/2020. Seja conciso mas detalhado.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setError('Erro ao processar mensagem. Tente novamente.');
      console.error('Erro no chat:', err);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Contestação de Análises</h3>
        <p className="text-xs text-slate-600 mt-1">Converse com IA sobre as análises realizadas</p>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">Inicie uma conversa para questionar ou discutir as análises</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`rounded-lg px-4 py-2.5 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-900'
                }`}>
                  <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*]:m-0 [&>p]:leading-relaxed">
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="bg-slate-100 rounded-lg px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-slate-200 flex gap-2">
        <Input
          placeholder="Questione uma análise..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
          className="text-sm"
        />
        <Button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}