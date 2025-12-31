import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Order {
  order_number: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  platform_commission?: number;
  tax_amount?: number;
  payment_method: string;
  created_at: string;
  store?: { name: string };
}

interface ReportData {
  title: string;
  subtitle?: string;
  dateRange?: { start: string; end: string };
  summary: { label: string; value: string }[];
  orders: Order[];
  platformInfo?: PlatformInfo;
}

export interface PlatformInfo {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
}

const getPlatformHeaderHTML = (platformInfo?: PlatformInfo) => {
  if (!platformInfo) {
    return `
      <div class="platform-header">
        <h1 class="platform-name">سوقنا</h1>
      </div>
    `;
  }

  return `
    <div class="platform-header">
      ${platformInfo.logoUrl ? `<img src="${platformInfo.logoUrl}" alt="${platformInfo.name}" class="platform-logo" />` : ''}
      <h1 class="platform-name">${platformInfo.name}</h1>
      <div class="platform-info">
        ${platformInfo.address ? `<span>${platformInfo.address}</span>` : ''}
        ${platformInfo.phone ? `<span>هاتف: ${platformInfo.phone}</span>` : ''}
        ${platformInfo.email ? `<span>البريد: ${platformInfo.email}</span>` : ''}
        ${platformInfo.taxNumber ? `<span>الرقم الضريبي: ${platformInfo.taxNumber}</span>` : ''}
      </div>
    </div>
  `;
};

