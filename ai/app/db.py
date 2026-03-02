"""数据库连接模块 — 提供 pgvector 语义搜索能力。"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from typing import Generator

import psycopg

logger = logging.getLogger(__name__)

_pool: psycopg.Connection | None = None


def _get_dsn() -> str:
    """从环境变量读取数据库连接字符串。"""
    dsn = os.getenv("DATABASE_URL", "")
    if not dsn:
        raise RuntimeError("DATABASE_URL 环境变量未设置，无法连接数据库")
    return dsn


@contextmanager
def get_connection() -> Generator[psycopg.Connection, None, None]:
    """获取数据库连接（短生命周期，用完即关）。"""
    conn = psycopg.connect(_get_dsn())
    try:
        yield conn
    finally:
        conn.close()


def pgvector_search(query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """
    使用 pgvector 执行最近邻搜索。
    在 knowledge_points 和 notes 表中搜索，返回最相似的记录。
    距离使用 L2 距离（<->），转换为相似度分数。
    """
    # 将 embedding 转为 pgvector 格式字符串
    vec_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    sql = """
        SELECT id, title, content, distance, source FROM (
            SELECT id, title, content, embedding <-> %s::vector AS distance, 'knowledge_point' AS source
            FROM knowledge_points
            WHERE embedding IS NOT NULL

            UNION ALL

            SELECT id, title, content, embedding <-> %s::vector AS distance, 'note' AS source
            FROM notes
            WHERE embedding IS NOT NULL
        ) t
        ORDER BY distance
        LIMIT %s
    """

    results: list[dict] = []
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (vec_str, vec_str, top_k))
                for row in cur.fetchall():
                    # 距离转换为相似度分数：score = 1 / (1 + distance)
                    distance = float(row[3])
                    score = 1.0 / (1.0 + distance)
                    results.append(
                        {
                            "id": row[0],
                            "title": row[1],
                            "content": row[2] or "",
                            "score": round(score, 4),
                            "source": row[4],
                        }
                    )
    except Exception as exc:
        logger.warning("pgvector 搜索失败，回退到空结果: %s", exc)

    return results
