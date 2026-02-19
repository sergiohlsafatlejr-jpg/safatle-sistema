import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Exportar dados para Excel
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Dados') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Exportar dados para PDF
 */
export function exportToPDF(data: any[], fileName: string, title: string = 'Relatório') {
  const doc = new jsPDF();
  
  // Adicionar título
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  // Adicionar data
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);
  
  // Extrair colunas
  if (data.length === 0) {
    doc.text('Nenhum dado para exibir', 14, 40);
    doc.save(`${fileName}.pdf`);
    return;
  }
  
  const columns = Object.keys(data[0]);
  const rows = data.map(item => columns.map(col => item[col]));
  
  // Adicionar tabela
  (doc as any).autoTable({
    head: [columns],
    body: rows,
    startY: 35,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [242, 242, 242],
    },
  });
  
  doc.save(`${fileName}.pdf`);
}

/**
 * Exportar dados para CSV
 */
export function exportToCSV(data: any[], fileName: string) {
  if (data.length === 0) {
    console.warn('Nenhum dado para exportar');
    return;
  }
  
  const columns = Object.keys(data[0]);
  const csv = [
    columns.join(','),
    ...data.map(row => columns.map(col => `"${row[col] || ''}"`).join(',')),
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
