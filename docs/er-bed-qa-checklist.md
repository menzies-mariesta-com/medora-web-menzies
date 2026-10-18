# ER bed master and assignment (manual QA)

1. Run migrations `0026_er_master`, `0027_ed_triage_level`, and information seed (demo ER ward `ER-DEMO` with six beds; triage levels 1-5).
2. Administration: ER Ward Master, ER Room Master, ER Bed Master (bed status shows Vacant/Occupied), ER Triage Levels CRUD.
3. Emergency registration list: **Create encounter** dialog (triage level, MLC, optional bed); list columns show triage, bed, MLC.
4. Row actions: Open EMR; overflow menu: assign bed (vacant/occupied table), transfer, triage, bill clearance, discharge, consumable order/return, edit details, MLC docs when MLC.
5. Register without bed; assign from menu or triage to Majors (assign-bed dialog on track board when required).
6. Track board: bed label on card; discharge from list menu releases bed (Vacant on ER Bed Status).
7. Optional: IPD admit from OPD releases ER bed if the same visit was linked.
