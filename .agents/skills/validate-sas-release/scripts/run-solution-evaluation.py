#!/usr/bin/env python3
"""Run the existing finite evaluator with the existing private Keychain helper. No retries or approvals."""
import argparse
import datetime
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--evidence', required=True)
parser.add_argument('--max-cases', required=True, type=int)
parser.add_argument('--log', required=True)
parser.add_argument('--receipt', required=True)
parser.add_argument('--key-helper', default=str(Path.home() / '.codex/skills/jev-codex/scripts/jev.py'))
args = parser.parse_args()
root = Path(__file__).resolve().parents[4]
paths = [Path(p).resolve() for p in (args.evidence, args.log, args.receipt)]
evidence, log, receipt = paths
if not 1 <= args.max_cases <= 72 or not (evidence / 'plan.json').is_file():
    parser.error('A prepared evidence directory and explicit 1..72 case bound are required')
if log == receipt or log.exists() or receipt.exists() or any((evidence / name).exists() for name in ('outputs.jsonl', 'attempts.jsonl', 'source-facts-attempts.jsonl', 'STOP-AFTER-CURRENT-CASE')):
    parser.error('Existing reports, inference attempts and stop requests are preserved; no replay')
if not log.parent.is_dir() or not receipt.parent.is_dir():
    parser.error('Explicit output parents must already exist')
try:
    spec = importlib.util.spec_from_file_location('private_jev_helper', Path(args.key_helper).resolve())
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    key = helper.keychain_key()
except Exception:
    sys.exit('Private Jev credential helper unavailable; no evaluation started')
env = os.environ.copy()
env['TYPESAFE_API_KEY'] = key
command = ['node', '--experimental-strip-types', 'scripts/evaluate-solution-playbooks.mjs', 'run', str(evidence), '--max-cases', str(args.max_cases)]
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
with os.fdopen(os.open(log, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as stream:
    result = subprocess.run(command, cwd=root, env=env, stdin=subprocess.DEVNULL, stdout=stream, stderr=subprocess.STDOUT)
record = {
    'scope': 'Actual finite evaluator process; never approval or publication evidence',
    'command': command,
    'started_at': started,
    'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'exit_code': result.returncode,
    'log': str(log),
    'publicationApproved': False,
    'automatic_retries': 0,
}
with os.fdopen(os.open(receipt, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as stream:
    json.dump(record, stream, indent=2)
    stream.write('\n')
print(json.dumps({'exit_code': result.returncode, 'receipt': str(receipt), 'publicationApproved': False}))
sys.exit(result.returncode)
