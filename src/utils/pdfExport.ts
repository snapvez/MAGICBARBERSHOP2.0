import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AppointmentData {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  service_price: number;
  barber_name?: string;
  payment_status: string;
}

interface ClientData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  total_appointments: number;
  subscription_status: string;
  created_at: string;
}

interface SubscriptionData {
  id: string;
  client_name: string;
  plan_name: string;
  status: string;
  cuts_used: number;
  cuts_allowed: number;
  current_period_start: string;
  current_period_end: string;
  barber_name?: string;
}

interface RevenueData {
  date: string;
  total: number;
  appointments_count: number;
  subscriptions_count: number;
}

interface PDFExportData {
  appointments: AppointmentData[];
  clients: ClientData[];
  subscriptions: SubscriptionData[];
  revenue: RevenueData[];
  stats: {
    totalClients: number;
    totalAppointments: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
  };
}

export const generateAdminPDF = (data: PDFExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Administrativo', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Geral', 14, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de Clientes: ${data.stats.totalClients}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Total de Marcações: ${data.stats.totalAppointments}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Receita Mensal: ${data.stats.monthlyRevenue.toFixed(2)}€`, 14, yPosition);
  yPosition += 6;
  doc.text(`Assinaturas Ativas: ${data.stats.activeSubscriptions}`, 14, yPosition);

  if (data.appointments.length > 0) {
    yPosition += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Marcações Recentes', 14, yPosition);
    yPosition += 5;

    const appointmentRows = data.appointments.map(apt => [
      new Date(apt.appointment_date).toLocaleDateString('pt-PT'),
      apt.start_time,
      apt.client_name,
      apt.client_phone,
      apt.service_name,
      `${apt.service_price.toFixed(2)}€`,
      apt.status,
      apt.payment_status
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Data', 'Hora', 'Cliente', 'Telemóvel', 'Serviço', 'Preço', 'Estado', 'Pagamento']],
      body: appointmentRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 28 },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 22 },
        7: { cellWidth: 25 }
      },
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  if (data.clients.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista de Clientes', 14, yPosition);
    yPosition += 5;

    const clientRows = data.clients.map(client => [
      client.full_name,
      client.phone || 'N/A',
      client.email,
      client.total_appointments.toString(),
      client.subscription_status === 'active' ? 'Ativa' : 'Inativa',
      new Date(client.created_at).toLocaleDateString('pt-PT')
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Nome', 'Telemóvel', 'Email', 'Marcações', 'Assinatura', 'Cliente Desde']],
      body: clientRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 45 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 }
      },
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  if (data.subscriptions.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Assinaturas Ativas', 14, yPosition);
    yPosition += 5;

    const subscriptionRows = data.subscriptions.map(sub => [
      sub.client_name,
      sub.plan_name,
      `${sub.cuts_used}/${sub.cuts_allowed}`,
      sub.status,
      new Date(sub.current_period_start).toLocaleDateString('pt-PT'),
      new Date(sub.current_period_end).toLocaleDateString('pt-PT'),
      sub.barber_name || 'N/A'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Cliente', 'Plano', 'Cortes', 'Estado', 'Início', 'Fim', 'Barbeiro']],
      body: subscriptionRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 30 }
      },
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  if (data.revenue.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Faturamento Diário', 14, yPosition);
    yPosition += 5;

    const revenueRows = data.revenue.map(rev => [
      new Date(rev.date).toLocaleDateString('pt-PT'),
      rev.appointments_count.toString(),
      rev.subscriptions_count.toString(),
      `${rev.total.toFixed(2)}€`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Data', 'Marcações', 'Assinaturas', 'Total']],
      body: revenueRows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: 14, right: 14 },
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const fileName = `relatorio_admin_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
