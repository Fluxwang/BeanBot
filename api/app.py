import os
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from beanbot.bootstrap import bootstrap_app


def create_app():
    app = Flask(__name__)

    app.config["JWT_SECRET_KEY"] = os.environ["JWT_SECRET_KEY"]
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 60 * 60 * 24 * 30  # 30天

    JWTManager(app)
    CORS(app)  # 开发阶段允许跨域，生产环境由  Nginx 处理

    config_path = os.environ["BEANBOT_CONFIG"]

    # bootstrap_app 初始化需要传入 config_path
    bootstrap_app(config_path)

    from api.auth import auth_bp
    from api.routes.accounts import account_bp

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(account_bp, url_prefix="/api")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
