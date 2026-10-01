import os
from contextlib import contextmanager

import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

_pool = pool.SimpleConnectionPool(1, 10, dsn=os.environ["DATABASE_URL"])


@contextmanager
def get_conn():
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def get_species() -> list[str]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT common_name FROM trees ORDER BY common_name"
            )
            return [row[0] for row in cur.fetchall()]


def find_nearest(species: str, lat: float, lng: float) -> dict | None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ST_Y(location) AS lat,
                    ST_X(location) AS lon,
                    common_name,
                    borough
                FROM trees
                WHERE lower(common_name) = lower(%s)
                ORDER BY ST_Distance(
                    location::geography,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
                )
                LIMIT 1
                """,
                (species, lng, lat),
            )
            row = cur.fetchone()
            if row is None:
                return None
            return {
                "lat": row[0],
                "lon": row[1],
                "common_name": row[2],
                "borough": row[3],
            }
