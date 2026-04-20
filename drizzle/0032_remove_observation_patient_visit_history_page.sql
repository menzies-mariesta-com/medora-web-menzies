-- Remove Observation EMR "Patient Visit History Dashboard" sub-page (tab); main EMR has no tab children.
DELETE FROM "user_group_page" WHERE "page_id" = 1300001;
DELETE FROM "page" WHERE "id" = 1300001;
