# BeanBot Web App 设计文档

**日期**：2026-06-21（grill 修订：2026-06-22）
**范围**：第一版 — 记账（Entry）+ 账本列表（Ledger）
**部署目标**：VPS 公网，Nginx + Gunicorn + HTTPS

---

## 一、项目结构

在现有 BeanBot 仓库中新增两个目录，**不修改** `beanbot/` 中任何现有代码。

```
BeanBot/
├── beanbot/              # 现有 Python 代码，完全不动
├── ui/                   # 设计稿（参考用）
│
├── api/                  # 🆕 Flask 薄层
│   ├── app.py            # Flask app factory，注册蓝图，调用 bootstrap_app()
│   ├── auth.py           # POST /api/auth/login → 签发 JWT
│   └── routes/
│       ├── entry.py      # /api/entry/build + /api/entry/parse + /api/entry/submit
│       ├── ledger.py     # /api/ledger/transactions
│       └── accounts.py   # /api/accounts
│
└── frontend/             # 🆕 React + Vite
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Ledger.jsx
    │   │   └── Entry.jsx
    │   ├── components/   # 从 ui/ 设计稿移植的 UI 组件
    │   ├── api.js        # 统一 fetch 封装（自动带 JWT header，拦截 401）
    │   └── main.jsx
    ├── vite.config.js    # dev 代理：/api/* → http://localhost:5000
    └── package.json
```

---

## 二、环境变量

所有敏感配置通过环境变量注入，不进 git。开发时在仓库根目录放 `.env` 文件（加入 gitignore）：

```
BEANBOT_CONFIG=/home/mark/project/personal/beancountBot/BeanBot/config.yaml
JWT_SECRET_KEY=<随机生成的长字符串>
```

`api/app.py` 启动时读取这两个变量：
- `BEANBOT_CONFIG` → 传给 `bootstrap_app(config_path)`
- `JWT_SECRET_KEY` → 传给 `flask-jwt-extended` 的 `JWT_SECRET_KEY` 配置

---

## 三、Flask API 端点

所有端点挂在 `/api/` 前缀下。除登录外，所有端点需要在请求头携带 JWT：
`Authorization: Bearer <token>`

### 认证

```
POST /api/auth/login
Body:   { "username": "...", "password": "..." }
Return: { "token": "<jwt>" }
```

用户名和密码存储在 `config.yaml` 的 `web.username` / `web.password` 字段（单用户，不需要数据库）。JWT 有效期 **30 天**，使用 `flask-jwt-extended` 签发。

### 图形模式构造交易

```
POST /api/entry/build
Body:   {
  "amount": 35.0,
  "from_account": "Assets:Bank:CMB",
  "to_account": "Expenses:Food:Meal",
  "payee": "KFC",          # 选填，来自"商家"chip，空字符串表示未填
  "narration": "午饭"
}
Return: { "raw": "<beancount 格式文本>" }
→ 调用 repository.build_transaction_entry() + repository.render_entry()
```

支出、收入、转账三种模式共用此端点。转账时 `from_account` 和 `to_account` 均为 Assets 账户，`to_account` 的 posting 金额由 Beancount 自动平衡。

### 自然语言解析

```
POST /api/entry/parse
Body:   { "text": "35 CMB KFC 午饭" }
Return: {
  "amount": 35.0,
  "from_account": "Assets:Bank:CMB",
  "to_account": "Expenses:Food:Meal",
  "payee": "KFC",
  "narration": "午饭",
  "raw": "<beancount 格式文本>"
}
→ 调用 controller.render_txs(text) 得到 raw 文本
→ 再用 repository.parse_transactions(raw) 反解析出结构化字段
→ 前端用结构化字段渲染预览卡片（ParsedRow 组件），确认后把 raw 传给 submit
```

### 提交交易

```
POST /api/entry/submit
Body:   { "data": "<beancount 格式文本>" }
Return: { "ok": true }
→ 调用 controller.submit_transaction(data)
```

图形模式和自然语言模式最终都走这个端点。

### 账本列表

```
GET /api/ledger/transactions
Return: {
  "rows": [
    { "date": "2026-06-22", "payee": "KFC", "narration": "午饭",
      "account": "Expenses:Food:Meal", "amount": "-35.00 CNY" }
  ]
}
→ 新增 query_service.fetch_transactions()，BQL：
  SELECT date, payee, narration, account, position
  WHERE account ~ 'Expenses' OR account ~ 'Income'
  ORDER BY date DESC
  LIMIT 50
```

### 账户列表

```
GET /api/accounts
Return: {
  "assets":   [{ "name": "Assets:Bank:CMB",     "label": "CMB" }],
  "expenses": [{ "name": "Expenses:Food:Meal",  "label": "Meal" }],
  "income":   [{ "name": "Income:Salary:Base",  "label": "Base" }]
}
→ 调用 repository.accounts（返回 set），按账户类型前缀分组、排序后返回
→ label = 账户全名按 ":" 分割后的最后一段
```

### 错误响应统一格式

```
{ "error": "错误描述文本" }
HTTP 状态码：400（参数错误）/ 401（未认证或 token 过期）/ 500（内部错误）
```

---

## 四、前端设计

### 路由

```
/login    → Login.jsx      未登录时强制跳转此页
/         → Ledger.jsx     首页，账本流水列表
/entry    → Entry.jsx      记账页，从首页 + 按钮进入
```

未登录访问受保护路由时，路由守卫自动重定向到 `/login`。

### 移动端适配

- 全局 `max-width: 430px; margin: 0 auto`，不写媒体查询，不做 Desktop 适配
- 使用 `100dvh`（dynamic viewport height）避免手机浏览器地址栏遮挡

