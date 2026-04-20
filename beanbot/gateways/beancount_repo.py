from __future__ import annotations
import re
import subprocess
from datetime import datetime
from decimal import Decimal

from beancount.core.number import MISSING
from beancount.parser.printer import EntryPrinter
from pathlib import Path

from beancount import loader
from beancount.core import data as d


class BeancountRepository:
    def __init__(self, filename: str | Path, currency: str, logger):
        self.filename = filename
        self.currency = currency
        self.logger = logger
        self._load()

    def _load(self):
        self._entries, errors, self._options = loader.load_file(self.filename)
        self._accounts = set()
        self.mtimes = {}
        self.account_files = set()

        for error in errors:
            self.logger.warning("Beancount load error: %s", error)

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

    def render_entry(self, entry) -> str:
        if not hasattr(self, "_printer"):
            # dcontext 是显示上下文，控制小数位数等格式
            self._printer = EntryPrinter(dcontext=self._options.get("dcontext"))
        return self._printer(entry)

    """根据账户片段查找完整账户名。
    Args:
        account_fragment: 要匹配的账户片段
        range_: 允许拿账户的第几层到第几层来做匹配, [2,3]类似与切片 Assets:Bank:Checking 就只取 Checking
    
    Returns:
        匹配到的完整账户名；如果没有找到则返回 None

    Assets:Bank:Checking
    """

    def find_account(
        self, account_fragment: str, range_: list[int] | None = None
    ) -> str | None:
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
        for entry in reversed(self.entries):
            if isinstance(entry, d.Transaction) and entry.payee == payee:
                for posting in entry.postings:
                    if posting.account.startswith(
                        "Expenses:"
                    ) or posting.account.startswith("Assets"):
                        return posting.account
        return None

    def _auto_reload(self, accounts_only: bool = False):
        files_to_check = self.mtimes.keys()
        # 是否只加载账户相关文件
        if accounts_only:
            files_to_check = self.account_files

        for filename in files_to_check:
            if self.mtimes[filename] != Path(filename).stat().st_mtime:
                self._load()
                return

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
