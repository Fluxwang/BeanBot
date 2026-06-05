from beanbot.bootstrap import bootstrap_app


ctx = bootstrap_app("config.yaml")

controller = ctx.controller.build_db()
print(controller.content)
print(len(ctx.repository.entries))
