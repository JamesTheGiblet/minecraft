/**
 * @file This plugin makes the bot react to player events.
 * It gives the bot a personality by making it seem more aware of the world.
 */

module.exports = (bot, sharedState) => {
  // A set to keep track of tamed animals we've already greeted.
  const greetedTamedAnimals = new Set();
  const autoComeEnabled = sharedState?.CONFIG?.AUTO_COME_ON_PLAYER_JOIN !== false;
  const configuredAutoComeDelay = Number.parseInt(sharedState?.CONFIG?.AUTO_COME_DELAY_MS, 10);
  const autoComeDelayMs = Number.isInteger(configuredAutoComeDelay) && configuredAutoComeDelay >= 0
    ? configuredAutoComeDelay
    : 1500;
  const autoComeOnlyFor = String(sharedState?.CONFIG?.AUTO_COME_ONLY_FOR || '').trim().toLowerCase();

  const shouldAutoComeFor = (username) => {
    if (!autoComeEnabled) return false;
    if (!username || username === bot.username) return false;
    if (!autoComeOnlyFor) return true;
    return String(username).toLowerCase() === autoComeOnlyFor;
  };

  const triggerAutoCome = (username) => {
    if (!shouldAutoComeFor(username)) return;

    setTimeout(() => {
      if (typeof sharedState.startFollowingPlayer === 'function') {
        sharedState.startFollowingPlayer(username, {
          message: `Welcome back, ${username}. I am on my way to you.`
        });
        return;
      }

      const player = bot.players?.[username];
      if (!player?.entity) return;

      const { GoalFollow } = require('mineflayer-pathfinder').goals;
      bot.pathfinder.setGoal(new GoalFollow(player.entity, 1), true);
    }, autoComeDelayMs);
  };

  // Welcome players when they join
  bot.on('playerJoined', (player) => {
    if (player.username !== bot.username) {
      setTimeout(() => {
        sharedState.say(`Welcome to the server, ${player.username}! Let me know if you need any building advice.`);
      }, 3000);

      triggerAutoCome(player.username);
    }
  });

  // Offer specific, personalized condolences on player death by parsing chat messages.
  bot.on('messagestr', (message, messagePosition, jsonMsg) => {
    if (messagePosition !== 'chat') return;

    // This regex is designed to capture the most common death message formats.
    const deathRegex = /^(\w+) (was slain by|was shot by|drowned|blew up|fell from a high place|hit the ground too hard|starved to death|suffocated in a wall)/;
    const match = message.match(deathRegex);

    if (match) {
      const deadPlayer = match[1];
      const deathReason = match[2];

      // Don't comment on the bot's own death.
      if (deadPlayer === bot.username) return;

      let condolence = `Oh no, ${deadPlayer}!`;
      if (deathReason.includes('fell') || deathReason.includes('hit the ground')) {
        condolence += " That's a long way down... a gentle reminder to watch your step on high builds!";
      } else if (deathReason.includes('drowned')) {
        condolence += " The sea is a cruel mistress. Maybe some turtle shell armor is in order?";
      } else if (deathReason.includes('slain') || deathReason.includes('shot')) {
        condolence += " A valiant effort! Let's get you geared up for round two.";
      } else {
        condolence += " Don't worry, every great structure is built on the foundations of a few mistakes.";
      }
      sharedState.say(`💀 ${condolence}`);
    }
  });

  // Congratulate on finding rare items
  bot.on('entityCollect', (collector, collected) => {
    if (collector.type !== 'player') return;

    const itemName = collected.name;
    if (itemName === 'diamond' || itemName === 'emerald' || itemName === 'ancient_debris') {
      sharedState.say(`💎 An excellent find, ${collector.username}! ${itemName} opens up a whole new tier of possibilities.`);
    }
  });

  // Wish players good night
  bot.on('sleep', () => {
    sharedState.say("A builder needs their rest. Sweet dreams!");
  });

  // Say good morning
  bot.on('wake', () => {
    sharedState.say("Good morning! A new day to build something amazing.");
  });

  // Congratulate on achievements
  bot.on('achievement', (achievement) => {
    sharedState.say(`🎉 Great job on completing the achievement: "${achievement}"! Progress!`);
  });

  // Congratulate on taming an animal
  bot.on('entityUpdate', (entity) => {
    // Check if it's a tameable animal and we haven't greeted it before.
    const isTameable = ['wolf', 'cat', 'ocelot', 'horse', 'donkey', 'mule', 'parrot'].includes(entity.name);
    if (!isTameable || greetedTamedAnimals.has(entity.uuid)) {
      return;
    }

    // Check if the entity is now tamed and owned by a player.
    // The `owner` property is the UUID of the owning player.
    if (entity.owner) {
      const ownerPlayer = Object.values(bot.players).find(p => p.uuid === entity.owner);

      if (ownerPlayer) {
        // We found a newly tamed animal!
        sharedState.say(`🐾 A new friend! Congratulations on taming the ${entity.name}, ${ownerPlayer.username}!`);

        // Add it to the set so we don't greet it again.
        greetedTamedAnimals.add(entity.uuid);
      }
    }
  });
};