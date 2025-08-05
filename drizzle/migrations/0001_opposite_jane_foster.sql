CREATE TABLE "extractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"resource_type" text NOT NULL,
	"status" text DEFAULT 'IDLE' NOT NULL,
	"efficiency" real DEFAULT 1 NOT NULL,
	"last_tick" timestamp DEFAULT now() NOT NULL,
	"storage" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "extractors_unique_location_constraint" UNIQUE("x","y","world_id")
);
--> statement-breakpoint
ALTER TABLE "extractors" ADD CONSTRAINT "extractors_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractors" ADD CONSTRAINT "extractors_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extractors_player_id_idx" ON "extractors" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "extractors_world_id_idx" ON "extractors" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "extractors_location_idx" ON "extractors" USING btree ("x","y");--> statement-breakpoint
CREATE INDEX "extractors_status_idx" ON "extractors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "extractors_resource_type_idx" ON "extractors" USING btree ("resource_type");