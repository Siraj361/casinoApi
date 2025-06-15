const db = require("../../Model");
const Job = db.Job;
const axios = require('axios');

const fetchJobsFromExternalAPIs = async (email, password) => {
    try {
        const availableJobsResponse = await axios.get('https://www.jobmonitor.com/api/available', {
            params: { email, password }
        });

        let availableJobs = availableJobsResponse.data.jobs || [];
        return availableJobs;
    } catch (error) {
        console.error("Error fetching jobs from external APIs:", error);
        return [];
    }
};

const fetchJobByIdAndSave = async (req, res) => {
    const { email, password, job_id } = req.query;

    if (!email || !password || !job_id) {
        return res.status(400).json({ error: "Email, password, and job_id are required" });
    }

    try {
        const response = await axios.get('https://www.jobmonitor.com/api/', {
            params: { email, password, job_id }
        });

        const jobArray = response.data?.data?.job || [];

        if (jobArray.length === 0) {
            return res.status(404).json({ error: "No job found for this ID" });
        }

        const job = jobArray[0];

        const savedJob = await Job.create({
            job_title: job.job_title,
            job_description: "", // Update this if description is provided
            company_name: job.company_name,
            job_location: "", // Update if available
            job_type: "" // Update if available
        });

        return res.status(200).json({ message: "Job fetched and saved", job: savedJob });
    } catch (error) {
        console.error("Error fetching job by ID:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const createJob = async (req, res) => {
    try {
        const { job_title, job_description, company_name, job_location, job_type } = req.body;

        if (!job_title || !job_description || !company_name || !job_location || !job_type) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const newJob = await Job.create({
            job_title,
            job_description,
            company_name,
            job_location,
            job_type
        });

        res.status(201).json({ message: "Job created successfully", job: newJob });
    } catch (error) {
        console.error("Error creating job:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getJobs = async (req, res) => {
    try {
        const jobs = await Job.findAll();
        res.status(200).json(jobs);
    } catch (error) {
        console.error("Error getting jobs:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const fetchAndSaveJobs = async (req, res) => {
    const { email, password } = req.query;

    try {
        const availableJobs = await fetchJobsFromExternalAPIs(email, password);

        if (availableJobs.length === 0) {
            return res.status(404).json({ message: "No available jobs found." });
        }

        const savedJobs = [];
        for (const job of availableJobs) {
            const savedJob = await Job.create({
                job_title: job.title,
                job_description: job.description,
                company_name: job.company_name,
                job_location: job.location,
                job_type: job.job_type
            });
            savedJobs.push(savedJob);
        }

        return res.status(200).json({
            message: "Jobs fetched and saved successfully",
            jobs: savedJobs
        });
    } catch (error) {
        console.error("Error fetching and saving jobs:", error);
        return res.status(500).json({ message: "Error fetching and saving jobs", error });
    }
};

module.exports = {
    createJob,
    getJobs,
    fetchAndSaveJobs,
    fetchJobByIdAndSave
};
