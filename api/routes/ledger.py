from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from beanbot.bootstrap import get_context

ledger_bp = Blueprint("ledger", __name__)


@ledger_bp.route("/ledger/transactions", methods=["GET"])
@jwt_required()
def get_transactions():
    ctx = get_context()
    try:
        rows = ctx.query_service.fetch_transactions()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"rows": rows})


@ledger_bp.route("/ledger/transactions", methods=["DELETE"])
@jwt_required()
def delete_transactions():
    ctx = get_context()
    data = request.get_json()
    ids = data.get("ids", []) if data else []
    if not ids:
        return jsonify({"error": "ids 不能为空"}), 400
    try:
        ctx.repository.delete_transactions(ids)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"success": True})
