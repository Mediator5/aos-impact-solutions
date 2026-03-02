import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

// Disable default body parsing (required for file uploads)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS || !process.env.TO) {
    console.error("Missing required environment variables.");
    return res.status(500).send("Server configuration error.");
  }

  const form = formidable({
    multiples: true, // Important for array-safe handling
    keepExtensions: true,
  });

  try {
    // Parse form safely using Promise wrapper
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Create Gmail transporter (explicit SMTP = more reliable)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // MUST be Google App Password
      },
    });

    const attachments = [];

    async function addFile(fileField) {
      if (!fileField) return;

      // Handle array or single file
      const file = Array.isArray(fileField) ? fileField[0] : fileField;

      if (!file || !file.filepath) return;

      const buffer = await fs.promises.readFile(file.filepath);

      attachments.push({
        filename: file.originalFilename || "uploaded-file",
        content: buffer,
      });
    }

    // Attach uploaded files
    await addFile(files.drivers_license_upload);
    await addFile(files.ssc_upload);

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.TO,
      subject: "New Tradeline Signup Submission",
      html: `
        <h2>New Tradeline Signup</h2>

        <p><strong>Name:</strong> ${fields.first_name || ""} ${fields.last_name || ""}</p>
        <p><strong>Email:</strong> ${fields.email || ""}</p>
        <p><strong>Phone:</strong> ${fields.phone || ""}</p>
        <p><strong>DOB:</strong> ${fields.date_of_birth || ""}</p>

        <hr/>

        <h3>Address</h3>
        <p>${fields.address || ""}</p>
        <p>${fields.city || ""}, ${fields.state || ""} ${fields.zip_code || ""}</p>

        <hr/>

        <h3>Experian Information</h3>
        <p><strong>Username:</strong> ${fields.experian_username || ""}</p>
        <p><strong>Password:</strong> ${fields.experian_password || ""}</p>
        <p><strong>Security Answer:</strong> ${fields.experian_security_answer || ""}</p>
        <p><strong>4 Digit PIN:</strong> ${fields.experian_pin || ""}</p>

        <hr/>

        <h3>Agreement</h3>
        <p>No Refunds Agreed: ${fields.agree_no_refunds ? "Yes" : "No"}</p>
        <p>Security Freezes Responsibility: ${fields.agree_security_freezes ? "Yes" : "No"}</p>
      `,
      attachments,
    };

    await transporter.sendMail(mailOptions);

    res.writeHead(302, {
      Location: "https://bisque-ram-411182.hostingersite.com/thank-you",
    });
    res.end();

  } catch (error) {
    console.error("API ERROR:", error);
    res.status(500).send("Email sending failed.");
  }
}