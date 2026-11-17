"""Command line entry point."""

from __future__ import annotations

import argparse
import logging
import sys

from jobs_radar.config import Settings


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        stream=sys.stdout,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="jobs-radar", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("version", help="Print the package version")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    settings = Settings.from_env()
    configure_logging(settings.log_level)
    if args.command == "version":
        from jobs_radar import __version__

        print(__version__)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
