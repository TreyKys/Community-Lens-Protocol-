export const up = async ({ context: { queryInterface, Sequelize } }) => {
    await queryInterface.createTable('paranet_synced_asset', {
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        blockchain_id: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        ual: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        paranet_ual: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        public_assertion_id: {
            allowNull: true,
            type: Sequelize.STRING,
        },
        private_assertion_id: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        sender: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        transaction_hash: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('NOW()'),
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('NOW()'),
        },
    });

    const [triggerInsertExists] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) AS trigger_exists
        FROM information_schema.triggers
        WHERE trigger_schema = DATABASE()
          AND trigger_name = 'before_insert_paranet_synced_asset';
    `);
    if (triggerInsertExists[0].trigger_exists === 0) {
        await queryInterface.sequelize.query(`
            CREATE TRIGGER before_insert_paranet_synced_asset
            BEFORE INSERT ON paranet_synced_asset
            FOR EACH ROW
            BEGIN
                SET NEW.created_at = NOW();
            END;
        `);
    }

    const [triggerUpdateExists] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) AS trigger_exists
        FROM information_schema.triggers
        WHERE trigger_schema = DATABASE()
          AND trigger_name = 'before_update_paranet_synced_asset';
    `);
    if (triggerUpdateExists[0].trigger_exists === 0) {
        await queryInterface.sequelize.query(`
            CREATE TRIGGER before_update_paranet_synced_asset
            BEFORE UPDATE ON paranet_synced_asset
            FOR EACH ROW
            BEGIN
                SET NEW.updated_at = NOW();
            END;
        `);
    }

    const indexes = [
        { name: 'idx_paranet_ual_created_at', columns: '(paranet_ual, created_at)' },
        { name: 'idx_sender', columns: '(sender)' },
        { name: 'idx_paranet_ual_unique', columns: '(paranet_ual)' },
    ];

    for (const index of indexes) {
        // eslint-disable-next-line no-await-in-loop
        const [indexExists] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) AS index_exists
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'paranet_synced_asset'
              AND index_name = '${index.name}';
        `);
        if (indexExists[0].index_exists === 0) {
            // eslint-disable-next-line no-await-in-loop
            await queryInterface.sequelize.query(`
                CREATE INDEX ${index.name}
                ON paranet_synced_asset ${index.columns};
            `);
        }
    }
};

export const down = async ({ context: { queryInterface } }) => {
    await queryInterface.dropTable('paranet_synced_asset');

    await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS before_insert_paranet_synced_asset;
    `);

    await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS before_update_paranet_synced_asset;
    `);
};
