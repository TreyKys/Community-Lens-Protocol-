export async function up({ context: { queryInterface, Sequelize } }) {
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (!(await columnExists('commands', 'priority'))) {
        await queryInterface.addColumn('commands', 'priority', {
            type: Sequelize.BIGINT,
        });
    }
}

export async function down({ context: { queryInterface } }) {
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (await columnExists('commands', 'priority')) {
        await queryInterface.removeColumn('commands', 'priority');
    }
}
