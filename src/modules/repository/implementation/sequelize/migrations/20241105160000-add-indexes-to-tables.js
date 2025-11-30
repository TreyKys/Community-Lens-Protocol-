export async function up({ context: { queryInterface } }) {
    const indexes = [
        { table: 'shard', column: ['blockchain_id'], name: 'shard_blockchain_id_index' },
        { table: 'shard', column: ['last_dialed'], name: 'last_dialed_index' },
        { table: 'paranet_synced_asset', column: ['ual'], name: 'paranet_synced_asset_ual_index' },
        {
            table: 'paranet_synced_asset',
            column: ['paranet_ual', 'data_source'],
            name: 'paranet_ual_data_source_index',
        },
        {
            table: 'paranet',
            column: ['blockchain_id', 'paranet_id'],
            name: 'blockchain_id_paranet_id_index',
        },
        { table: 'missed_paranet_asset', column: ['paranet_ual'], name: 'paranet_ual_index' },
        { table: 'missed_paranet_asset', column: ['ual'], name: 'missed_paranet_asset_ual_index' },
        { table: 'event', column: ['name', 'timestamp'], name: 'name_timestamp_index' },
        { table: 'event', column: ['operation_id'], name: 'event_operation_id_index' },
        { table: 'commands', column: ['name', 'status'], name: 'name_status_index' },
        { table: 'commands', column: ['status', 'started_at'], name: 'status_started_at_index' },
        { table: 'get', column: ['operation_id'], name: 'get_operation_id_index' },
        { table: 'publish', column: ['operation_id'], name: 'publish_operation_id_index' },
        { table: 'update', column: ['operation_id'], name: 'update_operation_id_index' },
        {
            table: 'publish_paranet',
            column: ['operation_id'],
            name: 'publish_paranet_operation_id_index',
        },
        { table: 'get', column: ['created_at'], name: 'get_created_at_index' },
        { table: 'publish', column: ['created_at'], name: 'publish_created_at_index' },
        { table: 'update', column: ['created_at'], name: 'update_created_at_index' },
        {
            table: 'publish_paranet',
            column: ['created_at'],
            name: 'publish_paranet_created_at_index',
        },
        {
            table: 'get_response',
            column: ['operation_id'],
            name: 'get_response_operation_id_index',
        },
        { table: 'publish_response', column: ['operation_id'], name: 'operation_id_index' },
        {
            table: 'update_response',
            column: ['operation_id'],
            name: 'update_response_operation_id_index',
        },
        {
            table: 'publish_paranet_response',
            column: ['operation_id'],
            name: 'publish_paranet_response_operation_id_index',
        },
        { table: 'get_response', column: ['created_at'], name: 'get_response_created_at_index' },
        {
            table: 'publish_response',
            column: ['created_at'],
            name: 'publish_response_created_at_index',
        },
        {
            table: 'update_response',
            column: ['created_at'],
            name: 'update_response_created_at_index',
        },
        {
            table: 'publish_paranet_response',
            column: ['created_at'],
            name: 'publish_paranet_response_created_at_index',
        },
        { table: 'blockchain', column: ['contract'], name: 'contract_index' },
    ];

    for (const index of indexes) {
        const { table, column, name } = index;

        // eslint-disable-next-line no-await-in-loop
        const [indexExists] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) AS index_exists
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
            AND table_name = '${table}'
            AND index_name = '${name}';
        `);
        if (indexExists[0].index_exists === 0) {
            // eslint-disable-next-line no-await-in-loop
            await queryInterface.sequelize.query(`
                CREATE INDEX \`${name}\`
                ON \`${table}\` (${column.map((col) => `\`${col}\``).join(', ')});
            `);
        }
    }
}

export async function down({ context: { queryInterface } }) {
    const indexes = [
        { table: 'shard', name: 'shard_blockchain_id_index' },
        { table: 'shard', name: 'last_dialed_index' },
        { table: 'paranet_synced_asset', name: 'paranet_synced_asset_ual_index' },
        { table: 'paranet_synced_asset', name: 'paranet_ual_data_source_index' },
        { table: 'paranet', name: 'blockchain_id_paranet_id_index' },
        { table: 'missed_paranet_asset', name: 'paranet_ual_index' },
        { table: 'missed_paranet_asset', name: 'missed_paranet_asset_ual_index' },
        { table: 'event', name: 'name_timestamp_index' },
        { table: 'event', name: 'event_operation_id_index' },
        { table: 'commands', name: 'name_status_index' },
        { table: 'commands', name: 'status_started_at_index' },
        { table: 'get', name: 'get_operation_id_index' },
        { table: 'publish', name: 'publish_operation_id_index' },
        { table: 'update', name: 'update_operation_id_index' },
        { table: 'publish_paranet', name: 'publish_paranet_operation_id_index' },
        { table: 'get', name: 'get_created_at_index' },
        { table: 'publish', name: 'publish_created_at_index' },
        { table: 'update', name: 'update_created_at_index' },
        { table: 'publish_paranet', name: 'publish_paranet_created_at_index' },
        { table: 'get_response', name: 'get_response_operation_id_index' },
        { table: 'publish_response', name: 'publish_response_operation_id_index' },
        { table: 'update_response', name: 'update_response_operation_id_index' },
        {
            table: 'publish_paranet_response',
            name: 'publish_paranet_response_operation_id_index',
        },
        { table: 'get_response', name: 'get_response_created_at_index' },
        { table: 'publish_response', name: 'publish_response_created_at_index' },
        { table: 'update_response', name: 'update_response_created_at_index' },
        {
            table: 'publish_paranet_response',
            name: 'publish_paranet_response_created_at_index',
        },
        { table: 'blockchain', name: 'contract_index' },
    ];

    for (const { table, name } of indexes) {
        // eslint-disable-next-line no-await-in-loop
        const [indexExists] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) AS index_exists
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
            AND table_name = '${table}'
            AND index_name = '${name}';
        `);

        if (indexExists[0].index_exists > 0) {
            // eslint-disable-next-line no-await-in-loop
            await queryInterface.removeIndex(table, name);
        }
    }
}
