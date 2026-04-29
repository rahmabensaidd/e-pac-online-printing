from __future__ import annotations

import json
import signal
import sys
import time
from pathlib import Path

import pricing__epac.src.machine_learning.orchestration.watcher as watcher_module

from pricing__epac.src.machine_learning.orchestration.watcher import (
    DependencyChecker,
    IGNORED_FILES,
    METRICS_FILE,
    PROCESSED_FOLDER,
    RESULTS_DIR,
    SQL_FOLDER,
    SQLFileHandler,
    WatcherConfig,
    logger,
)

POLL_INTERVAL_SECONDS = 5


def ensure_directories() -> None:
    """Create the directories the watcher expects before startup."""
    SQL_FOLDER.mkdir(parents=True, exist_ok=True)
    PROCESSED_FOLDER.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    METRICS_FILE.parent.mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR.parent / "logs").mkdir(parents=True, exist_ok=True)


def cleanup_generated_sql_files() -> None:
    for file_name in IGNORED_FILES:
        generated_file = SQL_FOLDER / file_name
        if generated_file.exists():
            generated_file.unlink()
            logger.info("Removed stale generated SQL file: %s", generated_file)


def cleanup_stale_tracking_entries() -> None:
    tracking_file = watcher_module.settings.WATCHER_TRACKING_FILE
    if not tracking_file.exists():
        return

    try:
        tracking = json.loads(tracking_file.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Could not read tracking file %s: %s", tracking_file, exc)
        return

    known_files = {path.name for path in SQL_FOLDER.glob("*.sql") if path.is_file()}
    previous_files = tracking.get("last_sql_files", [])
    filtered_files = [file_name for file_name in previous_files if file_name in known_files]

    if filtered_files == previous_files:
        return

    tracking["last_sql_files"] = filtered_files
    tracking_file.write_text(json.dumps(tracking, indent=2), encoding="utf-8")
    logger.info("Removed stale SQL entries from tracking file: %s", tracking_file)


def list_sql_files() -> list[Path]:
    return sorted(
        path for path in SQL_FOLDER.glob("*.sql") if path.is_file()
    )


def main() -> int:
    # In the Docker image, the package import root is /app, not /app/pricing__epac.
    watcher_module.PRICING_EPAC_ROOT = watcher_module.PROJECT_ROOT
    ensure_directories()
    cleanup_generated_sql_files()
    cleanup_stale_tracking_entries()

    if not DependencyChecker.check_all():
        logger.error("Critical dependency check failed. Exiting.")
        return 1

    config = WatcherConfig()
    handler = SQLFileHandler("all", config)
    stopping = False

    def stop_handler(sig, frame) -> None:  # noqa: ARG001
        nonlocal stopping
        logger.info("Received signal %s", sig)
        stopping = True

    signal.signal(signal.SIGINT, stop_handler)
    signal.signal(signal.SIGTERM, stop_handler)

    logger.info("=" * 70)
    logger.info("PRICING WATCHER - POLLING MODE")
    logger.info("Monitored folder: %s", SQL_FOLDER)
    logger.info("Processed folder: %s", PROCESSED_FOLDER)
    logger.info("Results folder: %s", RESULTS_DIR)
    logger.info("Metrics file: %s", METRICS_FILE)
    logger.info("Poll interval: %s seconds", POLL_INTERVAL_SECONDS)
    logger.info("=" * 70)

    try:
        while not stopping:
            for sql_file in list_sql_files():
                handler._handle_new_sql_file(str(sql_file))
            time.sleep(POLL_INTERVAL_SECONDS)
    finally:
        handler.stop()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
