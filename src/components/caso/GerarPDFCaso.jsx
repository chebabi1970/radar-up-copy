import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from 'lucide-react';
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

  // Helpers para desenhar gráficos no PDF
  const drawPieChart = (doc, data, x, y, radius) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;
    data.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      // Desenhar fatia
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);

      // Arco como polígono
      const points = [[x, y]];
      const steps = Math.max(Math.ceil(sliceAngle / 0.1), 3);
      for (let i = 0; i <= steps; i++) {
        const angle = startAngle + (sliceAngle * i) / steps;
        points.push([
          x + radius * Math.cos(angle),
          y + radius * Math.sin(angle)
        ]);
      }

      // Usar linhas para desenhar a fatia
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      const pathStr = points.map((p, idx) => idx === 0 ? `${p[0]} ${p[1]} m` : `${p[0]} ${p[1]} l`).join(' ');

      // Abordagem simplificada: desenhar triângulos
      for (let i = 1; i < points.length - 1; i++) {
        doc.triangle(
          points[0][0], points[0][1],
          points[i][0], points[i][1],
          points[i + 1][0], points[i + 1][1],
          'F'
        );
      }

      startAngle = endAngle;
    });
  };

  const drawBarChart = (doc, data, x, y, width, height) => {
    if (data.length === 0) return;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barWidth = (width - (data.length - 1) * 2) / data.length;
    const chartBottom = y + height;

    // Eixos
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(x, y, x, chartBottom);
    doc.line(x, chartBottom, x + width, chartBottom);

    // Linhas de grade horizontais
    for (let i = 0; i <= 4; i++) {
      const gridY = y + (height * i) / 4;
      doc.setDrawColor(230, 230, 230);
      doc.line(x, gridY, x + width, gridY);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(String(Math.round(maxVal * (4 - i) / 4)), x - 2, gridY + 1, { align: 'right' });
    }

    // Barras
    data.forEach((item, idx) => {
      const barHeight = (item.value / maxVal) * height;
      const barX = x + idx * (barWidth + 2);
      const barY = chartBottom - barHeight;

      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');

      // Label
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text(item.label, barX + barWidth / 2, chartBottom + 5, { align: 'center' });
    });

    doc.setTextColor(0, 0, 0);
  };

  const drawProgressBar = (doc, x, y, width, height, progress, color, bgColor) => {
    // Background
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F');

    // Progress
    const progressWidth = Math.max((progress / 100) * width, height);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, y, progressWidth, height, height / 2, height / 2, 'F');
  };

  const addFooter = (doc) => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Radar UP - Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')} | Página ${i} de ${pageCount}`,
        105, 290, { align: 'center' }
      );
      // Linha separadora
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(20, 286, 190, 286);
    }
    doc.setTextColor(0, 0, 0);
  };

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // ============================
      // CAPA
      // ============================
      // Faixa azul no topo
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 50, 'F');

      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('RADAR UP', 105, 25, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório Completo do Caso', 105, 38, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      yPos = 65;

      // Informações do caso em cards
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, yPos, 170, 80, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(20, yPos, 170, 80, 3, 3, 'S');

      yPos += 8;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`, 30, yPos);

      yPos += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      const infoCaso = [
        ['Cliente:', cliente?.razao_social || 'N/A'],
        ['CNPJ:', cliente?.cnpj || 'N/A'],
        ['Status:', statusLabels[caso.status] || caso.status],
        ['Hipótese:', hipoteseLabels[caso.hipotese_revisao] || caso.hipotese_revisao || 'N/A'],
        ['Modalidade:', caso.modalidade_pretendida || 'N/A'],
        ['Limite:', caso.limite_pretendido ? `USD ${caso.limite_pretendido.toLocaleString()}` : 'N/A'],
        ['Criado em:', new Date(caso.created_date).toLocaleDateString('pt-BR')]
      ];

      infoCaso.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(label, 30, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(String(value || ''), 75, yPos);
        yPos += 7;
      });

      yPos += 10;

      // Processo e-CAC
      if (caso.numero_processo_ecac || caso.data_protocolo_ecac) {
        doc.setFillColor(245, 243, 255);
        doc.roundedRect(20, yPos, 170, 35, 3, 3, 'F');
        doc.setDrawColor(196, 181, 253);
        doc.roundedRect(20, yPos, 170, 35, 3, 3, 'S');

        yPos += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(91, 33, 182);
        doc.text('Processo e-CAC', 30, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);

        if (caso.numero_processo_ecac) {
          doc.text(`Processo: ${caso.numero_processo_ecac}`, 30, yPos);
          yPos += 6;
        }
        if (caso.data_protocolo_ecac) {
          doc.text(`Protocolo: ${new Date(caso.data_protocolo_ecac).toLocaleDateString('pt-BR')}`, 30, yPos);
          if (caso.prazo_analise_rfb) {
            doc.text(`Prazo RFB: ${new Date(caso.prazo_analise_rfb).toLocaleDateString('pt-BR')}`, 110, yPos);
          }
        }
        yPos += 15;
      }

      // ============================
      // RESUMO VISUAL (Indicadores)
      // ============================
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Resumo do Caso', 20, yPos);
      yPos += 10;

      // Stats cards inline
      const docsTotal = documentos?.length || 0;
      const docsAnalisados = documentos?.filter(d => d.status_analise === 'analisado' || d.status_analise === 'concluido')?.length || 0;
      const docsPendentes = documentos?.filter(d => d.status_analise === 'pendente')?.length || 0;
      const checklistTotal = checklist?.length || 0;
      const checklistOk = checklist?.filter(i => i.status !== 'pendente')?.length || 0;
      const divergencias = caso.divergencias_encontradas || [];
      const divAbertas = divergencias.filter(d => !d.resolvida)?.length || 0;
      const divResolvidas = divergencias.filter(d => d.resolvida)?.length || 0;

      const stats = [
        { label: 'Documentos', value: docsTotal, sub: `${docsAnalisados} analisados`, color: [59, 130, 246] },
        { label: 'Checklist', value: `${checklistOk}/${checklistTotal}`, sub: `${checklistTotal > 0 ? Math.round((checklistOk / checklistTotal) * 100) : 0}% completo`, color: [16, 185, 129] },
        { label: 'Divergências', value: divergencias.length, sub: `${divAbertas} abertas`, color: [239, 68, 68] },
        { label: 'Pendentes', value: docsPendentes, sub: 'docs aguardando', color: [245, 158, 11] }
      ];

      const cardWidth = 38;
      const cardGap = 4;
      const startX = 20;

      stats.forEach((stat, idx) => {
        const cx = startX + idx * (cardWidth + cardGap);
        doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        doc.roundedRect(cx, yPos, cardWidth, 22, 2, 2, 'F');

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(String(stat.value), cx + cardWidth / 2, yPos + 10, { align: 'center' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(stat.label, cx + cardWidth / 2, yPos + 16, { align: 'center' });
        doc.setFontSize(6);
        doc.text(stat.sub, cx + cardWidth / 2, yPos + 20, { align: 'center' });
      });

      yPos += 30;

      // Barra de progresso do checklist
      if (checklistTotal > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Progresso do Checklist', 20, yPos);
        yPos += 4;

        const progressPct = Math.round((checklistOk / checklistTotal) * 100);
        drawProgressBar(doc, 20, yPos, 170, 5, progressPct, [16, 185, 129], [226, 232, 240]);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`${progressPct}%`, 192, yPos + 4);
        yPos += 12;
      }

      // ============================
      // PÁGINA 2: DOCUMENTOS
      // ============================
      doc.addPage();
      yPos = 20;

      // Faixa de cabeçalho
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('DOCUMENTOS ANEXADOS', 105, 10, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      yPos = 25;

      // Gráfico de status dos documentos
      if (docsTotal > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Status dos Documentos', 20, yPos);
        yPos += 8;

        const docStatusData = [
          { label: 'Analisados', value: docsAnalisados, color: [16, 185, 129] },
          { label: 'Pendentes', value: docsPendentes, color: [245, 158, 11] },
          { label: 'Com Erro', value: documentos?.filter(d => d.status_analise === 'erro')?.length || 0, color: [239, 68, 68] }
        ].filter(d => d.value > 0);

        // Pie chart de docs
        if (docStatusData.length > 0) {
          drawPieChart(doc, docStatusData, 50, yPos + 20, 18);

          // Legenda
          let legendY = yPos + 5;
          docStatusData.forEach((item) => {
            doc.setFillColor(item.color[0], item.color[1], item.color[2]);
            doc.circle(85, legendY, 2, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`${item.label}: ${item.value}`, 90, legendY + 1);
            legendY += 7;
          });

          // Bar chart ao lado
          drawBarChart(doc, docStatusData, 130, yPos, 60, 35);
        }

        yPos += 45;
      }

      // Tabela de documentos
      if (documentos && documentos.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Lista de Documentos', 20, yPos);
        yPos += 5;

        const docsData = documentos.map(d => [
          (d.tipo_documento || '').replace(/_/g, ' ').substring(0, 30),
          (d.nome_arquivo || '').substring(0, 35),
          d.status_analise === 'analisado' || d.status_analise === 'concluido' ? 'Analisado' :
            d.status_analise === 'erro' ? 'Erro' : 'Pendente',
          d.versao_numero ? `v${d.versao_numero}` : 'v1',
          d.created_date ? new Date(d.created_date).toLocaleDateString('pt-BR') : 'N/A'
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Tipo', 'Arquivo', 'Status', 'Versão', 'Data']],
          body: docsData,
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235], fontSize: 7, fontStyle: 'bold' },
          styles: { fontSize: 7, cellPadding: 2 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 50 },
            2: { cellWidth: 22 },
            3: { cellWidth: 15 },
            4: { cellWidth: 25 }
          }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('Nenhum documento anexado.', 20, yPos);
        yPos += 10;
      }

      // ============================
      // CHECKLIST (mesma página se couber)
      // ============================
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('CHECKLIST DE DOCUMENTOS', 105, 10, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        yPos = 25;
      } else {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Checklist de Documentos', 20, yPos);
        yPos += 8;
      }

      if (checklist && checklist.length > 0) {
        const checklistData = checklist.map(item => {
          const statusIcon = item.status === 'pendente' ? '[ ]' :
                            item.status === 'conforme' ? '[OK]' :
                            item.status === 'nao_conforme' ? '[X]' : '[-]';
          return [
            statusIcon,
            item.codigo_dda || 'N/A',
            (item.descricao || item.tipo_documento || '').substring(0, 50),
            item.obrigatorio ? 'Obrig.' : 'Opc.',
            item.status === 'pendente' ? 'Pendente' :
              item.status === 'conforme' ? 'Conforme' :
              item.status === 'nao_conforme' ? 'Não Conforme' : item.status || 'Pendente'
          ];
        });

        doc.autoTable({
          startY: yPos,
          head: [['', 'Código', 'Descrição', 'Tipo', 'Status']],
          body: checklistData,
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129], fontSize: 7, fontStyle: 'bold' },
          styles: { fontSize: 7, cellPadding: 2 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 20 },
            2: { cellWidth: 75 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 25 }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
              if (data.cell.raw === 'Conforme') {
                data.cell.styles.textColor = [5, 150, 105];
                data.cell.styles.fontStyle = 'bold';
              } else if (data.cell.raw === 'Não Conforme') {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
              } else if (data.cell.raw === 'Pendente') {
                data.cell.styles.textColor = [217, 119, 6];
              }
            }
          }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('Nenhum item no checklist.', 20, yPos);
        yPos += 10;
      }

      // ============================
      // DIVERGÊNCIAS
      // ============================
      if (divergencias.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFillColor(254, 242, 242);
        doc.roundedRect(20, yPos, 170, 10, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text(`Divergências Encontradas (${divergencias.length})`, 25, yPos + 7);
        yPos += 16;

        const divData = divergencias.map(d => [
          (d.tipo || d.campo || 'N/A').replace(/_/g, ' '),
          (d.descricao || d.mensagem || 'Sem descrição').substring(0, 60),
          d.severidade === 'critica' ? 'Crítica' :
            d.severidade === 'alta' ? 'Alta' :
            d.severidade === 'media' ? 'Média' : 'Baixa',
          d.resolvida ? 'Resolvida' : 'Aberta'
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Tipo', 'Descrição', 'Severidade', 'Status']],
          body: divData,
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], fontSize: 7, fontStyle: 'bold' },
          styles: { fontSize: 7, cellPadding: 2 },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 80 },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              if (data.cell.raw === 'Crítica') {
                data.cell.styles.textColor = [185, 28, 28];
                data.cell.styles.fontStyle = 'bold';
              } else if (data.cell.raw === 'Alta') {
                data.cell.styles.textColor = [234, 88, 12];
                data.cell.styles.fontStyle = 'bold';
              }
            }
            if (data.section === 'body' && data.column.index === 3) {
              if (data.cell.raw === 'Resolvida') {
                data.cell.styles.textColor = [5, 150, 105];
              } else {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // Resumo de divergências
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(20, yPos, 170, 18, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Total: ${divergencias.length} | Abertas: ${divAbertas} | Resolvidas: ${divResolvidas}`, 30, yPos + 7);

        if (divergencias.length > 0) {
          const pctResolvidas = Math.round((divResolvidas / divergencias.length) * 100);
          doc.text(`Taxa de resolução: ${pctResolvidas}%`, 30, yPos + 13);
          drawProgressBar(doc, 100, yPos + 9, 80, 4, pctResolvidas,
            pctResolvidas >= 80 ? [16, 185, 129] : pctResolvidas >= 50 ? [245, 158, 11] : [239, 68, 68],
            [226, 232, 240]
          );
        }

        yPos += 25;
      }

      // ============================
      // OBSERVAÇÕES
      // ============================
      if (caso.observacoes) {
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Observações', 20, yPos);
        yPos += 6;

        doc.setFillColor(248, 250, 252);
        const obsLines = doc.splitTextToSize(caso.observacoes, 160);
        const obsHeight = Math.min(obsLines.length * 5 + 8, 80);
        doc.roundedRect(20, yPos, 170, obsHeight, 2, 2, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(obsLines, 25, yPos + 6);
      }

      // Rodapé em todas as páginas
      addFooter(doc);

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
