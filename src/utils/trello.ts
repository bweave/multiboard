import config from '../config';
import store from 'store2';
import { Either, Success, Failure } from '../results';

const CACHE_VERSION = 'v4';

type TrelloResponse<T> = Promise<Either<T, TrelloFailure>>;
const TrelloResponse = Promise;

type GetOptions = {
  params?: object;
};

function get<T>(path: string, options: GetOptions = {}): TrelloResponse<T> {
  return new Promise((resolve) => {
    window.Trello.get(
      path,
      options.params || {},
      (json) => resolve(new Success(json)),
      (jqXhr) => resolve(new Failure(jqXhr))
    );
  });
}

type CachedGetOptions = GetOptions & {
  cacheKey?: string;
  forceRehydrate?: boolean;
};

async function cachedGet<T extends TrelloSuccess>(
  path: string,
  options: CachedGetOptions = {
    params: {},
    cacheKey: '',
    forceRehydrate: false,
  }
): Promise<Either<T, TrelloFailure>> {
  const fullCacheKey = [
    path,
    JSON.stringify(options.params),
    options.cacheKey,
    CACHE_VERSION,
  ].join('-');

  if (store.has(fullCacheKey) && options.forceRehydrate === false) {
    console.log('Cache hit for: ', fullCacheKey, store.get(fullCacheKey));
    return Success.from(store.get(fullCacheKey));
  } else {
    const response = await get<T>(path, options.params);

    response.flatMap((value) => {
      store.set(fullCacheKey, value);
    });

    return response;
  }
}

export async function getBoards(): TrelloResponse<TrelloBoard[]> {
  return cachedGet<TrelloBoard[]>('members/me/boards', {
    params: { fields: 'id,name,prefs' },
    cacheKey: config.boards.sort().join('-'),
  }).then((boards) =>
    boards.flatMap((boards) =>
      boards.filter((b) => config.boards.includes(b.name))
    )
  );
}

export async function getLists(
  board: TrelloBoard
): TrelloResponse<TrelloList[]> {
  const configListNames = config.lists.map((l) => l.name);

  return cachedGet<TrelloList[]>(`boards/${board.id}/lists`, {
    params: { filter: 'open', cards: 'none', fields: 'id,name' },
    cacheKey: configListNames.sort().join('-'),
  }).then((lists) =>
    lists.flatMap((lists) =>
      lists
        .filter((b) => configListNames.includes(b.name))
        .map((l) => ({ ...l, board }))
    )
  );
}

export async function getCards(
  list: TrelloList
): TrelloResponse<ITrelloCard[]> {
  return get<ITrelloCard[]>(`lists/${list.id}/cards`, {
    params: { members: true },
  }).then((cards) =>
    cards.flatMap((cards) => cards.map((c) => ({ ...c, board: list.board })))
  );
}

export async function getMembers(): TrelloResponse<ITrelloMember[]> {
  const responses = await Promise.all(
    config.members.map((id) => cachedGet<ITrelloMember>(`members/${id}`))
  );

  const anyFailure = responses.find((r) => r.isFailure());

  if (anyFailure) {
    return anyFailure.failure();
  } else {
    return Success.from(responses.map((r) => r.forcedValue()));
  }
}
