from __future__ import annotations

import time
from datetime import datetime, timedelta

import telegram
from fava.util.date import parse_date
from telegram import Update

from telegram.ext import (
    Application,
    ApplicationBuilder,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from beanbot.bootstrap import get_context
from beanbot.bots import controller
from beanbot.i18n import gettext as _
from beanbot.models import ErrorMessage

_start_time = time.monotonic()


def owner_required(func):
    async def wrapped(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if update.effective_chat is None:
            return
        chat_id = update.effective_chat.id
        owner_id = get_context().settings.bot.telegram.chat_id
        if chat_id != owner_id:
            return
        await func(update, context)

    return wrapped


async def start(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    now = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S")
    uptime = timedelta(seconds=time.monotonic() - _start_time)
    if update.message is None:
        return
    await update.message.reply_text(text=f"Now: {now}\n uptime: {uptime}")


def render_tg_table(headers, rows):
    # 将 Table 数据渲染成等宽文本，自动对齐列宽
    margin = 2
    # map(function, iterables)
    max_widths = list(map(len, headers))
    for row in rows:
        # enumerate() 会在遍历元素的同时，自动加上索引
        for index, cell in enumerate(row):
            max_widths[index] = max(len(str(cell)), max_widths[index])

    table = []
    raw_row = []
    for index, header in enumerate(headers):
        raw_row.append(f"{header}{' ' * (max_widths[index] - len(header) + margin)}")
    table.append(raw_row)
    table.append("-" * (sum(max_widths) + margin * (len(max_widths) - 1)))

    for row in rows:
        raw_row = []
        for index, cell in enumerate(row):
            raw_row.append(
                f"{cell}{' ' * (max_widths[index] - len(str(cell)) + margin)} "
            )
        table.append(raw_row)

    return "\n".join("".join(row) for row in table)


def escape_md2(text):
    # 转义 MarkdownV2 中的特殊字符
    return text.replace("-", "\\-").replace("*", "\\*")


@owner_required
async def bill(update: Update, context: ContextTypes.DEFAULT_TYPE):
    result = controller.get_controller().fetch_bill()
    if update.message is None:
        return
    if isinstance(result, ErrorMessage):
        await update.message.reply_text(text=result.content)
        return
    text = f"```\n{render_tg_table(result.headers, result.rows)}"
    await update.message.reply_text(text=text, parse_mode="MarkdownV2")


@owner_required
async def expense(update: Update, context: ContextTypes.DEFAULT_TYPE):
    result = controller.get_controller().fetch_expense()
    if update.message is None:
        return
    if isinstance(result, ErrorMessage):
        await update.message.reply_text(text=result.content)
        return
    text = f"```\n{render_tg_table(result.headers, result.rows)}"
    await update.message.reply_text(text=text, parse_mode="MarkdownV2")


def run_bot(settings, logger):
    app = ApplicationBuilder().token(settings.bot.telegram.token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("bill", bill))
    app.add_handler(CommandHandler("expense", expense))
    logger.info("Starting telegram Bot")
    app.run_polling()
