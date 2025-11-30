export async function up({ context: { queryInterface } }) {
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (await columnExists('publish_response', 'dataset_root')) {
        await queryInterface.removeColumn('publish_response', 'dataset_root');
    }

    if (await columnExists('get_response', 'dataset_root')) {
        await queryInterface.removeColumn('get_response', 'dataset_root');
    }
}

export async function down({ context: { queryInterface, Sequelize } }) {
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (!(await columnExists('publish_response', 'dataset_root'))) {
        await queryInterface.addColumn('publish_response', 'dataset_root', {
            type: Sequelize.STRING,
            allowNull: false,
        });
    }

    if (!(await columnExists('get_response', 'dataset_root'))) {
        await queryInterface.addColumn('get_response', 'dataset_root', {
            type: Sequelize.STRING,
            allowNull: false,
        });
    }
}
