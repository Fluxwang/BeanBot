from datetime import date, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from beanbot.bootstrap import get_context

stats_bp = Blueprint("stats", __name__)


def _date_range(range_param: str):
    today = date.today()

    if range_param == "week":
        start = today - timedelta(days=today.weekday())  # 本周周一
        days = today.weekday() + 1
        return start, today, "日均", max(days, 1)

    if range_param == "month":
        start = today.replace(day=1)
        return start, today, "日均", max(today.day, 1)

    if range_param == "year":
        start = today.replace(month=1, day=1)
        return start, today, "月均", max(today.month, 1)

    # all
    return None, None, "日均", 30


@stats_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    range_param = request.args.get("range", "month")
    if range_param not in ("week", "month", "year", "all"):
        return jsonify({"error": "range 参数无效"}), 400

    ctx = get_context()
    try:
        start, end, avg_label, avg_divisor = _date_range(range_param)
        data = ctx.query_service.fetch_stats(start, end)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    expense = round(data["expense_total"], 2)
    income = round(data["income_total"], 2)

    return jsonify({
        "summary": {
            "expense": expense,
            "income": income,
            "balance": round(income - expense, 2),
            "avg": round(expense / avg_divisor, 2),
            "avg_label": avg_label,
        },
        "expense_cats": data["expense_cats"],
        "income_cats": data["income_cats"],
    })
