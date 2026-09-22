-- Align module.image_url with Menzies Design Lucide icon names
-- (kebab-case, same as Wash `DynamicIcon` `name`). Replaces legacy inline SVG.
UPDATE "module" SET "image_url" = 'user-cog', "updated_at" = now() WHERE "id" = 1;
--> statement-breakpoint
UPDATE "module" SET "image_url" = 'users-round', "updated_at" = now() WHERE "id" = 2;
--> statement-breakpoint
UPDATE "module" SET "image_url" = 'clipboard-clock', "updated_at" = now() WHERE "id" = 3;
--> statement-breakpoint
UPDATE "module" SET "image_url" = 'heart-pulse', "updated_at" = now() WHERE "id" = 4;
--> statement-breakpoint
UPDATE "module" SET "image_url" = 'clipboard-list', "updated_at" = now() WHERE "id" = 5;
--> statement-breakpoint
UPDATE "module" SET "image_url" = 'stethoscope', "updated_at" = now() WHERE "id" = 6;
--> statement-breakpoint
UPDATE "module" SET "image_url" = 'receipt-text', "updated_at" = now() WHERE "id" = 8;
--> statement-breakpoint
UPDATE "module" SET "image_url" = 'warehouse', "updated_at" = now() WHERE "id" = 9;
--> statement-breakpoint
UPDATE "module" SET "image_url" = 'package', "updated_at" = now() WHERE "id" = 10;
--> statement-breakpoint
UPDATE "module" SET "image_url" = 'pill', "updated_at" = now() WHERE "id" = 11;
