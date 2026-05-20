from typing import Protocol
import math


class VectorStore(Protocol):
    def build(self, transactions: list[dict]): ...

    def query(
        self, embedding: list[float], sentence: str, candidate_amount: int
    ) -> list[dict]: ...

    def calculate_score(transaction: dict) -> float:
        # del sentence
        # occurance: 该交易在历史中出现的次数，使用对数函数进行计算 底数为50
        # 出现的次数越多, 对数值越大，可以进行压缩差异，让频繁交易有优势但不会完全压倒相似度
        occurrence_score = math.log(transaction["occurance"] + 1, 50)
        return transaction["distance"] + occurrence_score


tx1 = {"distance": 0.1, "occurance": 1}
tx2 = {"distance": 0.8, "occurance": 102}
tx3 = {"distance": 0.1, "occurance": 102}

score1 = VectorStore.calculate_score(tx1)
score2 = VectorStore.calculate_score(tx2)
score3 = VectorStore.calculate_score(tx3)
print(score1)
print(score2)
print(score3)