const getCommonStyles = () => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Segoe UI', Tahoma, sans-serif; 
    padding: 30px; 
    direction: rtl;
    font-size: 12px;
    color: #333;
  }
  .platform-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 3px solid #063c2a;
  }
  .platform-logo {
    width: 80px;
    height: 80px;
    object-fit: contain;
    margin-bottom: 10px;
  }
  .platform-name {
    font-size: 28px;
    color: #063c2a;
    font-weight: bold;
    margin-bottom: 5px;
  }
  .platform-info {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
    font-size: 11px;
    color: #666;
  }
  .header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #2563eb;
  }
  .header h1 {
    font-size: 24px;
    color: #1e40af;
    margin-bottom: 5px;
  }
  .header p {
    color: #666;
  }
  .date-range {
    background: #f0f4ff;
    padding: 10px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: inline-block;
  }
  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
    margin-bottom: 30px;
  }
  .summary-item {
    background: #f8fafc;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  .summary-item .label {
    display: block;
    color: #64748b;
    font-size: 11px;
    margin-bottom: 5px;
  }
  .summary-item .value {
    display: block;
    font-size: 18px;
    font-weight: bold;
    color: #1e293b;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }
  th {
    background: #063c2a;
    color: white;
    padding: 12px 8px;
    text-align: right;
    font-weight: 600;
  }
  td {
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  tr:nth-child(even) {
    background: #f8fafc;
  }
  .footer {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    color: #64748b;
    font-size: 10px;
  }
  @media print {
    body { padding: 15px; }
    .no-print { display: none; }
  }
`;

export const exportReportToPDF = (data: ReportData) => {
  const printWindow = window.open('', '', 'width=800,height=600');
  if (!printWindow) return;

  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy', { locale: ar });
  
  const ordersHTML = data.orders.map(order => `
    <tr>
      <td>${order.order_number}</td>
      <td>${order.store?.name || '-'}</td>
      <td>${Number(order.subtotal).toFixed(2)}</td>
      <td>${Number(order.delivery_fee || 0).toFixed(2)}</td>
      <td>${Number(order.platform_commission || 0).toFixed(2)}</td>
      <td>${Number(order.tax_amount || 0).toFixed(2)}</td>
      <td>${Number(order.total).toFixed(2)}</td>
      <td>${order.payment_method === 'cash' ? 'نقدي' : 'بطاقة'}</td>
      <td>${formatDate(order.created_at)}</td>
    </tr>
  `).join('');

  const summaryHTML = data.summary.map(item => `
    <div class="summary-item">
      <span class="label">${item.label}</span>
      <span class="value">${item.value}</span>
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <title>${data.title}</title>
      <style>${getCommonStyles()}</style>
    </head>
    <body>
      ${getPlatformHeaderHTML(data.platformInfo)}
      
      <div class="header">
        <h1>${data.title}</h1>
        ${data.subtitle ? `<p>${data.subtitle}</p>` : ''}
      </div>

      ${data.dateRange ? `
        <div class="date-range">
          الفترة: من ${formatDate(data.dateRange.start)} إلى ${formatDate(data.dateRange.end)}
        </div>
      ` : ''}

      <div class="summary">
        ${summaryHTML}
      </div>

      <table>
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>المتجر</th>
            <th>المبلغ</th>
            <th>التوصيل</th>
            <th>العمولة</th>
            <th>الضريبة</th>
            <th>الإجمالي</th>
            <th>الدفع</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          ${ordersHTML}
        </tbody>
      </table>

      <div class="footer">
        <p>تم إنشاء هذا التقرير بتاريخ: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
        ${data.platformInfo ? `<p>${data.platformInfo.name} - جميع الحقوق محفوظة</p>` : ''}
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

interface TaxReportData {
  title: string;
  dateRange: { start: string; end: string };
  summary: { label: string; value: string }[];
  platformInfo?: PlatformInfo;
  orders?: Order[];
}

export const exportTaxReportToPDF = (data: TaxReportData) => {
  const printWindow = window.open('', '', 'width=800,height=600');
  if (!printWindow) return;

  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy', { locale: ar });

  const summaryHTML = data.summary.map(item => `
    <div class="summary-item">
      <span class="label">${item.label}</span>
      <span class="value">${item.value}</span>
    </div>
  `).join('');

  const ordersHTML = data.orders?.map(order => `
    <tr>
      <td>${order.order_number}</td>
      <td>${order.store?.name || '-'}</td>
      <td>${Number(order.subtotal).toFixed(2)}</td>
      <td>${Number(order.tax_amount || 0).toFixed(2)}</td>
      <td>${Number(order.total).toFixed(2)}</td>
      <td>${formatDate(order.created_at)}</td>
    </tr>
  `).join('') || '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <title>${data.title}</title>
      <style>
        ${getCommonStyles()}
        .tax-title {
          background: #063c2a;
          color: white;
          padding: 15px;
          text-align: center;
          margin: 20px 0;
          border-radius: 8px;
        }
        .summary {
          grid-template-columns: repeat(3, 1fr);
        }
      </style>
    </head>
    <body>
      ${getPlatformHeaderHTML(data.platformInfo)}
      
      <div class="tax-title">
        <h1>${data.title}</h1>
      </div>

      <div class="date-range">
        الفترة: من ${formatDate(data.dateRange.start)} إلى ${formatDate(data.dateRange.end)}
      </div>

      <div class="summary">
        ${summaryHTML}
      </div>

      ${data.orders && data.orders.length > 0 ? `
        <h3 style="margin: 20px 0 10px;">تفاصيل الطلبات</h3>
        <table>
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>المتجر</th>
              <th>المبلغ</th>
              <th>الضريبة</th>
              <th>الإجمالي</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${ordersHTML}
          </tbody>
        </table>
      ` : ''}

      <div class="footer">
        <p>تقرير ضريبي - تم إنشاؤه بتاريخ: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
        ${data.platformInfo ? `<p>${data.platformInfo.name} - جميع الحقوق محفوظة</p>` : ''}
        ${data.platformInfo?.taxNumber ? `<p>الرقم الضريبي: ${data.platformInfo.taxNumber}</p>` : ''}
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

export const exportToExcel = (data: any[], filename: string, headers: string[]) => {
  const rows = data.map(item => headers.map(h => item[h] ?? ''));
  const csv = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
};
