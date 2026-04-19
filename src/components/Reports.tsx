import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Filter, TrendingUp, FileText, Receipt } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../lib/api';
import { formatYemeniCurrency } from '../lib/currency';
import type { AccountStatementResponse, AccountStatementRow, AuthUser, CommissionReportEntry, RestaurantItem } from '../types';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';
type ReportView = 'summary' | 'statement';

interface ReportData {
  period: string;
  sales: number;
  commission: number;
  orders: number;
  avgOrderValue: number;
  netAmount: number;
}

const periodLabels: Record<ReportPeriod, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
  custom: 'خلال فترة',
};

const PDF_ARABIC_FONT = 'NotoNaskhArabic';
const PDF_ARABIC_FONT_REGULAR_FILE = 'NotoNaskhArabic-Regular.ttf';
const PDF_ARABIC_FONT_BOLD_FILE = 'NotoNaskhArabic-Bold.ttf';
const arabicFontRegularUrl = '/fonts/NotoNaskhArabic-Regular.ttf';
const arabicFontBoldUrl = '/fonts/NotoNaskhArabic-Bold.ttf';
const pdfFontBinaryCache = new Map<string, Promise<string>>();

function containsArabicCharacters(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

async function loadBinaryString(url: string) {
  const cachedFont = pdfFontBinaryCache.get(url);
  if (cachedFont) {
    return cachedFont;
  }

  const fontPromise = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('تعذر تحميل الخط العربي المستخدم في التصدير');
      }

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      let binary = '';

      for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
      }

      return binary;
    });

  pdfFontBinaryCache.set(url, fontPromise);
  return fontPromise;
}

async function ensureArabicPdfFont(doc: jsPDF) {
  const regularFontBinary = await loadBinaryString(arabicFontRegularUrl);
  const boldFontBinary = await loadBinaryString(arabicFontBoldUrl);

  if (!doc.existsFileInVFS(PDF_ARABIC_FONT_REGULAR_FILE)) {
    doc.addFileToVFS(PDF_ARABIC_FONT_REGULAR_FILE, regularFontBinary);
  }

  if (!doc.existsFileInVFS(PDF_ARABIC_FONT_BOLD_FILE)) {
    doc.addFileToVFS(PDF_ARABIC_FONT_BOLD_FILE, boldFontBinary);
  }

  doc.addFont(PDF_ARABIC_FONT_REGULAR_FILE, PDF_ARABIC_FONT, 'normal');
  doc.addFont(PDF_ARABIC_FONT_BOLD_FILE, PDF_ARABIC_FONT, 'bold');
  doc.setFont(PDF_ARABIC_FONT, 'normal');
  doc.setR2L(false);
}

function toPdfText(doc: jsPDF, value: string | number) {
  const text = String(value ?? '');
  return containsArabicCharacters(text) ? doc.processArabic(text) : text;
}

function getPeriodHeadingLabel(period: ReportPeriod) {
  if (period === 'custom') {
    return 'خلال الفترة';
  }

  return periodLabels[period];
}

function formatDayKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function endOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + 6);
  return copy;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toMonthInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthBoundaries(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [yearValue, monthValue] = value.split('-').map(Number);
    const monthStart = new Date(yearValue, monthValue - 1, 1);
    const monthEnd = new Date(yearValue, monthValue, 0);

    return {
      from: toDateInputValue(monthStart),
      to: toDateInputValue(monthEnd),
    };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: toDateInputValue(monthStart),
    to: toDateInputValue(monthEnd),
  };
}

function getWeekKey(date: Date) {
  return formatDayKey(startOfWeek(date));
}

function getSummaryRange(selectedPeriod: ReportPeriod, dateRange: { from: string; to: string }) {
  const now = new Date();

  if (selectedPeriod === 'daily') {
    const from = dateRange.from || dateRange.to || toDateInputValue(now);
    const to = dateRange.to || dateRange.from || from;

    return {
      from,
      to,
      type: from === to ? 'day' : 'range',
    };
  }

  if (selectedPeriod === 'custom') {
    const from = dateRange.from || dateRange.to || toDateInputValue(now);
    const to = dateRange.to || dateRange.from || from;

    return {
      from,
      to,
      type: 'range',
    };
  }

  if (selectedPeriod === 'weekly') {
    const anchor = parseDateOnly(dateRange.from || dateRange.to || toDateInputValue(now)) || now;
    const from = toDateInputValue(startOfWeek(anchor));
    const to = toDateInputValue(endOfWeek(startOfWeek(anchor)));

    return { from, to, type: 'range' };
  }

  const { from, to } = getMonthBoundaries(dateRange.from || dateRange.to || toMonthInputValue(now));

  return {
    from,
    to,
    type: 'month',
  };
}

