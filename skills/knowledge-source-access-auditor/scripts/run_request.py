#!/usr/bin/env python3
"""Run this skill's pinned local model/runtime. No tools, hosted inference or publication."""
import argparse
import hashlib
import importlib.metadata
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model-path', required=True)
    parser.add_argument('--request', required=True, help='JSON with input text and optional context text')
    parser.add_argument('--output', required=True, help='New output file; never overwritten')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    profile = json.loads((root / 'references/model-profile.json').read_text())
    if Path(args.output).exists():
        raise ValueError('Refusing to overwrite output evidence')
    model_path = Path(args.model_path)
    if not model_path.is_dir() or model_path.name != profile['revision']:
        raise ValueError('Only the pinned cached model revision is supported')
    for key, package in [('mlx_vlm', 'mlx-vlm'), ('mlx', 'mlx')]:
        if importlib.metadata.version(package) != profile[key]:
            raise ValueError('Unqualified SDK/runtime version')
    for relative, expected in profile['files_sha256'].items():
        if hashlib.sha256((root / relative).read_bytes()).hexdigest() != expected:
            raise ValueError('Skill runtime/source changed; qualification no longer applies')
    for relative, expected in profile['model_files_sha256'].items():
        if hashlib.sha256((model_path / relative).read_bytes()).hexdigest() != expected:
            raise ValueError('Model configuration/tokenizer differs from the pinned revision')
    for relative, expected in profile['weights_sha256'].items():
        with (model_path / relative).open('rb') as source:
            if hashlib.file_digest(source, 'sha256').hexdigest() != expected:
                raise ValueError('Model weights differ from the pinned revision')
    request = json.loads(Path(args.request).read_text())
    if not isinstance(request, dict) or set(request) - {'input', 'context'} or not isinstance(request.get('input'), str) or not request['input'].strip():
        raise ValueError('Request must have nonempty input text and optional context text only')
    context = request.get('context')
    if context is not None and not isinstance(context, str):
        raise ValueError('Context must be text')
    from local_runtime import generate_response, PROTOCOL
    if profile['prompt_protocol'] != PROTOCOL:
        raise ValueError('Unqualified request protocol')
    import mlx.core as mx
    from mlx_vlm import load
    mx.random.seed(0)
    model, processor = load(str(model_path), local_files_only=True)
    result, provenance = generate_response(model, processor, (root / 'references/system-prompt.txt').read_text(), request['input'], context, root / 'scripts/check_input.py')
    truncated = result.generation_tokens >= profile['max_tokens']
    payload = {'model': profile['model'], 'prompt_protocol': PROTOCOL, 'output': result.text, 'runtime_provenance': provenance, 'truncated': truncated, 'prompt_tokens': result.prompt_tokens + provenance['routing_prompt_tokens'], 'generation_tokens': result.generation_tokens + provenance['routing_generation_tokens'], 'package_slug':profile['package_slug'], 'package_version':profile['package_version'], 'qualification_scope': 'Exact model, runtime, package version and tested input contracts only; no live tool execution'}
    with Path(args.output).open('x') as output:
        json.dump(payload, output, ensure_ascii=False, indent=2)
    Path(args.output).chmod(0o600)
    return 3 if truncated or not result.text.strip() else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as exc:
        print(f'Local runtime refused input/configuration: {exc}', file=sys.stderr)
        sys.exit(2)
