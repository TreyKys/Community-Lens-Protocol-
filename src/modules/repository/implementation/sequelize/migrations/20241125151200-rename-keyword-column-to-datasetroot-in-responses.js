export async function up({ context: { queryInterface } }) {
    // Helper function to check if a column exists
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (await columnExists('publish_response', 'keyword')) {
        await queryInterface.renameColumn('publish_response', 'keyword', 'dataset_root');
    }

    if (await columnExists('get_response', 'keyword')) {
        await queryInterface.renameColumn('get_response', 'keyword', 'dataset_root');
    }
}

export async function down({ context: { queryInterface } }) {
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (await columnExists('publish_response', 'dataset_root')) {
        await queryInterface.renameColumn('publish_response', 'dataset_root', 'keyword');
    }

    if (await columnExists('get_response', 'dataset_root')) {
        await queryInterface.renameColumn('get_response', 'dataset_root', 'keyword');
    }
}
