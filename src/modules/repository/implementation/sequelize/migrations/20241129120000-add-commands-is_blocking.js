export async function up({ context: { queryInterface, Sequelize } }) {
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (!(await columnExists('commands', 'is_blocking'))) {
        await queryInterface.addColumn('commands', 'is_blocking', {
            type: Sequelize.BOOLEAN,
        });
    }
}

export async function down({ context: { queryInterface } }) {
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (await columnExists('commands', 'is_blocking')) {
        await queryInterface.removeColumn('commands', 'is_blocking');
    }
}
