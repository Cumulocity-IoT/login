module.exports = {
  collectCoverageFrom: ['<rootDir>/**/*.{ts}', '!<rootDir>/**/*.{d.ts}'],
  coveragePathIgnorePatterns: ['<rootDir>/protocol-opcua/*'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/test/__mocks__/style-mock.js',
    '^lodash-es$': 'lodash'
  },
  testPathIgnorePatterns: ['bulk-operation-stepper.testing.module.spec.ts'],
  modulePathIgnorePatterns: ['yarn-cache', 'npm-cache', '.npm', 'dist'],
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: [
    '../ngx-components/test/setup-jest.ts',
    '../ngx-components/test/fail-on-console-error-configuration.ts'
  ],
  testRunner: 'jest-jasmine2',
  transformIgnorePatterns: ['/!node_modules\\/lodash-es/', 'node_modules/(?!.*\\.mjs$)']
};
