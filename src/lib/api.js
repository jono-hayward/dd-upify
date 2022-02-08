import Bottleneck from 'bottleneck';

import { get } from 'svelte/store';
import { log } from '$lib/helpers';
import { u, token } from '$lib/store.js';

const limiter = new Bottleneck({ minTime: 101 });

export let api = {
  ping: token => limiter.schedule(() => call(
    '{base}/util/ping', 'GET', {}, token
  )),
  get: (type, params = {}) => limiter.schedule(() => call(
    `{base}/${type}`, 'GET', params
  )),
  get_txns_for_acct: (account, params) => limiter.schedule(() => call(
    `{base}/accounts/${account}/transactions`, 'GET', Object.assign({
      'page[size]': 50
    }, params)
  )),
  get_custom: (path, params = {}) => limiter.schedule( () => call( path, 'GET', params ) ),
  tags: {
    add: (tx_id, tag_id) => limiter.schedule(() => call(
      `{base}/transactions/${tx_id}/relationships/tags`, 'POST', {
        data: [{
          type: 'tags',
          id: tag_id
        }]
      }
    )),
    remove: (tx_id, tag_id) => limiter.schedule(() => call(
      `{base}/transactions/${tx_id}/relationships/tags`, 'DELETE', {
        data: [{
          type: 'tags',
          id: tag_id
        }]
      }))
  }
};


let call = (path, method, params, user_token = get(token)) => {

  log( 'Initiating call', path, params );

  let query_url = new URL(path.replace('{base}', 'https://api.up.com.au/api/v1'));
  let opts = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${user_token}`,
    }
  };

  if( Object.keys( params ).length ) {
    log( 'Sorting params', params );
    switch (method) {
      case 'GET':
        Object.keys(params).forEach(key => params[key] && query_url.searchParams.append(key, params[key]));
        break;
      case 'PUT':
      case 'POST':
        opts.body = JSON.stringify(params);
        break;
      case 'DELETE':
        opts.body = JSON.stringify(params);
        break;
    }
  }

  return new Promise((resolve, reject) => {

    fetch(query_url, opts)
      .then(result => {
        log( 'Result', result );
        if (result.status === 401) {
          reject('Not authorised', result.json());
        } else if (result.status === 404) {
          reject('404 error', result.json());
        } else if (result.status === 429) {
          reject('API rate limit reached', result.json());
        } else if (method === 'DELETE' || method === 'POST' && result.ok ) {
          resolve( result );
        } else if (method === 'GET' && result.ok) {
          resolve(result && result.json());
        } else {
          reject(Error(result, path, method, params))
        }
      }, err => {
        reject(Error(err, path, method, params));
      });

  });
}
