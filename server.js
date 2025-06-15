const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');


require('dotenv').config();
const db = require("./Model/index.js")

const app = express();
const server = http.createServer(app); 
app.use(express.json());


// API routes
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const authRouter = require('./Routes/AuthRoutes/AuthRoutes.js');
const job =require('./Routes/JobRoutes/JobRoutes.js');
const application =require("./Routes/ApplicationRoutes/ApplicationRoutes.js");

app.use("/api/auth", authRouter);
app.use("/api/job", job);
app.use("/api/application", application);

// app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
    res.status(200).json({ status: 200, message: "API's are working" });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = { server };