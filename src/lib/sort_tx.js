export default (store, txs) => {

  txs.forEach( tx => {

    let dayref = tx.attributes.createdAt.split('T')[0];

    let matched_date = store.findIndex( date => date.dayref === dayref );

    if ( matched_date < 0 ) {

      store.push({
        dayref: dayref,
        tx: [],
        open: true
      });

      matched_date = store.length - 1;
    }

    store[matched_date].tx = [...store[matched_date].tx, tx ];

  } );

  return store;
}
