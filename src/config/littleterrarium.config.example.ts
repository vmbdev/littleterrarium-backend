export const server = {
  port: 5015,
  useCors: true,
  corsOrigin: 'http://localhost:3000',
  session: {
    secret: 'A little terrarium with a long list of plants'
  },
  angular: {
    /**
     * If there's a language set as default with a default basehref (/), here
     * is the place to set it up
     */
    defaultLang: 'en'
  }
}

export const plants = {
  number: 20,
  maxForMassAction: 20,
}

export const files = {
  hash: 'sha1',
  folder: {
    division: 3,
    temp: 'temp',
    public: 'public'
  },
  // makes a copy of the uploaded images to the WebP format
  webp: true,
  // serve only WebP images (files.webp must be true)
  webpOnly: false
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

export const mailer = {
  pool: true,
  host: '',
  port: 587,
  auth: {
    user: '',
    pass: ''
  }
}
