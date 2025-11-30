import logger from './logger.js';

export function validateConfig(config) {
    if (!config || typeof config !== 'object') {
        logger.error(
            `[VALIDATION ERROR] Config is not defined or it is not an object. Config: ${config}`,
        );
        process.exit(1);
    }
}

export function validateBlockchainName(blockchainName) {
    if (!blockchainName || typeof blockchainName !== 'string') {
        logger.error(
            `[VALIDATION ERROR] Blockchain name is defined or it is not a string. Blockchain name: ${blockchainName}`,
        );
        process.exit(1);
    }
}

export function validateBlockchainDetails(blockchainDetails) {
    if (
        !blockchainDetails ||
        typeof blockchainDetails !== 'object' ||
        !Object.keys(blockchainDetails).includes('ID') ||
        !Object.keys(blockchainDetails).includes('ENV') ||
        !Object.keys(blockchainDetails).includes('NAME') ||
        !Object.keys(blockchainDetails).includes('CONTENT_ASSET_STORAGE_CONTRACT_ADDRESS')
    ) {
        logger.error(
            `[VALIDATION ERROR] Blockchain details is defined or it is not an object. Blockchain details: ${blockchainDetails}`,
        );
        process.exit(1);
    }
}

export function validateTokenId(tokenId) {
    if (typeof tokenId !== 'string' && typeof tokenId !== 'number') {
        logger.error(
            `[VALIDATION ERROR] Token ID is not a string or number. Token ID: ${tokenId}. Type: ${typeof tokenId}`,
        );
        process.exit(1);
    }
}

export function validateUal(ual) {
    if (!ual.startsWith('did:dkg:') || typeof ual !== 'string') {
        logger.error(`[VALIDATION ERROR] UAL is not a valid UAL. UAL: ${ual}`);
        process.exit(1);
    }
}

export function validateTripleStoreRepositories(tripleStoreRepositories) {
    if (!tripleStoreRepositories || typeof tripleStoreRepositories !== 'object') {
        logger.error(
            `[VALIDATION ERROR] Triple store repositories is not defined or it is not an object. Triple store repositories: ${tripleStoreRepositories}`,
        );
        process.exit(1);
    }
}

export function validateTripleStoreImplementation(tripleStoreImplementation) {
    if (!tripleStoreImplementation || typeof tripleStoreImplementation !== 'string') {
        logger.error(
            `[VALIDATION ERROR] Triple store implementation is not defined or it is not a string. Triple store implementation: ${tripleStoreImplementation}`,
        );
        process.exit(1);
    }
}

export function validateTripleStoreConfig(tripleStoreConfig) {
    if (!tripleStoreConfig || typeof tripleStoreConfig !== 'object') {
        logger.error(
            `[VALIDATION ERROR] Triple store config is not defined or it is not an object. Triple store config: ${tripleStoreConfig}`,
        );
        process.exit(1);
    }
}

export function validateRepository(repository) {
    if (!repository || typeof repository !== 'string') {
        logger.error(
            `[VALIDATION ERROR] Repository is not defined or it is not a string. Repository: ${repository}`,
        );
        process.exit(1);
    }
}

export function validateQuery(query) {
    if (!query || typeof query !== 'string') {
        logger.error(
            `[VALIDATION ERROR] Query is not defined or it is not a string. Query: ${query}`,
        );
        process.exit(1);
    }
}

export function validateAssertionId(assertionId) {
    if (!assertionId || typeof assertionId !== 'string') {
        logger.error(
            `[VALIDATION ERROR] Assertion ID is not defined or it is not a string. Assertion ID: ${assertionId}`,
        );
        process.exit(1);
    }
}

export function validateAssertion(assertion) {
    if (!assertion || typeof assertion !== 'string') {
        logger.error(
            `[VALIDATION ERROR] Assertion is not defined or it is not a string. Assertion: ${assertion}`,
        );
        process.exit(1);
    }
}

// BLOCKCHAIN
export function validateProvider(provider) {
    if (!provider || typeof provider !== 'object') {
        logger.error(
            `[VALIDATION ERROR] Provider is not defined or it is not an object. Provider: ${provider}`,
        );
        process.exit(1);
    }
}

export function validateStorageContractAddress(storageContractAddress) {
    if (!storageContractAddress || typeof storageContractAddress !== 'string') {
        logger.error(
            `[VALIDATION ERROR] Storage contract address is not defined or it is not a string. Storage contract address: ${storageContractAddress}`,
        );
        process.exit(1);
    }
}

export function validateStorageContractName(storageContractName) {
    if (!storageContractName || typeof storageContractName !== 'string') {
        logger.error(
            `[VALIDATION ERROR] Storage contract name is not defined or it is not a string. Storage contract name: ${storageContractName}`,
        );
        process.exit(1);
    }
}

export function validateStorageContractAbi(storageContractAbi) {
    if (!storageContractAbi || typeof storageContractAbi !== 'object') {
        logger.error(
            `[VALIDATION ERROR] Storage contract ABI is not defined or it is not an object. Storage contract ABI: ${storageContractAbi}`,
        );
        process.exit(1);
    }
}

export function validateBatchData(batchData) {
    if (!batchData || typeof batchData !== 'object') {
        logger.error(
            `[VALIDATION ERROR] Batch data is not defined or it is not an object. Batch data: ${batchData}`,
        );
        process.exit(1);
    }
}
