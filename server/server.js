import cors from 'cors';
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storeFilePath = path.join(__dirname, 'data', 'store.json');
const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

async function readStore() {
  const raw = await fs.readFile(storeFilePath, 'utf8');
  return JSON.parse(raw);
}

async function writeStore(store) {
  await fs.writeFile(storeFilePath, JSON.stringify(store, null, 2), 'utf8');
}

function makeId() {
  return Date.now().toString();
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function getWeekdayLabel(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', { weekday: 'short' });
}

function formatDateOnly(dateString) {
  return new Date(dateString).toISOString().split('T')[0];
}

function withinRange(dateString, from, to) {
  const value = new Date(dateString).getTime();
  const fromValue = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const toValue = to ? new Date(`${to}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
  return value >= fromValue && value <= toValue;
}

function buildCommissionEntries(orders, commissionRate, restaurantName) {
  return orders
    .filter((order) => order.status !== 'cancelled')
    .map((order) => ({
      order_date: formatDateOnly(order.createdAt),
      captain_name: order.captainName || null,
      restaurant_name: restaurantName,
      order_id: order.id,
      total_amount: Number(order.total || 0),
      restaurant_commission: Number(((order.total || 0) * commissionRate).toFixed(2)),
      captain_commission: 0,
    }));
}

function buildLedgerEntries(orders, commissionRate) {
  return orders
    .filter((order) => order.status !== 'cancelled')
    .flatMap((order) => {
      const total = Number(order.total || 0);
      const commission = Number((total * commissionRate).toFixed(2));
      const journalDate = formatDateOnly(order.createdAt);

      return [
        {
          id: `sale-${order.id}`,
          journal_date: journalDate,
          reference_type: 'order',
          reference_id: order.id,
          currency_id: 'YER',
          currency_name: 'ريال يمني',
          account_name: 'مبيعات المطعم',
          debit: 0,
          credit: total,
          notes: `مبيعات الطلب #${order.id}`,
        },
        {
          id: `commission-${order.id}`,
          journal_date: journalDate,
          reference_type: 'order',
          reference_id: order.id,
          currency_id: 'YER',
          currency_name: 'ريال يمني',
          account_name: 'عمولة الشركة',
          debit: commission,
          credit: 0,
          notes: `عمولة الطلب #${order.id}`,
        },
      ];
    })
    .sort((left, right) => {
      const dateDiff = new Date(left.journal_date).getTime() - new Date(right.journal_date).getTime();

      if (dateDiff !== 0) {
        return dateDiff;
      }

      return String(left.id).localeCompare(String(right.id));
    });
}

