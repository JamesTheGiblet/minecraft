const { get } = require('../../utils/object-helpers');

describe('get', () => {
  const testObj = {
    a: 1,
    b: {
      c: 'hello',
      d: {
        e: true,
      },
    },
    f: null,
  };

  it('should get a top-level property', () => {
    expect(get(testObj, 'a')).toBe(1);
  });

  it('should get a nested property', () => {
    expect(get(testObj, 'b.c')).toBe('hello');
  });

  it('should get a deeply nested property', () => {
    expect(get(testObj, 'b.d.e')).toBe(true);
  });

  it('should return undefined for a non-existent path', () => {
    expect(get(testObj, 'b.x.y')).toBeUndefined();
  });
});