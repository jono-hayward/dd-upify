import { get } from 'svelte/store';

import { goto } from '$app/navigation';

import { users, logged_in, accounts, categories, tags, userid, token, txcache }   from '$lib/store';


export const toggle_user_pref = (pref, default_val) => {

  const id = get(userid);
  const all_users = get(users);
  let user = all_users[id];

  if ( !user.hasOwnProperty( 'prefs' ) ) user.prefs = {};

  if( user.prefs.hasOwnProperty( pref ) ) {
    user.prefs[pref] = !user.prefs[pref];
  } else {
    user.prefs[pref] = default_val;
  }

  users.set(all_users);

}
export const set_user_pref = (pref, val) => {

  const id = get(userid);
  const all_users = get(users);
  let user = all_users[id];

  if ( !user.hasOwnProperty( 'prefs' ) ) user.prefs = {};

  user[pref] = val;
  users.set( all_users );
}

export const logout = () => {
  logged_in.set(false);
  accounts.set(null);
  categories.set(null);
  tags.set(null);
  userid.set(null);
  token.set(null);
  txcache.set({});
  goto( '/' );
};
