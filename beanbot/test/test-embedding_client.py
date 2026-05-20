import json
from beanbot.settings import Settings
from beanbot.gateways.embedding_client import EmbeddingClient

settings = Settings.from_dict(
    {
        "embedding": {
            # "api_url": "http://localhost:11434/v1/embeddings",
            "api_url": "http://localhost:11434/v1/embeddings",
            "api_key": "ollama123",
            "model": "qwen3-embedding:0.6b",
        }
    }
)

client = EmbeddingClient(settings)
data, tokens = client.embed(["招商银行", "CMB", "Expenses:Food", "123"])

print(json.dumps(data))
print(f"嵌入了 {len(data)} 个文本")
print(f"使用了 {tokens} 个 token")
print(f"第一个向量维度: {len(data[0]['embedding'])}")
print(f"第一个向量前 5 维: {data[0]['embedding'][:5]}")
