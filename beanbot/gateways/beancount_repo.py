from __future__ import annotations

from pathlib import Path
import re

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
