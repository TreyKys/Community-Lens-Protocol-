import fs from 'fs';
import path from 'path';
import {
    NODERC_CONFIG_PATH,
    MIGRATION_PROGRESS_FILE,
    DEFAULT_CONFIG_PATH,
    MIGRATION_DIR,
} from './constants.js';
import { validateConfig } from './validation.js';
import logger from './logger.js';

export function initializeConfig() {
    const configPath = path.resolve(NODERC_CONFIG_PATH);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    validateConfig(config);
    return config;
}

export function initializeDefaultConfig() {
    const configPath = path.resolve(DEFAULT_CONFIG_PATH);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    validateConfig(config);
    return config;
}

export function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Created directory: ${dirPath}`);

        if (!fs.existsSync(dirPath)) {
            logger.error(
                `Something went wrong. Directory: ${dirPath} does not exist after creation.`,
            );
            process.exit(1);
        }
    }
}

export function ensureMigrationProgressFileExists() {
    ensureDirectoryExists(MIGRATION_DIR);
    const migrationProgressFilePath = path.join(MIGRATION_DIR, MIGRATION_PROGRESS_FILE);

    if (!fs.existsSync(migrationProgressFilePath)) {
        fs.writeFileSync(migrationProgressFilePath, '');
        logger.info(`Created migration progress file: ${migrationProgressFilePath}`);
        if (!fs.existsSync(migrationProgressFilePath)) {
            throw new Error(
                `Something went wrong. Progress file: ${migrationProgressFilePath} does not exist after creation.`,
            );
        }
    } else {
        logger.info(`Migration progress file already exists: ${migrationProgressFilePath}.`);
        logger.info('Checking if migration is already successful...');
        const fileContent = fs.readFileSync(migrationProgressFilePath, 'utf8');
        if (fileContent === 'MIGRATED') {
            logger.info('Migration is already successful. Exiting...');
            process.exit(0);
        }
    }
}

export function markMigrationAsSuccessfull() {
    // Construct the full path to the migration progress file
    const migrationProgressFilePath = path.join(MIGRATION_DIR, MIGRATION_PROGRESS_FILE);

    // open file
    const file = fs.openSync(migrationProgressFilePath, 'w');

    // write MIGRATED
    fs.writeSync(file, 'MIGRATED');

    // close file
    fs.closeSync(file);
}

export function deleteFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted file: ${filePath}`);

        if (fs.existsSync(filePath)) {
            logger.error(`File: ${filePath} still exists after deletion.`);
            process.exit(1);
        }
    } else {
        logger.info(`Did not delete file: ${filePath} because it does not exist.`);
    }
}
