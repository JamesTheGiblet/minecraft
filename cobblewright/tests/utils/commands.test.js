const commandsPlugin = require('../../plugins/commands.js');
const http = require('http');

// Mock the http module to prevent real network requests during tests
jest.mock('http');

describe('Commands Plugin', () => {
  // Tell Jest to use fake timers (setTimeout, setInterval, etc.)
  beforeAll(() => {
    jest.useFakeTimers();
  });

  // Restore real timers after all tests in this file have run
  afterAll(() => {
    jest.useRealTimers();
  });

  let mockBot;
  let mockSharedState;
  let chatCallback; // To capture the 'chat' event handler

  beforeEach(() => {
    // Reset mocks before each test to ensure a clean slate
    chatCallback = null;
    const getMock = jest.fn().mockImplementation(cb => {
      const res = { statusCode: 200, on: jest.fn() };
      cb(res);
      return { on: jest.fn(), setTimeout: jest.fn() };
    });
    http.get.mockImplementation(getMock);

    mockBot = {
      username: 'cobblewright',
      // Simulate the bot's event emitter
      on: jest.fn((event, callback) => {
        if (event === 'chat') {
          chatCallback = callback; // Capture the chat handler to simulate chat messages
        }
      }),
    };

    mockSharedState = {
      say: jest.fn(),
      updatePlayerActivity: jest.fn(),
      getArchitectAdvice: jest.fn(),
      getInspiration: jest.fn(),
      // Mock other plugin states/functions that commands.js might use
      playerStates: new Map([['testUser', { currentStyle: 'rustic' }]]),
      STYLES_DATA: { rustic: {}, modern: {} },
      startTime: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      memoryLog: [],
      CONFIG: {
        OLLAMA_HOST: 'localhost',
        OLLAMA_PORT: 11434,
      },
      // Mock functions provided by other plugins
      recordAuditEvent: jest.fn(),
    };

    // Initialize the plugin with our mocks. This will register the base commands.
    commandsPlugin(mockBot, mockSharedState);
  });

  it('should register the registerCommand function on sharedState', () => {
    expect(mockSharedState.registerCommand).toBeInstanceOf(Function);
  });

  it('should execute a registered direct command', () => {
    // Simulate a player typing 'help'
    chatCallback('testUser', 'help');
    expect(mockSharedState.say).toHaveBeenCalledWith(expect.stringContaining("I'm here to help"));
  });

  it('should execute a command with an alias', () => {
    // 'm' is an alias for 'materials'
    mockSharedState.getInventorySummary = jest.fn(() => ({ total: 0 })); // Mock the dependency
    chatCallback('testUser', 'm');
    expect(mockSharedState.getInventorySummary).toHaveBeenCalled();
  });

  describe('Natural Language Intent Parser', () => {
    it('should parse a build request addressed to the bot', () => {
      chatCallback('testUser', 'cobblewright what should we build next?');
      jest.runAllTimers();
      // The test checks if the function that handles build advice was called.
      expect(mockSharedState.getArchitectAdvice).toHaveBeenCalledWith('testUser', 'chat');
    });

    it('should parse a weather clear request', () => {
      // We need to register the 'weather' command for this test
      let weatherHandler;
      mockSharedState.registerCommand('weather', (username, args) => {
        weatherHandler(username, args);
      });
      weatherHandler = jest.fn();

      chatCallback('testUser', 'hey cobblewright, can you clear the weather');
      expect(weatherHandler).toHaveBeenCalledWith('testUser', ['weather', 'clear']);
    });

    it('should parse a gather request with an amount', () => {
      let gatherHandler = jest.fn();
      mockSharedState.registerCommand('gather', gatherHandler);

      chatCallback('testUser', 'cobblewright, please gather 50 stone for me');
      expect(gatherHandler).toHaveBeenCalledWith('testUser', ['gather', 'stone', '50']);
    });

    it('should parse a gather request without an amount', () => {
      let gatherHandler = jest.fn();
      mockSharedState.registerCommand('gather', gatherHandler);

      chatCallback('testUser', 'cobblewright gather oak_log');
      expect(gatherHandler).toHaveBeenCalledWith('testUser', ['gather', 'oak_log']);
    });

    it('should ignore messages not addressed to the bot', () => {
      chatCallback('testUser', 'what should I build next?');
      // None of the bot's core functions should be called
      expect(mockSharedState.getArchitectAdvice).not.toHaveBeenCalled();
      expect(mockSharedState.say).not.toHaveBeenCalled();
    });

    it('should not trigger on partial matches in other words', () => {
      // This ensures 'bot' in 'bottom' doesn't trigger the status check
      chatCallback('testUser', 'check the bottom status of the farm');
      expect(mockSharedState.say).not.toHaveBeenCalled();
    });

    it('should handle a complex project start command', () => {
      let projectHandler = jest.fn();
      mockSharedState.registerCommand('project', projectHandler);

      chatCallback('testUser', 'cobblewright, let\'s start a project called build a giant castle');
      expect(projectHandler).toHaveBeenCalledWith('testUser', ['project', 'start', 'build', 'a', 'giant', 'castle']);
    });
  });
});