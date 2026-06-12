"""
Rechunk existing JSONL data with:
- Max 800 tokens (~3200 chars) per chunk
- 80-token (~320 char) overlap between consecutive chunks
- Preserve all metadata (id, airline, url, title, heading)
"""

import json
import re
import os

CHUNK_SIZE = 3200   # chars (~800 tokens)
OVERLAP    = 320    # chars (~80 tokens)

def split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split text into overlapping chunks, breaking at sentence/newline boundaries."""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        if end >= len(text):
            chunks.append(text[start:].strip())
            break

        # Try to break at a paragraph boundary first
        boundary = text.rfind('\n\n', start, end)
        if boundary == -1 or boundary <= start:
            # Fall back to newline
            boundary = text.rfind('\n', start, end)
        if boundary == -1 or boundary <= start:
            # Fall back to sentence end
            boundary = text.rfind('. ', start, end)
        if boundary == -1 or boundary <= start:
            # Hard cut
            boundary = end

        chunk = text[start:boundary].strip()
        if chunk:
            chunks.append(chunk)

        # Next chunk starts overlap chars before the boundary
        start = max(start + 1, boundary - overlap)

    return chunks


def rechunk_file(airline: str):
    in_path  = f'/Users/apple/projects/airline-helper/{airline}_data/{airline}_chunks.jsonl'
    out_path = f'/Users/apple/projects/airline-helper/{airline}_data/{airline}_chunks.jsonl'

    original = [json.loads(l) for l in open(in_path)]

    new_chunks = []
    chunk_counter = 0

    for doc in original:
        text    = doc.get('text', '').strip()
        url     = doc.get('url', '')
        title   = doc.get('title', '')
        heading = doc.get('heading', '')
        airline_id = doc.get('airline', airline)

        if not text:
            continue

        parts = split_text(text, CHUNK_SIZE, OVERLAP)

        for i, part in enumerate(parts):
            new_chunks.append({
                'id':      f'{airline}_{chunk_counter:04d}',
                'airline': airline_id,
                'url':     url,
                'title':   title,
                'heading': heading if len(parts) == 1 else f'{heading} (part {i+1})' if heading else f'{title} (part {i+1})',
                'text':    part,
            })
            chunk_counter += 1

    # Write back in place
    with open(out_path, 'w') as f:
        for chunk in new_chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + '\n')

    sizes = [len(c['text']) for c in new_chunks]
    print(f'{airline}: {len(original)} → {len(new_chunks)} chunks | '
          f'max={max(sizes):,} avg={sum(sizes)//len(sizes):,} chars')


if __name__ == '__main__':
    for airline in ['starair', 'spicejet', 'allianceair']:
        rechunk_file(airline)
    print('\nDone. fly91 was already fine, skipped.')
