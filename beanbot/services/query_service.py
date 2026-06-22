from __future__ import annotations

import re
from beanbot.models import Table


class QueryService:
    """
    - result_types: 每一列的元信息，比如列名、类型
    eg:(beanquery.Column('account', str), beanquery.Column('sum(position)', inventory))

    - result_rows: 真正的数据行
    eg:[
      ('Expenses:Food', (250.00 CNY)),
      ('Expenses:Transport', (12.00 CNY)),
      ('Expenses:Coffee', (32.00 CNY)),
      ('Expenses:Shopping', (299.00 CNY))
      ]
    """

    def __init__(self, repository):
        self.repository = repository

    def translate_rows(self, title: str, result_types, result_rows) -> Table:
        """将 BeanQuery 的原始查询结果转换为项目统一使用的表格模型。"""
        headers = [column.name for column in result_types]
        rows = []
        for row in result_rows:
            row_data = [str(value) for value in row]
            if any(cell in ("", "()") for cell in row_data):
                continue
            rows.append(row_data)
        return Table(title=title, headers=headers, rows=rows)

    def fetch_expense(self) -> Table:
        query = (
            "SELECT account, sum(position) WHERE account ~ 'Expenses' GROUP BY account"
        )
        result_types, result_rows = self.repository.run_query(query)
        return self.translate_rows("Expenses", result_types, result_rows)

    def fetch_transactions(self) -> Table:
        query = (
            "SELECT date, payee, narration, account, position "
            "WHERE account ~ '^Expenses' OR account ~ '^Income' "
            "ORDER BY date DESC "
            "LIMIT 50"
        )
        result_types, result_rows = self.repository.run_query(query)
        return self.translate_rows("Transactions", result_types, result_rows)

    def fetch_bill(self) -> Table:
        query = "SELECT account, sum(position) WHERE account ~'Liabilities' or account ~'Assets' GROUP BY account"
        result_types, result_rows = self.repository.run_query(query)
        return self.translate_rows("Bills", result_types, result_rows)

    def fetch_stats(self, start_date=None, end_date=None) -> dict:
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

        _, expense_rows = self.repository.run_query(expense_query)
        _, income_rows = self.repository.run_query(income_query)

        expense_cats = self._group_categories(expense_rows, kind="expense")
        income_cats = self._group_categories(income_rows, kind="income")

        expense_total = sum(c["amount"] for c in expense_cats)
        income_total = sum(c["amount"] for c in income_cats)

        return {
            "expense_cats": expense_cats,
            "income_cats": income_cats,
            "expense_total": expense_total,
            "income_total": income_total,
        }

    def _group_categories(self, rows, kind: str) -> list:
        """将扁平账户列表聚合为两级树结构。"""
        parents: dict[str, dict] = {}

        for account, position, count in rows:
            pos_str = str(position)
            if pos_str in ("", "()"):
                continue
            m = re.search(r"[\d.]+", pos_str)
            if not m:
                continue
            amount = float(m.group())

            parts = account.split(":")
            # Expenses: 父=parts[1]，Income: 父=parts[2]
            parent_idx = 1 if kind == "expense" else 2
            if len(parts) <= parent_idx:
                continue
            parent_key = parts[parent_idx]
            parent_id = ":".join(parts[: parent_idx + 1])
            sub_name = parts[-1]

            if parent_key not in parents:
                parents[parent_key] = {
                    "id": parent_id,
                    "name": parent_key,
                    "amount": 0.0,
                    "count": 0,
                    "subs": [],
                }

            parents[parent_key]["amount"] += amount
            parents[parent_key]["count"] += count

            # 子节点只在账户深度超过父节点时添加
            if len(parts) > parent_idx + 1 or parts[-1] != parent_key:
                parents[parent_key]["subs"].append({
                    "id": account,
                    "name": sub_name,
                    "amount": amount,
                    "count": count,
                })

        result = sorted(parents.values(), key=lambda c: c["amount"], reverse=True)
        for cat in result:
            cat["subs"].sort(key=lambda s: s["amount"], reverse=True)
        return result
