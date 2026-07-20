/**
 * @file Provides a lightweight telemetry service for tracking task outcomes.
 * This helps measure the reliability of the bot's actions, a key goal
 * outlined in the project's strategic documents.
 */

module.exports = (bot, sharedState) => {
  /**
   * Records the outcome of a specific task.
   * @param {string} taskName - A unique identifier for the task (e.g., 'gather_wood', 'clear_weather').
   * @param {boolean} isSuccess - Whether the task succeeded or failed.
   * @param {object} [details={}] - Optional additional details about the outcome.
   */
  const recordTaskOutcome = (taskName, isSuccess, details = {}) => {
    const outcome = isSuccess ? 'SUCCESS' : 'FAILURE';
    const logEntry = {
      timestamp: new Date().toISOString(),
      taskName,
      outcome,
      ...details,
    };

    // For now, we just log to the console. This could be expanded to write to a file or database.
    console.log(`[Telemetry] Task Outcome: ${JSON.stringify(logEntry)}`);
  };

  // Expose the function to other plugins via sharedState.
  sharedState.recordTaskOutcome = recordTaskOutcome;
};