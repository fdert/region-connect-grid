// وظائف حساب ضريبة القيمة المضافة والعمولات للسوق السعودي

// نسبة ضريبة القيمة المضافة الافتراضية في السعودية
const DEFAULT_VAT_RATE = 15;
const DEFAULT_COMMISSION_RATE = 10;

export interface VatCalculationResult {
  priceExVat: number;           // السعر قبل الضريبة
  vatAmount: number;            // مبلغ الضريبة
  priceIncVat: number;          // السعر شامل الضريبة
}

export interface OrderItemVatSnapshot {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_ex_vat: number;    // سعر الوحدة قبل الضريبة
  vat_rate: number;             // نسبة الضريبة
  line_subtotal_ex_vat: number; // إجمالي البند قبل الضريبة
  line_vat_amount: number;      // مبلغ الضريبة للبند
  line_total: number;           // إجمالي البند شامل الضريبة
  commission_rate: number;      // نسبة عمولة المنصة
  commission_ex_vat: number;    // العمولة قبل الضريبة
  commission_vat: number;       // ضريبة العمولة
  commission_total: number;     // إجمالي العمولة شامل الضريبة
  merchant_payout: number;      // صافي مستحقات التاجر
}

export interface OrderVatSummary {
  items: OrderItemVatSnapshot[];
  subtotal_ex_vat: number;          // إجمالي المنتجات قبل الضريبة
  vat_on_products: number;          // ضريبة المنتجات
  subtotal_inc_vat: number;         // إجمالي المنتجات شامل الضريبة
  delivery_fee_ex_vat: number;      // رسوم التوصيل قبل الضريبة
  vat_on_delivery: number;          // ضريبة التوصيل
  delivery_fee_inc_vat: number;     // رسوم التوصيل شامل الضريبة
  total_commission_ex_vat: number;  // إجمالي عمولة المنصة قبل الضريبة
  total_commission_vat: number;     // ضريبة العمولة
  total_commission_inc_vat: number; // إجمالي العمولة شامل الضريبة
  total_merchant_payout: number;    // إجمالي مستحقات التاجر
  order_total: number;              // إجمالي الطلب شامل كل شيء
}

/**
 * حساب السعر قبل الضريبة من سعر شامل الضريبة
 * السعر في قاعدة البيانات شامل الضريبة، نحتاج لاستخراج السعر الأصلي
 */
export function extractPriceExVat(
  priceIncVat: number, 
  vatRate: number = DEFAULT_VAT_RATE
): VatCalculationResult {
  const priceExVat = priceIncVat / (1 + vatRate / 100);
  const vatAmount = priceIncVat - priceExVat;
  
  return {
    priceExVat: roundToTwo(priceExVat),
    vatAmount: roundToTwo(vatAmount),
    priceIncVat: roundToTwo(priceIncVat)
  };
}

/**
 * حساب السعر شامل الضريبة من سعر قبل الضريبة
 */
export function calculatePriceIncVat(
  priceExVat: number, 
  vatRate: number = DEFAULT_VAT_RATE
): VatCalculationResult {
  const vatAmount = priceExVat * (vatRate / 100);
  const priceIncVat = priceExVat + vatAmount;
  
  return {
    priceExVat: roundToTwo(priceExVat),
    vatAmount: roundToTwo(vatAmount),
    priceIncVat: roundToTwo(priceIncVat)
  };
}

/**
 * حساب العمولة على السعر قبل الضريبة وضريبة العمولة
 */
export function calculateCommission(
  priceExVat: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE,
  vatRate: number = DEFAULT_VAT_RATE
): {
  commission_ex_vat: number;
  commission_vat: number;
  commission_total: number;
} {
  const commissionExVat = priceExVat * (commissionRate / 100);
  const commissionVat = commissionExVat * (vatRate / 100);
  const commissionTotal = commissionExVat + commissionVat;
  
  return {
    commission_ex_vat: roundToTwo(commissionExVat),
    commission_vat: roundToTwo(commissionVat),
    commission_total: roundToTwo(commissionTotal)
  };
}

