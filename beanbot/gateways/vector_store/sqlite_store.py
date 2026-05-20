from __future__ import annotations

from operator import itemgetter
from pathlib import Path
import sqlite3
import struct

import sqlite_vec

from beanbot.gateways.vector_store.base import calculate_score


def serialize_f32(vector: list[float]) -> bytes:
    # *列表 = 把列表展开成独立参数
    # return struct.pack("%sf" % len(vector), *vector)
    return struct.pack(f"{len(vector)}f", *vector)


class SqliteVectorStore:
    def __init__(self, settings) -> None:
        self.settings = settings
        self._db = None

    @property
    def db_path(self) -> Path:
        db_dir = self.settings.embedding.get("db_store_folder", ".")
        return Path(db_dir) / "tx_db.sqlite"

    def get_db(self):
        if self._db is not None:
            return self._db

        self._db = sqlite3.connect(self.db_path)
        self._db.enable_load_extension(True)
        sqlite_vec.load(self._db)
        self._db.enable_load_extension(False)
        return self._db
