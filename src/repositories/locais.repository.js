import BaseRepository from "./base/base.repository.js";

class LocaisRepository extends BaseRepository {
  constructor() {
    super("local");
  }
}

export const locaisRepository = new LocaisRepository();