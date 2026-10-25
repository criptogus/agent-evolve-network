#!/usr/bin/env python3
"""Run existing checks with configured public Supabase variables; never print values."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('--repo', required=True)
parser.add_argument('--mode', choices=['security', 'project'], required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repo):
    parser.error('An explicit GitHub owner/repository is required')
log = args.output.with_suffix('.log')
if args.output.exists() or log.exists() or not args.output.parent.is_dir():
    parser.error('Supply a fresh report path in an existing directory')
remote = subprocess.run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True)
origin = remote.stdout.strip()
repository = origin.split(':', 1)[1] if origin.startswith('git@github.com:') else urlsplit(origin).path.strip('/') if urlsplit(origin).hostname == 'github.com' else ''
if remote.returncode or repository.removesuffix('.git') != args.repo:
    sys.exit('Working tree origin does not match the explicit repository')
response = subprocess.run(['gh', 'api', f'repos/{args.repo}/actions/variables?per_page=100'], capture_output=True, text=True)
if response.returncode:
    sys.exit('Unable to read the configured repository environment')
try:
    variables = {v['name']: v['value'] for v in json.loads(response.stdout)['variables']}
    url, key = variables['SUPABASE_URL'], variables['SUPABASE_PUBLISHABLE_KEY']
    parsed = urlsplit(url)
    if not key or parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError()
except (KeyError, TypeError, ValueError):
    sys.exit('Missing or invalid configured public Supabase environment')
env = os.environ.copy()
env.update(SUPABASE_URL=url, VITE_SUPABASE_URL=url, SUPABASE_PUBLISHABLE_KEY=key, VITE_SUPABASE_PUBLISHABLE_KEY=key)
command = ['npm', 'run', 'check:security'] if args.mode == 'security' else ['npm', 'run', 'check:project', '--', '--security']
with log.open('x') as handle:
    result = subprocess.run(command, env=env, stdout=handle, stderr=subprocess.STDOUT)
report = {
    'repository': args.repo, 'mode': args.mode, 'command': command,
    'exit_code': result.returncode, 'log': str(log),
    'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'source_sha256': {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path('scripts/run-playbook.ts'), Path('tests/playbook-gateway.test.ts')]},
    'model_calls': 0, 'production_writes': 0,
}
with args.output.open('x') as handle:
    json.dump(report, handle, indent=2)
    handle.write('\n')
print(json.dumps({'mode': args.mode, 'exit_code': result.returncode, 'report': str(args.output)}))
sys.exit(result.returncode)