function buildDashboard(orders) {
  const completedStatuses = new Set(['completed', 'delivery', 'confirmed', 'preparing', 'pending']);
  const relevantOrders = orders.filter((order) => completedStatuses.has(order.status));
  const totalSales = sum(relevantOrders.filter((order) => order.status !== 'cancelled').map((order) => order.total));
  const newOrders = orders.length;
  const pendingOrders = orders.filter((order) => ['pending', 'confirmed', 'preparing'].includes(order.status)).length;
  const latestWeek = orders.slice(0, 7).reverse();
  const previousWeek = orders.slice(7, 14);
  const latestTotal = sum(latestWeek.map((order) => order.total));
  const previousTotal = sum(previousWeek.map((order) => order.total));
  const growthRate = previousTotal > 0 ? ((latestTotal - previousTotal) / previousTotal) * 100 : 0;
  const weeklySales = latestWeek.map((order) => ({
    name: getWeekdayLabel(order.createdAt),
    value: order.total,
  }));
  const orderDistribution = [
    { name: 'مكتملة', value: orders.filter((order) => order.status === 'completed').length },
    { name: 'قيد التوصيل', value: orders.filter((order) => order.status === 'delivery').length },
    { name: 'ملغية', value: orders.filter((order) => order.status === 'cancelled').length },
  ];

  return {
    totalSales,
    newOrders,
    pendingOrders,
    growthRate,
    weeklySales,
    orderDistribution,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/agents/login', async (req, res) => {
  const { phone, password } = req.body || {};
  const store = await readStore();
  const user = store.settings.users.find(
    (item) => item.username === phone && item.password === password,
  );

  if (!user) {
    return res.status(401).json({ success: false, message: 'بيانات غير صحيحة' });
  }

  return res.json({
    success: true,
    token: `demo-token-${user.id}`,
    agent: {
      id: user.id,
      name: user.name,
      phone: user.username,
      branch_id: '1',
      image_url: null,
    },
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const store = await readStore();
  const user = store.settings.users.find(
    (item) => item.username === username && item.password === password,
  );

  if (!user) {
    return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
});

app.get('/api/dashboard', async (_req, res) => {
  const store = await readStore();
  res.json(buildDashboard(store.orders));
});

app.get('/api/orders', async (_req, res) => {
  const store = await readStore();
  const orders = [...store.orders].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  res.json(orders);
});

app.get('/api/commissions', async (req, res) => {
  const store = await readStore();
  const { from, to } = req.query;
  const commissionRate = Number(store.settings.commissionRate || 0.05);
  const restaurantName = store.settings.storeName || 'المطعم';

  const rows = buildCommissionEntries(store.orders, commissionRate, restaurantName)
    .filter((entry) => withinRange(entry.order_date, from, to))
    .sort((left, right) => new Date(right.order_date).getTime() - new Date(left.order_date).getTime());

  res.json({
    success: true,
    list: rows,
  });
});

app.post('/api/account-statement', async (req, res) => {
  const store = await readStore();
  const { from_date, to_date, report_mode } = req.body || {};
  const commissionRate = Number(store.settings.commissionRate || 0.05);
  const ledgerEntries = buildLedgerEntries(store.orders, commissionRate);

  const openingBalance = from_date
    ? Number(
        ledgerEntries
          .filter((entry) => new Date(entry.journal_date).getTime() < new Date(`${from_date}T00:00:00`).getTime())
          .reduce((sum, entry) => sum + entry.debit - entry.credit, 0)
          .toFixed(2),
      )
    : 0;

  const filteredEntries = ledgerEntries.filter((entry) => withinRange(entry.journal_date, from_date, to_date));

  if (report_mode === 'summary') {
    const debit = Number(filteredEntries.reduce((sum, entry) => sum + entry.debit, 0).toFixed(2));
    const credit = Number(filteredEntries.reduce((sum, entry) => sum + entry.credit, 0).toFixed(2));

    return res.json({
      success: true,
      opening_balance: openingBalance,
      list: [{
        currency_id: 'YER',
        currency_name: 'ريال يمني',
        account_name: 'الحساب العام',
        debit,
        credit,
        balance: Number((openingBalance + debit - credit).toFixed(2)),
      }],
    });
  }

  let runningBalance = openingBalance;
  const list = [];

  if (openingBalance !== 0) {
    list.push({
      id: 'opening-balance',
      journal_date: from_date || formatDateOnly(new Date().toISOString()),
      reference_type: 'opening',
      reference_id: '',
      currency_id: 'YER',
      currency_name: 'ريال يمني',
      account_name: 'رصيد سابق',
      debit: 0,
      credit: 0,
      balance: openingBalance,
      notes: 'رصيد سابق',
      is_opening: true,
    });
  }

  filteredEntries.forEach((entry) => {
    runningBalance = Number((runningBalance + entry.debit - entry.credit).toFixed(2));
    list.push({
      ...entry,
      balance: runningBalance,
    });
  });

  res.json({
    success: true,
    opening_balance: openingBalance,
    list,
  });
});

app.put('/api/orders/:id', async (req, res) => {
  const store = await readStore();
  const index = store.orders.findIndex((order) => order.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }

  store.orders[index] = {
    ...store.orders[index],
    ...req.body,
  };

  await writeStore(store);
  return res.json(store.orders[index]);
});

app.get('/api/products', async (_req, res) => {
  const store = await readStore();
  const products = [...store.products].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const store = await readStore();
  const product = {
    id: makeId(),
    createdAt: new Date().toISOString().split('T')[0],
    ...req.body,
  };

  store.products.unshift(product);
  await writeStore(store);
  res.status(201).json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const store = await readStore();
  const index = store.products.findIndex((product) => product.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'المنتج غير موجود' });
  }

  store.products[index] = {
    ...store.products[index],
    ...req.body,
  };

  await writeStore(store);
  res.json(store.products[index]);
});

app.delete('/api/products/:id', async (req, res) => {
  const store = await readStore();
  store.products = store.products.filter((product) => product.id !== req.params.id);
  await writeStore(store);
  res.json({ success: true });
});

app.get('/api/settings', async (_req, res) => {
  const store = await readStore();
  const { storeName, companyName, commissionRate, categories, types, units } = store.settings;
  res.json({ storeName, companyName, commissionRate, categories, types, units });
});

app.post('/api/settings/:collection', async (req, res) => {
  const { collection } = req.params;
  const allowed = ['categories', 'types', 'units'];

  if (!allowed.includes(collection)) {
    return res.status(400).json({ message: 'نوع الإعداد غير مدعوم' });
  }

  const store = await readStore();
  const newItem = {
    id: makeId(),
    name: String(req.body?.name || '').trim(),
    createdAt: new Date().toISOString().split('T')[0],
  };

  if (!newItem.name) {
    return res.status(400).json({ message: 'الاسم مطلوب' });
  }

  store.settings[collection].push(newItem);
  await writeStore(store);
  res.status(201).json(newItem);
});

app.put('/api/settings/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const allowed = ['categories', 'types', 'units'];

  if (!allowed.includes(collection)) {
    return res.status(400).json({ message: 'نوع الإعداد غير مدعوم' });
  }

  const store = await readStore();
  const index = store.settings[collection].findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'العنصر غير موجود' });
  }

  store.settings[collection][index] = {
    ...store.settings[collection][index],
    name: String(req.body?.name || '').trim(),
  };

  await writeStore(store);
  res.json(store.settings[collection][index]);
});

app.delete('/api/settings/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const allowed = ['categories', 'types', 'units'];

  if (!allowed.includes(collection)) {
    return res.status(400).json({ message: 'نوع الإعداد غير مدعوم' });
  }

  const store = await readStore();
  store.settings[collection] = store.settings[collection].filter((item) => item.id !== id);
  await writeStore(store);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Merchant server running on http://localhost:${PORT}`);
});