/**
 * حساب snapshot كامل لبند طلب واحد
 */
export function calculateOrderItemSnapshot(
  item: {
    product_id: string;
    name: string;
    price: number; // السعر شامل الضريبة
    quantity: number;
  },
  vatRate: number = DEFAULT_VAT_RATE,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): OrderItemVatSnapshot {
  // استخراج السعر قبل الضريبة للوحدة
  const unitPriceCalc = extractPriceExVat(item.price, vatRate);
  const unitPriceExVat = unitPriceCalc.priceExVat;
  
  // حساب إجمالي البند
  const lineSubtotalExVat = roundToTwo(unitPriceExVat * item.quantity);
  const lineVatAmount = roundToTwo(lineSubtotalExVat * (vatRate / 100));
  const lineTotal = roundToTwo(lineSubtotalExVat + lineVatAmount);
  
  // حساب العمولة على السعر قبل الضريبة
  const commission = calculateCommission(lineSubtotalExVat, commissionRate, vatRate);
  
  // صافي مستحقات التاجر = إجمالي البند شامل الضريبة - إجمالي العمولة شامل ضريبتها
  const merchantPayout = roundToTwo(lineTotal - commission.commission_total);
  
  return {
    product_id: item.product_id,
    product_name: item.name,
    quantity: item.quantity,
    unit_price_ex_vat: unitPriceExVat,
    vat_rate: vatRate,
    line_subtotal_ex_vat: lineSubtotalExVat,
    line_vat_amount: lineVatAmount,
    line_total: lineTotal,
    commission_rate: commissionRate,
    commission_ex_vat: commission.commission_ex_vat,
    commission_vat: commission.commission_vat,
    commission_total: commission.commission_total,
    merchant_payout: merchantPayout
  };
}

/**
 * حساب ملخص ضريبي كامل للطلب
 */
export function calculateOrderVatSummary(
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
  }>,
  deliveryFee: number = 0,
  vatRate: number = DEFAULT_VAT_RATE,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): OrderVatSummary {
  // حساب snapshot لكل بند
  const itemSnapshots = items.map(item => 
    calculateOrderItemSnapshot(item, vatRate, commissionRate)
  );
  
  // تجميع إجماليات المنتجات
  const subtotalExVat = roundToTwo(
    itemSnapshots.reduce((sum, item) => sum + item.line_subtotal_ex_vat, 0)
  );
  const vatOnProducts = roundToTwo(
    itemSnapshots.reduce((sum, item) => sum + item.line_vat_amount, 0)
  );
  const subtotalIncVat = roundToTwo(subtotalExVat + vatOnProducts);
  
  // حساب رسوم التوصيل (شاملة الضريبة)
  const deliveryCalc = extractPriceExVat(deliveryFee, vatRate);
  
  // تجميع إجماليات العمولة
  const totalCommissionExVat = roundToTwo(
    itemSnapshots.reduce((sum, item) => sum + item.commission_ex_vat, 0)
  );
  const totalCommissionVat = roundToTwo(
    itemSnapshots.reduce((sum, item) => sum + item.commission_vat, 0)
  );
  const totalCommissionIncVat = roundToTwo(totalCommissionExVat + totalCommissionVat);
  
  // تجميع مستحقات التاجر
  const totalMerchantPayout = roundToTwo(
    itemSnapshots.reduce((sum, item) => sum + item.merchant_payout, 0)
  );
  
  // إجمالي الطلب
  const orderTotal = roundToTwo(subtotalIncVat + deliveryFee);
  
  return {
    items: itemSnapshots,
    subtotal_ex_vat: subtotalExVat,
    vat_on_products: vatOnProducts,
    subtotal_inc_vat: subtotalIncVat,
    delivery_fee_ex_vat: deliveryCalc.priceExVat,
    vat_on_delivery: deliveryCalc.vatAmount,
    delivery_fee_inc_vat: deliveryFee,
    total_commission_ex_vat: totalCommissionExVat,
    total_commission_vat: totalCommissionVat,
    total_commission_inc_vat: totalCommissionIncVat,
    total_merchant_payout: totalMerchantPayout,
    order_total: orderTotal
  };
}

