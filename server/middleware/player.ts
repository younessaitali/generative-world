import { defineEventHandler, getCookie, setCookie, createError } from 'h3';
import { eq } from 'drizzle-orm';
import { db } from '~~/server/database/connection';
import { players, worlds } from '~~/server/database/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Player middleware that ensures every request has a valid player context
 * Creates a temporary player ID using browser session and persists it in the database
 */
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) {
    return;
  }

  try {
    let sessionId = getCookie(event, 'player-session-id');

    if (!sessionId) {
      sessionId = uuidv4();
      setCookie(event, 'player-session-id', sessionId, {
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    }

    let player = await db
      .select()
      .from(players)
      .where(eq(players.sessionId, sessionId))
      .then((rows) => rows[0] || null);

    if (!player) {
      let defaultWorld = await db
        .select()
        .from(worlds)
        .where(eq(worlds.isActive, true))
        .then((rows) => rows[0] || null);

      if (!defaultWorld) {
        const newWorld = {
          name: 'Default World',
          seed: 'default-seed-' + Math.random().toString(36).substring(7),
          description: 'Default world for new players',
          isActive: true,
        };
        const createdWorlds = await db.insert(worlds).values(newWorld).returning();
        defaultWorld = createdWorlds[0];
      }

      const newPlayer = {
        sessionId,
        worldId: defaultWorld.id,
        name: null,
        inventory: {},
        credits: 1000,
        lastActive: new Date(),
      };

      const createdPlayers = await db.insert(players).values(newPlayer).returning();

      player = createdPlayers[0];
    } else {
      await db.update(players).set({ lastActive: new Date() }).where(eq(players.id, player.id));
    }

    event.context.player = player;
    event.context.playerId = player.id;
    event.context.sessionId = sessionId;
  } catch (error) {
    console.error('Player middleware error:', error);
    // Don't block the request on player setup failure
    // API endpoints can handle missing player context gracefully
  }
});
