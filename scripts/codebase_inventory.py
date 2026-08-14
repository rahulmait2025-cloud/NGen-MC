#!/usr/bin/env python3
"""Generate a repeatable codebase inventory report with full file contents.

NextGen monorepo (this workspace):
  python scripts/codebase_inventory.py
  python scripts/codebase_inventory.py --root .\\nextgen-cto-lms-product --output out\\codebase.txt

Run from the directory you want as the scan root (often the NextGen folder), or pass ``--root``.

On PowerShell, use ";" not "&&" to chain commands, e.g.:
  Set-Location "D:\\NextGen"; python scripts/codebase_inventory.py
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, cast

DEFAULT_IGNORE_DIRS = {
    '.agent',
    '.agents',
    '.cursor',
    '.env',
    '.env.development',
    '.env.development.local',
    '.env.local',
    '.env.production',
    '.env.production.local',
    '.env.test',
    '.env.test.local',
    '.gemini',
    '.git',
    '.next',
    '.scripts',
    '.skills',
    '.swc',
    '.turbo',
    '.vercel',
    '__pycache__',
    'build',
    'coverage',
    'dist',
    'node_modules',
    'out',
}

INCLUDE_EXTENSIONS = {
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.json',
    '.jsonc',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.sql',
    '.prisma',
    '.graphql',
    '.gql',
    '.yml',
    '.yaml',
    '.toml',
    '.env',
    '.md',
}

IMPORTANT_FILE_NAMES = {
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'tsconfig.json',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'eslint.config.js',
    'eslint.config.mjs',
    'postcss.config.js',
    'postcss.config.mjs',
    'tailwind.config.js',
    'tailwind.config.ts',
    'dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    'schema.prisma',
}

TOPIC_PATTERNS: dict[str, re.Pattern[str]] = {
    'Authentication': re.compile(r'\b(auth|jwt|oauth|session|token|login)\b', re.IGNORECASE),
    'Database': re.compile(r'\b(prisma|postgres|mysql|sqlite|mongodb|schema|migration|sql)\b', re.IGNORECASE),
    'API': re.compile(r'\b(api|endpoint|router|request|response|graphql|trpc|rest)\b', re.IGNORECASE),
    'UI/Frontend': re.compile(r'\b(component|css|tailwind|ui|layout|page|theme)\b', re.IGNORECASE),
    'Testing': re.compile(r'\b(test|spec|playwright|jest|vitest|cypress)\b', re.IGNORECASE),
    'Config/Build': re.compile(r'\b(config|build|webpack|vite|next\.config|tsconfig|eslint|postcss)\b', re.IGNORECASE),
}


@dataclass(frozen=True)
class FileRecord:
    path: Path
    size_bytes: int
    extension: str
    topics: tuple[str, ...]


def should_include(path: Path) -> bool:
    name_lower = path.name.lower()
    if name_lower in IMPORTANT_FILE_NAMES:
        return True
    if path.suffix.lower() in INCLUDE_EXTENSIONS:
        return True
    if 'schema' in name_lower and path.suffix.lower() in {'.ts', '.js', '.sql', '.prisma', '.json', '.yml', '.yaml'}:
        return True
    return False


def read_text(path: Path, limit: int | None = None) -> str:
    try:
        with path.open('r', encoding='utf-8', errors='ignore') as handle:
            if limit is None:
                return handle.read()
            return handle.read(limit)
    except OSError as exc:
        return f'<UNREADABLE: {exc}>'


def detect_topics(path: Path) -> tuple[str, ...]:
    text = f'{path.name}\n{read_text(path, 24_000)}'
    hits = [topic for topic, pattern in TOPIC_PATTERNS.items() if pattern.search(text)]
    return tuple(hits)


def scan_files(root: Path, ignore_dirs: set[str]) -> tuple[list[FileRecord], int]:
    records: list[FileRecord] = []
    visited_files: int = 0

    for current, dirs, files in os.walk(root):
        filtered: list[str] = [d for d in dirs if d not in ignore_dirs]
        dirs[:] = filtered
        current_path = Path(current)

        for filename in files:
            visited_files = cast(int, visited_files) + 1
            file_path = current_path / filename
            if not should_include(file_path):
                continue

            try:
                stat = file_path.stat()
            except OSError:
                continue

            records.append(
                FileRecord(
                    path=file_path,
                    size_bytes=stat.st_size,
                    extension=file_path.suffix.lower() or '(no-ext)',
                    topics=detect_topics(file_path),
                )
            )

    return records, visited_files


def group_by_top_level_folder(
    root: Path, records: Iterable[FileRecord]
) -> tuple[list[str], dict[str, list[FileRecord]]]:
    """Group file records by top-level folder under root. Returns ordered section names and grouped records."""
    groups: dict[str, list[FileRecord]] = {}
    for record in records:
        try:
            rel = record.path.relative_to(root)
        except ValueError:
            continue
        if len(rel.parts) == 1:
            section = 'Root'
        else:
            section = rel.parts[0]
        groups.setdefault(section, []).append(record)
    for key in groups:
        groups[key].sort(key=lambda r: str(r.path).lower())
    order: list[str] = []
    if 'Root' in groups:
        order.append('Root')
    order.extend(sorted(k for k in groups if k != 'Root'))
    return order, groups


def render_report(root: Path, records: Iterable[FileRecord], visited_files: int, ignore_dirs: set[str]) -> str:
    order, groups = group_by_top_level_folder(root, records)
    now = dt.datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')
    total_included = sum(len(groups[s]) for s in order)

    lines: list[str] = []
    lines.append('Codebase Scan Report')
    lines.append('=' * 80)
    lines.append(f'Generated: {now}')
    lines.append(f'Root: {root}')
    lines.append(f'Ignored folders: {", ".join(sorted(ignore_dirs))}')
    lines.append(f'Visited files (all): {visited_files}')
    lines.append(f'Included files: {total_included}')
    lines.append('')

    for section in order:
        section_records = groups[section]
        lines.append(f'========== FOLDER: {section} ==========')
        lines.append('These are the contents of this folder.')
        lines.append('')
        for record in section_records:
            rel = record.path.relative_to(root)
            path_display = rel.as_posix()
            lines.append(f'--- FILE: {path_display} ---')
            lines.append(read_text(record.path))
            lines.append(f'--- END FILE: {path_display} ---')
            lines.append('')

    return '\n'.join(lines)


def write_report(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(f'{path.suffix}.tmp')
    try:
        temp_path.write_text(content, encoding='utf-8')
        temp_path.replace(path)
    except OSError as e:
        winerr = getattr(e, 'winerror', None)
        if 'Permission denied' in str(e) or winerr == 32:
            raise OSError(
                f'Cannot write report: {path}. The file may be open in another program (e.g. an editor). Close it and try again.'
            ) from e
        raise


def run_once(root: Path, output: Path, ignore_dirs: set[str]) -> None:
    records, visited_files = scan_files(root, ignore_dirs)
    report = render_report(root=root, records=records, visited_files=visited_files, ignore_dirs=ignore_dirs)
    write_report(output, report)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Scan project and generate a text inventory report.')
    parser.add_argument('--root', default='.', help='Project root to scan. Default: current directory')
    parser.add_argument(
        '--output',
        default='codebase.txt',
        help='Output text report file. Default: codebase.txt',
    )
    parser.add_argument(
        '--ignore',
        nargs='*',
        default=[],
        help='Additional directory names to ignore.',
    )
    parser.add_argument('--watch', action='store_true', help='Continuously refresh the report.')
    parser.add_argument(
        '--interval',
        type=int,
        default=30,
        help='Seconds between refreshes in watch mode. Default: 30',
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output).resolve()
    ignore_dirs = set(DEFAULT_IGNORE_DIRS) | set(args.ignore)

    if not root.exists() or not root.is_dir():
        raise SystemExit(f'Invalid --root path: {root}')

    try:
        if args.watch:
            print(f'Watching: {root}')
            print(f'Writing report to: {output}')
            print(f'Ignore dirs: {", ".join(sorted(ignore_dirs))}')
            try:
                while True:
                    run_once(root, output, ignore_dirs)
                    print(f'[{dt.datetime.now().strftime("%H:%M:%S")}] report updated')
                    time.sleep(max(1, args.interval))
            except KeyboardInterrupt:
                print('Stopped watch mode.')
                return 0

        run_once(root, output, ignore_dirs)
        print(f'Report written: {output}')
        return 0
    except OSError as e:
        import sys
        print(f'Error: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