/**
 * تقريب الرقم لمنزلتين عشريتين
 */
function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * حساب القيود المحاسبية للطلب
 */
export interface JournalEntryData {
  description: string;
  reference_type: 'order' | 'settlement' | 'refund';
  reference_id: string;
  lines: Array<{
    account_code: string;
    debit_amount: number;
    credit_amount: number;
    description: string;
  }>;
}

export function createOrderJournalEntry(
  orderId: string,
  orderNumber: string,
  summary: OrderVatSummary
): JournalEntryData {
  return {
    description: `قيد طلب رقم ${orderNumber}`,
    reference_type: 'order',
    reference_id: orderId,
    lines: [
      {
        account_code: '1000', // النقدية
        debit_amount: summary.order_total,
        credit_amount: 0,
        description: 'استلام نقدي للطلب'
      },
      {
        account_code: '2000', // مستحقات التجار
        debit_amount: 0,
        credit_amount: summary.total_merchant_payout,
        description: 'مستحقات التاجر من الطلب'
      },
      {
        account_code: '4000', // إيرادات العمولات
        debit_amount: 0,
        credit_amount: summary.total_commission_ex_vat,
        description: 'عمولة المنصة قبل الضريبة'
      },
      {
        account_code: '2100', // ضريبة القيمة المضافة المستحقة
        debit_amount: 0,
        credit_amount: summary.total_commission_vat,
        description: 'ضريبة القيمة المضافة على العمولة'
      },
      {
        account_code: '4100', // إيرادات التوصيل
        debit_amount: 0,
        credit_amount: summary.delivery_fee_ex_vat,
        description: 'إيرادات التوصيل قبل الضريبة'
      }
    ]
  };
}

export function createSettlementJournalEntry(
  settlementId: string,
  settlementNumber: string,
  totalPayout: number
): JournalEntryData {
  return {
    description: `قيد تسوية رقم ${settlementNumber}`,
    reference_type: 'settlement',
    reference_id: settlementId,
    lines: [
      {
        account_code: '2000', // مستحقات التجار
        debit_amount: totalPayout,
        credit_amount: 0,
        description: 'تسديد مستحقات التاجر'
      },
      {
        account_code: '1000', // النقدية
        debit_amount: 0,
        credit_amount: totalPayout,
        description: 'صرف نقدي للتسوية'
      }
    ]
  };
}

export function createRefundJournalEntry(
  refundId: string,
  refundNumber: string,
  originalSnapshot: OrderItemVatSnapshot
): JournalEntryData {
  return {
    description: `قيد مرتجع رقم ${refundNumber}`,
    reference_type: 'refund',
    reference_id: refundId,
    lines: [
      // عكس قيد النقدية
      {
        account_code: '1000',
        debit_amount: 0,
        credit_amount: originalSnapshot.line_total,
        description: 'رد نقدي للمرتجع'
      },
      // عكس مستحقات التاجر
      {
        account_code: '2000',
        debit_amount: originalSnapshot.merchant_payout,
        credit_amount: 0,
        description: 'خصم من مستحقات التاجر'
      },
      // عكس إيرادات العمولة
      {
        account_code: '4000',
        debit_amount: originalSnapshot.commission_ex_vat,
        credit_amount: 0,
        description: 'رد عمولة المنصة'
      },
      // عكس ضريبة العمولة
      {
        account_code: '2100',
        debit_amount: originalSnapshot.commission_vat,
        credit_amount: 0,
        description: 'رد ضريبة العمولة'
      }
    ]
  };
}