function buildPeriodLabel(selectedPeriod: ReportPeriod, sampleDate: Date) {
  if (selectedPeriod === 'daily' || selectedPeriod === 'custom') {
    return sampleDate.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  if (selectedPeriod === 'weekly') {
    return `أسبوع ${sampleDate.toLocaleDateString('ar-SA', { month: '2-digit', day: '2-digit' })}`;
  }

  return sampleDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
}

function buildSummaryData(entries: CommissionReportEntry[], selectedPeriod: ReportPeriod): ReportData[] {
  const grouped = new Map<string, {
    sampleDate: Date;
    orderTotals: Map<string, number>;
    commission: number;
  }>();

  entries.forEach((entry) => {
    const date = new Date(entry.orderDate);
    const key = selectedPeriod === 'daily' || selectedPeriod === 'custom'
      ? formatDayKey(date)
      : selectedPeriod === 'weekly'
        ? getWeekKey(date)
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const current = grouped.get(key) || {
      sampleDate: date,
      orderTotals: new Map<string, number>(),
      commission: 0,
    };

    const currentOrderTotal = current.orderTotals.get(entry.orderId);
    if (currentOrderTotal === undefined) {
      current.orderTotals.set(entry.orderId, entry.totalAmount);
    } else {
      current.orderTotals.set(entry.orderId, Math.max(currentOrderTotal, entry.totalAmount));
    }

    current.commission += entry.restaurantCommission;
    grouped.set(key, current);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, group]) => {
      const sales = Array.from(group.orderTotals.values()).reduce((sum, value) => sum + value, 0);
      const orders = group.orderTotals.size;
      const avgOrderValue = orders > 0 ? sales / orders : 0;
      const commission = group.commission;

      return {
        period: buildPeriodLabel(selectedPeriod, group.sampleDate),
        sales,
        commission,
        orders,
        avgOrderValue,
        netAmount: sales - commission,
      };
    });
}

