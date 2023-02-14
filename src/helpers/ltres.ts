import { Location, Photo, Plant, Specie, User } from "@prisma/client"

/**
 * Chainable class for HTTP responses
 * 
 * @class LTRes
 * @member {string} msg The response message
 * @member {number} code The HTTP corresponding to the response
 * @member {any} data The structures to be sent to the user in case of a correct petition
 * @member {any} errorData Contains more information about the error
 */
export class LTRes {
  msg?: string
  code?: number
  data?: {
    photo?: Photo
    photos?: Photo[]
    location?: Location
    locations?: Location[]
    user?: User
    users?: User[]
    plant?: Plant
    plants?: Plant[]
    specie?: Specie
    species?: Specie[]
  }
  errorData?: {
    field?: string
    values?: any[]
    comp?: any
  }

  constructor(options?: any) {
    this.msg = options?.msg
  }

  /**
   * Shortcut to create a instance of LTRes with a code and a defaulted msg
   * @param code 
   * @returns 
   */
  static createCode(code: number): LTRes {
    const res = new LTRes();
    res.setCode(code);
    return res;
  }

  static msg(msg: string): LTRes {
    const res = new LTRes({ msg });
    return res;
  }

  setCode(code: number) {
    this.code = code;
    return this;
  }

  photo(photo: Photo): LTRes {
    if (!this.data) this.data = {};

    this.data.photo = photo;
    return this;
  }

  photos(photos: Photo[]): LTRes {
    if (!this.data) this.data = {};

    this.data.photos = photos;
    return this;
  }

  location(location: Location): LTRes {
    if (!this.data) this.data = {};

    this.data.location = location;
    return this;
  }

  locations(locations: Location[]): LTRes {
    if (!this.data) this.data = {};

    this.data.locations = locations;
    return this;
  }

  user(user: User): LTRes {
    if (!this.data) this.data = {};

    this.data.user = user;
    return this;
  }

  users(users: User[]): LTRes {
    if (!this.data) this.data = {};

    this.data.users = users;
    return this;
  }

  plant(plant: Plant): LTRes {
    if (!this.data) this.data = {};

    this.data.plant = plant;
    return this;
  }

  plants(plants: Plant[]): LTRes {
    if (!this.data) this.data = {};

    this.data.plants = plants;
    return this;
  }

  specie(specie: Specie): LTRes {
    if (!this.data) this.data = {};

    this.data.specie = specie;
    return this;
  }

  species(species: Specie[]): LTRes {
    if (!this.data) this.data = {};

    this.data.species = species;
    return this;
  }

  errorField(field: string) {
    if (!this.errorData) this.errorData = {};

    this.errorData.field = field;
    return this;
  }

  errorValues(values: any[]) {
    if (!this.errorData) this.errorData = {};

    this.errorData.values = values;
    return this;
  }

  errorComp(comp: any) {
    if (!this.errorData) this.errorData = {};

    this.errorData.comp = comp;
    return this;
  }

}
