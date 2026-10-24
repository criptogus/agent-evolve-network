"""Immutable inference-prefix recovery, without loading or mocking a model."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('local_worker', ROOT / 'scripts/local-adversarial-model.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class WorkerResumeTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.output = Path(self.directory.name) / 'outputs.jsonl'
        self.runtime = {'model': 'pinned', 'worker_sha256': 'original', 'subject_package_fingerprints': {'skill': {'validator': 'unchanged'}}}
        (self.output.parent / 'runtime.json').write_text(json.dumps(self.runtime))
        self.plan = {'model': 'pinned', 'subjects': [{'slug': 'skill', 'version': 'v1', 'prompt_sha256': 'prompt', 'cases': [{'id': 'first'}, {'id': 'second'}]}]}
        self.row = {'slug': 'skill', 'version': 'v1', 'prompt_sha256': 'prompt', 'model': 'pinned', 'case_id': 'first', 'plan_sha256': 'original-plan', 'output': '', 'error': 'actual failure retained'}
        self.output.write_text(json.dumps(self.row) + '\n')
        identity = {'index': 1, 'slug': 'skill', 'case_id': 'first'}
        self.events = [{**identity, 'event': 'started'}, {**identity, 'event': 'completed', 'row_sha256': hashlib.sha256(json.dumps(self.row).encode()).hexdigest()}]
        self.journal = self.output.parent / 'attempts.jsonl'
        self.journal.write_text(''.join(json.dumps(event) + '\n' for event in self.events))

    def test_preserves_failed_evidence_instead_of_retrying(self):
        original = self.output.read_bytes()
        rows = worker.resume_prefix(self.output, self.plan, self.runtime, 'original-plan')
        self.assertEqual(rows, [self.row])
        self.assertEqual(self.output.read_bytes(), original)

    def test_rejects_runtime_plan_order_and_package_mutations(self):
        with self.assertRaises(ValueError):
            worker.resume_prefix(self.output, self.plan, {**self.runtime, 'worker_sha256': 'changed'}, 'original-plan')
        with self.assertRaises(ValueError):
            worker.resume_prefix(self.output, self.plan, {**self.runtime, 'subject_package_fingerprints': {}}, 'original-plan')
        with self.assertRaises(ValueError):
            worker.resume_prefix(self.output, self.plan, self.runtime, 'changed-plan')
        self.output.write_text(json.dumps({**self.row, 'case_id': 'second'}) + '\n')
        with self.assertRaises(ValueError):
            worker.resume_prefix(self.output, self.plan, self.runtime, 'original-plan')

    def test_rejects_empty_complete_and_truncated_evidence(self):
        for text in ['', json.dumps(self.row) + '\n' + json.dumps({**self.row, 'case_id': 'second'}) + '\n', json.dumps(self.row) + '\n{"partial":']:
            self.output.write_text(text)
            with self.assertRaises((ValueError, json.JSONDecodeError)):
                worker.resume_prefix(self.output, self.plan, self.runtime, 'original-plan')

    def test_rejects_inflight_attempts_and_legacy_evidence(self):
        with self.journal.open('a') as journal:
            journal.write(json.dumps({'index': 2, 'slug': 'skill', 'case_id': 'second', 'event': 'started'}) + '\n')
        with self.assertRaisesRegex(ValueError, 'interrupted'):
            worker.resume_prefix(self.output, self.plan, self.runtime, 'original-plan')
        self.journal.unlink()
        with self.assertRaisesRegex(ValueError, 'legacy'):
            worker.resume_prefix(self.output, self.plan, self.runtime, 'original-plan')


if __name__ == '__main__':
    unittest.main()
