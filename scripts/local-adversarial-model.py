#!/usr/bin/env python3
"""Text-only inference against one pre-frozen evaluation plan, offline and without tools."""
import argparse, hashlib, json, os, time, platform, importlib.metadata, importlib.util
from pathlib import Path
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'

def resume_prefix(output, plan, runtime, plan_hash):
    """Resume only a complete JSONL prefix bound to the unchanged subject and worker."""
    original_runtime = json.loads((output.parent / 'runtime.json').read_text())
    if original_runtime != runtime:
        raise ValueError('Resume rejected: model, SDK, worker or packaged subject changed')
    lines = output.read_text().splitlines()
    rows = [json.loads(line) for line in lines]
    journal_path = output.parent / 'attempts.jsonl'
    if not journal_path.is_file():raise ValueError('Resume rejected: legacy evidence lacks an attempt journal')
    events = [json.loads(line) for line in journal_path.read_text().splitlines()]
    if len(events) != 2 * len(rows):raise ValueError('Resume rejected: interrupted or unaccounted inference attempt')
    expected = [(subject, case) for subject in plan['subjects'] for case in subject['cases']]
    if not rows or len(rows) >= len(expected):
        raise ValueError('Resume requires a nonempty incomplete inference prefix')
    for index, (row, (subject, case)) in enumerate(zip(rows, expected), 1):
        begin, end = events[2 * index - 2:2 * index]
        identity = {'index': index, 'slug': subject['slug'], 'case_id': case['id']}
        if begin != {**identity, 'event': 'started'} or end != {**identity, 'event': 'completed', 'row_sha256': hashlib.sha256(lines[index - 1].encode()).hexdigest()}:
            raise ValueError('Resume rejected: attempt journal does not match preserved evidence')
        if row.get('plan_sha256') != plan_hash:
            raise ValueError('Resume rejected: original plan bytes changed')
        if row.get('slug') != subject['slug'] or row.get('version') != subject['version'] or row.get('case_id') != case['id'] or row.get('prompt_sha256') != subject['prompt_sha256'] or row.get('model') != plan['model']:
            raise ValueError('Resume rejected: reordered, duplicate or unbound existing evidence')
    return rows

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--resume',action='store_true');parser.add_argument('--max-cases',type=int);parser.add_argument('--plan',required=True);parser.add_argument('--model-path',required=True);parser.add_argument('--output',required=True)
    args=parser.parse_args(); plan=json.loads(Path(args.plan).read_text())
    if not plan.get('subjects') or not Path(args.model_path).is_dir():raise ValueError('Nonempty plan and existing local model required')
    if args.max_cases is not None and args.max_cases < 1:raise ValueError('max-cases must be positive')
    output=Path(args.output)
    if output.exists() != args.resume:raise ValueError('Use --resume only for existing partial evidence; outputs are never overwritten')
    if plan['model'].rsplit('@',1)[-1] != Path(args.model_path).name:
        raise ValueError('The declared model revision must match the cached snapshot directory')
    fingerprints={}
    for weight in sorted(Path(args.model_path).glob('*.safetensors')):
        with weight.open('rb') as source:fingerprints[weight.name]=hashlib.file_digest(source,'sha256').hexdigest()
    if not fingerprints:raise ValueError('No cached model weights found')
    runtime={'architecture':platform.machine(),'python':platform.python_version(),'mlx_vlm':importlib.metadata.version('mlx-vlm'),'mlx':importlib.metadata.version('mlx'),'model_snapshot':Path(args.model_path).name,'weight_fingerprints':fingerprints,'generation':{'temperature':0,'max_tokens':768,'seed':0},'tools':[],'network':'offline cached model only'}
    protocol=plan.get('prompt_protocol','system-first-v1')
    if protocol not in ('system-first-v1','redact-route-generate-v1'):raise ValueError('Unsupported declared protocol')
    if protocol=='redact-route-generate-v1':
        base_profile=json.loads((Path(__file__).resolve().parent.parent/'content/expansion/model-profile.json').read_text())
        if plan['model']!=base_profile['model']:raise ValueError('Unqualified model/profile combination')
        if any(runtime[key] != base_profile[key] for key in ('mlx_vlm', 'mlx', 'python', 'architecture')):raise ValueError('Unqualified SDK/profile combination')
        if set(fingerprints) != set(base_profile['weights_sha256']):raise ValueError('Unqualified model weight file set')
        if any(fingerprints.get(name)!=expected for name,expected in base_profile['weights_sha256'].items()):raise ValueError('Model weight/profile mismatch')
        model_files={name:hashlib.sha256((Path(args.model_path)/name).read_bytes()).hexdigest() for name in base_profile['model_files_sha256']}
        if model_files!=base_profile['model_files_sha256']:raise ValueError('Model configuration/tokenizer/profile mismatch')
        runtime['model_file_fingerprints']=model_files
        runtime['routing']=base_profile['routing']
    runtime['prompt_protocol']=protocol
    runtime['runtime_source_sha256']=hashlib.sha256((Path(__file__).resolve().parent.parent/'content/expansion/local_runtime.py').read_bytes()).hexdigest()
    runtime['worker_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    runtime['subject_package_fingerprints'] = {}
    for subject in plan['subjects']:
        package = Path(__file__).resolve().parent.parent / 'skills' / subject['slug']
        if (package / 'references/model-profile.json').is_file():
            profile = json.loads((package / 'references/model-profile.json').read_text())
            runtime['subject_package_fingerprints'][subject['slug']] = {name: hashlib.sha256((package / name).read_bytes()).hexdigest() for name in list(profile['files_sha256']) + ['references/model-profile.json']}
    skipped = 0
    if args.resume:
        digest = hashlib.sha256(Path(args.plan).read_bytes()).hexdigest()
        existing = resume_prefix(output, plan, runtime, digest)
        skipped = len(existing)
        with (output.parent / 'resumptions.jsonl').open('a') as log:
            log.write(json.dumps({'resumed_at_unix': time.time(), 'preserved_rows': skipped, 'plan_sha256': digest, 'runtime_source_sha256': runtime['runtime_source_sha256']}) + '\n')
    else:
        with (output.parent/'runtime.json').open('x') as stream:json.dump(runtime,stream,indent=2)
    runtime_spec=importlib.util.spec_from_file_location('local_runtime',Path(__file__).resolve().parent.parent/'content/expansion/local_runtime.py')
    local_runtime=importlib.util.module_from_spec(runtime_spec);runtime_spec.loader.exec_module(local_runtime)
    from mlx_vlm import load, generate
    from mlx_vlm.prompt_utils import apply_chat_template
    import mlx.core as mx
    model,processor=load(args.model_path,local_files_only=True)
    mx.random.seed(0)
    cursor = 0
    with output.open('a' if args.resume else 'x') as stream, (output.parent / 'attempts.jsonl').open('a' if args.resume else 'x') as journal:
        for subject in plan['subjects']:
            error = None
            for case in subject['cases']:
                cursor += 1
                if cursor <= skipped:continue
                identity = {'index': cursor, 'slug': subject['slug'], 'case_id': case['id']}
                journal.write(json.dumps({**identity, 'event': 'started'}) + '\n');journal.flush()
                started=time.monotonic();result=None;error=None;provenance=None
                try:
                    provenance=None
                    if protocol=='redact-route-generate-v1':
                        result,provenance=local_runtime.generate_response(model,processor,subject['system_prompt'],case['input'],case.get('context'),Path(__file__).resolve().parent.parent/'skills'/subject['slug']/'scripts/check_input.py')
                    else:
                        messages=[{'role':'system','content':subject['system_prompt']}]
                        if case.get('context'):messages.append({'role':'user','content':'Context:\n'+case['context']})
                        messages.append({'role':'user','content':case['input']})
                        prompt=apply_chat_template(processor,model.config,messages,num_images=0)
                        result=generate(model,processor,prompt=prompt,max_tokens=768,temperature=0,verbose=False)
                    if not result.text.strip():raise ValueError('Empty model output')
                except Exception as exc:error=f'{type(exc).__name__}: {exc}'
                row={'slug':subject['slug'],'version':subject['version'],'prompt_sha256':subject['prompt_sha256'],'case_id':case['id'],'output':result.text if result else '', 'runtime_provenance':provenance, 'error':error,'generation_tokens':getattr(result,'generation_tokens',None),'prompt_tokens':getattr(result,'prompt_tokens',None),'truncated':bool(result and result.generation_tokens>=768),'duration_ms':round((time.monotonic()-started)*1000),'model':plan['model'],'plan_sha256':hashlib.sha256(Path(args.plan).read_bytes()).hexdigest()}
                line = json.dumps(row, ensure_ascii=False)
                stream.write(line+'\n');stream.flush()
                journal.write(json.dumps({**identity, 'event': 'completed', 'row_sha256': hashlib.sha256(line.encode()).hexdigest()}) + '\n');journal.flush()
                total = sum(len(item['cases']) for item in plan['subjects'])
                if args.max_cases and cursor - skipped >= args.max_cases and cursor < total:
                    with (output.parent / 'checkpoints.jsonl').open('a') as checkpoint:
                        checkpoint.write(json.dumps({'completed_rows': cursor, 'remaining': total - cursor, 'reason': 'explicit max-cases boundary', 'qualifies': False}) + '\n')
                    print(json.dumps({'checkpoint': cursor, 'remaining': total - cursor, 'qualifies': False}), flush=True)
                    return 4
            print(json.dumps({'slug':subject['slug'],'executed':len(subject['cases']),'inference_errors':error is not None}),flush=True)
            mx.clear_cache()
if __name__=='__main__':raise SystemExit(main() or 0)
