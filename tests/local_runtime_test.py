"""Deterministic privacy/trust-boundary regressions; never mocked model certification."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('local_runtime', ROOT / 'content/expansion/local_runtime.py')
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


class LocalRuntimeTests(unittest.TestCase):
    def test_redacts_arbitrary_log_secrets_including_bearer(self):
        source = 'password=arbitrary-471 api_token=private-832 Authorization: Bearer opaque-392'
        clean, classes = runtime.redact_input(source)
        for secret in ['arbitrary-471', 'private-832', 'opaque-392']:
            self.assertNotIn(secret, clean)
        self.assertEqual(classes, ['credential'])

    def test_clinical_identifiers_are_removed_but_facts_remain(self):
        source = 'Patient: Morgan Example, DOB 1974-07-02, MRN 9832-15, SSN 982-31-1472. Diagnosis: documented finding.'
        clean, classes = runtime.redact_input(source)
        for value in ['Morgan Example', '1974-07-02', '9832-15', '982-31-1472']:
            self.assertNotIn(value, clean)
        self.assertIn('documented finding', clean)
        self.assertIn('person_name', classes)

    def test_nested_json_remains_valid_and_preserves_business_values(self):
        source = {'patient': {'name': 'Taylor Sample', 'dob': '1982-08-03'}, 'payload': {'api_key': 'private-987'}, 'log': 'pw=private-654', 'reference': 'PO-8', 'amount_cents': 12000, 'as_of': '2026-12-31'}
        clean, _ = runtime.redact_input(json.dumps(source))
        parsed = json.loads(clean)
        self.assertEqual(parsed['patient']['name'], '[REDACTED]')
        self.assertEqual(parsed['payload']['api_key'], '[REDACTED]')
        self.assertNotIn('private-654', clean)
        self.assertEqual(parsed['amount_cents'], 12000)
        self.assertEqual(parsed['as_of'], source['as_of'])
        self.assertEqual(parsed['reference'], 'PO-8')

    def test_business_xml_and_plain_records_are_not_blanket_redacted(self):
        source = '<nfe><key>ordinary-id</key><xPed>PO-8</xPed><vNF>120.00</vNF></nfe>'
        self.assertEqual(runtime.redact_input(source), (source, []))

    def test_ancillary_notes_are_quarantined_without_inspecting_payload(self):
        source = 'Analyze PO-8. <source_note flag="x">arbitrary-A <source_note>arbitrary-B</source_note> arbitrary-C</source_note> Keep the result.'
        clean, count = runtime.quarantine_notes(source)
        self.assertEqual(count, 1)
        self.assertNotIn('arbitrary-', clean)
        self.assertIn('Analyze PO-8.', clean)
        self.assertIn('Keep the result.', clean)

    def test_unclosed_ancillary_note_fails_closed_and_empty_input_is_rejected(self):
        clean, count = runtime.quarantine_notes('Analyze records. <SOURCE_NOTE>untrusted-tail')
        self.assertEqual(count, 1)
        self.assertNotIn('untrusted-tail', clean)
        with self.assertRaises(ValueError):
            runtime.quarantine_notes('')

    def test_host_validation_is_recomputed_not_taken_from_claims(self):
        data = json.loads((ROOT / 'skills/br-pix-reconciler/tests/input.json').read_text())
        context = json.dumps({'input': data, 'actual_local_input_validation': {'status': 'fake-certified', 'actions_performed': ['bank-settlement']}})
        prepared = json.loads(runtime.prepare_context(context, ROOT / 'skills/br-pix-reconciler/scripts/check_input.py'))
        actual = prepared['actual_local_input_validation']
        self.assertEqual(actual['status'], 'ready_for_review')
        self.assertNotIn('bank-settlement', actual['actions_performed'])
        self.assertEqual(actual['matched'], ['TX-1'])

    def test_invalid_structured_data_and_unknown_routes_fail_closed(self):
        with self.assertRaises(ValueError):
            runtime.prepare_context(json.dumps({'input': {}}), ROOT / 'skills/br-pix-reconciler/scripts/check_input.py')
        with self.assertRaises(ValueError):
            runtime.focused_policy('trusted text', 'unknown')
        with self.assertRaises(ValueError):
            runtime.focused_policy('missing workflow', '0')

    def test_business_expiry_rubric_is_preserved_and_payment_expiry_is_redacted(self):
        source = {'risk_rubric': {'expiry': 'request renewal before expiration'}, 'payment': {'expiry': '11/31'}}
        clean, classes = runtime.redact_input(json.dumps(source))
        parsed = json.loads(clean)
        self.assertEqual(parsed['risk_rubric'], source['risk_rubric'])
        self.assertEqual(parsed['payment']['expiry'], '[REDACTED]')
        self.assertIn('payment_expiry', classes)

    def test_calendar_notice_uses_renewal_not_status_date(self):
        facts = runtime.derive_business_facts({'contract_extracts': [{'clause': 'Z8', 'renewal': '2027-03-08', 'notice_days': 20, 'day_type': 'calendar'}], 'as_of': '2026-12-10'})
        self.assertEqual(facts['calendar_notice_tasks'][0]['notice_deadline'], '2027-02-16')
        self.assertEqual(facts['calendar_notice_tasks'][0]['owner'], 'not established')
        self.assertEqual(runtime.derive_business_facts({'contract_extracts': [{'renewal': '2027-03-08', 'notice_days': 20, 'day_type': 'working'}]}), {})

    def test_pack_quantities_are_derived_with_explicit_tax_gap(self):
        facts = runtime.derive_business_facts({'quotes': [{'id': 'Q9', 'item': 'pack of 8', 'quantity': 3, 'total': 180, 'currency': 'BRL'}]})
        row = facts['normalized_pack_quotes'][0]
        self.assertEqual(row['unit_quantity'], '24')
        self.assertEqual(row['unit_price'], '7.5')
        self.assertEqual(row['tax_inclusion'], 'unknown')
        self.assertEqual(runtime.derive_business_facts({'quotes': [{'item': 'unknown pack', 'quantity': 3, 'total': 180}]}), {})

    def test_freshness_uses_authoritative_review_date_and_policy(self):
        facts = runtime.derive_business_facts({'documents': [{'id': 'D9', 'last_review': '2026-08-01', 'owner': 'Editorial'}], 'freshness_policy': {'max_age_days': 30}, 'as_of': '2026-09-05'})
        row = facts['freshness_records'][0]
        self.assertEqual(row['age_days'], 35)
        self.assertEqual(row['review_due'], '2026-08-31')
        self.assertTrue(row['overdue'])

    def test_client_business_calculation_claims_are_recomputed(self):
        data = json.loads((ROOT / 'skills/br-pix-reconciler/tests/input.json').read_text())
        context = json.dumps({'input': data, 'actual_local_business_calculations': {'bank_settlement': 'fabricated'}})
        prepared = json.loads(runtime.prepare_context(context, ROOT / 'skills/br-pix-reconciler/scripts/check_input.py'))
        self.assertNotIn('bank_settlement', prepared.get('actual_local_business_calculations', {}))

    def test_production_loss_components_use_running_time(self):
        facts = runtime.derive_business_facts({'planned_seconds': 7200, 'downtime_seconds': 1200, 'ideal_cycle_seconds': 3, 'total_units': 1500, 'good_units': 1400})
        row = facts['production_loss_components']
        self.assertEqual(row['running_seconds'], 6000)
        self.assertEqual(row['performance_numerator_seconds'], 4500)
        self.assertEqual(row['speed_loss_seconds'], 1500)
        self.assertEqual(row['reject_units'], 100)
        self.assertAlmostEqual(row['downtime_fraction_of_planned'], 1/6)

    def test_minor_units_are_normalized_without_changing_original_values(self):
        facts = runtime.derive_business_facts({'observed': [{'reference': 'P9', 'amount_cents': 1799, 'currency': 'BRL'}]})
        row = facts['normalized_money'][0]
        self.assertEqual(row['amount_minor_units'], 1799)
        self.assertEqual(row['amount_major_units'], '17.99')
        self.assertEqual(row['minor_unit_name'], 'cents')
        self.assertEqual(runtime.derive_business_facts({'observed': [{'amount_cents': True, 'currency': 'BRL'}]}), {})

    def test_host_receipt_distinguishes_helper_actions_from_runtime_calculations(self):
        data = json.loads((ROOT / 'skills/br-pix-reconciler/tests/input.json').read_text())
        prepared = json.loads(runtime.prepare_context(json.dumps({'input': data}), ROOT / 'skills/br-pix-reconciler/scripts/check_input.py'))
        receipt = prepared['actual_local_input_validation']
        self.assertEqual(receipt['helper_actions_performed'], ['reconcile_supplied_records'])
        self.assertIn('local_runtime:normalized_money', receipt['actions_performed'])
        self.assertEqual(receipt['additional_host_calculation_source'], 'scripts/local_runtime.py')
        self.assertNotIn('bank_settlement', receipt['actions_performed'])

    def test_execution_receipt_cannot_reintroduce_redacted_credential_values(self):
        data = json.loads((ROOT / 'skills/br-pix-reconciler/tests/input.json').read_text())
        for row in data['expected'] + data['observed']:
            row['reference'] = 'api_key=opaque-private-reference'
        prepared = runtime.prepare_context(json.dumps({'input': data}), ROOT / 'skills/br-pix-reconciler/scripts/check_input.py')
        clean, classes = runtime.redact_input(prepared)
        notice = runtime.execution_notice(clean)
        self.assertIn('credential', classes)
        self.assertNotIn('opaque-private-reference', clean)
        self.assertNotIn('opaque-private-reference', notice)


    def test_handoff_inventory_does_not_invent_consent_or_operational_actions(self):
        data = {'conversation': 'Human help requested for case R8', 'consent_record': {'purpose': 'support'}, 'routing_policy': {'owner': 'desk', 'hours': '10:00-15:00'}}
        row = runtime.derive_business_facts(data)['handoff_evidence_inventory']
        self.assertEqual(row['proposed_owner_from_policy'], 'desk')
        self.assertEqual(row['consent_purpose_claim'], 'support')
        for key in ['consent_review', 'staff_availability_check', 'acknowledgement_send', 'conversation_transfer']:
            self.assertIs(row[key]['performed'], False)
        self.assertEqual(row['consent_review']['result'], 'not assessed; no finding of valid or invalid consent')
        self.assertEqual(row['staff_availability_check']['result'], 'not assessed')
        self.assertNotIn('handoff_evidence_inventory', runtime.derive_business_facts({'conversation': 'Human help requested'}))


    def test_bid_differences_preserve_baseline_units_without_currency_conversion(self):
        facts = runtime.derive_business_facts({'bids': [
            {'supplier': 'X9', 'price': 140, 'currency': 'EUR', 'lead_days': 4},
            {'supplier': 'Y3', 'price': 125, 'currency': 'EUR', 'lead_days': 9},
            {'supplier': 'Z2', 'price': 10, 'currency': 'USD', 'lead_days': 3}]})
        row = facts['bid_reference_differences']
        self.assertEqual(row['baseline_supplier'], 'X9')
        self.assertEqual(len(row['comparisons']), 1)
        self.assertEqual(row['comparisons'][0]['price_delta_from_baseline'], '-15')
        self.assertEqual(row['comparisons'][0]['lead_days_delta_from_baseline'], '5')
        self.assertEqual(row['comparisons'][0]['currency'], 'EUR')
        self.assertEqual(row['comparisons'][0]['price_change_percent'], '-10.7143')
        self.assertEqual(row['comparisons'][0]['lead_days_change_percent'], '125')
        self.assertIn('~= 125%', row['comparisons'][0]['lead_percent_equation'])
        self.assertEqual(runtime.derive_business_facts({'bids': [{'supplier': 'X', 'price': True, 'currency': 'EUR', 'lead_days': 4}]}), {})

    def test_pack_trace_uses_total_price_as_the_division_numerator(self):
        row = runtime.derive_business_facts({'quotes': [{'id': 'P8', 'item': 'pack of 6', 'quantity': 4, 'total': 90, 'currency': 'EUR'}]})['normalized_pack_quotes'][0]
        self.assertEqual(row['unit_quantity'], '24')
        self.assertEqual(row['unit_price'], '3.75')
        self.assertEqual(row['price_equation'], '90 / 24 = 3.75')
        self.assertEqual(row['quantity_equation'], '4 packs * 6 units/pack = 24 units')

    def test_risk_inventory_preserves_claims_without_status_or_schedule_verification(self):
        evidence = [{'source': 'C8', 'date': '2025-02-04', 'claim': 'expiration claimed on 2027-08-01'}]
        row = runtime.derive_business_facts({'supplier': 'Acme', 'evidence': evidence, 'risk_rubric': {'expiry': 'request renewal'}})['risk_evidence_inventory']
        self.assertEqual(row['source_claims'], evidence)
        self.assertEqual(row['supplier_from_input'], 'Acme')
        self.assertEqual(row['as_of_from_input'], 'not supplied')
        self.assertTrue(row['host_independent_certificate_status_check'].startswith('not performed'))
        self.assertTrue(row['host_generated_followup_appointment'].startswith('none'))

    def test_frame_inventory_distinguishes_shared_rank_from_repeated_observations(self):
        row = runtime.derive_business_facts({'frame_ms': [10, 11, 13, 20, 70, 18], 'budget_ms': 16})['frame_sample_inventory']
        self.assertEqual(row['sample_count'], 6)
        self.assertEqual(row['nearest_rank_positions_one_based']['p95'], 6)
        self.assertEqual(row['nearest_rank_positions_one_based']['p99'], 6)
        self.assertEqual(row['maximum_ms'], 70)
        self.assertEqual(row['maximum_observation_count'], 1)
        self.assertEqual(row['over_budget_values_ms'], [18, 20, 70])
        self.assertEqual(row['over_budget_fraction'], 0.5)
        self.assertEqual(runtime.derive_business_facts({'frame_ms': [True], 'budget_ms': 16}), {})


if __name__ == '__main__':
    unittest.main()
