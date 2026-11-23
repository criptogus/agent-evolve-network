/**
 * Who may score or read a diagnosis. Owned diagnoses belong to their owner;
 * anonymous ones (owner null) to whoever holds the unguessable diagnosis id.
 */
export function canAccessDiagnosis(ownerId: string | null, callerId: string | null): boolean {
  return ownerId === null || ownerId === callerId;
}
