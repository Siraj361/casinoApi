module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("users",
        {
            username: {
                type: DataTypes.STRING,
                allowNull: true
            },
            email: {
                type: DataTypes.STRING,
                allowNull: true
            },
           
            password: {
                type: DataTypes.STRING,
                allowNull: true
            },
            first_name: {
                type: DataTypes.STRING,
                allowNull: true
            },
            last_name: {
                type: DataTypes.STRING,
                allowNull: true
            },
            birthdate: {
                type: DataTypes.DATE,
                allowNull: true
            },
            address: {
                type: DataTypes.STRING,
                allowNull: true
            },
            country: {
                type: DataTypes.STRING,
                allowNull: true
            },
            city: {
                type: DataTypes.STRING,
                allowNull: true
            },
            Nationality: {
                type: DataTypes.STRING,
                allowNull: true
            },
            age: {
                type: DataTypes.INTEGER,
                allowNull: true
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
   
    return User;
}