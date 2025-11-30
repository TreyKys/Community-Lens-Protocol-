export async function up({ context: { queryInterface } }) {
    async function tableExists(table) {
        const [results] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) AS table_exists
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = '${table}';
        `);
        return results[0].table_exists > 0;
    }

    if (await tableExists('finality')) {
        await queryInterface.renameTable('finality', 'ask');
    }

    if (await tableExists('finality_response')) {
        await queryInterface.renameTable('finality_response', 'ask_response');
    }
}

export async function down({ context: { queryInterface } }) {
    async function tableExists(table) {
        const [results] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) AS table_exists
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = '${table}';
        `);
        return results[0].table_exists > 0;
    }

    if (await tableExists('ask')) {
        await queryInterface.renameTable('ask', 'finality');
    }

    if (await tableExists('ask_response')) {
        await queryInterface.renameTable('ask_response', 'finality_response');
    }
}
