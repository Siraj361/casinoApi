module.exports = {
    HOST: process.env.DB_HOST || '127.0.0.1', 
    USER: process.env.DB_USER || 'casino_user', // USER ko DB_USER kar diya
    PASSWORD: process.env.DB_PASSWORD || 'MyPassword123',
    DB: process.env.DB_NAME || 'casino',
    dialect: 'mysql',
};


// module.exports = {
//     HOST: process.env.DB_HOST || '127.0.0.1', 
//     USER: process.env.DB_USER || 'casino_user', // USER ko DB_USER kar diya
//     // PASSWORD: process.env.DB_PASSWORD || 'MyPassword123',
//     PASSWORD: "",

//     DB: process.env.DB_NAME || 'casino',
//     dialect: 'mysql',
// };