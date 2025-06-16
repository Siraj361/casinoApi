const db = require("../../Model/index.js");
const Application = db.Application;
const User = db.User;
const Job = db.Job;
const JobEmailSubscription = db.JobEmailSubscription;
const axios = require("axios");

const applyJobs = async (req, res) => {
  const userId = req.decodedToken.user_id;

  console.log("User ID from token:", userId);
  console.log("Request body:", req.body);
  const { jobId, cover_letter, useAI, email, subscription_type, password } = req.body;

  try {
    // Find the job
    const job = await Job.findOne({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Ensure CV is uploaded
    if (!req.file) {
      return res.status(400).json({ message: "CV is required" });
    }

    let finalCoverLetter = cover_letter || null;

    // Handle AI-generated cover letter
    if (useAI === 'true') {
      const user = await User.findOne({ where: { id: userId } });

      const prompt = `
      Write a professional and personalized cover letter for the job "${job.job_title}" at "${job.company_name}" located in ${job.job_location}.
      The applicant's full name is: ${user.first_name} ${user.last_name}.
      Make sure to include the applicant's name directly in the letter and avoid using placeholders like [Your Name].
      Do not include markdown or formatting placeholders. Return clean professional text only.
      `;

      const deepseekResponse = await axios.post(
        'https://api.deepseek.com/v1/chat/completions', // Correct API endpoint
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an expert cover letter writer.' },
            { role: 'user', content: prompt }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      finalCoverLetter = deepseekResponse.data.choices[0].message.content;
    }

    // Create application entry
    const application = await Application.create({
      user_id: userId,
      job_id: jobId,
      cv: req.file.path,
      cover_letter: finalCoverLetter,
    });

    // Now, handle email and subscription if provided
    if (email) {
      const existingSubscription = await JobEmailSubscription.findOne({ where: { email: email } });

      if (existingSubscription) {
        return res.status(400).json({ message: "This email is already subscribed" });
      }

      // Create new subscription
      await JobEmailSubscription.create({
        user_id: userId,
        email: email,
        subscription_type: subscription_type || "Daily", // Default to "Daily" if not provided
      });

      // You can add an email sending logic here with Mailgun or any service.
      // Ensure to confirm the subscription and send email updates based on the type.

    }

    return res.status(201).json({
      message: "Application created successfully",
      application,
    });

  } catch (error) {
    console.error("Error applying to job:", error?.response?.data || error.message);
    return res.status(500).json({ message: "Error creating application", error });
  }
};

const getUserAppliedJobs = async (req, res) => {
  const userId = req.decodedToken.user_id;

  try {
    // Step 1: Get applications for the user
    const applications = await Application.findAll({
      where: { user_id: userId },
      order: [['applied_at', 'DESC']]
    });

    // Step 2: Extract job IDs
    const jobIds = applications.map(app => app.job_id);

    // Step 3: Get job details
    const jobs = await Job.findAll({
      where: { id: jobIds }
    });

    // Step 4: Merge jobs with applications manually
    const result = applications.map(app => {
      const job = jobs.find(j => j.id === app.job_id);
      return {
        application_id: app.id,
        job_id: app.job_id,
        cv: app.cv,
        cover_letter: app.cover_letter,
        status: app.status,
        applied_at: app.applied_at,
        job: job || null
      };
    });

    return res.status(200).json({
      count: applications.length,
      applications: result
    });

  } catch (error) {
    console.error("Error fetching user applications:", error.message);
    return res.status(500).json({ message: "Failed to fetch user applications", error });
  }
};


module.exports = {
  applyJobs,
  getUserAppliedJobs
};
