from beanbot.gateways.vector_store.sqlite_store import SqliteVectorStore
from beanbot.settings import Settings

settings = Settings.from_dict({"embedding": {"db_store_folder": "vec_db"}})

store = SqliteVectorStore(settings)

store.build(
    [
        {
            "hash": "abc123",
            "sentence": "KFC 午餐",
            "embedding": [0.1, 0.2, 0.3],
            "occurance": 3,
            "content": '2024-01-15 * "KFC" "午餐"\n  Assets:Bank:CMB -100 CNY\n  Expenses:Food',
        }
    ]
)


results = store.query([0.11, 0.19, 0.31], "肯德基 午餐", candidate_amount=3)
for r in results:
    print(f"相似度: {r['distance']:.3f}, 交易: {r['sentence']}")
