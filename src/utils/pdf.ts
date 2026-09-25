import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

// Wrapper for html2canvas to safely handle modern color formats (oklab, oklch)
export const safeHtml2Canvas = async (element: HTMLElement, options: any = {}) => {
  const originalGetComputedStyle = window.getComputedStyle;
  
  // Monkey-patch window.getComputedStyle specifically for html2canvas
  window.getComputedStyle = function(el, pseudoElt) {
    const style = originalGetComputedStyle(el, pseudoElt);
    
    return new Proxy(style, {
      get(target: any, prop: string | symbol) {
        if (prop === 'getPropertyValue') {
          return function(property: string) {
            const val = target.getPropertyValue(property);
            if (val && typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
              return 'rgb(125, 125, 125)'; // Fallback color that html2canvas can parse
            }
            return val;
          };
        }
        
        const val = target[prop];
        if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
          return 'rgb(125, 125, 125)'; // Fallback color
        }
        
        return typeof val === 'function' ? val.bind(target) : val;
      }
    });
  };

  try {
    const canvas = await html2canvas(element, options);
    return canvas;
  } finally {
    // Always restore the original monkey-patch
    window.getComputedStyle = originalGetComputedStyle;
  }
};

export const generateStructuredPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await safeHtml2Canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
  }
};

export const handlePrint = () => {
  window.print();
};

