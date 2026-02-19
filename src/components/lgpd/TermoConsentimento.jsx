/**
 * Componente de Termo de Consentimento LGPD
 * 
 * Implementa requisitos da Lei Geral de Proteção de Dados (Lei 13.709/2018)
 * para coleta de consentimento explícito do titular dos dados.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, FileText, Eye, Download, Trash2, AlertCircle } from 'lucide-react';

export default function TermoConsentimento({ onAccept, onReject }) {
  const [consentimentos, setConsentimentos] = useState({
    tratamentoDados: false,
    compartilhamento: false,
    armazenamento: false,
    analiseAutomatizada: false
  });

  const [leuTermo, setLeuTermo] = useState(false);

  const todosConsentimentosMarcados = Object.values(consentimentos).every(v => v);

  const handleConsentimentoChange = (key) => {
    setConsentimentos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAceitar = () => {
    if (!todosConsentimentosMarcados || !leuTermo) {
      return;
    }

    const registro = {
      dataHora: new Date().toISOString(),
      consentimentos,
      ipAddress: 'IP_DO_USUARIO', // Deve ser capturado no backend
      userAgent: navigator.userAgent,
      versaoTermo: '1.0'
    };

    onAccept(registro);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-2xl">Termo de Consentimento</CardTitle>
              <CardDescription>
                Lei Geral de Proteção de Dados (LGPD) - Lei 13.709/2018
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden pt-6">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6 text-sm">
              {/* Identificação do Controlador */}
              <section>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  1. Identificação do Controlador de Dados
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  O <strong>RADAR UP</strong> é uma plataforma de análise de conformidade para operadores de comércio exterior, 
                  operada por [NOME DA EMPRESA], inscrita no CNPJ [CNPJ], com sede em [ENDEREÇO].
                </p>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  <strong>Encarregado de Dados (DPO):</strong> [NOME DO DPO]<br />
                  <strong>Contato:</strong> dpo@radarup.com.br
                </p>
              </section>

              {/* Dados Coletados */}
              <section>
                <h3 className="font-semibold text-lg mb-2">2. Dados Pessoais Coletados</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  Para prestação dos serviços, coletamos e tratamos os seguintes dados pessoais:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>Dados Cadastrais:</strong> Nome, CPF, RG, endereço, telefone, e-mail</li>
                  <li><strong>Dados Empresariais:</strong> CNPJ, razão social, contrato social, documentos societários</li>
                  <li><strong>Dados Financeiros:</strong> Extratos bancários, balancetes, balanços patrimoniais, DRE</li>
                  <li><strong>Dados Tributários:</strong> DAS, DARF, comprovantes de pagamento de tributos</li>
                  <li><strong>Documentos:</strong> Procurações, comprovantes de endereço, certidões</li>
                  <li><strong>Dados de Navegação:</strong> Endereço IP, cookies, logs de acesso</li>
                </ul>
              </section>

              {/* Finalidades */}
              <section>
                <h3 className="font-semibold text-lg mb-2">3. Finalidades do Tratamento</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  Os dados pessoais são tratados para as seguintes finalidades:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Análise de capacidade financeira conforme IN RFB 1984/2020 e Portaria Coana 72/2020</li>
                  <li>Verificação de conformidade documental e cruzamento de dados</li>
                  <li>Elaboração de relatórios e pareceres técnicos</li>
                  <li>Comunicação com o titular sobre o andamento do processo</li>
                  <li>Cumprimento de obrigações legais e regulatórias</li>
                  <li>Melhoria dos serviços através de análise estatística anonimizada</li>
                </ul>
              </section>

              {/* Base Legal */}
              <section>
                <h3 className="font-semibold text-lg mb-2">4. Base Legal do Tratamento</h3>
                <p className="text-muted-foreground leading-relaxed">
                  O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais (Art. 7º da LGPD):
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                  <li><strong>Consentimento:</strong> Mediante sua autorização expressa</li>
                  <li><strong>Execução de Contrato:</strong> Para prestação dos serviços contratados</li>
                  <li><strong>Obrigação Legal:</strong> Cumprimento de normas da Receita Federal e COANA</li>
                  <li><strong>Legítimo Interesse:</strong> Prevenção de fraudes e segurança da informação</li>
                </ul>
              </section>

              {/* Compartilhamento */}
              <section>
                <h3 className="font-semibold text-lg mb-2">5. Compartilhamento de Dados</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Seus dados poderão ser compartilhados com:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                  <li><strong>Receita Federal do Brasil:</strong> Para fins de habilitação no RADAR</li>
                  <li><strong>Provedores de Serviços:</strong> Armazenamento em nuvem (AWS/Azure), processamento de IA</li>
                  <li><strong>Autoridades Competentes:</strong> Quando exigido por lei ou ordem judicial</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  <strong>Importante:</strong> Não vendemos, alugamos ou compartilhamos seus dados para fins de marketing.
                </p>
              </section>

              {/* Segurança */}
              <section>
                <h3 className="font-semibold text-lg mb-2">6. Segurança dos Dados</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Implementamos medidas técnicas e organizacionais para proteger seus dados:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                  <li>Criptografia AES-256 para dados em repouso</li>
                  <li>Conexão TLS 1.3 para dados em trânsito</li>
                  <li>Controle de acesso baseado em funções (RBAC)</li>
                  <li>Logs de auditoria de todas as operações</li>
                  <li>Backup diário com retenção de 30 dias</li>
                  <li>Testes de segurança e pentests periódicos</li>
                </ul>
              </section>

              {/* Retenção */}
              <section>
                <h3 className="font-semibold text-lg mb-2">7. Retenção de Dados</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Seus dados serão armazenados pelo período necessário para:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                  <li><strong>Dados do Processo:</strong> 5 anos após conclusão (obrigação legal)</li>
                  <li><strong>Dados Financeiros:</strong> 5 anos (Código Tributário Nacional)</li>
                  <li><strong>Logs de Acesso:</strong> 6 meses (Marco Civil da Internet)</li>
                  <li><strong>Consentimentos:</strong> Pelo prazo de tratamento + 5 anos</li>
                </ul>
              </section>

              {/* Direitos do Titular */}
              <section>
                <h3 className="font-semibold text-lg mb-2">8. Seus Direitos (Art. 18 da LGPD)</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  Você tem os seguintes direitos sobre seus dados pessoais:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Confirmação e Acesso</p>
                      <p className="text-xs text-muted-foreground">Confirmar existência e acessar seus dados</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Correção</p>
                      <p className="text-xs text-muted-foreground">Corrigir dados incompletos ou desatualizados</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <Trash2 className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Eliminação</p>
                      <p className="text-xs text-muted-foreground">Solicitar exclusão de dados desnecessários</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <Download className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Portabilidade</p>
                      <p className="text-xs text-muted-foreground">Receber dados em formato estruturado</p>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  Para exercer seus direitos, entre em contato com nosso DPO através do e-mail <strong>dpo@radarup.com.br</strong>. 
                  Responderemos sua solicitação em até 15 dias.
                </p>
              </section>

              {/* Revogação */}
              <section>
                <h3 className="font-semibold text-lg mb-2">9. Revogação do Consentimento</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Você pode revogar este consentimento a qualquer momento através do menu "Configurações &gt; Privacidade" 
                  ou entrando em contato com o DPO. A revogação não afeta a legalidade do tratamento realizado antes da revogação.
                </p>
              </section>

              {/* Alterações */}
              <section>
                <h3 className="font-semibold text-lg mb-2">10. Alterações no Termo</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Este termo pode ser atualizado periodicamente. Você será notificado sobre alterações significativas 
                  e terá a oportunidade de revisar e aceitar a nova versão.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  <strong>Versão:</strong> 1.0<br />
                  <strong>Última Atualização:</strong> Fevereiro de 2026
                </p>
              </section>
            </div>
          </ScrollArea>

          {/* Checkboxes de Consentimento */}
          <div className="mt-6 space-y-4 border-t pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Para utilizar o RADAR UP, você deve concordar com todos os itens abaixo:
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="tratamentoDados"
                  checked={consentimentos.tratamentoDados}
                  onCheckedChange={() => handleConsentimentoChange('tratamentoDados')}
                />
                <label htmlFor="tratamentoDados" className="text-sm leading-relaxed cursor-pointer">
                  Autorizo o tratamento dos meus dados pessoais para análise de capacidade financeira 
                  conforme descrito neste termo.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="compartilhamento"
                  checked={consentimentos.compartilhamento}
                  onCheckedChange={() => handleConsentimentoChange('compartilhamento')}
                />
                <label htmlFor="compartilhamento" className="text-sm leading-relaxed cursor-pointer">
                  Autorizo o compartilhamento dos meus dados com a Receita Federal do Brasil e provedores 
                  de serviços necessários para a prestação do serviço.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="armazenamento"
                  checked={consentimentos.armazenamento}
                  onCheckedChange={() => handleConsentimentoChange('armazenamento')}
                />
                <label htmlFor="armazenamento" className="text-sm leading-relaxed cursor-pointer">
                  Autorizo o armazenamento dos meus dados pelo período de 5 anos conforme obrigação legal.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="analiseAutomatizada"
                  checked={consentimentos.analiseAutomatizada}
                  onCheckedChange={() => handleConsentimentoChange('analiseAutomatizada')}
                />
                <label htmlFor="analiseAutomatizada" className="text-sm leading-relaxed cursor-pointer">
                  Autorizo o uso de análise automatizada (Inteligência Artificial) para processamento 
                  dos documentos e extração de dados.
                </label>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t">
                <Checkbox
                  id="leuTermo"
                  checked={leuTermo}
                  onCheckedChange={() => setLeuTermo(!leuTermo)}
                />
                <label htmlFor="leuTermo" className="text-sm leading-relaxed cursor-pointer font-medium">
                  Declaro que li e compreendi integralmente este Termo de Consentimento.
                </label>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onReject}
              className="flex-1"
            >
              Não Aceito
            </Button>
            <Button
              onClick={handleAceitar}
              disabled={!todosConsentimentosMarcados || !leuTermo}
              className="flex-1"
            >
              Aceito os Termos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
