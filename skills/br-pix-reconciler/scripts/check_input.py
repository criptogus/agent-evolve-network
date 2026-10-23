#!/usr/bin/env python3
"""Validate a skill's explicit input contract; compute only supported deterministic metrics."""
import argparse, json, sys, math
from pathlib import Path

def number(value):
    if isinstance(value, bool) or not isinstance(value, (int,float)) or not math.isfinite(value):
        raise ValueError('Expected a finite number')
    return value

def evaluate(contract, data):
    if not isinstance(data, dict): raise ValueError('Input must be an object')
    missing=[key for key in contract['required'] if key not in data or data[key] is None or data[key]=='' or data[key]==[] or data[key]=={}]
    if missing: raise ValueError('Missing required inputs: '+', '.join(missing))
    result={'status':'ready_for_review','skill':contract['slug'],'input_fields':sorted(data),'actions_performed':[]}
    mode=contract.get('calculation')
    if mode in ('fmea','reconcile','frame_times'):
        fields={'fmea':['failure_modes'],'reconcile':['expected','observed'],'frame_times':['frame_ms']}[mode]
        if any(not isinstance(data[k],list) for k in fields):raise ValueError('Expected record arrays')
        if mode!='frame_times' and any(not isinstance(row,dict) for k in fields for row in data[k]):raise ValueError('Expected object records')
    if mode=='oee':
        planned=number(data['planned_seconds']);stop=number(data['downtime_seconds']);cycle=number(data['ideal_cycle_seconds']);total=number(data['total_units']);good=number(data['good_units'])
        if planned<=0 or not 0<=stop<planned or cycle<=0 or total<=0 or not 0<=good<=total: raise ValueError('Invalid production measurement range')
        run=planned-stop;availability=run/planned;performance=cycle*total/run;quality=good/total
        if performance>1: raise ValueError('Performance exceeds 100%; verify ideal cycle and time units')
        result.update(metrics={'availability':availability,'performance':performance,'quality':quality,'oee':availability*performance*quality},actions_performed=['calculate_oee'])
    elif mode=='fmea':
        risks=[]
        for row in data['failure_modes']:
            factors=[number(row[k]) for k in ['severity','occurrence','detection']]
            if any(v!=int(v) or not 1<=v<=10 for v in factors): raise ValueError('FMEA factors must be integers 1–10')
            risks.append({'id':row['id'],'rpn':math.prod(factors),'severity':factors[0]})
        result.update(risks=sorted(risks,key=lambda r:(-r['severity'],-r['rpn'])),actions_performed=['calculate_rpn'])
    elif mode=='reconcile':
        expected=data['expected'];observed=data['observed'];seen=set();issues=[];matched=[]
        if len({r['reference'] for r in expected})!=len(expected):raise ValueError('Duplicate expected reference')
        by_ref={r['reference']:r for r in expected}
        for row in expected+observed:
            cents=row['amount_cents']
            if isinstance(cents,bool) or not isinstance(cents,int):raise ValueError('amount_cents must be an integer')
            if not isinstance(row.get('currency'),str) or not row['currency']:raise ValueError('Currency is required')
        for row in observed:
            ref=row['reference']
            if ref in seen:issues.append({'reference':ref,'reason':'duplicate'});continue
            seen.add(ref);target=by_ref.get(ref)
            if target is None:issues.append({'reference':ref,'reason':'unexpected'})
            elif row['currency']!=target['currency'] or row['amount_cents']!=target['amount_cents']:issues.append({'reference':ref,'reason':'mismatch'})
            else:matched.append(ref)
        issues += [{'reference':r,'reason':'missing'} for r in by_ref if r not in seen]
        result.update(matched=matched,exceptions=issues,actions_performed=['reconcile_supplied_records'])
    elif mode=='frame_times':
        frames=[number(v) for v in data['frame_ms']]
        if any(v<=0 for v in frames):raise ValueError('Frame times must be positive')
        frames.sort();budget=number(data['budget_ms'])
        if budget<=0:raise ValueError('Frame budget must be positive')
        result.update(metrics={'p50_ms':frames[math.ceil(len(frames)*.5)-1],'p95_ms':frames[math.ceil(len(frames)*.95)-1],'p99_ms':frames[math.ceil(len(frames)*.99)-1],'over_budget':sum(v>budget for v in frames),'frames':len(frames)},actions_performed=['calculate_frame_percentiles'])
    # A validated input is never evidence that the task itself succeeded.
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('input');parser.add_argument('--contract',default=str(Path(__file__).resolve().parent.parent/'references/contract.json'));parser.add_argument('--output');args=parser.parse_args()
    try:
        result=evaluate(json.loads(Path(args.contract).read_text()),json.loads(Path(args.input).read_text()))
        text=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
        if args.output:Path(args.output).write_text(text)
        else:sys.stdout.write(text)
    except (ValueError,KeyError,TypeError,OSError,IndexError) as exc:
        print(json.dumps({'status':'invalid_input','error':str(exc)},ensure_ascii=False),file=sys.stderr);return 2
    return 0
if __name__=='__main__':sys.exit(main())
