from __future__ import annotations

from beanbot.models import Table


class QueryService:
    """
    - result_types: 每一列的元信息，比如列名、类型
    - result_rows: 真正的数据行
    Table(
          title="Expenses",
          headers=["account", "sum_position"],
          rows=[
              ["Expenses:Food", "100.00 CNY"],
              ["Expenses:Transport", "20.00 CNY"],
          ],
      )
    """

    def __init__(self, repository):
        self.repository = repository

    def translate_rows(self, title: str, result_types, result_rows) -> Table:
        """将 BeanQuery 的原始查询结果转换为项目统一使用的表格模型。"""
        headers = [column.name for column in result_types]
        rows = []
        for row in result_rows:
            row_data = []
            for value in row:
                row_data.append(str(value))
            rows.append(row_data)
        return Table(title=title, headers=headers, rows=rows)

    def fetch_expense(self) -> Table:
        query = (
            "SELECT account, sum(position) WHERE account ~ 'Expenses' GROUP BY account"
        )
        result_types, result_rows = self.repository.run_query(query)
        return self.translate_rows("Expenses", result_types, result_rows)

    def fetch_bill(self) -> Table:
        query = "SELECT account, sum(position) WHERE account ~'Liabilities' GROUP BY account"
        result_types, result_rows = self.repository.run_query(query)
        return self.translate_rows("Bills", result_types, result_rows)
