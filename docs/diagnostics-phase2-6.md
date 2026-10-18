# Diagnostics platform: Phase 2–6 backlog

Phase 1 (Core LIS, items 76–78) is implemented in Medora. Use this document for subsequent epics.

## Phase 2: Microbiology depth (item 79)

- Culture order types, media, incubation tracking
- Organism identification and AST (MIC) grid UI
- Preliminary vs final culture reports
- Micro section worklist filters (pending setup, growth, ID complete)
- Optional HL7 ORU mapping for automated ID/AST instruments

## Phase 3: Blood bank (item 80)

- Donor registration and donation events (lightweight for small_multi hospitals)
- Component inventory (RBC, FFP, platelets) with expiry
- Patient antibody screen and crossmatch workflow
- Issue to ward/OR with bedside verification
- Transfusion reaction clinical form and export

## Phase 4: Radiology RIS (item 81)

- `imaging_order` on radiology `service_order_detail`
- Modality worklist, schedule, check-in, perform
- Structured report templates and versioning
- Peer review queue and second read sign-off

## Phase 5: PACS UX (item 82)

- Orthanc or vendor PACS with DICOMweb
- OHIF viewer embed in Diagnostics
- Hanging protocol configuration by study type
- Prior study comparison by modality and body region

## Phase 6: POC and send-out (items 83–84)

- POC device ingest queue (HL7 ORU) with match rules
- Reference lab accounts, shipment manifest, TAT tracking
- Result reconciliation when placer order id differs

## Integration standards (hybrid)

| Flow | Protocol |
|------|----------|
| Analyzer to Medora | HL7 ORU or FHIR DiagnosticReport |
| Medora to analyzer | HL7 OML (optional) |
| Reference lab | ORU + accession crosswalk |
| RIS/PACS | HL7 ORM + DICOMweb |

Use `lab_integration_message` inbox and extend `lab-integration-inbox.server.ts` with parsers and workers.
