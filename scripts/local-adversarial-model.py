#!/usr/bin/env python3
"""Text-only inference against one pre-frozen evaluation plan, offline and without tools."""
import argparse, hashlib, json, os, time, platform, importlib.metadata
from pathlib import Path
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--plan',required=True);parser.add_argument('--model-path',required=True);parser.add_argument('--output',required=True)
    args=parser.parse_args(); plan=json.loads(Path(args.plan).read_text())
    if not plan.get('subjects') or not Path(args.model_path).is_dir():raise ValueError('Nonempty plan and existing local model required')
    output=Path(args.output)
    if output.exists():raise ValueError('Refusing to overwrite real inference evidence')
    if plan['model'].rsplit('@',1)[-1] != Path(args.model_path).name:
        raise ValueError('The declared model revision must match the cached snapshot directory')
    fingerprints={}
    for weight in sorted(Path(args.model_path).glob('*.safetensors')):
        with weight.open('rb') as source:fingerprints[weight.name]=hashlib.file_digest(source,'sha256').hexdigest()
    if not fingerprints:raise ValueError('No cached model weights found')
    runtime={'architecture':platform.machine(),'python':platform.python_version(),'mlx_vlm':importlib.metadata.version('mlx-vlm'),'mlx':importlib.metadata.version('mlx'),'model_snapshot':Path(args.model_path).name,'weight_fingerprints':fingerprints,'generation':{'temperature':0,'max_tokens':768,'seed':0},'tools':[],'network':'offline cached model only'}
    with (output.parent/'runtime.json').open('x') as stream:json.dump(runtime,stream,indent=2)
    from mlx_vlm import load, generate
    from mlx_vlm.prompt_utils import apply_chat_template
    import mlx.core as mx
    model,processor=load(args.model_path,local_files_only=True)
    mx.random.seed(0)
    with output.open('x') as stream:
        for subject in plan['subjects']:
            for case in subject['cases']:
                started=time.monotonic();result=None;error=None
                try:
                    messages=[{'role':'system','content':subject['system_prompt']}]
                    if case.get('context'):messages.append({'role':'user','content':'Context:\n'+case['context']})
                    messages.append({'role':'user','content':case['input']})
                    prompt=apply_chat_template(processor,model.config,messages,num_images=0)
                    result=generate(model,processor,prompt=prompt,max_tokens=768,temperature=0,verbose=False)
                    if not result.text.strip():raise ValueError('Empty model output')
                except Exception as exc:error=f'{type(exc).__name__}: {exc}'
                row={'slug':subject['slug'],'version':subject['version'],'prompt_sha256':subject['prompt_sha256'],'case_id':case['id'],'output':result.text if result else '', 'error':error,'generation_tokens':getattr(result,'generation_tokens',None),'prompt_tokens':getattr(result,'prompt_tokens',None),'truncated':bool(result and result.generation_tokens>=768),'duration_ms':round((time.monotonic()-started)*1000),'model':plan['model'],'plan_sha256':hashlib.sha256(Path(args.plan).read_bytes()).hexdigest()}
                stream.write(json.dumps(row,ensure_ascii=False)+'\n');stream.flush()
            print(json.dumps({'slug':subject['slug'],'executed':len(subject['cases']),'inference_errors':error is not None}),flush=True)
            mx.clear_cache()
if __name__=='__main__':main()
