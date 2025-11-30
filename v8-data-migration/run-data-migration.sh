MAIN_DIR=/root

cd $MAIN_DIR/ot-node/current/v8-data-migration/ &&
npm rebuild sqlite3 &&
nohup node v8-data-migration.js > $MAIN_DIR/ot-node/data/nohup.out 2>&1 &