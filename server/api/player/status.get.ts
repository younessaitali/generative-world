import { defineEventHandler, createError } from 'h3';

export default defineEventHandler(async (event) => {
  const player = event.context.player;
  const sessionId = event.context.sessionId;

  if (!player) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Player not initialized',
    });
  }

  return {
    success: true,
    player: {
      id: player.id,
      sessionId: sessionId,
      name: player.name || 'Anonymous Player',
      inventory: player.inventory || {},
      credits: player.credits || 0,
      lastActive: player.lastActive,
      createdAt: player.createdAt,
    },
  };
});
