# Backend Patch: Link Sub-Users To Agent

هذه التعديلات مخصصة لـ repo الباك اند `HassainHerhmh/ebham-backend`.

الهدف:
- كل مستخدم فرعي في جدول `users` يحمل `agent_id`.
- إذا أنشأ الوكيل مستخدماً، ينربط تلقائياً به.
- تسجيل الدخول يعيد `agent_id` واسم الوكيل.
- جلب المستخدمين يرجع فقط مستخدمي الوكيل عند دخول الوكيل.
- مستخدمو الفرع العاديون يبقون على فلترة الفرع الحالية.

## 1. Migration

نفذ الملف التالي على قاعدة البيانات:

- [project/docs/backend-agent-user-link.sql](project/docs/backend-agent-user-link.sql)

## 2. Update `routes/users.js`

### في `GET /users`

استبدل منطق البداية ليقرأ دور المستخدم الحالي، ثم أضف حالة خاصة للوكيل:

```js
router.get("/", async (req, res) => {
  try {
    const { is_admin_branch, branch_id, role, id: authUserId } = req.user;
    const selectedBranch = req.headers["x-branch-id"];

    let rows;

    if (role === "agent") {
      [rows] = await pool.query(
        `
        SELECT u.*, b.name AS branch_name, a.name AS agent_name
        FROM users u
        LEFT JOIN branches b ON b.id = u.branch_id
        LEFT JOIN agents a ON a.id = u.agent_id
        WHERE u.agent_id = ?
        ORDER BY u.id DESC
        `,
        [authUserId]
      );
    } else if (is_admin_branch) {
      if (selectedBranch && selectedBranch !== "all") {
        [rows] = await pool.query(
          `
          SELECT u.*, b.name AS branch_name, a.name AS agent_name
          FROM users u
          LEFT JOIN branches b ON b.id = u.branch_id
          LEFT JOIN agents a ON a.id = u.agent_id
          WHERE u.branch_id = ?
          ORDER BY u.id DESC
          `,
          [selectedBranch]
        );
      } else {
        [rows] = await pool.query(`
          SELECT u.*, b.name AS branch_name, a.name AS agent_name
          FROM users u
          LEFT JOIN branches b ON b.id = u.branch_id
          LEFT JOIN agents a ON a.id = u.agent_id
          ORDER BY u.id DESC
        `);
      }
    } else {
      [rows] = await pool.query(
        `
        SELECT u.*, b.name AS branch_name, a.name AS agent_name
        FROM users u
        LEFT JOIN branches b ON b.id = u.branch_id
        LEFT JOIN agents a ON a.id = u.agent_id
        WHERE u.branch_id = ?
        ORDER BY u.id DESC
        `,
        [branch_id]
      );
    }

    res.json({ success: true, users: rows });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ success: false });
  }
});
```

### في `POST /users`

عدّل الإدخال لقراءة `agent_id`، مع ربط تلقائي إذا كان المنشئ وكيلاً:

```js
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const authUser = req.user;
    let { name, email, phone, password, role, permissions, branch_id, agent_id } = req.body;

    if (!(authUser.role === "admin" && authUser.is_admin_branch === true)) {
      branch_id = authUser.branch_id;
    }

    if (authUser.role === "agent") {
      agent_id = authUser.id;
    }

    if (agent_id) {
      const [[agent]] = await pool.query(
        `SELECT id, branch_id, name FROM agents WHERE id = ? LIMIT 1`,
        [agent_id]
      );

      if (!agent) {
        return res.status(400).json({ success: false, message: "الوكيل غير موجود" });
      }

      if (branch_id && agent.branch_id && Number(branch_id) !== Number(agent.branch_id)) {
        return res.status(400).json({ success: false, message: "الوكيل لا يتبع هذا الفرع" });
      }

      branch_id = agent.branch_id || branch_id;
    }

    const hashed = await bcrypt.hash(password, 10);

    const image_url = req.file
      ? `/uploads/users/${req.file.filename}`
      : null;

    const [result] = await pool.query(
      `
      INSERT INTO users (name, email, phone, password, role, permissions, branch_id, agent_id, image_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        name,
        email,
        phone,
        hashed,
        role,
        permissions || "{}",
        branch_id || null,
        agent_id || null,
        image_url,
      ]
    );

    res.json({ success: true, id: result.insertId, agent_id: agent_id || null });
  } catch (err) {
    console.error("ADD USER ERROR:", err);
    res.status(500).json({ success: false });
  }
});
```

### في `PUT /users/:id`

اسمح بتعديل `agent_id` أيضاً:

```js
const { name, email, phone, role, branch_id, agent_id } = req.body;

const fields = ["name = ?", "email = ?", "phone = ?", "role = ?", "agent_id = ?"];
const values = [name, email || null, phone || null, normalizeRole(role), agent_id || null];
```

### في `GET /users/:id/permissions`

يمكنك إرجاع بيانات الوكيل أيضاً لو أردت للواجهة:

```js
SELECT u.id, u.name, u.role, u.permissions, u.agent_id, a.name AS agent_name
FROM users u
LEFT JOIN agents a ON a.id = u.agent_id
WHERE u.id = ?
LIMIT 1
```

## 3. Update `routes/auth.js`

في استعلام تسجيل دخول المستخدمين أضف `u.agent_id` واسم الوكيل:

```js
const [rows] = await db.query(
  `
  SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.password,
    u.role,
    u.status,
    u.branch_id,
    u.agent_id,
    a.name AS agent_name,
    b.name AS branch_name,
    b.is_admin AS is_admin_branch
  FROM users u
  LEFT JOIN branches b ON b.id = u.branch_id
  LEFT JOIN agents a ON a.id = u.agent_id
  WHERE u.email = ? OR u.phone = ?
  LIMIT 1
  `,
  [identifier, identifier]
);
```

وأعد الحقول في الاستجابة:

```js
res.json({
  success: true,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    branch_id: user.branch_id,
    branch_name: user.branch_name,
    agent_id: user.agent_id,
    agent_name: user.agent_name,
    is_admin_branch: user.is_admin_branch === 1,
    token,
  },
});
```

## 4. Update `middlewares/auth.js`

في جزء جلب `ADMIN / STAFF` أضف `agent_id`:

```js
const [rows] = await db.query(
  `
  SELECT 
    id,
    name,
    phone,
    role,
    branch_id,
    agent_id
  FROM users
  WHERE id=? LIMIT 1
  `,
  [decoded.id]
);
```

ثم أضفه في `req.user`:

```js
req.user = {
  id: userRecord.id,
  name: userRecord.name,
  phone: userRecord.phone,
  role: userRecord.role,
  branch_id: userRecord.branch_id || null,
  agent_id: userRecord.agent_id || null,
  status: userRecord.status || null,
  is_admin: userRecord.is_admin || 0,
  is_admin_branch: userRecord.is_admin_branch || 0,
  is_active: userRecord.is_active ?? null,
};
```

## 5. Frontend compatibility

الفرونت في هذا المشروع صار جاهزاً لالتقاط `agent_id` و`agent_name` من الباك اند تلقائياً عندما تضيف هذه التعديلات.

## 6. Recommended follow-up

بعد تطبيق التعديلات على الباك اند:
- شغل migration.
- أعد نشر الباك اند.
- جرّب إنشاء مستخدم فرعي من حساب وكيل.
- تأكد أن `GET /api/users` من حساب الوكيل يرجع فقط مستخدميه.
- تأكد أن `POST /api/auth/login` يرجع `agent_id` و`agent_name` للمستخدم الفرعي.