import { beforeAll } from 'vitest';

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes('consultation_test')) {
    throw new Error(
      'Refusing to run tests: DATABASE_URL does not point at the test database. ' +
        'Check .env.test (see README "Running tests").'
    );
  }
});
