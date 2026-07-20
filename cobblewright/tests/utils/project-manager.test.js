const projectManagerPlugin = require('../../plugins/project-manager.js');
const { Pool } = require('pg');

// Mock the 'pg' module to prevent real database connections
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockPool = {
    query: mockQuery,
    end: jest.fn().mockResolvedValue(),
  };
  return {
    Pool: jest.fn(() => mockPool),
    // Expose the mock query function so we can control it in tests
    __mockQuery: mockQuery,
  };
});

describe('Project Manager Plugin', () => {
  let mockBot;
  let mockSharedState;
  let projectCommandHandler;
  let mockQuery;

  beforeEach(() => {
    // Reset mocks before each test
    mockQuery = require('pg').__mockQuery;
    mockQuery.mockReset();

    mockBot = {
      once: jest.fn(),
    };

    mockSharedState = {
      CONFIG: {
        POSTGRES_URL: 'postgresql://postgres:postgres@localhost:5432/cobblewright_test',
      },
      say: jest.fn(),
      registerCommand: jest.fn((name, handler) => {
        if (name === 'project') {
          projectCommandHandler = handler;
        }
      }),
      // Mock dependencies from the brain plugin
      callOllama: jest.fn(),
      buildAwarenessPromptContext: jest.fn().mockResolvedValue('Test awareness context.'),
    };

    // Initialize the plugin with mocks
    projectManagerPlugin(mockBot, mockSharedState);

    // Simulate the 'login' event to trigger schema setup
    const loginCallback = mockBot.once.mock.calls.find(call => call[0] === 'login')[1];
    // Mock the initial schema check to resolve successfully
    mockQuery.mockResolvedValue({ rows: [] });
    loginCallback();
  });

  it('should register the /project command', () => {
    expect(mockSharedState.registerCommand).toHaveBeenCalledWith('project', expect.any(Function));
    expect(projectCommandHandler).toBeDefined();
  });

  describe('/project start', () => {
    it('should create a new project and save it to the database', async () => {
      const mockPlan = {
        phase: 'foundation',
        tasks: [{ text: 'Survey the area', done: false }],
      };
      mockSharedState.callOllama.mockResolvedValue(JSON.stringify(mockPlan));

      // Mock the DB calls: 1. Pause old projects (finds none), 2. Insert new project, 3. Get active project (returns the new one)
      const newProjectRecord = {
        id: expect.any(String),
        username: 'testUser',
        name: 'build a house',
        objective: 'build a house',
        phase: 'foundation',
        tasks: mockPlan.tasks,
        next_action: 'Survey the area',
      };
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No active projects to pause
        .mockResolvedValueOnce({ rows: [] }) // INSERT returns nothing
        .mockResolvedValueOnce({ rows: [newProjectRecord] }); // SELECT returns the new project

      await projectCommandHandler('testUser', ['project', 'start', 'build', 'a', 'house']);

      // Verify AI was called to propose a plan
      expect(mockSharedState.callOllama).toHaveBeenCalled();
      // Verify the database was updated
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO project_goals'), expect.any(Array));
      // Verify user was notified
      expect(mockSharedState.say).toHaveBeenCalledWith('Project started: build a house. Phase: foundation. Next: Survey the area');
    });
  });

  describe('/project status', () => {
    it('should report the status of the active project', async () => {
      const existingProject = {
        id: 'project_123',
        name: 'Test Project',
        objective: 'To test things',
        phase: 'structure',
        tasks: [{ text: 'Task 1', done: true }, { text: 'Task 2', done: false }],
        blockers: [],
        next_action: 'Task 2',
      };
      mockQuery.mockResolvedValue({ rows: [existingProject] });

      await projectCommandHandler('testUser', ['project', 'status']);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT *'), ['testUser']);
      expect(mockSharedState.say).toHaveBeenCalledWith('Active project: Test Project. Phase: structure. Progress: 1/2. Open blockers: 0. Next: Task 2');
    });

    it('should report when no project is active', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await projectCommandHandler('testUser', ['project', 'status']);
      expect(mockSharedState.say).toHaveBeenCalledWith('No active project yet. Start one with: project start <goal>.');
    });
  });

  describe('/project done', () => {
    it('should mark a task as complete', async () => {
      const projectBefore = {
        id: 'project_123',
        tasks: [{ text: 'Do the thing', done: false }, { text: 'Do another thing', done: false }],
      };
      const projectAfter = {
        ...projectBefore,
        tasks: [{ text: 'Do the thing', done: true }, { text: 'Do another thing', done: false }],
        next_action: 'Do another thing',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [projectBefore] }) // Get project
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns nothing
        .mockResolvedValueOnce({ rows: [projectAfter] }); // Get updated project

      await projectCommandHandler('testUser', ['project', 'done', 'the thing']);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE project_goals'), expect.any(Array));
      expect(mockSharedState.say).toHaveBeenCalledWith('Progress updated. Next action: Do another thing');
    });
  });

  describe('/project advance', () => {
    it('should advance to the next phase if all tasks are complete', async () => {
      const projectBefore = {
        id: 'project_123',
        username: 'testUser',
        objective: 'Test Objective',
        phase: 'foundation',
        tasks: [{ text: 'Foundation task', done: true }],
        blockers: [],
      };
      const nextPhasePlan = {
        phase: 'structure',
        tasks: [{ text: 'Build walls', done: false }],
      };
      const projectAfter = {
        ...projectBefore,
        phase: 'structure',
        tasks: nextPhasePlan.tasks,
        next_action: 'Build walls',
      };

      mockSharedState.callOllama.mockResolvedValue(JSON.stringify(nextPhasePlan));
      mockQuery
        .mockResolvedValueOnce({ rows: [projectBefore] }) // Get project
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns nothing
        .mockResolvedValueOnce({ rows: [projectAfter] }); // Get updated project

      await projectCommandHandler('testUser', ['project', 'advance']);

      expect(mockSharedState.callOllama).toHaveBeenCalled(); // AI was asked for next phase plan
      expect(mockSharedState.say).toHaveBeenCalledWith('Phase updated. Now in structure. Next action: Build walls');
    });
  });
});