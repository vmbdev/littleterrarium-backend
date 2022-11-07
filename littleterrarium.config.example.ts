export const server = {
  port: 5015,
  useCors: true,
  corsOrigin: 'http://localhost:3000',
  session: {
    secret: 'A little terrarium with a long list of plants'
  },
}

export const files = {
  hash: 'sha1',
  folder: {
    division: 3,
    temp: 'temp',
    public: 'public'
  }
}

export const password = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireNonAlphanumeric: true
}