import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

// Disable default body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const form = formidable({
    multiples: false,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Form parsing error");
    }

    try {
      // Gmail transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS, // App Password (NOT real password)
        },
      });

      // Prepare attachments
      const attachments = [];

      if (files.id_upload) {
        attachments.push({
          filename: files.id_upload.originalFilename,
          path: files.id_upload.filepath,
        });
      }

      if (files.ssn_upload) {
        attachments.push({
          filename: files.ssn_upload.originalFilename,
          path: files.ssn_upload.filepath,
        });
      }

      if (files.address_proof_upload) {
        attachments.push({
          filename: files.address_proof_upload.originalFilename,
          path: files.address_proof_upload.filepath,
        });
      }

      // Email body
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.TO, // where you receive submissions
        subject: "New Credit Dispute Form Submission",
        html: `
          <h2>New Submission</h2>
          <p><strong>Name:</strong> ${fields.full_name}</p>
          <p><strong>Email:</strong> ${fields.email}</p>
          <p><strong>Phone:</strong> ${fields.phone}</p>
          <p><strong>DOB:</strong> ${fields.date_of_birth}</p>
          <p><strong>SSN:</strong> ${fields.ssn}</p>
          <p><strong>Address:</strong> ${fields.address}, ${fields.city}, ${fields.state}, ${fields.zip_code}</p>

          <hr />

          <p><strong>MyFreeScoreNow Username:</strong> ${fields.myfreescorenow_username}</p>
          <p><strong>MyFreeScoreNow Password:</strong> ${fields.myfreescorenow_password}</p>

          <p><strong>Experian Username:</strong> ${fields.experian_username}</p>
          <p><strong>Experian Password:</strong> ${fields.experian_password}</p>
        `,
        attachments,
      };

      await transporter.sendMail(mailOptions);

      // Cleanup temp files
      attachments.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });

      // Redirect after success
      res.writeHead(302, {
        Location: "https://bisque-ram-411182.hostingersite.com/thank-you",
      });
      res.end();

    } catch (error) {
      console.error(error);
      res.status(500).send("Email sending failed");
    }
  });
}