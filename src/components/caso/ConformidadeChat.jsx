import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ConformidadeChat({ casoId, onClose, analiseExistente }) {
  const [conversationId, setConversationId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Criar ou carregar conversa
    const iniciarConversa = async () => {
      try {
        let convId;
        
        if (analiseExistente) {
          // Carregar conversa existente
          const conversas = await base44.agents.listConversations({
            agent_name: 'analise_conformidade'
          });
          const conversa = conversas.find(c => c.metadata?.caso_id === casoId);
          if (conversa) {
            convId = conversa.id;
            setMensagens(conversa.messages || []);
          } else {
            // Criar nova
            const novaConv = await base44.agents.createConversation({
              agent_name: 'analise_conformidade',
              metadata: { caso_id: casoId }
            });
            convId = novaConv.id;
          }
        } else {
          // Criar nova conversa
          const novaConv = await base44.agents.createConversation({
            agent_name: 'analise_conformidade',
            metadata: { caso_id: casoId }
          });
          convId = novaConv.id;
        }
        
        setConversationId(convId);
      } catch (error) {
        console.error('Erro ao inicializar conversa:', error);
      }
    };

    iniciarConversa();
  }, [casoId, analiseExistente]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    if (!conversationId) return;

    // Subscrever a atualizações em tempo real
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMensagens(data.messages || []);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [conversationId]);

  const handleEnviar = async () => {
    if (!input.trim() || !conversationId) return;

    const mensagem = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: mensagem
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
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
            disabled={isLoading || !conversationId}
          />
          <Button 
            onClick={handleEnviar}
            disabled={isLoading || !conversationId || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}