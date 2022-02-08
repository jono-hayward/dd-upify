import { writable, derived, get } from 'svelte/store';
import { api } from './api.js';

const store_get = (store, key) => {
  if( typeof window !== 'undefined' ) {
    return window[store].getItem( key );
  }
}
const store_set = (store, key, value) => {
  if( typeof window !== 'undefined' ) {
    window[store].setItem( key, value );
  }
}



// Users object, kept in localStorage to permit saved logins
// User preferences are also stored here. Any secure/private information is stored in encrypted form
const stored_users = store_get( 'localStorage', 'users' );
export const users = writable( stored_users && JSON.parse( stored_users ) || {} );
users.subscribe( value => store_set( 'localStorage', 'users', JSON.stringify( value ) ) );



// User ID and decrypted token, kept in sessionStorage for quick access even if the page refreshes
// This is cleared when the user logs out or closes the window
const stored_userid = store_get( 'sessionStorage', 'userid' );
export const userid = writable( stored_userid && JSON.parse( stored_userid ) || {} );
userid.subscribe( value => store_set( 'sessionStorage', 'userid', JSON.stringify( value ) ) );

const stored_token = store_get( 'sessionStorage', 'token' );
export const token = writable( stored_token && JSON.parse( stored_token ) || {} );
token.subscribe( value => store_set( 'sessionStorage', 'token', JSON.stringify( value ) ) );



// Current user object. A derived store that gives us quick access to the current user
// Any changes to the user's preferences or details must be made to their entry in $users
export const u = derived( [users, userid], ( [$users, $userid], set ) => {
  set( $users[$userid] );
});


// Stores current login status
const stored_status = store_get( 'sessionStorage', 'logged_in' );
export const logged_in = writable( stored_status && JSON.parse( stored_status ) || false );
logged_in.subscribe( value => store_set( 'sessionStorage', 'logged_in', JSON.stringify( value ) ) );

// Stores user's accounts data
const stored_accounts = store_get( 'sessionStorage', 'accounts' );
export const accounts = writable( stored_accounts && JSON.parse( stored_accounts ) || [] );
accounts.subscribe( value => store_set( 'sessionStorage', 'accounts', JSON.stringify(value) ) );

// Stores user's transaction categories
const stored_categories = store_get( 'sessionStorage', 'categories' );
export const categories = writable( stored_categories && JSON.parse( stored_categories ) || [] );
categories.subscribe( value => store_set( 'sessionStorage', 'categories', JSON.stringify(value) ) );

// Stores user's tags
const stored_tags = store_get( 'sessionStorage', 'tags' );
export const tags = writable( stored_tags && JSON.parse( stored_tags ) || [] );
tags.subscribe( value => store_set( 'sessionStorage', 'tags', JSON.stringify(value) ) );



// Transaction cache store
// Deliberately not stored in sessionStorage so as to not hit size limits, and to avoid CPU cost of frequently parsing and stringifying a large, complex object
export const txcache = writable({});
