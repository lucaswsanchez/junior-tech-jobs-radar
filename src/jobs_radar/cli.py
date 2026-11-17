"""Command line entry point: ``jobs-radar run | export | init-db | version``."""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from jobs_radar import __version__
from jobs_radar.config import DEFAULT_SQLITE_URL, Settings

DEFAULT_EXPORT_DIR = Path("web/public/data")
logger = logging.getLogger("jobs_radar")


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        stream=sys.stdout,
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="jobs-radar", description="Junior tech jobs ETL pipeline for Argentina/LATAM."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="Extract, transform, load and export JSON")
    run.add_argument("--export-dir", type=Path, default=DEFAULT_EXPORT_DIR)
    run.add_argument("--no-export", action="store_true", help="Skip the JSON export")

    export = sub.add_parser("export", help="Export JSON snapshots from the database")
    export.add_argument("--export-dir", type=Path, default=DEFAULT_EXPORT_DIR)

    sub.add_parser("init-db", help="Create the database tables")
    sub.add_parser("version", help="Print the package version")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    settings = Settings.from_env()
    configure_logging(settings.log_level)

    if args.command == "version":
        print(__version__)
        return 0

    from jobs_radar.load.schema import create_schema, make_engine

    if settings.database_url == DEFAULT_SQLITE_URL:
        logger.warning("DATABASE_URL is not set: using local SQLite at %s", DEFAULT_SQLITE_URL)
    engine = make_engine(settings.database_url)

    if args.command == "init-db":
        create_schema(engine)
        logger.info("Schema ready")
        return 0

    if args.command == "export":
        from jobs_radar.export import export_json

        create_schema(engine)
        export_json(engine, args.export_dir)
        return 0

    from jobs_radar.pipeline import run_pipeline

    report = run_pipeline(
        settings, export_dir=None if args.no_export else args.export_dir, engine=engine
    )
    return 1 if report.status == "failed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
