import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

// Disable default body parsing (required for formidable)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // Quick environment safety check
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS || !process.env.TO) {
    console.error("Missing required environment variables.");
    return res.status(500).send("Server configuration error.");
  }

  const form = formidable({
    multiples: false,
    keepExtensions: true,
  });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Create Gmail transporter (explicit SMTP — more stable)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // MUST be Google App Password
      },
    });

    // Build attachments using buffers (serverless safe)
    const attachments = [];

    async function addFile(file) {
      if (!file) return;

      const fileBuffer = await fs.promises.readFile(file.filepath);

      attachments.push({
        filename: file.originalFilename || "uploaded-file",
        content: fileBuffer,
      });
    }

    await addFile(files.id_upload);
    await addFile(files.ssn_upload);
    await addFile(files.address_proof_upload);

    // Email content
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.TO,
      subject: "New Credit Dispute Form Submission",
      html: `
        <h2>New Submission</h2>

        <p><strong>Name:</strong> ${fields.full_name || ""}</p>
        <p><strong>Email:</strong> ${fields.email || ""}</p>
        <p><strong>Phone:</strong> ${fields.phone || ""}</p>
        <p><strong>DOB:</strong> ${fields.date_of_birth || ""}</p>
        <p><strong>SSN:</strong> ${fields.ssn || ""}</p>
        <p><strong>Address:</strong> 
          ${fields.address || ""}, 
          ${fields.city || ""}, 
          ${fields.state || ""}, 
          ${fields.zip_code || ""}
        </p>

        <hr />

        <p><strong>MyFreeScoreNow Username:</strong> ${fields.myfreescorenow_username || ""}</p>
        <p><strong>MyFreeScoreNow Password:</strong> ${fields.myfreescorenow_password || ""}</p>

        <p><strong>Experian Username:</strong> ${fields.experian_username || ""}</p>
        <p><strong>Experian Password:</strong> ${fields.experian_password || ""}</p>
      `,
      attachments,
    };

    await transporter.sendMail(mailOptions);

    // Redirect after success
    res.writeHead(302, {
      Location: "https://bisque-ram-411182.hostingersite.com/thank-you",
    });
    res.end();

  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).send("Email sending failed.");
  }
}