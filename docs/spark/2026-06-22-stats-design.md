# BeanBot 统计页面设计文档

**日期**：2026-06-22（grill 修订：2026-06-22）
**范围**：Stats 页面 v1 — 时间范围 + 概览卡片 + Donut 分类图表 + 分类列表
**跳过**：账单汇总（BillsSummary）、AI 聊天 overlay（留到后续版本）

---

## 一、新增 / 修改文件

**新增：**
```
beanbot/services/query_service.py  # 新增 fetch_stats() 方法
api/routes/stats.py                # GET /api/stats 端点
frontend/src/pages/Stats.jsx       # 移植自 ui/stats.jsx
```

**修改：**
```
api/app.py                  # 注册 stats blueprint
frontend/src/main.jsx       # 添加 /stats 路由
frontend/src/pages/Ledger.jsx   # TabBar 补 Stats 导航
frontend/src/pages/Assets.jsx   # TabBar 补 Stats 导航
```

---

## 二、后端

### 2.1 BQL 查询（已测试确认）

日期过滤语法：`date >= YYYY-MM-DD`（裸写，无需引号），beanquery 支持。

`count(date)` 支持，直接返回 int。

**Income 正则必须用 `^Income`**（从头匹配），否则 `Expenses:Government:IncomeTax` 会混入结果——现有 `fetch_transactions` 也有此 bug，一并修复。

### 2.2 金额符号

| 账户类型 | `sum(position)` 符号 | 处理方式 |
|---|---|---|
| Expenses | 正数，如 `(60.88 CNY)` | 直接用 |
| Income | 负数，如 `(-474.98 CNY)` | Python 端 `abs()` |

解析方式（Python）：
```python
import re
def parse_amount(pos_str):
    m = re.search(r'[\d.]+', pos_str)
    return float(m.group()) if m else 0.0
```

### 2.3 账户分组规则

| 类型 | 父节点 | 子节点 |
|---|---|---|
| Expenses | `split(':')[1]`（如 `Food`） | `split(':')[-1]`（如 `Breakfast`） |
| Income | `split(':')[2]`（如 `Salary`） | `split(':')[-1]`（如 `MUJI`） |

3 层 Income 账户（如 `Income:CN:Sales`）：父=`Sales`，子=`Sales`，subs 为空列表（叶节点）。
4 层 Expenses 账户（如 `Expenses:Transport:Car:Rent`）：父=`Transport`，子=`Rent`（`Car` 中间层忽略）。
2 层账户：用户承诺会补全为 3 层，忽略。

### 2.4 QueryService.fetch_stats()

```python
def fetch_stats(self, start_date=None, end_date=None):
    date_clause = ""
    if start_date:
        date_clause = f" AND date >= {start_date} AND date <= {end_date}"

    expense_query = (
        f"SELECT account, sum(position), count(date) "
        f"WHERE account ~ '^Expenses'{date_clause} GROUP BY account"
    )
    income_query = (
        f"SELECT account, sum(position), count(date) "
        f"WHERE account ~ '^Income'{date_clause} GROUP BY account"
    )
    # 查询 → 聚合 → 返回 (expense_cats, income_cats)
```

**聚合逻辑**（Python 侧）：
1. 遍历结果，按父节点 key 分组，累加 amount / count
2. 每个父节点下挂 subs 列表（子节点 id = 完整账户路径，label = 最后一段）
3. 按 amount 降序排列父节点

**概览总计**：从分类结果直接 sum，不额外发 BQL。

### 2.5 GET /api/stats

```
GET /api/stats?range=<week|month|year|all>
Authorization: Bearer <jwt>
```

**range → 日期范围映射（以请求当天为准）：**

| range | start_date | end_date | avg_label | avg 分母 |
|---|---|---|---|---|
| week | 本周周一 | 今天 | 日均 | `(today - monday).days + 1` |
| month | 本月第 1 天 | 今天 | 日均 | `today.day` |
| year | 本年 1 月 1 日 | 今天 | 月均 | `today.month` |
| all | 不过滤 | — | 日均 | 固定 30 |

**响应格式：**

```json
{
  "summary": {
    "expense": 6342.50,
    "income": 21785.00,
    "balance": 15442.50,
    "avg": 211.42,
    "avg_label": "日均"
  },
  "expense_cats": [
    {
      "id": "Expenses:Food",
      "name": "Food",
      "amount": 2979.70,
      "count": 23,
      "subs": [
        { "id": "Expenses:Food:Breakfast", "name": "Breakfast", "amount": 60.88, "count": 8 },
        { "id": "Expenses:Food:DrinkFruit", "name": "DrinkFruit", "amount": 178.47, "count": 25 }
      ]
    }
  ],
  "income_cats": [
    {
      "id": "Income:CN:Salary",
      "name": "Salary",
      "amount": 21785.00,
      "count": 2,
      "subs": [
        { "id": "Income:CN:Salary:MUJI", "name": "MUJI", "amount": 15000.00, "count": 1 }
      ]
    }
  ]
}
```

**错误响应**：`{ "error": "..." }`，HTTP 400 / 401 / 500。

---

## 三、前端

### 3.1 Stats.jsx 结构

从 `ui/stats.jsx` 移植，**去掉** `BillsSummary` 和 `AIChat`，**去掉** Donut hover 联动（移动端无意义）：

```
Header "统计"
Segmented（周 / 月 / 年 / 全部）  ← 切换触发重新请求
SummaryCard（支出 / 收入 / 结余 / avg）
Donut 卡片
  Tabs（支出 / 收入）
  Donut SVG（纯 SVG，移植自 ui/stats.jsx）
  Mini 图例（最多 6 项）
CatRow 列表（点击展开 subs，无 hover 联动）
TabBar（统计 active）
```

### 3.2 数据加载

```js
const [data, setData] = useState(null);
const [range, setRange] = useState('month');

useEffect(() => {
  setData(null);  // 触发 loading 状态
  get(`/api/stats?range=${range}`).then(res => { if (res) setData(res); });
}, [range]);
```

加载中显示 `加载中...`（与 Ledger / Assets 页保持一致）。

### 3.3 颜色 / Icon

与 Assets.jsx 中完全相同的 `hashColor()` 函数，直接复制：

```js
function hashColor(str) {
  const palette = ['#e9876a','#69a7e8','#7dd87d','#caa46a','#b07de8','#e87d9a','#7dc8e8','#e8c87d'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xfffffff;
  return palette[h % palette.length];
}
```

颜色取 `hashColor(cat.id)`（父节点完整路径），首字母 icon 取 `cat.name[0].toUpperCase()`。

### 3.4 路由与 TabBar

`main.jsx` 新增：
```jsx
import Stats from './pages/Stats';
<Route path="/stats" element={<RequireAuth><Stats /></RequireAuth>} />
```

Ledger.jsx 和 Assets.jsx 的 TabBar：给「统计」补上 `onClick={() => navigate('/stats')}`，「存钱」维持无 onClick。

Stats.jsx 的 TabBar：「统计」标为 active，其余正常导航。

---

## 四、开发顺序

1. `query_service.py` — `fetch_stats()` + 分组聚合，curl 验证输出格式
2. `api/routes/stats.py` — 端点 + range → 日期计算，注册到 `app.py`
3. `Stats.jsx` — 移植组件，接入真实数据
4. `main.jsx` + Ledger / Assets TabBar — 补路由和导航
