import fetch, { Response, Request } from 'node-fetch';

// fetch error handler
function httpErrorHandler(response : Response) : Response {
  if (!response.ok) {
    switch (response.status) {
      case 504:
        // Gateway Timeout - need a retry method for this
        Promise.reject();
        throw Error(response.statusText);
      case 401:
        // Authorisation error -> should trigger a re-auth
        Promise.reject();
        throw Error(response.statusText);
    }
  }
  return response;
}

// fetch request wrapper / http manager
export async function request(request: Request) : Promise<object>{
  return fetch(request)
    .then(httpErrorHandler)
    .then(res => res.json())
    .catch(error => error);
}