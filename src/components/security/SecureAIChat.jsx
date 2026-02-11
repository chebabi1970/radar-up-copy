import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle, Send } from 'lucide-react';

/**
 * Componente seguro para interação com IA
 * Usa InvokeLLMSecure com todas as proteções de segurança
 */
export default function SecureAIChat({ 
  systemPrompt = "Você é um assistente útil e seguro.",
  placeholder = "Digite sua mensagem...",
  onResponse 
}) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const fullPrompt = `${systemPrompt}\n\nUsuário: ${prompt}`;
      
      const { data } = await base44.functions.invoke('InvokeLLMSecure', {
        prompt: fullPrompt,
        add_context_from_internet: false
      });

      if (data.error) {
        setError(data.error + (data.reason ? ` (${data.reason})` : ''));
        return;
      }

      const aiResponse = data.result;
      setResponse(aiResponse);
      
      setHistory([
        ...history,
        { role: 'user', content: prompt },
        { role: 'assistant', content: aiResponse }
      ]);

      if (onResponse) {
        onResponse(aiResponse);
      }

      setPrompt('');
    } catch (err) {
      console.error('Erro ao invocar IA:', err);
      setError('Erro ao processar requisição. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Histórico de mensagens */}
      {history.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.map((msg, idx) => (
            <Card key={idx} className={msg.role === 'user' ? 'bg-blue-50' : 'bg-slate-50'}>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">
                  {msg.role === 'user' ? 'Você' : 'IA'}
                </p>
                <p className="text-sm text-slate-700">{msg.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Erro de segurança */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Bloqueado por Segurança</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          rows={4}
          className="resize-none"
        />
        
        <Button 
          type="submit" 
          disabled={loading || !prompt.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </>
          )}
        </Button>
      </form>

      <p className="text-xs text-slate-500 text-center">
        🔒 Protegido contra injeção de prompt e tentativas de manipulação
      </p>
    </div>
  );
}