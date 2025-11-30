export async function up({ context: { queryInterface, Sequelize } }) {
    // Helper function to check if a column exists
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (await columnExists('blockchain_event', 'blockchain_id')) {
        await queryInterface.renameColumn('blockchain_event', 'blockchain_id', 'blockchain');
    }

    if (await columnExists('blockchain_event', 'block')) {
        await queryInterface.changeColumn('blockchain_event', 'block', {
            type: Sequelize.BIGINT,
        });

        await queryInterface.renameColumn('blockchain_event', 'block', 'block_number');
    }

    if (!(await columnExists('blockchain_event', 'transaction_index'))) {
        await queryInterface.addColumn('blockchain_event', 'transaction_index', {
            type: Sequelize.BIGINT,
        });
    }

    if (!(await columnExists('blockchain_event', 'log_index'))) {
        await queryInterface.addColumn('blockchain_event', 'log_index', {
            type: Sequelize.BIGINT,
        });
    }

    if (!(await columnExists('blockchain_event', 'contract_address'))) {
        await queryInterface.addColumn('blockchain_event', 'contract_address', {
            type: Sequelize.STRING,
        });
    }
}

export async function down({ context: { queryInterface, Sequelize } }) {
    async function columnExists(table, column) {
        const tableDescription = await queryInterface.describeTable(table);
        return Object.prototype.hasOwnProperty.call(tableDescription, column);
    }

    if (await columnExists('blockchain_event', 'block_number')) {
        await queryInterface.renameColumn('blockchain_event', 'block_number', 'block');
    }

    if (await columnExists('blockchain_event', 'block')) {
        await queryInterface.changeColumn('blockchain_event', 'block', {
            type: Sequelize.INTEGER,
        });
    }

    if (await columnExists('blockchain_event', 'blockchain')) {
        await queryInterface.renameColumn('blockchain_event', 'blockchain', 'blockchain_id');
    }

    if (await columnExists('blockchain_event', 'transaction_index')) {
        await queryInterface.removeColumn('blockchain_event', 'transaction_index');
    }

    if (await columnExists('blockchain_event', 'log_index')) {
        await queryInterface.removeColumn('blockchain_event', 'log_index');
    }

    if (await columnExists('blockchain_event', 'contract_address')) {
        await queryInterface.removeColumn('blockchain_event', 'contract_address');
    }
}
