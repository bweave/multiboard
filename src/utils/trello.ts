import config from '../config.json';
import store from 'store2';
import { Either, Success, Failure } from '../results';

const CACHE_VERSION = 'v3';

function get(
  path: string,
  params: object = {}
): Promise<Either<TrelloSuccess, TrelloFailure>> {
  return new Promise((resolve) => {
    window.Trello.get(
      path,
      params,
      (json) => resolve(new Success(json)),
      (jqXhr) => resolve(new Failure(jqXhr))
    );
  });
}

type CachedGetOptions = {
  cacheKey: string;
  params: object;
};

async function cachedGet<T extends TrelloSuccess>(
  path: string,
  options: CachedGetOptions = { params: {}, cacheKey: '' }
): Promise<Either<T, TrelloFailure>> {
  const fullCacheKey = [
    path,
    JSON.stringify(options.params),
    options.cacheKey,
    CACHE_VERSION,
  ].join('-');

  if (store.has(fullCacheKey)) {
    console.log('Cache hit for: ', fullCacheKey);
    return Success.from(store.get(fullCacheKey));
  } else {
    const response = await get(path, options.params);

    response.bind((value) => {
      store.set(fullCacheKey, value);
    });

    return response;
  }
}

export async function getBoards(): Promise<
  Either<TrelloBoard[], TrelloFailure>
> {
  const boards = await cachedGet<TrelloBoard[]>('members/me/boards', {
    params: { fields: 'id,name,prefs' },
    cacheKey: config.boards.sort().join('-'),
  });

  return boards.flatMap((boards) =>
    boards.filter((b) => config.boards.includes(b.name))
  );
}

export async function getLists(
  board: TrelloBoard
): Promise<Either<TrelloList[], TrelloFailure>> {
  const lists = await cachedGet<TrelloList[]>(`boards/${board.id}/lists`, {
    params: { filter: 'open', cards: 'none', fields: 'id,name' },
    cacheKey: config.lists.sort().join('-'),
  });

  return lists.flatMap((boards) =>
    boards.filter((b) => config.boards.includes(b.name))
  );
}