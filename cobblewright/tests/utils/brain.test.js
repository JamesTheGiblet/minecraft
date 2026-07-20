const brainPlugin = require('../../plugins/brain.js');
const { Vec3 } = require('vec3');

describe('Brain Plugin', () => {
  let mockBot;
  let mockSharedState;
  let mockCallOllama;

  beforeEach(() => {
    mockCallOllama = jest.fn();

    mockBot = {
      username: 'cobblewright',
      version: '1.21.1',
      game: { dimension: 'overworld' },
      players: {
        testUser: {
          entity: {
            position: new Vec3(0, 64, 0),
          },
        },
      },
      entity: {
        position: new Vec3(5, 64, 5),
      },
      entities: {},
      blockAt: jest.fn(() => ({
        name: 'grass_block',
        biome: { name: 'plains' },
      })),
      health: 20,
      food: 20,
    };

    mockSharedState = {
      CONFIG: {
        BOT_NAME: 'cobblewright',
        LLM_MODEL: 'test-model',
      },
      say: jest.fn(),
      getInventorySummary: jest.fn(() => ({
        woodLogs: 10,
        planks: 20,
        stone: 30,
        total: 60,
      })),
      playerStates: new Map([
        ['testUser', { currentStyle: 'rustic', lastActivityTime: Date.now() }],
      ]),
      memoryLog: [],
      pointsOfInterest: new Map(),
      getHomePosition: () => new Vec3(0, 64, 0),
      getHomeRadius: () => 16,
      addMemory: jest.fn(),
      recordAuditEvent: jest.fn(),
      // The core dependency we are mocking and spying on
      callOllama: mockCallOllama,
    };

    // Initialize the plugin, which will override the placeholder functions on sharedState
    brainPlugin(mockBot, mockSharedState);
  });

  it('should expose its core functions to sharedState', () => {
    expect(mockSharedState.getArchitectAdvice).toBeInstanceOf(Function);
    expect(mockSharedState.getInspiration).toBeInstanceOf(Function);
    expect(mockSharedState.buildAwarenessPromptContext).toBeInstanceOf(Function);
  });

  describe('getArchitectAdvice', () => {
    it('should call Ollama with a well-formed prompt', async () => {
      // Simulate a valid JSON response from the AI
      const mockAdvice = {
        observation: 'Test observation',
        step1: 'Test step 1',
        step2: 'Test step 2',
        goal: 'Test goal',
      };
      mockCallOllama.mockResolvedValue(JSON.stringify(mockAdvice));

      await mockSharedState.getArchitectAdvice('testUser');

      // Verify that the call to the AI happened
      expect(mockCallOllama).toHaveBeenCalled();

      // Check that the prompt contains key pieces of context
      const prompt = mockCallOllama.mock.calls[0][0];
      expect(prompt).toContain('You are CobbleWright');
      expect(prompt).toContain('Current situation:');
      expect(prompt).toContain('Biome: plains');
      expect(prompt).toContain('Bot\'s Key Materials (proxy for area resources): 10 logs, 20 planks, 30 stone.');
    });

    it('should parse a valid JSON response and say the advice', async () => {
      const mockAdvice = {
        observation: 'The area is clear.',
        step1: 'Gather some wood.',
        step2: 'Build a crafting table.',
        goal: 'To get started!',
      };
      mockCallOllama.mockResolvedValue(`Here is the JSON: ${JSON.stringify(mockAdvice)}`);

      await mockSharedState.getArchitectAdvice('testUser');

      // Verify that the bot "said" the formatted advice
      expect(mockSharedState.say).toHaveBeenCalledWith('🏛️ The area is clear. Step 1: Gather some wood. Step 2: Build a crafting table. To get started!');
      // Verify that a memory was added
      expect(mockSharedState.addMemory).toHaveBeenCalled();
    });

    it('should handle an invalid JSON response gracefully', async () => {
      mockCallOllama.mockResolvedValue('Oops, I forgot the JSON format.');

      await mockSharedState.getArchitectAdvice('testUser');

      // Verify that it gave a user-friendly error message instead of crashing
      expect(mockSharedState.say).toHaveBeenCalledWith("My thoughts are a bit scrambled right now. Let's try something simpler.");
      // Verify that no memory was added on failure
      expect(mockSharedState.addMemory).not.toHaveBeenCalled();
    });
  });
});