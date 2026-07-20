const leightonLoopPlugin = require('../../plugins/leighton-loop.js');

// Note: This test file was moved from tests/utils to tests/plugins
describe('Leighton Loop Plugin', () => {
  let mockBot;
  let mockSharedState;
  let critiqueLoopIntervalCallback;

  beforeEach(() => {
    // Use fake timers to control setInterval
    jest.useFakeTimers();

    critiqueLoopIntervalCallback = null;
    const mockSetInterval = (callback, _duration) => {
      critiqueLoopIntervalCallback = callback;
    };

    mockBot = {
      on: jest.fn(),
      once: jest.fn((event, callback) => {
        // Capture the setInterval call made on 'login'
        if (event === 'login') {
          // Temporarily override global setInterval to capture the callback
          const originalSetInterval = global.setInterval;
          global.setInterval = mockSetInterval;
          callback();
          global.setInterval = originalSetInterval; // Restore it immediately
        }
      }),
    };

    mockSharedState = {
      CONFIG: { ADVICE_INTERVAL_MS: 60000 },
      playerStates: new Map([
        ['testUser', { lastActivityTime: Date.now(), inactivityThreshold: 30000 }],
      ]),
      memoryLog: [], // We will populate this in each test
      getInventorySummary: jest.fn(),
      getActiveProject: jest.fn().mockResolvedValue(null),
      // These must be defined before the plugin is loaded
      getLearningProfile: jest.fn().mockResolvedValue({}),
      saveLearningProfile: jest.fn().mockResolvedValue(),
      updateMemory: jest.fn().mockResolvedValue(),
    };

    // Initialize the plugin
    leightonLoopPlugin(mockBot, mockSharedState);
  });

  afterEach(() => {
    // Restore real timers after each test
    jest.useRealTimers();
  });

  it('should expose its telemetry functions to sharedState', () => {
    expect(mockSharedState.getLearningTelemetrySnapshot).toBeInstanceOf(Function);
    expect(mockSharedState.recordHazardEvent).toBeInstanceOf(Function);
  });

  describe('Critique Loop Logic', () => {
    it('should score advice as "likely_successful" when player activity aligns with the advice', async () => {
      // 1. Setup: Create a past advice capsule
      const adviceTimestamp = Date.now() - 70000; // 70 seconds ago
      const adviceCapsule = {
        id: 'advice_123',
        type: 'advice',
        outcome: 'unknown',
        timestamp: adviceTimestamp,
        context: {
          username: 'testUser',
          inventory: { woodLogs: 10 },
          telemetryAtAdvice: { movementDistance: 5, blockChangesNearPlayer: 2, hazardEvents: 0 },
        },
      };
      mockSharedState.memoryLog.push(adviceCapsule);

      // 2. Simulate player activity since the advice was given
      // Player moved, changed blocks, and used the advised material
      mockSharedState.getInventorySummary.mockReturnValue({ woodLogs: 5 }); // Wood logs decreased
      mockSharedState.getLearningTelemetrySnapshot = () => ({
        movementDistance: 50, // Increased from 5
        blockChangesNearPlayer: 20, // Increased from 2
        hazardEvents: 0,
      });

      // 3. Trigger the critique loop
      const critiquePromise = critiqueLoopIntervalCallback();
      await jest.runAllTimersAsync(); // Allow promises within the loop to resolve
      await critiquePromise;

      // 4. Assertions
      // Check that the capsule outcome was updated
      expect(adviceCapsule.outcome).toBe('likely_successful');
      expect(adviceCapsule.learningSignals.compositeScore).toBeGreaterThan(0.3);

      // Check that the learning profile was updated with a success
      expect(mockSharedState.saveLearningProfile).toHaveBeenCalled();
      const savedProfile = mockSharedState.saveLearningProfile.mock.calls[0][1];
      expect(savedProfile.successCount).toBe(1);
      expect(savedProfile.failureCount).toBe(0);
    });

    it('should score advice as "likely_failed" when player is hurt and makes no progress', async () => {
      // 1. Setup
      const adviceTimestamp = Date.now() - 70000;
      const adviceCapsule = {
        id: 'advice_456',
        type: 'advice',
        outcome: 'unknown',
        timestamp: adviceTimestamp,
        context: {
          username: 'testUser',
          inventory: { stone: 20 },
          telemetryAtAdvice: { movementDistance: 10, blockChangesNearPlayer: 5, hazardEvents: 0 },
        },
      };
      mockSharedState.memoryLog.push(adviceCapsule);

      // 2. Simulate player inactivity and danger
      mockSharedState.getInventorySummary.mockReturnValue({ stone: 20 }); // No change in stone
      mockSharedState.getLearningTelemetrySnapshot = () => ({
        movementDistance: 12, // Very little movement
        blockChangesNearPlayer: 5, // No blocks changed
        hazardEvents: 2, // Player got hurt
      });

      // 3. Trigger the critique loop
      const critiquePromise = critiqueLoopIntervalCallback();
      await jest.runAllTimersAsync(); // Allow promises within the loop to resolve
      await critiquePromise;

      // 4. Assertions
      expect(adviceCapsule.outcome).toBe('likely_failed');
      expect(adviceCapsule.learningSignals.compositeScore).toBeLessThanOrEqual(0);
      expect(adviceCapsule.learningSignals.failurePatterns).toContain('hazard_pressure');
      expect(adviceCapsule.learningSignals.failurePatterns).toContain('no_build_progress');

      // Check that the learning profile was updated with a failure
      expect(mockSharedState.saveLearningProfile).toHaveBeenCalled();
      const savedProfile = mockSharedState.saveLearningProfile.mock.calls[0][1];
      expect(savedProfile.successCount).toBe(0);
      expect(savedProfile.failureCount).toBe(1);
      expect(savedProfile.topFailurePatterns).toContain('hazard_pressure');
    });

    it('should not critique a capsule if not enough time has passed', async () => {
      // 1. Setup: Advice was given only 10 seconds ago
      const adviceTimestamp = Date.now() - 10000;
      const adviceCapsule = {
        id: 'advice_789',
        type: 'advice',
        outcome: 'unknown',
        timestamp: adviceTimestamp,
        context: { username: 'testUser' },
      };
      mockSharedState.memoryLog.push(adviceCapsule);

      // 2. Trigger the critique loop
      await critiqueLoopIntervalCallback();

      // 3. Assertions: The outcome should remain 'unknown'
      expect(adviceCapsule.outcome).toBe('unknown');
      expect(mockSharedState.saveLearningProfile).not.toHaveBeenCalled();
      expect(mockSharedState.updateMemory).not.toHaveBeenCalled();
    });
  });
});