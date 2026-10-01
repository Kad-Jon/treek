"""
Run once to create the trees table and load the CSV.

    python seed.py

Requires DATABASE_URL in .env or the environment.
"""

import csv
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

CSV_PATH = Path(__file__).parent / "data" / "Borough_tree_list_2025Nov.csv"
BATCH = 10_000

DDL = """
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS trees (
    id          SERIAL PRIMARY KEY,
    uniqueid    INTEGER,
    borough     TEXT,
    common_name TEXT,
    taxon_species TEXT,
    location    GEOMETRY(POINT, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS trees_location_gix
    ON trees USING GIST(location);

CREATE INDEX IF NOT EXISTS trees_common_name_idx
    ON trees(lower(common_name));
"""


def seed():
    conn = psycopg2.connect(dsn=os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            cur.execute(DDL)
            conn.commit()

            cur.execute("SELECT COUNT(*) FROM trees")
            if cur.fetchone()[0] > 0:
                print("Table already has data — skipping load.")
                return

        print(f"Loading {CSV_PATH} …")
        batch = []
        total = 0

        with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    lat = float(row["lat"])
                    lon = float(row["lon"])
                except ValueError:
                    continue

                batch.append((
                    row["uniqueid"] or None,
                    row["borough"],
                    row["common_name"],
                    row["taxon_species"],
                    lon,
                    lat,
                ))

                if len(batch) >= BATCH:
                    _flush(conn, batch)
                    total += len(batch)
                    batch = []
                    print(f"  {total:,} rows inserted…", end="\r")

        if batch:
            _flush(conn, batch)
            total += len(batch)

        conn.commit()
        print(f"\nDone — {total:,} rows loaded.")
    finally:
        conn.close()


def _flush(conn, batch):
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO trees (uniqueid, borough, common_name, taxon_species, location)
            VALUES %s
            """,
            batch,
            template="(%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))",
        )
    conn.commit()


if __name__ == "__main__":
    seed()
