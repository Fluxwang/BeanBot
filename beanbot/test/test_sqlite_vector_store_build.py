from __future__ import annotations

import sqlite3
from tempfile import TemporaryDirectory

from beanbot.gateways.vector_store.sqlite_store import SqliteVectorStore
from beanbot.settings import Settings


TRANSACTIONS = [
    {
        # hash 的值为Beancount 自带的函数所生成
        "hash": "tx_kfc_20240501",
        "sentence": "KFC 午餐",
        "embedding": [1.0, 0.0, 0.0],
        "occurance": 8,
        "content": '2024-05-01 * "KFC" "午餐"\n  Assets:Bank:CMB  -35.00 CNY\n  Expenses:Food',
    },
    {
        "hash": "tx_luckin_20240502",
        "sentence": "瑞幸咖啡 早餐",
        "embedding": [0.92, 0.08, 0.0],
        "occurance": 5,
        "content": '2024-05-02 * "瑞幸咖啡" "早餐"\n  Assets:Bank:CMB  -18.00 CNY\n  Expenses:Food:Coffee',
    },
    {
        "hash": "tx_didi_20240503",
        "sentence": "滴滴 打车 去公司",
        "embedding": [0.0, 1.0, 0.0],
        "occurance": 4,
        "content": '2024-05-03 * "滴滴" "打车去公司"\n  Assets:Bank:CMB  -26.50 CNY\n  Expenses:Transport:Taxi',
    },
    {
        "hash": "tx_supermarket_20240504",
        "sentence": "盒马 超市 购物",
        "embedding": [0.0, 0.75, 0.25],
        "occurance": 3,
        "content": '2024-05-04 * "盒马" "超市购物"\n  Assets:Bank:CMB  -128.00 CNY\n  Expenses:Shopping:Groceries',
    },
    {
        "hash": "tx_salary_20240505",
        "sentence": "工资 收入",
        "embedding": [0.0, 0.0, 1.0],
        "occurance": 1,
        "content": '2024-05-05 * "公司" "工资"\n  Assets:Bank:CMB  10000.00 CNY\n  Income:Salary',
    },
]


def show_database_rows(store: SqliteVectorStore) -> None:
    db = sqlite3.connect(store.db_path)
    rows = db.execute(
        "SELECT id, hash, occurance, sentence, content FROM transactions ORDER BY id"
    ).fetchall()
    db.close()

    print("\n第 3 步：查看普通 transactions 表里保存了什么")
    for row in rows:
        tx_id, tx_hash, occurance, sentence, content = row
        first_line = content.splitlines()[0]
        print(
            f"  id={tx_id}, hash={tx_hash}, occurance={occurance}, sentence={sentence}"
        )
        print(f"    content 第一行: {first_line}")


def show_query(
    store: SqliteVectorStore, embedding: list[float], sentence: str
) -> list[dict]:
    print(f"\n第 4 步：用输入句子查询相似交易：{sentence}")
    print(f"  查询向量: {embedding}")

    results = store.query(embedding, sentence, candidate_amount=3)
    for index, result in enumerate(results, 1):
        print(
            f"  Top {index}: score={result['score']:.4f}, "
            f"similarity={result['distance']:.4f}, "
            f"occurance={result['occurance']}, sentence={result['sentence']}"
        )
        print(f"    {result['content'].splitlines()[0]}")
    return results


def main() -> None:
    with TemporaryDirectory() as db_dir:
        print("第 1 步：准备临时向量数据库目录")
        print(f"  db_store_folder = {db_dir}")

        settings = Settings.from_dict({"embedding": {"db_store_folder": db_dir}})
        store = SqliteVectorStore(settings)
        print(f"  sqlite 文件路径 = {store.db_path}")

        print("\n第 2 步：构建向量数据库")
        print(f"  准备写入 {len(TRANSACTIONS)} 条历史交易")
        store.build(TRANSACTIONS)
        print("  build() 完成：已创建 vec_items 虚拟表和 transactions 普通表")

        show_database_rows(store)

        lunch_results = show_query(store, [0.99, 0.01, 0.0], "肯德基 午餐")
        taxi_results = show_query(store, [0.0, 0.98, 0.02], "今天打车去公司")

        assert lunch_results[0]["sentence"] == "KFC 午餐"
        assert taxi_results[0]["sentence"] == "滴滴 打车 去公司"
        assert len(lunch_results) == 3

        print("\n第 5 步：断言通过")
        print("  KFC 午餐和滴滴打车都能作为最相近的历史交易返回")
        print(
            "  这个脚本说明当前 SqliteVectorStore 的 build() 和 query() 主流程可以跑通"
        )


if __name__ == "__main__":
    main()

