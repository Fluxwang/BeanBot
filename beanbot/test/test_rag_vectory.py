from beanbot.bootstrap import bootstrap_app

ctx = bootstrap_app("config.yaml")

result = ctx.ledger_service.generate_transactions(
    '23.4 BofA:Checking "Kin Soy" Eating #tag1 #tag2'
)
print(result[0])
