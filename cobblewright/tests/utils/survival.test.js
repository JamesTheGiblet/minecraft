const survivalPlugin = require('../../plugins/survival.js');
const { Vec3 } = require('vec3');

describe('Survival Plugin', () => {
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
  const commandHandlers = {};

  beforeEach(() => {
    // Reset mocks before each test
    commandHandlers.sethome = null;
    commandHandlers.home = null;
    commandHandlers.gohome = null;

    mockBot = {
      players: {
        testUser: {
          entity: {
            position: new Vec3(10, 64, 20),
          },
        },
      },
      pathfinder: {
        setGoal: jest.fn(),
        stop: jest.fn(),
        goto: jest.fn().mockResolvedValue(), // Add mock for goto
      },
      // Mock the event emitter functionality
      on: jest.fn(),
      once: jest.fn(),
      loadPlugin: jest.fn(), // Add mock for loadPlugin
    };

    mockSharedState = {
      homePosition: null,
      homeRadius: 16,
      say: jest.fn(),
      registerCommand: jest.fn((name, handler) => {
        commandHandlers[name] = handler;
      }),
      applySafeMovements: jest.fn(),
      applyNonDestructiveMovements: jest.fn(),
    };

    // Initialize the plugin with our mocks
    survivalPlugin(mockBot, mockSharedState);
  });

  it('should register the home-related commands', () => {
    expect(mockSharedState.registerCommand).toHaveBeenCalledWith('sethome', expect.any(Function), ['sethomehere']);
    expect(mockSharedState.registerCommand).toHaveBeenCalledWith('home', expect.any(Function));
    expect(mockSharedState.registerCommand).toHaveBeenCalledWith('gohome', expect.any(Function), ['returnhome']);
  });

  describe('/sethome', () => {
    it('should set the home position to the current player\'s location', () => {
      commandHandlers.sethome('testUser');
      expect(mockSharedState.homePosition).toEqual(new Vec3(10, 64, 20));
      expect(mockSharedState.say).toHaveBeenCalledWith('Home set to testUser\'s position at X: 10, Y: 64, Z: 20.');
    });

    it('should report an error if the player cannot be seen', () => {
      commandHandlers.sethome('unknownUser');
      expect(mockSharedState.homePosition).toBeNull();
      expect(mockSharedState.say).toHaveBeenCalledWith("I can't see you right now, so I can't set home to your location.");
    });
  });

  describe('/home', () => {
    it('should report the home position when it is set', () => {
      mockSharedState.homePosition = new Vec3(100, 70, -50);
      commandHandlers.home('testUser');
      expect(mockSharedState.say).toHaveBeenCalledWith('Current saved home is X: 100, Y: 70, Z: -50 (radius 16).');
    });

    it('should report that no home is set', () => {
      commandHandlers.home('testUser');
      expect(mockSharedState.say).toHaveBeenCalledWith('No home is currently saved. Use sethome to anchor one to your location.');
    });
  });

  describe('/gohome', () => {
    it('should pathfind to the home position', async () => {
      mockSharedState.homePosition = new Vec3(100, 70, -50);
      await commandHandlers.gohome('testUser');
      expect(mockSharedState.say).toHaveBeenCalledWith('Returning home now.');
      // We check that goto was called and that the goal has the correct coordinates.
      expect(mockBot.pathfinder.goto).toHaveBeenCalled();
      const goal = mockBot.pathfinder.goto.mock.calls[0][0];
      expect(goal.x).toBe(100);
      expect(goal.y).toBe(70);
      expect(goal.z).toBe(-50);
    });
  });
});
