module.exports = (sequelize, DataTypes) => {
    const Job = sequelize.define("Job",
        {
            job_title: {
                type: DataTypes.STRING,
                allowNull: false
            },
            company_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            job_description: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            job_location: {
                type: DataTypes.STRING,
                allowNull: false
            },
            job_type: {
                type: DataTypes.STRING,  // E.g., Full-time, Part-time, Remote, etc.
                allowNull: true
            },
            job_posted_at: {
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

  
    return Job;
};