function getGrowthRate(currentValue: number, previousValue: number) {
  if (previousValue <= 0) {
    return 0;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

function getStatementDisplayText(entry: AccountStatementRow) {
  const primaryText = entry.notes.trim();
  if (primaryText) {
    return primaryText;
  }

  if (entry.accountName.trim()) {
    return entry.accountName;
  }

  return entry.isOpening ? 'رصيد سابق' : 'قيد محاسبي';
}

function getDateRangeForPeriod(selectedPeriod: ReportPeriod, dateRange: { from: string; to: string }) {
  const now = new Date();

  if (selectedPeriod === 'daily') {
    const value = dateRange.from || dateRange.to || toDateInputValue(now);
    return { from: value, to: value };
  }

  if (selectedPeriod === 'weekly') {
    const anchor = parseDateOnly(dateRange.from || dateRange.to || toDateInputValue(now)) || now;
    const start = startOfWeek(anchor);
    return {
      from: toDateInputValue(start),
      to: toDateInputValue(endOfWeek(start)),
    };
  }

  if (selectedPeriod === 'monthly') {
    return getMonthBoundaries(dateRange.from || dateRange.to || toMonthInputValue(now));
  }

  return {
    from: dateRange.from || undefined,
    to: dateRange.to || undefined,
  };
}

function parseDateOnly(value: string) {
  const datePart = value.split('T')[0];

  if (!datePart) {
    return null;
  }

  const parsedDate = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function isDateWithinRange(value: string, range: { from?: string; to?: string }) {
  const targetDate = parseDateOnly(value);

  if (!targetDate) {
    return false;
  }

  const fromDate = range.from ? parseDateOnly(range.from) : null;
  const toDate = range.to ? parseDateOnly(range.to) : null;

  if (fromDate && targetDate.getTime() < fromDate.getTime()) {
    return false;
  }

  if (toDate && targetDate.getTime() > toDate.getTime()) {
    return false;
  }

  return true;
}

function getBalanceStatus(balance: number) {
  if (balance < 0) {
    return {
      label: 'عليه',
      tone: 'text-red-600',
      badge: 'bg-red-50 text-red-700',
    };
  }

  if (balance > 0) {
    return {
      label: 'له',
      tone: 'text-green-600',
      badge: 'bg-green-50 text-green-700',
    };
  }

  return {
    label: 'متوازن',
    tone: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-700',
  };
}

function formatStatementBalance(balance: number, fractionDigits = 0) {
  return formatYemeniCurrency(Math.abs(balance), fractionDigits);
}

function getOpeningBalanceValue(openingBalance: AccountStatementResponse['openingBalance']) {
  if (typeof openingBalance === 'number') {
    return openingBalance;
  }

  if (typeof openingBalance === 'string') {
    const parsedValue = Number(openingBalance);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  const firstValue = Object.values(openingBalance || {}).find(
    (value) => typeof value === 'number' || typeof value === 'string',
  );

  if (typeof firstValue === 'number') {
    return firstValue;
  }

  if (typeof firstValue === 'string') {
    const parsedValue = Number(firstValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function getOpeningEntryBalance(entry?: AccountStatementRow) {
  if (!entry) {
    return 0;
  }

  if (Number.isFinite(entry.balance) && entry.balance !== 0) {
    return entry.balance;
  }

  const derivedBalance = Number(entry.credit || 0) - Number(entry.debit || 0);
  return Number.isFinite(derivedBalance) ? derivedBalance : 0;
}

function resolveOpeningBalance(
  statementData: AccountStatementResponse,
  openingEntry?: AccountStatementRow,
) {
  const responseOpeningBalance = getOpeningBalanceValue(statementData.openingBalance);
  const entryOpeningBalance = getOpeningEntryBalance(openingEntry);

  if (responseOpeningBalance !== 0) {
    return responseOpeningBalance;
  }

  if (entryOpeningBalance !== 0) {
    return entryOpeningBalance;
  }

  return responseOpeningBalance || entryOpeningBalance || 0;
}

function createOpeningBalanceEntry(balance: number, fromDate?: string): AccountStatementRow {
  return {
    id: 'opening-balance-row',
    journalDate: fromDate || '',
    referenceId: '',
    referenceType: 'opening_balance',
    notes: 'رصيد سابق',
    accountName: 'رصيد سابق',
    currencyName: '',
    debit: balance < 0 ? Math.abs(balance) : 0,
    credit: balance > 0 ? Math.abs(balance) : 0,
    balance,
    isOpening: true,
  };
}

function buildStatementEntries(
  statementData: AccountStatementResponse,
  activeDateRange: { from?: string; to?: string },
) {
  const openingEntry = statementData.list.find((entry) => entry.isOpening);
  const openingBalance = resolveOpeningBalance(statementData, openingEntry);
  const transactions = statementData.list.filter(
    (entry) => !entry.isOpening && isDateWithinRange(entry.journalDate, activeDateRange),
  );

  let runningBalance = openingBalance;
  const rebuiltEntries = transactions.map((entry) => {
    runningBalance += entry.credit - entry.debit;

    return {
      ...entry,
      balance: runningBalance,
    };
  });

  return [
    openingEntry
      ? {
          ...openingEntry,
          notes: openingEntry.notes || 'رصيد سابق',
          accountName: openingEntry.accountName || 'رصيد سابق',
          balance: openingBalance,
        }
      : createOpeningBalanceEntry(openingBalance, activeDateRange.from),
    ...rebuiltEntries,
  ];
}

interface ReportsProps {
  restaurant?: RestaurantItem | null;
  user?: AuthUser | null;
}

export function Reports({ restaurant, user }: ReportsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('daily');
  const [appliedPeriod, setAppliedPeriod] = useState<ReportPeriod>('daily');
  const [reportView, setReportView] = useState<ReportView>('summary');
  const [dateRange, setDateRange] = useState({ from: toDateInputValue(new Date()), to: toDateInputValue(new Date()) });
  const [appliedDateRange, setAppliedDateRange] = useState({ from: toDateInputValue(new Date()), to: toDateInputValue(new Date()) });
  const [reloadKey, setReloadKey] = useState(0);
  const [commissionEntries, setCommissionEntries] = useState<CommissionReportEntry[]>([]);
  const [statementData, setStatementData] = useState<AccountStatementResponse>({
    openingBalance: 0,
    list: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const pendingDateRange = useMemo(
    () => getDateRangeForPeriod(selectedPeriod, dateRange),
    [dateRange, selectedPeriod],
  );
  const activeDateRange = useMemo(
    () => getDateRangeForPeriod(appliedPeriod, appliedDateRange),
    [appliedDateRange, appliedPeriod],
  );
  const dateFieldType = selectedPeriod === 'monthly' ? 'month' : 'date';
  const dateFieldValue = (() => {
    if (selectedPeriod === 'custom') {
      return dateRange.from;
    }

    if (selectedPeriod === 'monthly') {
      return dateRange.from ? dateRange.from.slice(0, 7) : toMonthInputValue(new Date());
    }

    return dateRange.from || pendingDateRange.from || toDateInputValue(new Date());
  })();

  const handlePeriodChange = (period: ReportPeriod) => {
    setSelectedPeriod(period);

    if (period === 'monthly') {
      const monthValue = dateRange.from ? dateRange.from.slice(0, 7) : toMonthInputValue(new Date());
      setDateRange({ from: monthValue, to: monthValue });
      return;
    }

    if (period === 'custom') {
      const currentValue = pendingDateRange.from || toDateInputValue(new Date());
      setDateRange({ from: currentValue, to: pendingDateRange.to || currentValue });
      return;
    }

    const currentValue = pendingDateRange.from || toDateInputValue(new Date());
    setDateRange({ from: currentValue, to: currentValue });
  };

  const handleSingleDateChange = (value: string) => {
    if (selectedPeriod === 'monthly') {
      setDateRange({ from: value, to: value });
      return;
    }

    setDateRange({ from: value, to: value });
  };

  const applyFilters = () => {
    setAppliedPeriod(selectedPeriod);
    setAppliedDateRange(dateRange);
    setReloadKey((value) => value + 1);
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError('');

      try {
        if (reportView === 'summary') {
          const range = getSummaryRange(appliedPeriod, appliedDateRange);
          const response = await api.getCommissions({
            ...range,
            restaurantId: restaurant?.id,
            agentId: user?.id,
          });

          if (mounted) {
            setCommissionEntries(response);
          }
        } else {
          const resolvedAccountId = user?.account_id
            || (user?.id ? await api.getLinkedAgentAccountId(user.id) : null)
            || restaurant?.account_id
            || (restaurant?.id ? (await api.getRestaurantDetails(restaurant.id)).account_id : null);

          if (!resolvedAccountId) {
            throw new Error('الوكيل أو المطعم غير مرتبط بحساب محاسبي');
          }

          const range = getDateRangeForPeriod(appliedPeriod, appliedDateRange);

const response = await api.getAccountStatement({
  accountId: resolvedAccountId,
  fromDate: range.from,
  toDate: range.to,
  reportMode: 'detailed',
  detailedType: 'full',
});

          if (mounted) {
            console.log("ACCOUNT STATEMENT RESPONSE =", response);
            setStatementData(response);
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل التقارير');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
}, [
  appliedDateRange.from,
  appliedDateRange.to,
  appliedPeriod,
  reloadKey,
  reportView,
  restaurant?.account_id,
  restaurant?.id,
  user?.account_id,
  user?.id,
]);
  const filteredCommissionEntries = useMemo(
    () => commissionEntries.filter((entry) => isDateWithinRange(entry.orderDate, activeDateRange)),
    [activeDateRange, commissionEntries],
  );

  const currentData = useMemo(
    () => buildSummaryData(filteredCommissionEntries, appliedPeriod),
    [filteredCommissionEntries, appliedPeriod],
  );

  const statementEntries = useMemo(
    () => buildStatementEntries(statementData, activeDateRange),
    [activeDateRange, statementData],
  );

  const totalSales = currentData.reduce((sum, item) => sum + item.sales, 0);
  const totalOrders = currentData.reduce((sum, item) => sum + item.orders, 0);
  const totalCommission = currentData.reduce((sum, item) => sum + item.commission, 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const netAmount = totalSales - totalCommission;

  const statementTotals = useMemo(() => {
    const transactionEntries = statementEntries.filter((entry) => !entry.isOpening);
    const debit = transactionEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const credit = transactionEntries.reduce((sum, entry) => sum + entry.credit, 0);
    const finalBalance = statementEntries[statementEntries.length - 1]?.balance
      ?? getOpeningBalanceValue(statementData.openingBalance);

    return {
      debit,
      credit,
      finalBalance,
    };
  }, [statementData.openingBalance, statementEntries]);

  const exportSummaryToPDF = async () => {
    const doc = new jsPDF();
    await ensureArabicPdfFont(doc);
    const rightEdge = doc.internal.pageSize.getWidth() - 20;

    doc.setFont(PDF_ARABIC_FONT, 'bold');
    doc.setFontSize(16);
    doc.text(toPdfText(doc, `تقرير المبيعات - ${periodLabels[appliedPeriod]}`), 105, 20, { align: 'center' });

    const reportDate = new Date().toLocaleDateString('ar-SA');
    doc.setFont(PDF_ARABIC_FONT, 'normal');
    doc.setFontSize(12);
    doc.text(toPdfText(doc, `تاريخ التقرير: ${reportDate}`), rightEdge, 35, { align: 'right' });

    doc.setFont(PDF_ARABIC_FONT, 'bold');
    doc.setFontSize(14);
    doc.text(toPdfText(doc, 'ملخص الإحصائيات:'), rightEdge, 50, { align: 'right' });

    doc.setFont(PDF_ARABIC_FONT, 'normal');
    doc.setFontSize(11);
    doc.text(toPdfText(doc, `إجمالي المبيعات: ${formatYemeniCurrency(totalSales)}`), rightEdge, 65, { align: 'right' });
    doc.text(toPdfText(doc, `إجمالي العمولة: ${formatYemeniCurrency(-totalCommission)}`), rightEdge, 75, { align: 'right' });
    doc.text(toPdfText(doc, `الصافي: ${formatYemeniCurrency(netAmount)}`), rightEdge, 85, { align: 'right' });
    doc.text(toPdfText(doc, `إجمالي الطلبات: ${totalOrders}`), rightEdge, 95, { align: 'right' });
    doc.text(toPdfText(doc, `متوسط قيمة الطلب: ${formatYemeniCurrency(avgOrderValue)}`), rightEdge, 105, { align: 'right' });

    const tableData = currentData.map((item, index) => {
      const previousSales = index > 0 ? currentData[index - 1].sales : 0;
      const growthRate = index > 0 ? getGrowthRate(item.sales, previousSales) : 0;

      return [
        toPdfText(doc, item.period),
        toPdfText(doc, formatYemeniCurrency(item.sales)),
        toPdfText(doc, formatYemeniCurrency(-item.commission)),
        toPdfText(doc, formatYemeniCurrency(item.netAmount)),
        item.orders.toString(),
        toPdfText(doc, formatYemeniCurrency(item.avgOrderValue)),
        index > 0 ? `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%` : '-',
      ];
    });

    autoTable(doc, {
      head: [[
        toPdfText(doc, 'الفترة'),
        toPdfText(doc, 'المبيعات'),
        toPdfText(doc, 'العمولة'),
        toPdfText(doc, 'الصافي'),
        toPdfText(doc, 'عدد الطلبات'),
        toPdfText(doc, 'متوسط قيمة الطلب'),
        toPdfText(doc, 'معدل النمو'),
      ]],
      body: tableData,
      startY: 120,
      styles: {
        font: PDF_ARABIC_FONT,
        fontSize: 10,
        cellPadding: 5,
        halign: 'right',
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        font: PDF_ARABIC_FONT,
        halign: 'right',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 120, right: 20, bottom: 20, left: 20 },
    });

    doc.save(`تقرير_المبيعات_${periodLabels[appliedPeriod]}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportStatementToPDF = async () => {
    const doc = new jsPDF();
    await ensureArabicPdfFont(doc);
    const rightEdge = doc.internal.pageSize.getWidth() - 20;

    doc.setFont(PDF_ARABIC_FONT, 'bold');
    doc.setFontSize(16);
    doc.text(toPdfText(doc, 'كشف حساب مفصل'), 105, 20, { align: 'center' });

    const reportDate = new Date().toLocaleDateString('ar-SA');
    doc.setFont(PDF_ARABIC_FONT, 'normal');
    doc.setFontSize(12);
    doc.text(toPdfText(doc, `تاريخ التقرير: ${reportDate}`), rightEdge, 35, { align: 'right' });

    const tableData = statementEntries.map((entry) => [
      entry.journalDate,
      entry.referenceId || '-',
      toPdfText(doc, getStatementDisplayText(entry)),
      entry.debit > 0 ? toPdfText(doc, formatYemeniCurrency(entry.debit)) : '-',
      entry.credit > 0 ? toPdfText(doc, formatYemeniCurrency(entry.credit)) : '-',
      toPdfText(doc, formatStatementBalance(entry.balance)),
      toPdfText(doc, getBalanceStatus(entry.balance).label),
    ]);

    autoTable(doc, {
      head: [[
        toPdfText(doc, 'التاريخ'),
        toPdfText(doc, 'المرجع'),
        toPdfText(doc, 'البيان'),
        toPdfText(doc, 'مدين'),
        toPdfText(doc, 'دائن'),
        toPdfText(doc, 'الرصيد'),
        toPdfText(doc, 'الحالة'),
      ]],
      body: tableData,
      startY: 50,
      styles: {
        font: PDF_ARABIC_FONT,
        fontSize: 10,
        cellPadding: 5,
        halign: 'right',
      },
      headStyles: {
        fillColor: [255, 165, 0],
        textColor: 255,
        fontStyle: 'bold',
        font: PDF_ARABIC_FONT,
        halign: 'right',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 50, right: 20, bottom: 20, left: 20 },
    });

    doc.save(`كشف_حساب_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">التقارير والإحصائيات</h2>
        <p className="text-sm text-gray-600">عرض بيانات التقارير وكشف الحساب مباشرة من السيرفر</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
        <div className="flex bg-green-50 rounded-2xl p-1 mb-4 w-full overflow-x-auto border border-green-100">
          <button
            onClick={() => setReportView('summary')}
            className={`flex-1 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap ${
              reportView === 'summary'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">ملخص التقارير</span>
            <span className="xs:hidden">ملخص</span>
          </button>
          <button
            onClick={() => setReportView('statement')}
            className={`flex-1 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap ${
              reportView === 'statement'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">كشف الحساب</span>
            <span className="xs:hidden">كشف</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,1.1fr)] gap-3 items-stretch">
          <label className="relative flex items-center rounded-[28px] border border-slate-300 bg-white px-5 py-4 shadow-sm">
            <Filter className="h-5 w-5 text-slate-900" />
            <select
              value={selectedPeriod}
              onChange={(event) => handlePeriodChange(event.target.value as ReportPeriod)}
              className="w-full appearance-none bg-transparent pe-8 ps-4 text-lg font-semibold text-sky-600 outline-none"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute left-5 text-2xl text-sky-500">⌄</span>
          </label>

          <label className="relative flex items-center rounded-[28px] border border-slate-300 bg-white px-5 py-4 shadow-sm">
            <Calendar className="h-5 w-5 text-slate-900" />
            <input
              type={dateFieldType}
              value={dateFieldValue}
              onChange={(event) => handleSingleDateChange(event.target.value)}
              className="w-full bg-transparent pe-4 ps-4 text-lg font-medium text-slate-900 outline-none disabled:text-slate-900"
              disabled={selectedPeriod === 'custom'}
            />
          </label>

          <button
            onClick={applyFilters}
            className="flex items-center justify-center rounded-[28px] bg-green-600 px-6 py-4 text-lg font-bold text-white shadow-[0_12px_30px_rgba(34,197,94,0.25)] transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 lg:col-start-3"
            disabled={isLoading}
          >
            عرض البيانات
          </button>
        </div>

        {selectedPeriod === 'custom' && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="date"
              value={dateRange.from}
              onChange={(event) => setDateRange({ ...dateRange, from: event.target.value })}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm sm:text-base focus:border-green-500 focus:outline-none"
              placeholder="من"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(event) => setDateRange({ ...dateRange, to: event.target.value })}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm sm:text-base focus:border-green-500 focus:outline-none"
              placeholder="إلى"
            />
          </div>
        )}

        <button
          onClick={reportView === 'summary' ? exportSummaryToPDF : exportStatementToPDF}
          className="mt-3 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          تصدير PDF
        </button>
      </div>

      {reportView === 'summary' ? (
        <>
          {isLoading && <div className="text-center py-4 text-gray-500">جاري تحميل بيانات التقارير...</div>}

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
              <div className="flex flex-col gap-1">
                <p className="text-gray-600 text-xs font-medium">إجمالي المبيعات</p>
                <p className="text-sm sm:text-base font-bold text-gray-900">{formatYemeniCurrency(totalSales)}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
              <div className="flex flex-col gap-1">
                <p className="text-gray-600 text-xs font-medium">إجمالي العمولة</p>
                <p className="text-sm sm:text-base font-bold text-red-600">{formatYemeniCurrency(-totalCommission)}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
              <div className="flex flex-col gap-1">
                <p className="text-gray-600 text-xs font-medium">الصافي</p>
                <p className="text-sm sm:text-base font-bold text-green-600">{formatYemeniCurrency(netAmount)}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
              <div className="flex flex-col gap-1">
                <p className="text-gray-600 text-xs font-medium">إجمالي الطلبات</p>
                <p className="text-sm sm:text-base font-bold text-gray-900">{totalOrders}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 col-span-2">
              <div className="flex flex-col gap-1">
                <p className="text-gray-600 text-xs font-medium">متوسط قيمة الطلب</p>
                <p className="text-sm sm:text-base font-bold text-gray-900">{formatYemeniCurrency(avgOrderValue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">التقرير {getPeriodHeadingLabel(appliedPeriod)} المفصل</h3>

            <div className="block sm:hidden space-y-3">
              {currentData.map((item, index) => {
                const previousSales = index > 0 ? currentData[index - 1].sales : 0;
                const growthRate = index > 0 ? getGrowthRate(item.sales, previousSales) : 0;

                return (
                  <div key={item.period} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <span className="font-bold text-sm text-gray-900">{item.period}</span>
                      {index > 0 && (
                        <span className={`font-medium text-xs px-2 py-1 rounded ${
                          growthRate >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">المبيعات:</span>
                        <span className="font-medium text-gray-900 mr-1">{formatYemeniCurrency(item.sales, 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">العمولة:</span>
                        <span className="font-medium text-red-600 mr-1">{formatYemeniCurrency(-item.commission, 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">الصافي:</span>
                        <span className="font-medium text-green-600 mr-1">{formatYemeniCurrency(item.netAmount, 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">الطلبات:</span>
                        <span className="font-medium text-gray-900 mr-1">{item.orders}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">المتوسط:</span>
                        <span className="font-medium text-gray-900 mr-1">{formatYemeniCurrency(item.avgOrderValue, 0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!isLoading && currentData.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                  لا توجد بيانات تقارير للفترة المحددة
                </div>
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-2 px-2 font-semibold text-gray-700 text-xs">الفترة</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-700 text-xs">المبيعات</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-700 text-xs">العمولة</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-700 text-xs">الصافي</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-700 text-xs">الطلبات</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-700 text-xs">المتوسط</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-700 text-xs">النمو</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((item, index) => {
                    const previousSales = index > 0 ? currentData[index - 1].sales : 0;
                    const growthRate = index > 0 ? getGrowthRate(item.sales, previousSales) : 0;

                    return (
                      <tr key={item.period} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-2 font-medium text-gray-900 text-xs">{item.period}</td>
                        <td className="py-2 px-2 font-medium text-gray-900 text-xs">{formatYemeniCurrency(item.sales, 0)}</td>
                        <td className="py-2 px-2 font-medium text-red-600 text-xs">{formatYemeniCurrency(-item.commission, 0)}</td>
                        <td className="py-2 px-2 font-medium text-green-600 text-xs">{formatYemeniCurrency(item.netAmount, 0)}</td>
                        <td className="py-2 px-2 text-gray-700 text-xs">{item.orders}</td>
                        <td className="py-2 px-2 text-gray-700 text-xs">{formatYemeniCurrency(item.avgOrderValue, 0)}</td>
                        <td className="py-2 px-2">
                          {index > 0 && (
                            <span className={`font-medium text-xs ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {!isLoading && currentData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-sm text-gray-500">لا توجد بيانات تقارير للفترة المحددة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">كشف الحساب المفصل</h3>
            </div>
            <div className="text-sm text-gray-600">آخر تحديث: {new Date().toLocaleDateString('ar-SA')}</div>
          </div>

          {isLoading && <div className="text-center py-4 text-gray-500">جاري تحميل كشف الحساب...</div>}

          <div className="block sm:hidden space-y-2">
            {statementEntries.map((entry) => (
              <div key={entry.id} className={`border rounded-lg p-3 ${entry.debit > 0 ? 'bg-red-50 border-red-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-2 pb-2 border-b border-gray-200">
                  <div className="text-sm text-gray-600">{entry.journalDate ? new Date(entry.journalDate).toLocaleDateString('ar-SA') : '-'}</div>
                  {entry.referenceId && <div className="text-sm font-medium text-gray-900">#{entry.referenceId}</div>}
                </div>
                <div className="text-sm text-gray-700 mb-2">{getStatementDisplayText(entry)}</div>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <div className="text-gray-500">مدين</div>
                    <div className="font-medium text-red-600">{entry.debit > 0 ? formatYemeniCurrency(entry.debit, 0) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">دائن</div>
                    <div className="font-medium text-green-600">{entry.credit > 0 ? formatYemeniCurrency(entry.credit, 0) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">الرصيد</div>
                    <div className="font-bold text-gray-900">{formatStatementBalance(entry.balance, 0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">الحالة</div>
                    <div className={`inline-flex rounded-full px-2 py-1 font-bold ${getBalanceStatus(entry.balance).badge}`}>
                      {getBalanceStatus(entry.balance).label}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!isLoading && statementEntries.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                لا توجد قيود في كشف الحساب للفترة المحددة
              </div>
            )}

            <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3 font-bold">
              <div className="flex justify-between items-center gap-3">
                <span className="text-base text-gray-900">الرصيد النهائي</span>
                <span className="text-lg text-green-600">{formatStatementBalance(statementTotals.finalBalance, 0)}</span>
              </div>
              <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-sm ${getBalanceStatus(statementTotals.finalBalance).badge}`}>
                {getBalanceStatus(statementTotals.finalBalance).label}
              </div>
            </div>
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 text-sm">التاريخ</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 text-sm">المرجع</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 text-sm">البيان</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 text-sm">مدين</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 text-sm">دائن</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 text-sm">الرصيد</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 text-sm">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {statementEntries.map((entry) => (
                  <tr key={entry.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${entry.debit > 0 ? 'bg-red-50/40' : ''}`}>
                    <td className="py-3 px-2 text-sm text-gray-900">{entry.journalDate ? new Date(entry.journalDate).toLocaleDateString('ar-SA') : '-'}</td>
                    <td className="py-3 px-2 text-sm text-gray-900 font-medium">{entry.referenceId || '-'}</td>
                    <td className="py-3 px-2 text-sm text-gray-700">
                      <div className="flex items-start gap-1">
                        {entry.debit > 0 && <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0"></span>}
                        <span className="line-clamp-2">{getStatementDisplayText(entry)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm">{entry.debit > 0 ? <span className="text-red-600 font-medium">{formatYemeniCurrency(entry.debit, 0)}</span> : <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-2 text-sm">{entry.credit > 0 ? <span className="text-green-600 font-medium">{formatYemeniCurrency(entry.credit, 0)}</span> : <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-2 text-sm font-bold text-gray-900">{formatStatementBalance(entry.balance, 0)}</td>
                    <td className="py-3 px-2 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-medium ${getBalanceStatus(entry.balance).badge}`}>
                        {getBalanceStatus(entry.balance).label}
                      </span>
                    </td>
                  </tr>
                ))}

                {!isLoading && statementEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-gray-500">لا توجد قيود في كشف الحساب للفترة المحددة</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-green-50 border-t-2 border-green-200">
                  <td colSpan={5} className="py-3 px-2 font-bold text-gray-900 text-sm">الرصيد النهائي</td>
                  <td className="py-3 px-2 font-bold text-green-600 text-base">{formatStatementBalance(statementTotals.finalBalance, 0)}</td>
                  <td className="py-3 px-2 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${getBalanceStatus(statementTotals.finalBalance).badge}`}>
                      {getBalanceStatus(statementTotals.finalBalance).label}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-200">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-700 font-medium">إجمالي الدائن</div>
              <div className="text-base sm:text-lg font-bold text-green-800 mt-1">{formatYemeniCurrency(statementTotals.credit, 0)}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-sm text-red-700 font-medium">إجمالي المدين</div>
              <div className="text-base sm:text-lg font-bold text-red-800 mt-1">{formatYemeniCurrency(statementTotals.debit, 0)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-700 font-medium">الرصيد الحالي</div>
              <div className="text-base sm:text-lg font-bold text-green-800 mt-1">{formatStatementBalance(statementTotals.finalBalance, 0)}</div>
              <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-sm font-bold ${getBalanceStatus(statementTotals.finalBalance).badge}`}>
                {formatStatementBalance(statementTotals.finalBalance, 0)} {getBalanceStatus(statementTotals.finalBalance).label}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
