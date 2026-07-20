const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  deepMerge,
  getCapsule,
  loadSCCapsules,
  summarizeCapsule
} = require('../../utils/sc-capsules');

const makeTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sc-capsules-'));
  const capsuleDir = path.join(root, 'data', 'S.C');
  fs.mkdirSync(capsuleDir, { recursive: true });
  return { root, capsuleDir };
};

const writeCapsule = (capsuleDir, fileName, content) => {
  fs.writeFileSync(path.join(capsuleDir, fileName), content, 'utf8');
};

describe('sc-capsules utils', () => {
  describe('deepMerge', () => {
    test.each([
      {
        name: 'overrides scalar property',
        base: { a: 1 },
        override: { a: 2 },
        expected: { a: 2 }
      },
      {
        name: 'adds new scalar property',
        base: { a: 1 },
        override: { b: 2 },
        expected: { a: 1, b: 2 }
      },
      {
        name: 'merges nested object',
        base: { a: { x: 1 } },
        override: { a: { y: 2 } },
        expected: { a: { x: 1, y: 2 } }
      },
      {
        name: 'nested override wins for shared key',
        base: { a: { x: 1 } },
        override: { a: { x: 7 } },
        expected: { a: { x: 7 } }
      },
      {
        name: 'array in override replaces base array',
        base: { a: [1, 2] },
        override: { a: [3] },
        expected: { a: [3] }
      },
      {
        name: 'array in override replaces base object',
        base: { a: { x: 1 } },
        override: { a: [3] },
        expected: { a: [3] }
      },
      {
        name: 'object in override replaces base scalar',
        base: { a: 3 },
        override: { a: { x: 1 } },
        expected: { a: { x: 1 } }
      },
      {
        name: 'null in override replaces base value',
        base: { a: 3 },
        override: { a: null },
        expected: { a: null }
      },
      {
        name: 'undefined in override is assigned',
        base: { a: 3 },
        override: { a: undefined },
        expected: { a: undefined }
      },
      {
        name: 'empty override keeps base values',
        base: { a: 1, b: 2 },
        override: {},
        expected: { a: 1, b: 2 }
      },
      {
        name: 'empty base adopts override values',
        base: {},
        override: { a: 1, b: 2 },
        expected: { a: 1, b: 2 }
      },
      {
        name: 'non-object base returns override',
        base: 1,
        override: { a: 2 },
        expected: { a: 2 }
      },
      {
        name: 'non-object override returns override scalar',
        base: { a: 1 },
        override: 4,
        expected: 4
      },
      {
        name: 'both non-objects returns override',
        base: 'a',
        override: 'b',
        expected: 'b'
      },
      {
        name: 'deeply merges multiple levels',
        base: { a: { b: { c: 1, d: 1 } } },
        override: { a: { b: { c: 2, e: 3 } } },
        expected: { a: { b: { c: 2, d: 1, e: 3 } } }
      },
      {
        name: 'keeps sibling branches intact',
        base: { a: { x: 1 }, b: { y: 2 } },
        override: { a: { z: 3 } },
        expected: { a: { x: 1, z: 3 }, b: { y: 2 } }
      }
    ])('$name', ({ base, override, expected }) => {
      expect(deepMerge(base, override)).toEqual(expected);
    });

    it('does not mutate the input objects', () => {
      const base = { a: { x: 1 }, b: 2 };
      const override = { a: { y: 3 } };

      const baseClone = JSON.parse(JSON.stringify(base));
      const overrideClone = JSON.parse(JSON.stringify(override));

      const merged = deepMerge(base, override);

      expect(base).toEqual(baseClone);
      expect(override).toEqual(overrideClone);
      expect(merged).toEqual({ a: { x: 1, y: 3 }, b: 2 });
    });
  });

  describe('summarizeCapsule', () => {
    test.each([
      { name: 'returns empty for null', capsule: null, expected: [] },
      { name: 'returns empty for number', capsule: 7, expected: [] },
      { name: 'returns empty for array', capsule: [1, 2], expected: [] },
      {
        name: 'includes primary goal',
        capsule: { intent: { primary_goal: 'build shelter' } },
        expected: ['goal: build shelter']
      },
      {
        name: 'includes role',
        capsule: { identity: { role: 'builder' } },
        expected: ['role: builder']
      },
      {
        name: 'limits priorities to first three',
        capsule: { behavior_rules: { priorities: ['one', 'two', 'three', 'four'] } },
        expected: ['priorities: one, two, three']
      },
      {
        name: 'limits domains to first four',
        capsule: { knowledge_focus: { domains: ['a', 'b', 'c', 'd', 'e'] } },
        expected: ['domains: a, b, c, d']
      },
      {
        name: 'includes all supported summary parts in order',
        capsule: {
          intent: { primary_goal: 'goal-x' },
          identity: { role: 'role-x' },
          behavior_rules: { priorities: ['p1', 'p2'] },
          knowledge_focus: { domains: ['d1', 'd2'] }
        },
        expected: [
          'goal: goal-x',
          'role: role-x',
          'priorities: p1, p2',
          'domains: d1, d2'
        ]
      },
      {
        name: 'ignores empty priorities array',
        capsule: { behavior_rules: { priorities: [] } },
        expected: []
      },
      {
        name: 'ignores empty domains array',
        capsule: { knowledge_focus: { domains: [] } },
        expected: []
      },
      {
        name: 'ignores missing nested structures',
        capsule: { behavior_rules: {}, knowledge_focus: {} },
        expected: []
      },
      {
        name: 'accepts mixed primitive values in priorities/domains',
        capsule: {
          behavior_rules: { priorities: ['p1', 2, true] },
          knowledge_focus: { domains: ['d1', 5, false, 'd4'] }
        },
        expected: [
          'priorities: p1, 2, true',
          'domains: d1, 5, false, d4'
        ]
      }
    ])('$name', ({ capsule, expected }) => {
      expect(summarizeCapsule(capsule)).toEqual(expected);
    });
  });

  describe('getCapsule', () => {
    const capsules = {
      core: { id: 'core' },
      weather: { id: 'weather' },
      'very-custom': { id: 'very-custom' },
      'multi-word-name': { id: 'multi-word-name' }
    };

    test.each([
      { name: 'returns null for null capsules map', capsules: null, area: 'core', expected: null },
      { name: 'returns null for non-object capsules map', capsules: 3, area: 'core', expected: null },
      { name: 'defaults to core when area missing', capsules, area: undefined, expected: capsules.core },
      { name: 'finds direct lowercase key', capsules, area: 'weather', expected: capsules.weather },
      { name: 'normalizes uppercase area', capsules, area: 'WEATHER', expected: capsules.weather },
      { name: 'normalizes whitespace', capsules, area: '  weather  ', expected: null },
      { name: 'normalizes slash to dash', capsules, area: 'very/custom', expected: capsules['very-custom'] },
      { name: 'normalizes spaces to dashes', capsules, area: 'multi word name', expected: capsules['multi-word-name'] },
      { name: 'normalizes punctuation to dashes', capsules, area: 'multi.word@name', expected: capsules['multi-word-name'] },
      { name: 'returns null when normalized key missing', capsules, area: 'unknown', expected: null },
      { name: 'normalizes numeric string', capsules: { 'v2': { id: 'v2' } }, area: 'V2', expected: { id: 'v2' } },
      { name: 'trims leading punctuation', capsules: { core: { id: 'core' } }, area: '***', expected: null },
      { name: 'handles empty area by defaulting to core', capsules, area: '', expected: capsules.core },
      { name: 'handles null area by defaulting to core', capsules, area: null, expected: capsules.core }
    ])('$name', ({ capsules: c, area, expected }) => {
      expect(getCapsule(c, area)).toEqual(expected);
    });
  });

  describe('loadSCCapsules', () => {
    it('returns empty result with warning when capsule directory does not exist', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sc-capsules-missing-'));
      const result = loadSCCapsules(root);

      expect(result.capsules).toEqual({});
      expect(result.merged).toEqual({});
      expect(result.diagnostics.some((d) => d.level === 'warn' && d.message.includes('Capsule directory not found'))).toBe(true);
    });

    it('loads only .sc.json and .scp.json files', () => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, 'a.sc.json', JSON.stringify({ a: 1 }));
      writeCapsule(capsuleDir, 'b.scp.json', JSON.stringify({ b: 2 }));
      writeCapsule(capsuleDir, 'ignore.json', JSON.stringify({ c: 3 }));
      writeCapsule(capsuleDir, 'ignore.txt', 'hello');

      const result = loadSCCapsules(root);

      expect(Object.keys(result.capsules).sort()).toEqual(['a', 'b']);
    });

    it('normalizes file names into area keys', () => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, 'Weather Manager.sc.json', JSON.stringify({ x: 1 }));
      writeCapsule(capsuleDir, 'Project-Flow.scp.json', JSON.stringify({ y: 2 }));

      const result = loadSCCapsules(root);

      expect(result.capsules['weather-manager']).toBeDefined();
      expect(result.capsules['project-flow']).toBeDefined();
    });

    it('adds _meta details to each parsed capsule', () => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, 'core.sc.json', JSON.stringify({ intent: { primary_goal: 'X' } }));

      const result = loadSCCapsules(root);
      const core = result.capsules.core;

      expect(core._meta).toBeDefined();
      expect(core._meta.area).toBe('core');
      expect(core._meta.fileName).toBe('core.sc.json');
      expect(core._meta.fullPath).toContain(path.join('data', 'S.C', 'core.sc.json'));
      expect(core._meta.summary).toContain('goal: X');
    });

    it('produces info diagnostics for loaded capsules', () => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, 'alpha.sc.json', JSON.stringify({ a: 1 }));
      writeCapsule(capsuleDir, 'beta.sc.json', JSON.stringify({ b: 2 }));

      const result = loadSCCapsules(root);

      const infoDiagnostics = result.diagnostics.filter((d) => d.level === 'info');
      expect(infoDiagnostics).toHaveLength(2);
      expect(infoDiagnostics[0].message).toContain('Loaded capsule');
    });

    it('calls the provided log function for each diagnostic', () => {
      const { root, capsuleDir } = makeTempRoot();
      const log = jest.fn();
      writeCapsule(capsuleDir, 'alpha.sc.json', JSON.stringify({ a: 1 }));

      const result = loadSCCapsules(root, { log });

      expect(log).toHaveBeenCalledTimes(result.diagnostics.length);
    });

    it('skips malformed JSON files in non-strict mode with warn diagnostic', () => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, 'good.sc.json', JSON.stringify({ good: true }));
      writeCapsule(capsuleDir, 'bad.sc.json', '{ not-valid-json');

      const result = loadSCCapsules(root, { strict: false });

      expect(result.capsules.good).toBeDefined();
      expect(result.capsules.bad).toBeUndefined();
      expect(result.diagnostics.some((d) => d.level === 'warn' && d.message.includes('Failed to load capsule bad.sc.json'))).toBe(true);
    });

    it('throws on malformed JSON in strict mode', () => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, 'bad.sc.json', '{ not-valid-json');

      expect(() => loadSCCapsules(root, { strict: true })).toThrow('Failed to load capsule bad.sc.json');
    });

    it('warns and skips files where parsed content is not an object', () => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, 'arr.sc.json', JSON.stringify([1, 2, 3]));
      writeCapsule(capsuleDir, 'num.sc.json', '42');
      writeCapsule(capsuleDir, 'ok.sc.json', JSON.stringify({ ok: true }));

      const result = loadSCCapsules(root);

      expect(result.capsules.ok).toBeDefined();
      expect(result.capsules.arr).toBeUndefined();
      expect(result.capsules.num).toBeUndefined();
      expect(result.diagnostics.filter((d) => d.message.includes('Capsule is not an object')).length).toBe(2);
    });

    it('merges capsules in lexical key order', () => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, 'zeta.sc.json', JSON.stringify({ order: ['zeta'], val: 1 }));
      writeCapsule(capsuleDir, 'alpha.sc.json', JSON.stringify({ order: ['alpha'], val: 2 }));

      const result = loadSCCapsules(root);

      expect(result.merged.order).toEqual(['zeta']);
      expect(result.merged.val).toBe(1);
    });

    it('deep-merges nested objects into merged payload', () => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, 'a.sc.json', JSON.stringify({ root: { left: 1, nested: { a: 1 } } }));
      writeCapsule(capsuleDir, 'b.sc.json', JSON.stringify({ root: { right: 2, nested: { b: 2 } } }));

      const result = loadSCCapsules(root);

      expect(result.merged.root.left).toBe(1);
      expect(result.merged.root.right).toBe(2);
      expect(result.merged.root.nested).toEqual({ a: 1, b: 2 });
    });

    it('supports overriding capsule directory via options.capsuleDir', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sc-capsules-custom-'));
      const customCapsuleDir = path.join(root, 'capsules');
      fs.mkdirSync(customCapsuleDir, { recursive: true });
      writeCapsule(customCapsuleDir, 'custom.sc.json', JSON.stringify({ x: 1 }));

      const result = loadSCCapsules(root, { capsuleDir: customCapsuleDir });

      expect(result.capsuleDir).toBe(customCapsuleDir);
      expect(result.capsules.custom).toBeDefined();
    });

    test.each([
      { fileName: 'core.sc.json', expectedArea: 'core' },
      { fileName: 'CORE.sc.json', expectedArea: 'core' },
      { fileName: 'weather-manager.scp.json', expectedArea: 'weather-manager' },
      { fileName: 'Weather Manager.sc.json', expectedArea: 'weather-manager' },
      { fileName: 'Weather___Manager.sc.json', expectedArea: 'weather-manager' },
      { fileName: '123.sc.json', expectedArea: '123' },
      { fileName: '---.sc.json', expectedArea: 'core' },
      { fileName: 'mixed.Case_Name.scp.json', expectedArea: 'mixed-case-name' },
      { fileName: 'name.with.dots.sc.json', expectedArea: 'name-with-dots' },
      { fileName: 'name+plus.scp.json', expectedArea: 'name-plus' },
      { fileName: 'name%percent.sc.json', expectedArea: 'name-percent' },
      { fileName: 'x y z.scp.json', expectedArea: 'x-y-z' },
      { fileName: '__x__.sc.json', expectedArea: 'x' },
      { fileName: 'capsule-01.sc.json', expectedArea: 'capsule-01' },
      { fileName: 'capsule_01.scp.json', expectedArea: 'capsule-01' },
      { fileName: 'capsule..01.sc.json', expectedArea: 'capsule-01' },
      { fileName: 'capsule@@01.scp.json', expectedArea: 'capsule-01' },
      { fileName: 'A B C 123.sc.json', expectedArea: 'a-b-c-123' }
    ])('normalizes file area for $fileName', ({ fileName, expectedArea }) => {
      const { root, capsuleDir } = makeTempRoot();
      writeCapsule(capsuleDir, fileName, JSON.stringify({ ok: true }));

      const result = loadSCCapsules(root);

      expect(result.capsules[expectedArea]).toBeDefined();
      expect(result.capsules[expectedArea]._meta.area).toBe(expectedArea);
    });
  });
});
