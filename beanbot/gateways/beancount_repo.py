from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import subprocess

from beancount.core.number import MISSING
from beancount.parser.printer import EntryPrinter
from beancount import loader
from beancount.core.amount import Amount
from beancount.core import data as d


NO_TRANSACTION_ERROR = ValueError("No Transaction found")


class BeancountRepository:
    """账本数据访问层"""

    def __init__(self, filename: str | Path, currency: str, logger):
        self.filename = filename
        self.currency = currency
        self.logger = logger
        self._load()

    def _load(self):
        """加载账本文件"""
        self._entries, errors, self._options = loader.load_file(self.filename)
        self._accounts = set()
        self.mtimes = {}
        self.account_files = set()

        for error in errors:
            self.logger.warning("Beancount load error: %s", error)

        # 收集账户列表
        for entry in self._entries:
            if isinstance(entry, d.Open):
                self._accounts.add(entry.account)
                self.account_files.add(entry.meta["filename"])
            elif isinstance(entry, d.Close):
                self._accounts.remove(entry.account)
                self.account_files.remove(entry.meta["filename"])

        for include_file in self._options["include"]:
            # 获取文件最后修改时间
            self.mtimes[include_file] = Path(include_file).stat().st_mtime

        self._printer = EntryPrinter(dcontext=self._options.get("dcontext"))

    def _auto_reload(self, accounts_only: bool = False):
        """自动更新, 当设置accounts_only 将只检查account条目更新"""
        files_to_check = self.mtimes.keys()
        if accounts_only:
            files_to_check = self.account_files

        for filename in files_to_check:
            if self.mtimes[filename] != Path(filename).stat().st_mtime:
                self._load()
                return

    def render_entry(self, entry) -> str:
        """将交易对象格式化为文本"""
        if not hasattr(self, "_printer"):
            # dcontext 是显示上下文，控制小数位数等格式
            self._printer = EntryPrinter(dcontext=self._options.get("dcontext"))
        return self._printer(entry)

    def find_account(
        self, account_fragment: str, range_: list[int] | None = None
    ) -> str | None:
        """根据账户片段查找完整账户名。
        Args:
            account_fragment: 要匹配的账户片段
            range_: 允许拿账户的第几层到第几层来做匹配, [2,3]类似与切片 Assets:Bank:Checking 就只取 Checking

        Returns:
            匹配到的完整账户名；如果没有找到则返回 None

        Assets:Bank:Checking
        """
        if range_ is None:
            range_ = [2, 3]

        candidates = []
        for account in self.accounts:
            parts = account.split(":")
            if len(parts) < range_[0]:
                continue

            for i in range(range_[0], min(range_[1] + 1, len(parts) + 1)):
                partial = ":".join(parts[:i])
                if partial.endswith(account_fragment):
                    # 添tuple 对象
                    candidates.append((i, account))
                    break
        if not candidates:
            return None

        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]

    def find_account_by_payee(self, payee: str) -> str | None:
        """根据历史交易的收款方查找目标账户"""
        for entry in reversed(self.entries):
            if isinstance(entry, d.Transaction) and entry.payee == payee:
                for posting in entry.postings:
                    if posting.account.startswith(
                        "Expenses:"
                    ) or posting.account.startswith("Assets"):
                        return posting.account
                    elif posting.units is MISSING:
                        return posting.account
        return None

    def build_transaction_entry(
        self,
        date: datetime | None,
        payee: str,
        narration: str,
        from_account: str,
        to_account: str,
        amount: Decimal,
        tags: set[str] | None = None,
    ) -> d.Transaction:
        # 创建一个新的元数据容器, <generated>对应filename参数，告诉系统这条数据是被生成的，并不存在于实际的物理账本目录中
        meta = d.new_metadata("<generated>", 0)
        postings = [
            d.Posting(
                account=from_account,
                units=Amount(amount, self.currency),
                cost=None,
                price=None,
                flag=None,
                meta=None,
            ),
            d.Posting(
                account=to_account,
                units=Amount(-amount, self.currency),
                # units=MISSING,
                cost=None,
                price=None,
                flag=None,
                meta=None,
            ),
        ]
        return d.Transaction(
            meta=meta,
            date=date.date() if date else datetime.now().date(),
            flag="*",
            payee=payee,
            narration=narration,
            tags=frozenset(tags) if tags else frozenset(),
            links=frozenset(),
            postings=postings,
        )

    def append_transaction(self, data: str):
        """追加交易到账本文件。

        Args:
            data: 要追加到账本中的交易文本

        Raises:
          subprocess.CalledProcessError: bean-format
          格式化失败时抛出
        """
        path = Path(self.filename)
        prefix = "" if path.stat().st_size == 0 else "\n"

        # 追加新的交易内容
        with open(self.filename, "a", encoding="utf-8") as f:
            f.write(prefix + data.strip("\n") + "\n")

        # 格式化文件
        subprocess.run(
            ["bean-format", "-o", self.filename, self.filename],
            check=True,
        )
        # 重新加载
        self._load()

    @property
    def entries(self):
        self._auto_reload()
        return self._entries

    @property
    def options(self):
        self._auto_reload()
        return self._options

    @property
    def accounts(self):
        self._auto_reload(accounts_only=True)
        return self._accounts
