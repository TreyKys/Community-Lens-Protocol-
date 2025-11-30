import { createRequire } from 'module';

// Triple store constants
export const SCHEMA_CONTEXT = 'http://schema.org/';
export const METADATA_NAMED_GRAPH = 'metadata:graph';
export const PRIVATE_ASSERTION_ONTOLOGY =
    '<https://ontology.origintrail.io/dkg/1.0#privateAssertionID>';
export const TRIPLE_STORE_CONNECT_MAX_RETRIES = 10;
export const TRIPLE_STORE_CONNECT_RETRY_FREQUENCY = 10;
export const N_QUADS = 'application/n-quads';
export const OT_BLAZEGRAPH = 'ot-blazegraph';
export const OT_FUSEKI = 'ot-fuseki';
export const OT_GRAPHDB = 'ot-graphdb';
export const PRIVATE_CURRENT = 'privateCurrent';
export const PUBLIC_CURRENT = 'publicCurrent';
export const DKG_REPOSITORY = 'dkg';
export const VISIBILITY = {
    PUBLIC: 'public',
    PRIVATE: 'private',
};
export const BATCH_SIZE = 50;

export const MAIN_DIR = '/root';
export const DEFAULT_CONFIG_PATH = `${MAIN_DIR}/ot-node/current/config/config.json`;
export const NODERC_CONFIG_PATH = `${MAIN_DIR}/ot-node/.origintrail_noderc`;
export const DATA_MIGRATION_DIR = `${MAIN_DIR}/ot-node/data/data-migration`;
export const LOG_DIR = `${MAIN_DIR}/ot-node/data/data-migration/logs`;
export const ENV_PATH = `${MAIN_DIR}/ot-node/current/.env`;
export const MIGRATION_DIR = `${MAIN_DIR}/ot-node/data/migrations/`;
export const MIGRATION_PROGRESS_FILE = 'v8DataMigration';

export const DB_URLS = {
    testnet: 'https://hosting.origin-trail.network/csv/testnet.db',
    mainnet: 'https://hosting.origin-trail.network/csv/mainnet.db',
};

const require = createRequire(import.meta.url);

export const ABIs = {
    ContentAssetStorageV2: require('./abi/ContentAssetStorageV2.json'),
    ContentAssetStorage: require('./abi/ContentAssetStorage.json'),
};
export const BLOCKCHAINS = {
    BASE_DEVNET: {
        ID: 'base:84532',
        ENV: 'devnet',
        NAME: 'base_devnet',
        CONTENT_ASSET_STORAGE_CONTRACT_ADDRESS: '0xbe08a25dcf2b68af88501611e5456571f50327b4',
    },
    BASE_TESTNET: {
        ID: 'base:84532',
        ENV: 'testnet',
        NAME: 'base_testnet',
        CONTENT_ASSET_STORAGE_CONTRACT_ADDRESS: '0x9e3071dc0730cb6dd0ce42969396d716ea33e7e1',
    },
    BASE_MAINNET: {
        ID: 'base:8453',
        ENV: 'mainnet',
        NAME: 'base_mainnet',
        CONTENT_ASSET_STORAGE_CONTRACT_ADDRESS: '0x3bdfa81079b2ba53a25a6641608e5e1e6c464597',
    },
    GNOSIS_DEVNET: {
        ID: 'gnosis:10200',
        ENV: 'devnet',
        NAME: 'gnosis_devnet',
        CONTENT_ASSET_STORAGE_CONTRACT_ADDRESS: '0x3db64dd0ac054610d1e2af9cca0fbcb1a7f4c2d8',
    },
    GNOSIS_TESTNET: {
        ID: 'gnosis:10200',
        ENV: 'testnet',
        NAME: 'gnosis_testnet',
        CONTENT_ASSET_STORAGE_CONTRACT_ADDRESS: '0xea3423e02c8d231532dab1bce5d034f3737b3638',
    },
    GNOSIS_MAINNET: {
        ID: 'gnosis:100',
        ENV: 'mainnet',
        NAME: 'gnosis_mainnet',
        CONTENT_ASSET_STORAGE_CONTRACT_ADDRESS: '0xf81a8c0008de2dcdb73366cf78f2b178616d11dd',
    },
    NEUROWEB_TESTNET: {
        ID: 'otp:20430',
        ENV: 'testnet',
        NAME: 'neuroweb_testnet',
        CONTENT_ASSET_STORAGE_CONTRACT_ADDRESS: '0x1a061136ed9f5ed69395f18961a0a535ef4b3e5f',
    },
    NEUROWEB_MAINNET: {
        ID: 'otp:2043',
        ENV: 'mainnet',
        NAME: 'neuroweb_mainnet',
        CONTENT_ASSET_STORAGE_CONTRACT_ADDRESS: '0x5cac41237127f94c2d21dae0b14bfefa99880630',
    },
};

export const CONTENT_ASSET_STORAGE_CONTRACT = 'ContentAssetStorage';
