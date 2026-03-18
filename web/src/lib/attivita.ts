export const ATTIVITA_OPTIONS = [
  "Pilates",
  "In-Trinity",
  "WBS",
  "Piloga",
  "Functional",
  "Easy Reformer",
  "Easy WBS",
  "PT 1h",
  "PT 30 Min",
  "Check-up",
  "OSTEO",
] as const;

export const ATTIVITA_CON_PARTECIPANTI = [
  "Pilates",
  "In-Trinity",
  "WBS",
  "Piloga",
  "Functional",
] as const;

export const SOGLIA_PARTECIPANTI = 5; // 1-4 = fascia bassa, 5+ = fascia alta

export function richiedePartecipanti(attivita: string): boolean {
  return (ATTIVITA_CON_PARTECIPANTI as readonly string[]).includes(attivita);
}
