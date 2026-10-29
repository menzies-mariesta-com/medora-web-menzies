# ER bed master and assignment (manual QA)

1. Run migrations `0026_er_master`, `0027_ed_triage_level`, and information seed (demo ER ward `ER-DEMO` with six beds; triage levels 1-5).
2. Administration: ER Ward Master, ER Room Master, ER Bed Master (bed status shows Vacant/Occupied), ER Triage Levels CRUD.
3. **ED Patient Registration** (`/emergency/admission/new`): full registration fields (triage level, doctor, MLC, admission date/time, remarks, OPD link when applicable).
4. Nursing Workbench: triage, track board (assign bed dialog), MLC documentation tab when visit selected.
5. Register without bed; assign from triage or track board when required.
6. Track board: bed label on card; discharge and billing via unified **Bill** flow (not registration list).
7. Optional: IPD admit from OPD releases ER bed if the same visit was linked.
