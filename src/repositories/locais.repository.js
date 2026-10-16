import BaseRepository from "./base/base.repository.js";

class LocaisRepository extends BaseRepository {
  constructor() {
    super("local");
  }

  pertenceAoPromotor(localId, promotorId) {
    return this.db.findFirst({
      where: {
        id: localId,
        donoId: promotorId
      },
      select: { id: true }
    });
  }

}

export const locaisRepository = new LocaisRepository();