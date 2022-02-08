import { u, categories } from '$lib/store';
import { get } from 'svelte/store';

export const slugify = str => str.toLowerCase().replace( /\s/g, '-').replace( /\W^-/g, '' );

export const format = {
  date: (date, format) => date.toLocaleDateString( 'en-AU', format || { weekday: 'long', day: 'numeric', 'month': 'long', year: 'numeric' } ),
  time: date => date.toLocaleTimeString( 'en-AU', { hour: 'numeric', minute: '2-digit' } ),
  currency: num => new Intl.NumberFormat( 'en-AU', { style: 'currency', currency: 'AUD' } ).format( num ).replace( '$', '' )
};

export const make_tag_list = list => list.map( tag => { return { value: tag.id, label: tag.attributes && tag.attributes.name || tag.label || tag.id } } );

export const log = (...args) => get(u) && get(u)['debug'] && console.log( ...args );

export const iso_date = (date, hours = 0, mins = 0, secs = 0) => {
  date = new Date( date );
  date.setHours( hours, mins, secs );
  return date.toISOString();
}


export const get_category = id => {
  let cats = get(categories);
  let index = cats.findIndex( cat => cat.id === id )
  if ( index > -1 ) return cats[index];
};


export const get_total = txs => txs.reduce( ( prev, curr ) => {

  if ( Array.isArray( curr ) ) {
    return prev + get_total( curr );
  }

  let val = curr.attributes.amount.value;

  if ( val >= 0 || curr.relationships.transferAccount.data ) {
    return prev;
  } else {
    return prev + Math.abs( val );
  }
}, 0 );
