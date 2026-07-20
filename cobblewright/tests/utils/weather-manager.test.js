const weatherManager = require('../../plugins/weather-manager.js');

describe('Weather Manager Plugin', () => {
  let mockBot;
  let mockSharedState;
  let weatherCommandHandler;

  // This runs before each test, setting up a clean environment
  beforeEach(() => {
    // Create mock objects that simulate the real bot and sharedState
    mockBot = {
      weather: {
        rain: 0,
        thunder: 0,
      },
      chat: jest.fn(), // A mock function to spy on bot.chat calls
    };

    mockSharedState = {
      say: jest.fn(), // A mock function to spy on sharedState.say calls
      recordTaskOutcome: jest.fn(),
      // Simulate the command registration process
      registerCommand: jest.fn((name, handler) => {
        if (name === 'weather') {
          weatherCommandHandler = handler;
        }
      }),
    };

    // Initialize the plugin with our mock objects
    weatherManager(mockBot, mockSharedState);
  });

  it('should register the /weather command on initialization', () => {
    expect(mockSharedState.registerCommand).toHaveBeenCalledWith('weather', expect.any(Function));
    expect(weatherCommandHandler).toBeDefined();
  });

  describe('/weather check', () => {
    it('should report clear skies when not raining', () => {
      mockBot.weather.rain = 0;
      weatherCommandHandler('testUser', ['check']);
      expect(mockSharedState.say).toHaveBeenCalledWith('The skies are clear! A beautiful day for building.');
    });

    it('should report rain when it is raining', () => {
      mockBot.weather.rain = 1;
      mockBot.weather.thunder = 0;
      weatherCommandHandler('testUser', ['check']);
      expect(mockSharedState.say).toHaveBeenCalledWith('It\'s raining. Perfect weather for some indoor decorating.');
    });

    it('should report thunder when it is thundering', () => {
      mockBot.weather.rain = 1;
      mockBot.weather.thunder = 1;
      weatherCommandHandler('testUser', ['check']);
      expect(mockSharedState.say).toHaveBeenCalledWith('It\'s currently thundering. A great day to stay inside and build!');
    });
  });

  describe('/weather clear', () => {
    it('should call bot.chat with the correct command and record telemetry', () => {
      weatherCommandHandler('testUser', ['clear']);
      expect(mockSharedState.say).toHaveBeenCalledWith('Attempting to clear the skies...');
      expect(mockBot.chat).toHaveBeenCalledWith('/weather clear');
      expect(mockSharedState.recordTaskOutcome).toHaveBeenCalledWith('clear_weather', true, { triggeredBy: 'testUser' });
    });
  });
});