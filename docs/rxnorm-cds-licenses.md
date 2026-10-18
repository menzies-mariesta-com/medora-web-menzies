# RxNorm local CDS: data sources and licenses

Medora can run prescribing CDS from a **local Postgres catalog** (RxNorm Full + interaction feeds). Review these terms before production import.

## RxNorm Full (NLM / UMLS)

- Source: NLM RxNorm Full RRF files.
- Terms: UMLS Metathesaurus License. Accept terms via NLM/UMLS registration for your organization.
- Import: `pnpm db:import:rxnorm`
- Attribution: National Library of Medicine, RxNorm.

## DDInter

- Source: DDInter interaction CSV downloads.
- Terms: DDInter license applies to your use case (research vs commercial). **Do not import in production until legal review.**
- Gate: set `ALLOW_DDINTER_IMPORT=true` only after sign-off.
- Import: `pnpm db:import:ddinter`

## openFDA drug labels

- Source: openFDA Drug Label API (`drug_interactions` section).
- Terms: openFDA public domain / attribution as required by FDA.
- Import: `pnpm db:import:openfda-interactions`
- Note: Parsed text is heuristic; severity defaults to moderate.
