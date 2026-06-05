from beanbot.settings import load_settings
from beanbot.gateways.beancount_repo import BeancountRepository
from beanbot.gateways.embedding_client import EmbeddingClient
from beanbot.gateways.vector_store import create_vector_store
from beanbot.services.vector_service import VectorService
import logging

settings = load_settings("config.yaml")
logger = logging.getLogger(__name__)

repository = BeancountRepository(
    filename=str(settings.beancount.filename),
    currency=str(settings.beancount.currency),
    logger=logger,
)

embedding_client = EmbeddingClient(settings)
vector_store = create_vector_store(settings)

service = VectorService(settings, embedding_client, vector_store, None, logger)
service.build_transaction_db(repository.entries)

matches = service.query_transactions("CMB 肯德基 午餐")
print(matches)
print("\n")

# args = ["50", "招商银行", "肯德基", "午餐"]
# new_args_list = service.modify_args_via_vector(args)
# print(new_args_list)
