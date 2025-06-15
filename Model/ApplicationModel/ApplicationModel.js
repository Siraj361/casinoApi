module.exports = (sequelize, DataTypes) => {
    const Application = sequelize.define("Application",
        {
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            job_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            cv: {
                type: DataTypes.STRING, // Path to the uploaded CV
                allowNull: false,
            },
            cover_letter: {
                type: DataTypes.TEXT, // Optional Cover letter
                allowNull: true,
            },
            status: {
                type: DataTypes.STRING,  // E.g., Applied, Under Review, Rejected, etc.
                allowNull: false,
                defaultValue: "Applied"
            },
            applied_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
              createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                field: 'created_at'
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                field: 'updated_at'
            }
        });

  

    return Application;
};
