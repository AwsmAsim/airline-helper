#!/usr/bin/env python3
"""
Knowledge Base Crawler for RAG ingestion.
Uses Playwright to handle JavaScript-rendered pages (e.g. Zoho Desk).

Usage:
    python crawl_kb.py --url "https://support.fly91.in/portal/en/kb/fly91" --airline fly91
    python crawl_kb.py --url "https://support.someairline.com/kb" --airline indigo

Install deps:
    pip install playwright
    playwright install chromium
"""

import argparse
import json
import time
import re
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout


NOISE_SELECTORS = [
    "nav", "header", "footer", "script", "style",
    "[class*='breadcrumb']", "[class*='sidebar']",
    "[class*='subscribe']", "[class*='follow']",
    "[class*='helpful']", "[class*='footer']",
]

CONTENT_SELECTORS = [
    # Zoho Desk (used by Fly91 and many other airlines)
    "[class*='KbDetailLtContainer__articleContent']",
    "[class*='KbDetailLtContainer__articelDetail']",
    "[class*='description']",
    # Generic patterns
    "article",
    "[class*='article-body']",
    "[class*='kb-article']",
    "[class*='article-content']",
    "[class*='kb-content']",
    "main",
    "[role='main']",
]


def get_links(page, allowed_prefix: str) -> list[str]:
    """Return all unique internal links that stay within the allowed prefix."""
    hrefs = page.eval_on_selector_all("a[href]", "els => els.map(e => e.href)")
    seen = set()
    result = []
    for href in hrefs:
        clean = href.split("#")[0].split("?")[0].rstrip("/")
        if clean.startswith(allowed_prefix) and clean not in seen:
            seen.add(clean)
            result.append(clean)
    return sorted(result)


def extract_content(page, url: str) -> dict:
    """Extract structured content from the current page."""
    # Title
    title = ""
    try:
        title = page.inner_text("h1", timeout=3000).strip()
    except PWTimeout:
        pass
    if not title:
        title = page.title().strip()

    # Try content selectors in order
    content = ""
    matched_selector = "body"
    for selector in CONTENT_SELECTORS:
        try:
            content = page.inner_text(selector, timeout=2000).strip()
            if len(content) > 150:
                matched_selector = selector
                break
        except (PWTimeout, Exception):
            continue

    if len(content) < 150:
        try:
            content = page.inner_text("body", timeout=5000).strip()
        except PWTimeout:
            content = ""

    # Clean up excessive whitespace
    content = re.sub(r"\n{3,}", "\n\n", content)

    # Split into sections by heading
    sections = []
    lines = content.split("\n")
    current_heading = ""
    current_lines = []

    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Heuristic: short lines (< 80 chars) that look like headings
        if len(line) < 80 and line.endswith("?") or (len(line) < 60 and line == line.title() and len(line.split()) <= 8):
            if current_lines:
                sections.append({"heading": current_heading, "text": " ".join(current_lines)})
            current_heading = line
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append({"heading": current_heading, "text": " ".join(current_lines)})

    return {
        "url": url,
        "title": title,
        "full_text": content,
        "sections": sections,
        "content_selector": matched_selector,
    }


def crawl(base_url: str, airline: str, output_dir: Path, delay: float = 1.5, max_pages: int = 0):
    allowed_prefix = base_url.rstrip("/")
    visited: set[str] = set()
    queue: list[str] = [base_url]
    articles: list[dict] = []

    print(f"\nStarting crawl: {base_url}")
    print(f"Airline       : {airline}")
    if max_pages:
        print(f"Max pages     : {max_pages} (test mode)")
    print()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        while queue:
            if max_pages and len(visited) >= max_pages:
                print(f"\n[test mode] Reached {max_pages} pages, stopping.")
                break

            url = queue.pop(0).rstrip("/")
            if url in visited:
                continue
            visited.add(url)

            print(f"[{len(visited)}] Fetching: {url}")
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
                time.sleep(0.5)
            except PWTimeout:
                print(f"  [timeout] skipping {url}")
                continue
            except Exception as e:
                print(f"  [error] {e}")
                continue

            # Discover new links
            new_links = get_links(page, allowed_prefix)
            added = 0
            for link in new_links:
                if link not in visited and link not in queue:
                    queue.append(link)
                    added += 1
            if added:
                print(f"  +{added} new links queued (queue size: {len(queue)})")

            # Extract content
            data = extract_content(page, url)
            data["airline"] = airline

            if len(data["full_text"]) > 200:
                articles.append(data)
                print(f"  [ok] '{data['title']}' — {len(data['full_text'])} chars, {len(data['sections'])} sections")
            else:
                print(f"  [skip] thin content ({len(data['full_text'])} chars)")

            time.sleep(delay)

        browser.close()

    # Save outputs
    output_dir.mkdir(parents=True, exist_ok=True)

    all_path = output_dir / f"{airline}_kb.json"
    with open(all_path, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(articles)} articles -> {all_path}")

    # RAG chunks (newline-delimited JSON)
    chunks_path = output_dir / f"{airline}_chunks.jsonl"
    chunk_count = 0
    with open(chunks_path, "w", encoding="utf-8") as f:
        for article in articles:
            path_slug = urlparse(article["url"]).path.replace("/", "_").strip("_")
            if article["sections"]:
                for i, section in enumerate(article["sections"]):
                    if len(section["text"]) < 30:
                        continue
                    chunk = {
                        "id": f"{airline}_{path_slug}_{i}",
                        "airline": airline,
                        "url": article["url"],
                        "title": article["title"],
                        "heading": section["heading"],
                        "text": section["text"],
                    }
                    f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
                    chunk_count += 1
            else:
                chunk = {
                    "id": f"{airline}_{path_slug}_0",
                    "airline": airline,
                    "url": article["url"],
                    "title": article["title"],
                    "heading": "",
                    "text": article["full_text"],
                }
                f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
                chunk_count += 1

    print(f"Saved {chunk_count} RAG chunks -> {chunks_path}")
    print("\nDone.")


def main():
    parser = argparse.ArgumentParser(description="Crawl an airline KB site for RAG (Playwright-based).")
    parser.add_argument("--url", required=True, help="Base KB URL to crawl")
    parser.add_argument("--airline", required=True, help="Airline identifier (used in filenames)")
    parser.add_argument("--output", default="./kb_data", help="Output directory (default: ./kb_data)")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between requests in seconds (default: 1.5)")
    parser.add_argument("--max-pages", type=int, default=0, help="Stop after N pages (0 = unlimited, for testing)")
    args = parser.parse_args()

    crawl(
        base_url=args.url,
        airline=args.airline,
        output_dir=Path(args.output),
        delay=args.delay,
        max_pages=args.max_pages,
    )


if __name__ == "__main__":
    main()
