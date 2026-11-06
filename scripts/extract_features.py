"""Export valid paired-keystroke features from a collector JSON export (stdlib only)."""
import argparse
import csv
import json
from pathlib import Path


def extract(data, include_invalid=False):
    for record in data['records']:
        if not record['valid'] and not include_invalid:
            continue
        for feature in record['features']:
            yield {
                'participant_id': record['participant_id'],
                'session_id': record['session_id'],
                'session_uuid': record['session_uuid'],
                'attempt_id': record['attempt_id'],
                'prompt_id': record['prompt_id'],
                'keyboard': record['keyboard'],
                'valid': record['valid'],
                **feature,
            }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('-o', '--output', type=Path, default=Path('features.csv'))
    parser.add_argument('--include-invalid', action='store_true')
    args = parser.parse_args()
    data = json.loads(args.input.read_text(encoding='utf-8-sig'))
    rows = list(extract(data, args.include_invalid))
    if not rows:
        parser.error('No matching paired keystrokes in export')
    with args.output.open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f'Exported {len(rows)} rows to {args.output}')
