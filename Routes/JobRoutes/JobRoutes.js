const JobController = require('../../Controller/JobController/JobController.js');
const VerifyJWTtoken = require('../../Middleware/verify_jwt_token.js');
const router = require("express").Router();

// Create a job manually
router.post("/createJob", JobController.createJob);

// Get all jobs
router.get("/getJobs", JobController.getJobs);

// Fetch and save multiple jobs from external API
router.get("/fetchAndSaveJobs", JobController.fetchAndSaveJobs);

// Fetch and save a single job by job_id from external API
router.get("/fetchJobById", JobController.fetchJobByIdAndSave);

module.exports = router;