CREATE TYPE "public"."scan_type" AS ENUM('resource', 'geological', 'full');--> statement-breakpoint
CREATE TABLE "player_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"scan_x" real NOT NULL,
	"scan_y" real NOT NULL,
	"scan_radius" real NOT NULL,
	"scan_type" "scan_type" NOT NULL,
	"results" jsonb NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"world_id" uuid NOT NULL,
	"name" text,
	"inventory" jsonb DEFAULT '{}' NOT NULL,
	"credits" real DEFAULT 1000 NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "players_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "resource_veins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_type" text NOT NULL,
	"center_x" real NOT NULL,
	"center_y" real NOT NULL,
	"radius" real NOT NULL,
	"density" real NOT NULL,
	"quality" real NOT NULL,
	"depth" real,
	"is_exhausted" boolean DEFAULT false NOT NULL,
	"extracted_amount" real DEFAULT 0 NOT NULL,
	"discovered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worlds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"seed" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_scans_session_time_idx" ON "player_scans" USING btree ("session_id","scanned_at");--> statement-breakpoint
CREATE INDEX "players_session_id_idx" ON "players" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "players_last_active_idx" ON "players" USING btree ("last_active");--> statement-breakpoint
CREATE INDEX "players_world_id_idx" ON "players" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "resource_veins_type_idx" ON "resource_veins" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "resource_veins_location_idx" ON "resource_veins" USING btree ("center_x","center_y");--> statement-breakpoint
CREATE INDEX "world_events_type_idx" ON "world_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "world_events_time_idx" ON "world_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "worlds_name_idx" ON "worlds" USING btree ("name");--> statement-breakpoint
CREATE INDEX "worlds_active_idx" ON "worlds" USING btree ("is_active");