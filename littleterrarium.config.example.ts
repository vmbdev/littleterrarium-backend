export const server = {
  port: 5015,
  useCors: true,
  corsOrigin: 'http://localhost:3000',
  session: {
    secret: 'A little terrarium with a long list of plants'
  },
  angular: {
    defaultLang: 'en'       // If there's a language set as default with a default basehref (/), here is the place to set it up
  }
}

export const files = {
  hash: 'sha1',
  folder: {
    division: 3,
    temp: 'temp',
    public: 'public'
  }
}

export const username = {
  minLength: 5,
  maxLength: 20
}

export const password = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireNonAlphanumeric: true
}