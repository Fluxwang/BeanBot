from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from beanbot.bootstrap import get_context
from beanbot.models import ErrorMessage

ledger_bp = Blueprint("ledger", __name__)


@ledger_bp.route("/ledger/transactions", methods=["GET"])
@jwt_required()
def get_transactions():
    ctx = get_context()
    try:
        table = ctx.query_service.fetch_transactions()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Table.headers = ['date', 'payee', 'narration', 'account', 'position']
    # Table.rows = [['2026-06-22', 'KFC', '午饭', 'Expenses:Food', '-35.00 CNY'], ...]
    keys = table.headers
    rows = [dict(zip(keys, row)) for row in table.rows]
    return jsonify({"rows": rows})
