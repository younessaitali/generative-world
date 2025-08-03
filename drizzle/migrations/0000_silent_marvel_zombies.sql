CREATE TABLE "player_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"chunk_id" uuid NOT NULL,
	"scan_x" real NOT NULL,
	"scan_y" real NOT NULL,
	"scan_radius" real NOT NULL,
	"scan_type" text NOT NULL,
	"results" jsonb NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_veins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk_id" uuid NOT NULL,
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
CREATE TABLE "world_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk_x" integer NOT NULL,
	"chunk_y" integer NOT NULL,
	"biome_data" jsonb NOT NULL,
	"elevation_data" jsonb NOT NULL,
	"resource_data" jsonb,
	"terrain_data" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"chunk_id" uuid,
	"event_data" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_scans" ADD CONSTRAINT "player_scans_chunk_id_world_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."world_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_veins" ADD CONSTRAINT "resource_veins_chunk_id_world_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."world_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_chunk_id_world_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."world_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_scans_session_idx" ON "player_scans" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "player_scans_chunk_idx" ON "player_scans" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "player_scans_type_idx" ON "player_scans" USING btree ("scan_type");--> statement-breakpoint
CREATE INDEX "player_scans_time_idx" ON "player_scans" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "resource_veins_chunk_id_idx" ON "resource_veins" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "resource_veins_type_idx" ON "resource_veins" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "resource_veins_location_idx" ON "resource_veins" USING btree ("center_x","center_y");--> statement-breakpoint
CREATE INDEX "chunk_coordinates_idx" ON "world_chunks" USING btree ("chunk_x","chunk_y");--> statement-breakpoint
CREATE INDEX "updated_at_idx" ON "world_chunks" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "world_events_type_idx" ON "world_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "world_events_chunk_idx" ON "world_events" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "world_events_time_idx" ON "world_events" USING btree ("created_at");