const addHeader = (doc: jsPDF, title: string, systemSettings: any) => {
  const pageWidth = doc.internal.pageSize.width;
  
  if (systemSettings?.logoBase64) {
    try {
      doc.addImage(systemSettings.logoBase64, 'PNG', 14, 10, 20, 20);
    } catch (e) {
      console.error('Error adding logo to PDF', e);
    }
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(systemSettings?.entidadeFilha || 'NEXUM - Gestão Municipal', 40, 16);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${systemSettings?.cnpj || 'Não informado'}`, 40, 22);
  doc.text(`${systemSettings?.endereco || 'Endereço não informado'}`, 40, 27);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 45, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth - 14, 16, { align: 'right' });
  
  return 55;
};

export const generateChecklistPDF = (checklist: any, systemSettings: any) => {
  if (!checklist) return;
  const doc = new jsPDF();
  let startY = addHeader(doc, 'Ficha de Detalhes do Processo', systemSettings);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações do Processo', 14, startY);
  startY += 8;
  
  autoTable(doc, {
    startY,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 45 },
      1: { cellWidth: 'auto' }
    },
    body: [
      ['Nº do Processo', checklist.processNumber || '-'],
      ['Nº do Contrato', checklist.contractNumber || '-'],
      ['Fornecedor', checklist.vendor || '-'],
      ['Valor da Nota', checklist.invoiceValue || '-'],
      ['Nº da Nota', checklist.invoiceNumber || '-'],
      ['Objeto', checklist.object || '-']
    ],
  });
  
  startY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Etapas e Documentos', 14, startY);
  startY += 8;
  
  const itemsBody = (checklist.items || []).map((item: any) => [
    item.label,
    item.checked ? 'Concluído' : 'Pendente'
  ]);
  
  if (itemsBody.length > 0) {
    autoTable(doc, {
      startY,
      theme: 'striped',
      head: [['Etapa/Documento', 'Status']],
      body: itemsBody,
      headStyles: { fillColor: [2, 132, 199] },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhuma etapa registrada para este processo.', 14, startY);
  }
  
  doc.save(`processo_${checklist.processNumber || 'detalhes'}.pdf`);
};

export const generateChecklistsReportPDF = (records: any[], title: string, systemSettings: any) => {
  const doc = new jsPDF('l');
  const startY = addHeader(doc, title, systemSettings);
  
  const body = records.map(r => [
    r.processNumber || '-',
    r.vendor || '-',
    r.invoiceNumber || '-',
    r.object || '-',
    r.invoiceValue || '-'
  ]);
  
  autoTable(doc, {
    startY,
    head: [['Processo', 'Fornecedor', 'Nº Nota', 'Objeto', 'Valor Nota']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 45 },
      2: { cellWidth: 25 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });
  
  doc.save(`relatorio_processos_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateFuelPDF = (records: any[], systemSettings: any) => {
  const doc = new jsPDF('l');
  const startY = addHeader(doc, 'Relatório de Abastecimentos', systemSettings);
  
  const body = records.map(r => [
    r.date ? format(new Date(r.date), 'dd/MM/yyyy') : '-',
    r.vehicle || '-',
    r.plate || '-',
    r.driver || '-',
    r.quantity || '-',
    r.cost || '-',
    r.status || '-'
  ]);
  
  autoTable(doc, {
    startY,
    head: [['Data', 'Veículo', 'Placa', 'Motorista', 'Quantidade', 'Custo', 'Status']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] },
  });
  
  doc.save(`relatorio_abastecimentos_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateDailyPDF = (records: any[], servidores: any[], systemSettings: any) => {
  const doc = new jsPDF('l');
  const startY = addHeader(doc, 'Relatório de Diárias', systemSettings);
  
  const body = records.map(r => {
    const servant = servidores.find(s => 
      s.id === r.servidorId || 
      (s.name && (r.beneficiary || r.driver) && s.name.trim().toLowerCase() === (r.beneficiary || r.driver).trim().toLowerCase())
    );
    return [
      r.driver || r.beneficiary || '-',
      r.registrationNumber || servant?.registrationNumber || '-',
      r.destination || '-',
      r.value || '-'
    ];
  });
  
  autoTable(doc, {
    startY,
    head: [['Beneficiário', 'Matrícula', 'Destino', 'Valor']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] },
  });
  
  doc.save(`relatorio_diarias_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateContractsPDF = (records: any[], systemSettings: any) => {
  const doc = new jsPDF('l');
  const startY = addHeader(doc, 'Relatório de Contratos', systemSettings);
  
  const body = records.map(r => [
    r.number || '-',
    r.vendor || '-',
    r.object || '-',
    r.validity || '-',
    r.expiryDate ? format(new Date(r.expiryDate), 'dd/MM/yyyy') : '-',
    r.totalValue || '-',
    r.status || '-'
  ]);
  
  autoTable(doc, {
    startY,
    head: [['Número', 'Fornecedor', 'Objeto', 'Vigência', 'Vencimento', 'Valor Total', 'Status']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] },
  });
  
  doc.save(`relatorio_contratos_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateReportPDF = async (elementId: string, filename: string, isExporting: (val: boolean) => void) => {
  isExporting(true);
  const element = document.getElementById(elementId);
  if (!element) {
    isExporting(false);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 1200, // Fixed width for consistent layout
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Subsequent pages if content is long
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Erro ao gerar PDF do relatório:", error);
  } finally {
    isExporting(false);
  }
};

export const generateUsersPDF = (records: any[], systemSettings: any) => {
  const doc = new jsPDF('l');
  const startY = addHeader(doc, 'Relatório de Usuários', systemSettings);
  
  const body = records.map(r => [
    r.name || '-',
    r.email || '-',
    r.role || '-',
    r.department || '-',
    r.status || '-',
    r.lastLogin || '-'
  ]);
  
  autoTable(doc, {
    startY,
    head: [['Nome', 'Email', 'Nível', 'Departamento', 'Status', 'Último Acesso']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] },
  });
  
  doc.save(`relatorio_usuarios_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateAuditLogsPDF = (records: any[], systemSettings: any) => {
  const doc = new jsPDF();
  const startY = addHeader(doc, 'Timeline de Atividades', systemSettings);
  
  const body = records.map(r => [
    r.time || '-',
    r.user || '-',
    r.title || '-',
    r.type || '-'
  ]);
  
  autoTable(doc, {
    startY,
    head: [['Data/Hora', 'Usuário', 'Ação', 'Módulo']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30 }
    }
  });
  
  doc.save(`logs_atividades_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateFleetReportPDF = (records: any[], systemSettings: any) => {
  const doc = new jsPDF('l');
  const startY = addHeader(doc, 'Relatório da Frota Municipal', systemSettings);
  
  const body = records.map(r => [
    r.nome || '-',
    r.placa || '-',
    r.ano || '-',
    r.secretaria || '-',
    r.km_atual || '-',
    r.tipo_propriedade?.toUpperCase() || 'OFICIAL',
    r.status?.replace('_', ' ').toUpperCase() || '-'
  ]);
  
  autoTable(doc, {
    startY,
    head: [['Veículo', 'Placa', 'Ano', 'Secretaria', 'KM Atual', 'Tipo', 'Status']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] },
  });
  
  doc.save(`relatorio_frota_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
