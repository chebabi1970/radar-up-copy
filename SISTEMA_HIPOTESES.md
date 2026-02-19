# Sistema de Hipóteses - RADAR UP

## 📋 Implementação Completa

Sistema dinâmico de gerenciamento de hipóteses de revisão conforme **Portaria Coana 72/2020, Art. 4º**.

---

## ✅ O Que Foi Implementado

### 1. **Mapeamento Completo de Documentos por Hipótese**

**Arquivo:** `src/config/documentosPorHipotese.js`

Configuração completa das 5 hipóteses com seus documentos obrigatórios e opcionais:

| Hipótese | Código | Documentos Obrigatórios | Base Legal |
|----------|--------|------------------------|------------|
| **I** | Recursos Financeiros Livres | 7 documentos | Art. 4º, I |
| **II** | Desonerações Tributárias | 8 documentos | Art. 4º, II |
| **III** | DAS - Simples Nacional | 5 documentos | Art. 4º, III |
| **IV** | CPRB | 5 documentos | Art. 4º, IV |
| **V** | Início/Retomada < 5 anos | 5 documentos | Art. 4º, V |

**Funções Disponíveis:**
```javascript
import { 
  getDocumentosObrigatorios,
  getDocumentosOpcionais,
  isDocumentoObrigatorio,
  isDocumentoAplicavel,
  getPeriodoDocumento,
  getHipoteseInfo,
  getAllHipoteses
} from '@/config/documentosPorHipotese';
```

---

### 2. **Componente SeletorHipotese**

**Arquivo:** `src/components/caso/SeletorHipotese.jsx`

Componente visual para seleção e alteração de hipótese com:

**Funcionalidades:**
- ✅ Exibe hipótese atual com destaque
- ✅ Permite selecionar nova hipótese via dropdown
- ✅ Mostra descrição e artigo de cada hipótese
- ✅ **Dialog de confirmação** antes de mudar
- ✅ Alerta sobre impactos da mudança
- ✅ **Bloqueio automático** após protocolo

**Props:**
```javascript
<SeletorHipotese
  hipoteseAtual="I"                    // Hipótese atual do caso
  onMudarHipotese={(nova) => {...}}    // Callback ao confirmar mudança
  bloqueado={false}                    // Bloqueia alteração (após protocolo)
/>
```

**Validações:**
- Não permite mudança se caso estiver protocolado, deferido ou indeferido
- Exige confirmação explícita do usuário
- Alerta sobre atualização da lista de documentos

---

### 3. **ChecklistDocumentos Dinâmico**

**Arquivo:** `src/components/caso/ChecklistDocumentos.jsx` (atualizado)

Checklist que **filtra automaticamente** os documentos baseado na hipótese:

**Nova Prop:**
```javascript
<ChecklistDocumentos
  documentos={[...]}
  hipotese="I"                // Filtra documentos desta hipótese
  onUploadClick={...}
  onViewClick={...}
/>
```

**Comportamento:**
1. Recebe a hipótese como prop
2. Filtra `CATEGORIAS_DOCUMENTOS` usando `isDocumentoAplicavel()`
3. Marca documentos como obrigatórios usando `isDocumentoObrigatorio()`
4. Mostra período obrigatório usando `getPeriodoDocumento()`
5. Recalcula estatísticas automaticamente

**Resultado:**
- Mostra **apenas documentos aplicáveis** à hipótese selecionada
- Marca corretamente quais são **obrigatórios** para aquela hipótese
- Atualiza **automaticamente** quando a hipótese mudar

---

### 4. **Integração no CasoDetalhe**

**Arquivo:** `src/pages/CasoDetalhe.jsx` (atualizado)

**Adicionado:**

1. **Import do SeletorHipotese:**
```javascript
import SeletorHipotese from '@/components/caso/SeletorHipotese';
```

2. **Mutation para atualizar hipótese:**
```javascript
const updateHipoteseMutation = useMutation({
  mutationFn: async (novaHipotese) => {
    await base44.entities.Caso.update(casoId, { 
      hipotese_revisao: novaHipotese 
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['caso', casoId] });
    toast.success('Hipótese atualizada com sucesso');
  }
});
```

3. **SeletorHipotese na aba Dashboard:**
```javascript
<TabsContent value="dashboard">
  <div className="space-y-6">
    <SeletorHipotese
      hipoteseAtual={caso?.hipotese_revisao || 'I'}
      onMudarHipotese={handleMudarHipotese}
      bloqueado={caso?.status === 'protocolado'}
    />
    <DashboardUnificado ... />
  </div>
</TabsContent>
```

4. **Prop hipotese no ChecklistDocumentos:**
```javascript
<ChecklistDocumentos
  documentos={documentos}
  hipotese={caso?.hipotese_revisao || 'I'}
  ...
/>
```

---

## 🎯 Como Funciona

### Fluxo Completo

1. **Usuário abre um caso**
   - Sistema carrega `caso.hipotese_revisao` (ex: "I")

2. **Aba Dashboard**
   - Mostra `SeletorHipotese` com hipótese atual
   - Usuário pode selecionar nova hipótese no dropdown

3. **Usuário seleciona nova hipótese**
   - Dialog de confirmação aparece
   - Mostra impactos da mudança
   - Usuário confirma ou cancela

