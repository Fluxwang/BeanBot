from beanbot.settings import Settings
from beanbot.gateways.vector_store import create_vector_store

settings = Settings.from_dict({"embedding": {"db_store_folder": "vec_db"}})

store = create_vector_store(settings)
print(f"使用的存储类型: {type(store).__name__}")
