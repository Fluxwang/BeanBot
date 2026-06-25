from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from beanbot.bootstrap import get_context

account_bp = Blueprint("accounts", __name__)


def _label(account_name: str) -> str:
    # 获取account_name
    label = account_name.split(":")[-1]
    if label == "CN":
        label = account_name.split(":")[-2]
    return label


@account_bp.route("/accounts", methods=["GET"])
@jwt_required()
def get_accounts():
    ctx = get_context()
    all_accounts = sorted(ctx.repository.accounts)

    result = {"assets": [], "expenses": [], "income": [], "liabilities": []}
    prefix_map = {
        "Assets:": "assets",
        "Expenses:": "expenses",
        "Income:": "income",
        "Liabilities:": "liabilities",
    }

    for name in all_accounts:
        for prefix, key in prefix_map.items():
            if name.startswith(prefix):
                result[key].append({"name": name, "label": _label(name)})
                break

    return jsonify(result)
