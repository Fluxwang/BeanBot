from __future__ import annotations

import logging

from beanbot.gateways.beancount_repo import BeancountRepository
from beanbot.bots.controller import BotController, configure as configure_controller
from beanbot.services.ledger_service import LedgerService
from beanbot.services.query_service import QueryService
from beanbot.settings import Settings


def build_settings(**kwargs):
    config = {
        "beancount": {"filename": "testdata/example.bean", "currency": "CNY"},
        "embedding": {"enable": False},
        "rag": {"enable": False},
        **kwargs,
    }
    return Settings.from_dict(config)


class DummyLogger:
    def info(self, *args, **kwargs):
        pass

    def warning(self, *args, **kwargs):
        pass

    def error(self, *args, **kwargs):
        pass

    def debug(self, *args, **kwargs):
        pass


def build_controller(settings=None):
    if settings is None:
        settings = build_settings()
    logger = DummyLogger()
    repo = BeancountRepository(
        filename=settings.beancount.filename,
        currency=settings.beancount.currency,
        logger=logger,
    )
    ledger_service = LedgerService(
        settings=settings, repository=repo, vector_service=None
    )
    query_service = QueryService(repository=repo)
    c = BotController(
        settings=settings,
        repository=repo,
        ledger_service=ledger_service,
        query_service=query_service,
        vector_service=None,
    )
    configure_controller(c)
    return c


def assert_txs_equal(tx1: str, tx2: str):
    lines1 = [l.strip() for l in tx1.strip().splitlines() if l.strip()]
    lines2 = [l.strip() for l in tx2.strip().splitlines() if l.strip()]
    assert lines1 == lines2, f"\nExpected:\n{tx2}\nGot:\n{tx1}"
