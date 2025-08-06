CREATE TYPE "public"."scan_type" AS ENUM('resource', 'geological', 'full');--> statement-breakpoint
CREATE TABLE "extractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"position" geometry(point),
	"resource_type" text NOT NULL,
	"status" text DEFAULT 'IDLE' NOT NULL,
	"efficiency" real DEFAULT 1 NOT NULL,
	"last_tick" timestamp DEFAULT now() NOT NULL,
	"storage" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "extractors_x_y_world_id_unique" UNIQUE("x","y","world_id")
);
--> statement-breakpoint
CREATE TABLE "player_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"scan_center" geometry(point),
	"scan_area" geometry(point),
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
CREATE TABLE "resource_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"resource_vein_id" uuid NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"claim_type" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "resource_claims_resource_vein_id_unique" UNIQUE("resource_vein_id")
);
--> statement-breakpoint
CREATE TABLE "resource_veins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"center_x" real NOT NULL,
	"center_y" real NOT NULL,
	"radius" real NOT NULL,
	"center_point" geometry(point),
	"extraction_area" geometry(point),
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
ALTER TABLE "extractors" ADD CONSTRAINT "extractors_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractors" ADD CONSTRAINT "extractors_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_claims" ADD CONSTRAINT "resource_claims_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_claims" ADD CONSTRAINT "resource_claims_resource_vein_id_resource_veins_id_fk" FOREIGN KEY ("resource_vein_id") REFERENCES "public"."resource_veins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_veins" ADD CONSTRAINT "resource_veins_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extractors_player_id_idx" ON "extractors" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "extractors_world_id_idx" ON "extractors" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "extractors_resource_type_idx" ON "extractors" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "extractors_location_idx" ON "extractors" USING btree ("x","y");--> statement-breakpoint
CREATE INDEX "extractors_position_spatial_idx" ON "extractors" USING gist ("position");--> statement-breakpoint
CREATE INDEX "player_scans_session_time_idx" ON "player_scans" USING btree ("session_id","scanned_at");--> statement-breakpoint
CREATE INDEX "player_scans_center_spatial_idx" ON "player_scans" USING gist ("scan_center");--> statement-breakpoint
CREATE INDEX "player_scans_area_spatial_idx" ON "player_scans" USING gist ("scan_area");--> statement-breakpoint
CREATE INDEX "players_session_id_idx" ON "players" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "players_last_active_idx" ON "players" USING btree ("last_active");--> statement-breakpoint
CREATE INDEX "players_world_id_idx" ON "players" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "resource_claims_player_idx" ON "resource_claims" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "resource_claims_vein_idx" ON "resource_claims" USING btree ("resource_vein_id");--> statement-breakpoint
CREATE INDEX "resource_claims_activity_idx" ON "resource_claims" USING btree ("last_activity");--> statement-breakpoint
CREATE INDEX "resource_veins_world_id_idx" ON "resource_veins" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "resource_veins_type_idx" ON "resource_veins" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "resource_veins_location_idx" ON "resource_veins" USING btree ("center_x","center_y");--> statement-breakpoint
CREATE INDEX "resource_veins_center_spatial_idx" ON "resource_veins" USING gist ("center_point");--> statement-breakpoint
CREATE INDEX "resource_veins_area_spatial_idx" ON "resource_veins" USING gist ("extraction_area");--> statement-breakpoint
CREATE INDEX "world_events_type_idx" ON "world_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "world_events_time_idx" ON "world_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "worlds_name_idx" ON "worlds" USING btree ("name");--> statement-breakpoint
CREATE INDEX "worlds_active_idx" ON "worlds" USING btree ("is_active");


-- Enable PostGIS extension for spatial data support
CREATE EXTENSION IF NOT EXISTS postgis;
