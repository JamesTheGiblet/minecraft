/**
 * Boot Stage 00: Knowledge Gate Verification.
 * Ensures the AI is properly grounded before it is allowed to operate.
 */
module.exports = async (bot, sharedState) => {
  if (typeof sharedState.runKnowledgeGate !== 'function') {
    console.warn('[Boot] WARNING: Knowledge Gate plugin not found. The AI\'s core knowledge has not been verified.');
    return;
  }

  const isVerified = await sharedState.runKnowledgeGate();
  if (!isVerified) {
    throw new Error('Knowledge Gate verification failed.');
  }
};