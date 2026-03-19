export const ATTIVITA_OPTIONS = [
  "Pilates Sala 1",
  "Pilates Sala 2",
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
  "Pilates Sala 1",
  "Pilates Sala 2",
  "In-Trinity",
  "WBS",
  "Piloga",
  "Functional",
] as const;

export const SOGLIA_PARTECIPANTI = 5; // 1-4 = fascia bassa, 5+ = fascia alta

// Capienza massima per attività di gruppo
export const CAPIENZA_MAX: Record<string, number> = {
  "Pilates Sala 1": 6,
  "Pilates Sala 2": 6,
  "In-Trinity": 5,
  "WBS": 6,
  "Piloga": 6,
  "Functional": 6,
  "Easy Reformer": 6,
  "Easy WBS": 6,
};

export function richiedePartecipanti(attivita: string): boolean {
  return (ATTIVITA_CON_PARTECIPANTI as readonly string[]).includes(attivita);
}