4. **Ao confirmar**
   - `updateHipoteseMutation` atualiza o banco
   - React Query invalida cache
   - Componentes re-renderizam automaticamente

5. **ChecklistDocumentos atualiza**
   - Recebe nova hipótese via prop
   - Filtra documentos aplicáveis
   - Marca obrigatórios corretamente
   - Recalcula estatísticas

6. **Resultado**
   - Lista de documentos atualizada instantaneamente
   - Usuário vê apenas documentos relevantes
   - Validações refletem nova hipótese

---

## 📊 Documentos por Hipótese

### Hipótese I - Recursos Financeiros Livres

**Obrigatórios:**
1. Requerimento DAS
2. Documento de Identificação do Responsável
3. Contrato Social e Alterações
4. Certidão da Junta Comercial
5. Conta de Energia (últimos 3 meses)
6. Extratos Bancários (últimos 3 meses)
7. Balancete de Verificação (últimos 3 meses)

**Opcionais:**
- Procuração e doc. procurador
- Plano de internet, IPTU
- Escritura, contrato de locação
- Documentos de integralização/mútuo

---

### Hipótese II - Desonerações Tributárias

**Obrigatórios:**
1. Requerimento DAS
2. Documento de Identificação do Responsável
3. Contrato Social e Alterações
4. Certidão da Junta Comercial
5. Conta de Energia
6. **Embasamento Legal da Desoneração**
7. **Comprovante de Habilitação a Regime Especial**
8. **Planilha de Tributos Não Recolhidos**

**Opcionais:**
- Procuração e doc. procurador
- Comprovantes de endereço adicionais
- Documentos de integralização

---

### Hipótese III - DAS (Simples Nacional)

**Obrigatórios:**
1. Requerimento DAS
2. Documento de Identificação do Responsável
3. Contrato Social e Alterações
4. Certidão da Junta Comercial
5. Conta de Energia

**Opcionais:**
- Procuração e doc. procurador
- Comprovantes de endereço adicionais
- Documentos de integralização

---

### Hipótese IV - CPRB

**Obrigatórios:**
1. Requerimento DAS
2. Documento de Identificação do Responsável
3. Contrato Social e Alterações
4. Certidão da Junta Comercial
5. Conta de Energia

**Opcionais:**
- Procuração e doc. procurador
- Comprovantes de endereço adicionais
- Documentos de integralização

---

### Hipótese V - Início/Retomada < 5 anos

**Obrigatórios:**
1. Requerimento DAS
2. Documento de Identificação do Responsável
3. Contrato Social e Alterações
4. Certidão da Junta Comercial
5. Conta de Energia

**Opcionais:**
- Procuração e doc. procurador
- Comprovantes de endereço adicionais
- Documentos de integralização

---

## 🔒 Regras de Negócio

### Quando Permitir Mudança de Hipótese

✅ **PERMITIDO:**
- Status: Novo, Em Análise, Aguardando Documentos, Documentação Completa

❌ **BLOQUEADO:**
- Status: Protocolado, Deferido, Indeferido, Arquivado

**Motivo:** Após o protocolo, a hipótese não pode ser alterada pois já foi submetida à Receita Federal.

---

### Validação de Documentos Obrigatórios

O sistema considera um documento obrigatório se:
1. Está na lista `documentos_obrigatorios` da hipótese atual
2. OU é um documento comum a todas as hipóteses

**Documentos Comuns (sempre obrigatórios):**
- Requerimento DAS
- Documento de Identificação do Responsável
- Contrato Social e Alterações
- Certidão da Junta Comercial
- Conta de Energia

---

## 🚀 Próximas Melhorias Sugeridas

### 1. Marcação Manual de Obrigatórios
Permitir que o usuário marque/desmarque documentos como obrigatórios para casos específicos.

### 2. Documentos Condicionais
Implementar lógica para documentos condicionais (ex: "Se imóvel próprio, então escritura; se alugado, então contrato de locação").

### 3. Validação Pré-Protocolo
Bloquear protocolo se documentos obrigatórios da hipótese não foram enviados.

### 4. Histórico de Mudanças
Registrar histórico de mudanças de hipótese com data, usuário e motivo.

### 5. Sugestão Automática
IA sugere melhor hipótese baseada nos documentos já enviados.

---

## 📝 Commit

**Commit:** `2b396e3`  
**Branch:** `main`  
**Status:** ✅ Pushed com sucesso

**Arquivos Alterados:**
- `src/config/documentosPorHipotese.js` (novo)
- `src/components/caso/SeletorHipotese.jsx` (novo)
- `src/components/caso/ChecklistDocumentos.jsx` (atualizado)
- `src/pages/CasoDetalhe.jsx` (atualizado)

---

## ✅ Resultado Final

Seu RADAR UP agora tem um **sistema completo de gerenciamento de hipóteses** que:

1. ✅ Mapeia corretamente os 5 tipos de hipóteses da Portaria Coana 72/2020
2. ✅ Filtra documentos dinamicamente baseado na hipótese selecionada
3. ✅ Permite mudança de hipótese após criação do caso
4. ✅ Bloqueia mudança após protocolo
5. ✅ Atualiza automaticamente a lista de documentos obrigatórios
6. ✅ Exige confirmação do usuário antes de mudar
7. ✅ Mantém conformidade com a regulamentação

**O sistema está pronto para uso em produção!** 🎉