### Token 管理

登录成功后 JWT 存入 `localStorage`，有效期 30 天。`api.js` 统一封装所有请求：

```js
// src/api.js
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const handle = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }
  return res.json();
};

export const get  = (path) => fetch(path, { headers: authHeader() }).then(handle);
export const post = (path, body) =>
  fetch(path, { method: 'POST', headers: authHeader(), body: JSON.stringify(body) }).then(handle);
```

token 过期（401）→ 清除 localStorage → 跳转 `/login`，不做 refresh token 机制。

### 账户 Icon 策略

账户数据从 `GET /api/accounts` 动态获取，App 启动时加载一次存入 React Context，不硬编码任何账户。

Icon 使用账户 label（叶子节点）的首字母，放在带背景色的圆圈内：

```
Assets:Bank:CMB     → label="CMB"  → 圆圈显示 "C"
Assets:Pay:Alipay   → label="Alipay" → 圆圈显示 "A"
Expenses:Food:Meal  → label="Meal" → 圆圈显示 "M"
```

颜色根据账户全名哈希得到固定色值，同一账户颜色永远一致。

### Entry 页面：图形模式 UI 修改

在 `MetaRow` 的 chip 行新增一个「商家」chip（选填），点击后弹出文本输入框，用户填写 payee。不填默认空字符串，不影响记账流程，但填写后能提升未来 RAG 的匹配质量。

### 页面交互流程

```
Login
  → 输入用户名 + 密码
  → POST /api/auth/login → 存 token
  → GET /api/accounts → 存入 React Context
  → 跳转 /

Ledger（首页）
  → GET /api/ledger/transactions → 渲染交易流水列表（最近 50 条）
  → 点 + 按钮 → 跳转 /entry

Entry（记账）—— 三个 Tab：支出 / 收入 / 转账

  图形模式（支出/收入）：
    → 选分类（来自 /api/accounts expenses 或 income）
    → 选资产账户（来自 /api/accounts assets）
    → 填商家（选填 chip）
    → 数字键盘输入金额
    → 点"完成" → POST /api/entry/build → 得到 raw
    → POST /api/entry/submit(raw) → 返回 /

  图形模式（转账）：
    → 选转出账户（/api/accounts assets）
    → 选转入账户（/api/accounts assets，排除转出账户）
    → 数字键盘输入金额
    → POST /api/entry/build(from=assets, to=assets) → 得到 raw
    → POST /api/entry/submit(raw) → 返回 /

  文字模式（自然语言）：
    → 输入文本（如"35 CMB KFC 午饭"）
    → POST /api/entry/parse → 返回结构化预览 + raw
    → 用 ParsedRow 组件展示预览卡片
    → 确认 → POST /api/entry/submit(raw) → 返回 /
```

### UI 组件来源

`ui/` 目录下的设计稿已包含完整 UI 实现，直接迁移到 `frontend/src/components/`，改为标准 ES module 导出，不重写设计逻辑。

---

## 五、开发顺序

开发时两个终端分别运行：
- 终端 1：`python -m flask --app api/app.py run`（端口 5000）
- 终端 2：`npm run dev`（端口 5173，Vite 代理 `/api/*` → 5000）

### 阶段 1 — Flask API（约 2-3 天）

1. `api/app.py` — Flask app factory，读环境变量，接入 `bootstrap_app()`
2. `api/auth.py` — 登录端点，JWT 签发（30 天有效期）
3. `api/routes/accounts.py` — accounts 分组返回（先做，方便后续测试）
4. `api/routes/entry.py` — build + parse + submit 三个端点
5. `query_service.fetch_transactions()` — 新增 BQL 查询
6. `api/routes/ledger.py` — transactions 端点

每个端点用 curl 验证数据格式后再进入下一个。

### 阶段 2 — 前端框架（约 1 天）

1. `npm create vite@latest frontend -- --template react`
2. 配置 `vite.config.js` proxy
3. `api.js` — fetch 封装 + 401 拦截
4. `Login.jsx` + token 存取
5. React Router + 路由守卫 + 登录后预加载 `/api/accounts`

### 阶段 3 — Ledger 页面（约 1-2 天）

1. 接 `GET /api/ledger/transactions`，渲染流水列表
2. 从 `ui/ledger.jsx` 移植 UI 组件

### 阶段 4 — Entry 页面（约 2-3 天）

1. 从 Context 读账户数据，渲染账户/分类选择器（首字母圆圈 icon）
2. 图形模式（支出/收入）：选账户 → 填商家（选填）→ 键盘输入 → build → submit
3. 图形模式（转账）：双账户选择器 → 键盘输入 → build → submit
4. 文字模式：输入 → parse → 预览卡片 → submit
5. 从 `ui/entry.jsx` 移植组件，`MetaRow` 新增商家 chip

### 阶段 5 — 部署（按需）

1. `npm run build` 生成 `frontend/dist/`
2. VPS 上用 Gunicorn 运行 Flask：`gunicorn -w 2 api.app:app`
3. Nginx 配置：静态文件服务 `frontend/dist/`，`/api/*` 反向代理到 Gunicorn
4. Certbot 申请 HTTPS 证书

---

## 六、新增依赖

**Python：**
```
flask
flask-jwt-extended
flask-cors          # 仅开发阶段，生产由 Nginx 处理跨域
python-dotenv       # 读取 .env 文件中的环境变量
```

**前端：**
```
react-router-dom    # 路由
```

不引入 Redux / Zustand，全局账户数据用 React Context 即可。
