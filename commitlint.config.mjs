export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['mobile', 'web', 'api', 'domain', 'contracts', 'infra', 'repo', 'deps', 'skills'],
    ],
    'header-max-length': [2, 'always', 72],
  },
};
