import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ConformidadeChat({ casoId, onClose, analiseExistente }) {
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const handleEnviar = async () => {
    if (!input.trim()) return;

    const mensagem = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Adicionar mensagem do usuário
      const novasMensagens = [...mensagens, { role: 'user', content: mensagem }];
      setMensagens(novasMensagens);

      // Chamar LLM para análise
      const historico = novasMensagens.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n\n');
      
      const resposta = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em conformidade fiscal e habilitação com a RFB conforme IN 1984/2020 e Portaria Coana 72/2020.
        
Histórico da conversa:
${historico}

Forneça uma análise detalhada e profissional sobre o caso, considerando documentação, capacidade financeira e requisitos legais.`,
        add_context_from_internet: false
      });

      setMensagens([...novasMensagens, { role: 'assistant', content: resposta }]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao processar a mensagem. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col border-0 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
          <CardTitle className="text-base">Análise de Conformidade - Agent</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {mensagens.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-slate-100 text-slate-900 rounded-bl-none'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <div className="text-sm prose prose-sm prose-slate max-w-none">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-900 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analisando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        <div className="border-t p-4 flex gap-2">
          <Input
           placeholder="Digite sua mensagem..."
           value={input}
           onChange={(e) => setInput(e.target.value)}
           onKeyPress={(e) => {
             if (e.key === 'Enter' && !e.shiftKey) {
               e.preventDefault();
               handleEnviar();
             }
           }}
           disabled={isLoading}
          />
          <Button 
           onClick={handleEnviar}
           disabled={isLoading || !input.trim()}
           className="bg-blue-600 hover:bg-blue-700"
          >
           <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}