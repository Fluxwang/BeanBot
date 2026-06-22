from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from beancount.core import data as d

from beanbot.bootstrap import get_context
from beanbot.models import ErrorMessage

entry_bp = Blueprint("entry", __name__)


@entry_bp.route("/entry/build", methods=["POST"])
@jwt_required()
def build():
    """图形模式：接收结构化数据，构造 Beancount 文本"""
    body = request.get_json()
    try:
        amount = Decimal(str(body["amount"]))
    except (KeyError, InvalidOperation):
        return jsonify({"error": "amount 参数无效"}), 400

    from_account = body.get("from_account", "")
    to_account = body.get("to_account", "")
    payee = body.get("payee", "")
    narration = body.get("narration", "")

    if not from_account or not to_account:
        return jsonify({"error": "from_account 和 to_account 不能为空"}), 400

    ctx = get_context()
    entry = ctx.repository.build_transaction_entry(
        payee=payee,
        narration=narration,
        from_account=from_account,
        to_account=to_account,
        amount=-amount,  # 从 from_account 流出，金额为负
    )
    raw = ctx.repository.render_entry(entry)
    return jsonify({"raw": raw})


@entry_bp.route("/entry/parse", methods=["POST"])
@jwt_required()
def parse():
    """自然语言模式：解析文本，返回结构化预览 + raw Beancount 文本"""
    body = request.get_json()
    text = body.get("text", "").strip()
    if not text:
        return jsonify({"error": "text 不能为空"}), 400

    ctx = get_context()
    result = ctx.controller.render_txs(text)

    if isinstance(result, ErrorMessage):
        return jsonify({"error": result.content}), 400

    raw = result[0] if result else ""

    # 反解析 raw 文本，提取结构化字段供前端渲染预览卡片
    entries, errors, _ = ctx.repository.parse_transactions(raw)
    tx = next((e for e in entries if isinstance(e, d.Transaction)), None)

    if tx is None:
        return jsonify({"error": "解析失败，未能生成有效交易"}), 400

    # 按金额正负判断方向：负数为资金流出方（from），正数或 None 为流入方（to）
    from_posting = next((p for p in tx.postings if p.units and p.units.number < 0), None)
    to_posting = next((p for p in tx.postings if p.units is None or (p.units and p.units.number > 0)), None)

    amount = abs(float(from_posting.units.number)) if from_posting and from_posting.units else 0.0

    return jsonify({
        "amount": amount,
        "from_account": from_posting.account if from_posting else "",
        "to_account": to_posting.account if to_posting else "",
        "payee": tx.payee or "",
        "narration": tx.narration or "",
        "raw": raw,
    })


@entry_bp.route("/entry/submit", methods=["POST"])
@jwt_required()
def submit():
    """提交已格式化的 Beancount 文本到账本"""
    body = request.get_json()
    data = body.get("data", "").strip()
    if not data:
        return jsonify({"error": "data 不能为空"}), 400

    ctx = get_context()
    result = ctx.controller.submit_transaction(data)

    if isinstance(result, ErrorMessage):
        return jsonify({"error": result.content}), 500

    return jsonify({"ok": True})
