from decimal import Decimal, InvalidOperation
from datetime import datetime
import re

from beancount import Transaction
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from beancount.core import data as d

from beanbot.bootstrap import get_context
from beanbot.models import ErrorMessage

entry_bp = Blueprint("entry", __name__)


@entry_bp.route("/entry/build", methods=["POST"])
@jwt_required()
def build():
    """图形模式： 接收结构化数据"""
    body = request.get_json()
    try:
        amount = Decimal(str(body["amount"]))
    except (KeyError, InvalidOperation):
        return jsonify({"error": "amount 参数无效"}), 400

    from_account = body.get("from_account", "")
    to_account = body.get("to_account", "")
    payee = body.get("payee", "")
    narration = body.get("narration", "")
    tags = body.get("tags", "")

    date = body.get("date", datetime.now().strftime("%Y-%m-%d"))

    # 因为为图形模式，不会使用 find_account function
    if not from_account or not to_account:
        return jsonify({"error": "from_account 和 to_account 不能为空"}), 400

    ctx = get_context()
    entry = ctx.repository.build_transaction_entry(
        payee=payee,
        narration=narration,
        from_account=from_account,
        to_account=to_account,
        amount=amount,
        date=datetime.strptime(date, "%Y-%m-%d"),
        tags=tags,
    )
    raw = ctx.repository.render_entry(entry)
    return jsonify({"raw": raw})


@entry_bp.route("/entry/parse", methods=["POST"])
@jwt_required()
def parse():
    """自然语言模式： 解析文本，返回结构化预览 + raw Beancount 文本"""
    body = request.get_json()
    # text = body.get("text", "").strip()
    text = body.get("text", "")
    if not text:
        return jsonify({"error": "text 不能为空"}), 400

    ctx = get_context()
    result = ctx.controller.render_txs(text)

    if isinstance(result, ErrorMessage):
        return jsonify({"error": result.content}), 400

    raw = result[0] if result else ""

    entries, errors, _ = ctx.repository.parse_transactions(raw)
    tx = next((e for e in entries if isinstance(e, d.Transaction)), None)

    if tx is None:
        return jsonify({}), 400

    # 使用next 可以每次只取一个数据
    from_posting = next(
        (p for p in tx.postings if p.units and p.units.number < 0), None
    )
    to_posting = next((for p in tx.postings if p ))


