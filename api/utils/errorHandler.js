export function catchError(promise) {
  return promise
    .then((data) => [null, data])
    .catch((error) => [error, undefined]);
}
