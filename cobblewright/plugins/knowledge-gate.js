/**
 * @file This plugin acts as a knowledge gate, verifying the AI's core understanding at startup.
 * It runs a data-driven test suite loaded from semantic capsules before allowing the bot to connect.
 */

const { get } = require('../utils/object-helpers.js');

module.exports = (bot, sharedState) => {
  /**
   * Runs the knowledge verification check.
   * @returns {Promise<boolean>} True if the knowledge is verified, false otherwise.
   */
  const verifyKnowledge = async () => {
    console.log('[KnowledgeGate] Running startup knowledge verification...');

    // 1. Find the required capsules.
    const coreKnowledge = sharedState.S_C?.find(c => c.id?.includes('minecraft_gameplay_core'));
    const testSuiteCapsule = sharedState.S_C?.find(c => c.id?.includes('knowledge_gate_tests'));

    if (!coreKnowledge) {
      console.error('[KnowledgeGate] CRITICAL: Core knowledge capsule (`minecraft_gameplay_core`) not found. Halting.');
      return false;
    }
    if (!testSuiteCapsule || !testSuiteCapsule.content?.tests) {
      console.error('[KnowledgeGate] CRITICAL: Test suite capsule (`knowledge_gate_tests`) not found or is malformed. Halting.');
      return false;
    }
    if (typeof sharedState.askLLM !== 'function') {
      console.error('[KnowledgeGate] CRITICAL: `sharedState.askLLM` function not available. Halting.');
      return false;
    }

    const verificationTests = testSuiteCapsule.content.tests;
    console.log(`[KnowledgeGate] Found ${verificationTests.length} verification tests to run.`);

    for (const test of verificationTests) {
      console.log(`[KnowledgeGate] Running test: "${test.name}"...`);

      // 2. Dynamically resolve the context for the test.
      const testContext = get(coreKnowledge, test.context_ref.replace('minecraft_gameplay_core.', ''));
      if (!testContext) {
        console.error(`[KnowledgeGate] ❌ CRITICAL: Could not resolve context reference "${test.context_ref}" for test "${test.name}". Halting.`);
        return false;
      }

      const prompt = `
        Based *only* on the provided context about Minecraft gameplay, answer the following question.
        Do not use any other knowledge.
        Context: ${JSON.stringify(testContext)}
        Question: ${test.question}
        Answer in one or two words.
      `;

      try {
        const response = await sharedState.askLLM(prompt);
        const answer = response.toLowerCase().trim();
        console.log(`[KnowledgeGate] LLM Response for "${test.name}": "${answer}"`);

        const isVerified = test.keywords.some(keyword => answer.includes(keyword));

        if (!isVerified) {
          console.error(`[KnowledgeGate] ❌ CRITICAL: Verification FAILED for test "${test.name}".`);
          console.error(`[KnowledgeGate] Expected response to include one of: [${test.keywords.join(', ')}]. Halting.`);
          return false;
        }
      } catch (error) {
        console.error(`[KnowledgeGate] ❌ CRITICAL: An error occurred during LLM verification for test "${test.name}": ${error.message}`);
        return false;
      }
    }

    console.log('[KnowledgeGate] ✅ All knowledge verification tests passed. AI is correctly grounded.');
    return true;
  };

  // Expose the verification function to the architect.
  sharedState.runKnowledgeGate = verifyKnowledge;
};