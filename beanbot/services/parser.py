from __future__ import annotations
import shlex

ARGS_ERROR = ValueError("Quote not closed")


def parse_args(line: str) -> list[str]:
    """将中文引号更改为英文的引号"""
    line = line.replace("“", '"').replace("”", '"')
    try:
        return shlex.split(line)
    except ValueError as exc:
        raise ARGS_ERROR from exc
