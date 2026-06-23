from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from beanbot.bootstrap import get_context

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    body = request.get_json()
    username = body.get("username", "")
    password = body.get("password", "")

    ctx = get_context()
    expected_username = str(ctx.settings.web.username)
    expected_password = str(ctx.settings.web.password)

    if username != expected_username or password != expected_password:
        return jsonify({"error": "用户名或密码错误"}), 401

    token = create_access_token(identity=username)
    return jsonify({"token": token})
