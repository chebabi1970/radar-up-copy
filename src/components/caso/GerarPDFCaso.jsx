import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function GerarPDFCaso({ caso, cliente, documentos, checklist }) {
  const [gerando, setGerando] = useState(false);

  const hipoteseLabels = {
    recursos_financeiros_livres: "Recursos Financeiros de Livre Movimentação",
    fruicao_desoneracao_tributaria: "Fruição de Desonerações Tributárias",
    recolhimento_tributos_das: "Recolhimento Tributos - DAS",
    recolhimento_tributos_cprb: "Recolhimento Tributos - CPRB",
    retomada_atividades: "Retomada de Atividades",
    inicio_retomada_atividades_5anos: "Início/Retomada de Atividades há menos de 5 anos"
  };

  const statusLabels = {
    novo: "Novo",
    em_analise: "Em Análise",
    aguardando_documentos: "Aguardando Documentos",
    documentacao_completa: "Documentação Completa",
    protocolado: "Protocolado",
    deferido: "Deferido",
    indeferido: "Indeferido",
    arquivado: "Arquivado"
  };

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DO CASO', 105, yPos, { align: 'center' });
      yPos += 15;

      // Informações do Caso
      doc.setFontSize(14);
      doc.text('Informações do Caso', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const infoCaso = [
        ['Número do Caso:', caso.numero_caso || `#${caso.id.slice(0, 8)}`],
        ['Status:', statusLabels[caso.status] || caso.status],
        ['Cliente:', cliente?.razao_social || 'N/A'],
        ['CNPJ:', cliente?.cnpj || 'N/A'],
        ['Hipótese:', hipoteseLabels[caso.hipotese_revisao] || caso.hipotese_revisao],
        ['Modalidade Pretendida:', caso.modalidade_pretendida || 'N/A'],
        ['Limite Pretendido:', caso.limite_pretendido ? `USD ${caso.limite_pretendido.toLocaleString()}` : 'N/A'],
        ['Data de Criação:', new Date(caso.created_date).toLocaleDateString('pt-BR')]
      ];

      infoCaso.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 80, yPos);
        yPos += 7;
      });

      // Dados do Processo e-CAC
      if (caso.numero_processo_ecac || caso.data_protocolo_ecac) {
        yPos += 5;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Processo e-CAC', 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        if (caso.numero_processo_ecac) {
          doc.setFont('helvetica', 'bold');
          doc.text('Número do Processo:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(caso.numero_processo_ecac, 80, yPos);
          yPos += 7;
        }
        
        if (caso.data_protocolo_ecac) {
          doc.setFont('helvetica', 'bold');
          doc.text('Data de Protocolo:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(new Date(caso.data_protocolo_ecac).toLocaleDateString('pt-BR'), 80, yPos);
          yPos += 7;
        }
        
        if (caso.prazo_analise_rfb) {
          doc.setFont('helvetica', 'bold');
          doc.text('Prazo de Análise:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(new Date(caso.prazo_analise_rfb).toLocaleDateString('pt-BR'), 80, yPos);
          yPos += 7;
        }
      }

      // Nova página para documentos
      doc.addPage();
      yPos = 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Documentos Anexados', 20, yPos);
      yPos += 10;

      if (documentos && documentos.length > 0) {
        const docsData = documentos.map(d => [
          d.tipo_documento,
          d.nome_arquivo,
          d.status_analise || 'Pendente',
          d.created_date ? new Date(d.created_date).toLocaleDateString('pt-BR') : 'N/A'
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Tipo', 'Nome do Arquivo', 'Status', 'Data']],
          body: docsData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Nenhum documento anexado.', 20, yPos);
        yPos += 10;
      }

      // Checklist
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      } else {
        yPos += 10;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Checklist de Documentos', 20, yPos);
      yPos += 10;

      if (checklist && checklist.length > 0) {
        const checklistData = checklist.map(item => [
          item.codigo_dda || 'N/A',
          item.descricao || item.tipo_documento,
          item.obrigatorio ? 'Sim' : 'Não',
          item.status || 'Pendente'
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Código', 'Descrição', 'Obrigatório', 'Status']],
          body: checklistData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 }
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Nenhum item no checklist.', 20, yPos);
      }

      // Observações
      if (caso.observacoes) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Observações', 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(caso.observacoes, 170);
        doc.text(lines, 20, yPos);
      }

      // Salvar PDF
      const nomeArquivo = `caso_${caso.numero_caso || caso.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nomeArquivo);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF: ' + error.message);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Button
      onClick={gerarPDF}
      disabled={gerando}
      variant="outline"
      className="gap-2"
    >
      {gerando ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando PDF...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Gerar PDF do Caso
        </>
      )}
    </Button>
  );
}