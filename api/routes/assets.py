from collections import defaultdict

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from beancount.core import data as d

from beanbot.bootstrap import get_context

assets_bp = Blueprint("assets", __name__)


def _amount_to_float(units, currency: str) -> float:
    if units is None:
        return 0.0
    if hasattr(units, 'currency') and units.currency != currency:
        return 0.0  # 只统计主货币，忽略外币持仓
    return float(units.number)


@assets_bp.route("/assets", methods=["GET"])
@jwt_required()
def get_assets():
    ctx = get_context()
    currency = str(ctx.settings.beancount.currency)

    balances = defaultdict(float)
    for entry in ctx.repository.entries:
        if not isinstance(entry, d.Transaction):
            continue
        for posting in entry.postings:
            acct = posting.account
            if acct.startswith("Assets:") or acct.startswith("Liabilities:"):
                balances[acct] += _amount_to_float(posting.units, currency)

    assets = [
        {"name": k, "label": k.split(":")[-1], "value": round(v, 2)}
        for k, v in sorted(balances.items()) if k.startswith("Assets:") and round(v, 2) != 0
    ]
    liabilities = [
        {"name": k, "label": k.split(":")[-1], "value": round(v, 2)}
        for k, v in sorted(balances.items()) if k.startswith("Liabilities:") and round(v, 2) != 0
    ]

    assets_total = round(sum(a["value"] for a in assets), 2)
    liab_total   = round(sum(l["value"] for l in liabilities), 2)

    return jsonify({
        "net": round(assets_total + liab_total, 2),
        "assets_total": assets_total,
        "liabilities_total": liab_total,
        "assets": assets,
        "liabilities": liabilities,
    })
