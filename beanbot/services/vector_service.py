from __future__ import annotations
from beancount.core.compare import hash_entry

# from beancount.core.data import Transaction
from beancount.core import data as d


class VectorService:
    def __init__(self, settings, embedding_client, vector_store, rag_client, logger):
        self.settings = settings
        self.embedding_client = embedding_client
        self.vector_store = vector_store
        self.rag_client = rag_client
        self.logger = logger

    def convert_account(self, account: str) -> str:
        """分割账户名，去配置指定范围的段"""
        dist_range = self.settings.beancount.account_distinguation_range
        segments = account.split(":")
        if isinstance(dist_range, int):
            segments = segments[dist_range : dist_range + 1]
        else:
            segments = segments[dist_range[0] : dist_range[1] + 1]
        if not segments:
            return account
        return ":".join(segments)

    def escape_quotes(self, value: str | None):
        """将字符串中的双引号转义," -> \"
        为了防止出现条目中意外含有" 时，导致格式解析出错
        """
        if not value:
            return value
        return value.replace('"', '\\"')

    def convert_to_natural_language(self, transaction) -> str:
        payee = f"{self.escape_quotes(transaction.payee)}"
        description = f"{self.escape_quotes(transaction.description)}"
        accounts = " ".join(
            [self.convert_account(posting.account) for posting in transaction.postings]
        )
        sentence = f"{payee} {description} {accounts}"
        if transaction.tags:
            tags = " ".join(["#" + tag for tag in transaction.tags])
            sentence += f"{tags}"
        return sentence

    def build_transaction_db(self, transactions) -> int:
        content_cache = {}

        def read_lines(filename, start, end):
            if filename not in content_cache:
                with open(filename, "utf-8") as file:
                    content_cache[filename] = file.readlines()
            return content_cache[filename][start - 1 : end]

        # unique_transactions 的 key 为 sentence 的值, 目的是 同一条 sentence 以及存在就直接 occurance + 1
        unique_transactions = {}
        amount = self.settings.embedding.transaction_amount
        for entry in reversed(transactions):
            if not isinstance(entry, d.Transaction):
                continue
            sentence = self.convert_to_natural_language(entry)
            if sentence in unique_transactions:
                # 如果 sentence 已经在 unique_transactions 中存在直接 occurance + 1
                unique_transactions[sentence]["occurance"] += 1
                continue
            filename = entry.meta["filename"]
            start_lineno = entry.meta["lineno"]
            # end_lineno = max(posting.meta["lineno"] for posting in entry.postings)
            end_lineno = max(
                (
                    posting.meta["lineno"]
                    for posting in entry.postings
                    if posting.meta is not None
                ),
                default=start_lineno,
            )

            unique_transactions[sentence] = {
                "sentence": sentence,
                "hash": hash_entry(entry),
                "occurance": 1,
                "content": "".join(read_lines(filename, start_lineno, end_lineno)),
            }
            # 最多不超过配置文件中设置的 amount
            if len(unique_transactions) >= amount:
                break
        total_usage = 0
        # 将values 用 list 进行表示
        unique_transactions_list = list(unique_transactions.values())
        for index in range(0, len(unique_transactions_list), 32):
            # 使用切片进行每批32个进行处理
            sentence_batch = [
                item["sentence"]
                for item in unique_transactions_list[index : index + 32]
            ]
            # 使用embed进行请求
            embeddings, usage = self.embedding_client.embed(sentence_batch)
            for item, embedding in zip(
                unique_transactions_list[index : index + 32], embeddings
            ):
                # 每次循环, embedding 只是其中一个 dict,
                # TODO: 去理解为什么 embedding["embedding"] 可以直接取出embedding 值
                item["embedding"] = embedding["embedding"]
            total_usage += usage

        self.vector_store.build(unique_transactions_list)
        self.logger.info("Total token usage: %d", total_usage)
        return total_usage
