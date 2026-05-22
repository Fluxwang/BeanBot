"""最小测试：观察 sqlite 向量查询返回的 rows 结构"""

import sqlite3
import struct
import sqlite_vec


# 将Python的字符串转化为二进制
def serialize_f32(vector: list[float]) -> bytes:
    return struct.pack(f"{len(vector)}f", *vector)


# 数据库只存在于内存，不写磁盘
db = sqlite3.connect(":memory:")
db.enable_load_extension(True)
# 将向量搜索注入到这个连接
sqlite_vec.load(db)
db.enable_load_extension(False)

db.execute("CREATE VIRTUAL TABLE vec_items USING vec0(embedding float[3])")
db.execute(
    "INSERT INTO vec_items (rowid, embedding) VALUES (1, ?)",
    (serialize_f32([1.0, 0.0, 0.0]),),
)
db.execute(
    "INSERT INTO vec_items (rowid, embedding) VALUES (2, ?)",
    (serialize_f32([0.9, 0.1, 0.0]),),
)
db.execute(
    "INSERT INTO vec_items (rowid, embedding) VALUES (3, ?)",
    (serialize_f32([0.0, 1.0, 0.0]),),
)
db.commit()

query_vec = [1.0, 0.0, 0.0]
rows = db.execute(
    """
    SELECT
    rowid,
    1 - vec_distance_cosine(embedding, ?) AS similarity
    FROM vec_items
    ORDER BY similarity DESC LIMIT 3
    """,
    (serialize_f32(query_vec),),
).fetchall()

print("rows 原始结构:", rows)
print()
for row in rows:
    print(f"  row={row}  →  row[0]={row[0]}  row[1]={row[1]:.4f}")
