import nodemailer from "nodemailer";
import formidable from "formidable";

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).send("Method not allowed");
    }

    const form = new formidable.IncomingForm({
        multiples: true,
        keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send("File parsing error");
        }

        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD,
                },
            });

            const attachments = [];

            Object.values(files).forEach((file) => {
                if (Array.isArray(file)) {
                    file.forEach((f) => {
                        attachments.push({
                            filename: f.originalFilename,
                            path: f.filepath,
                        });
                    });
                } else {
                    attachments.push({
                        filename: file.originalFilename,
                        path: file.filepath,
                    });
                }
            });

            await transporter.sendMail({
                from: `"Credit Dispute Form" <${process.env.GMAIL_USER}>`,
                to: process.env.NOTIFY_EMAIL,
                subject: "New Credit Dispute Submission",
                text: `
Name: ${fields.name}
Phone: ${fields.phone}
DOB: ${fields.dob}
SSN: ${fields.ssn}
Email: ${fields.email}
        `,
                attachments,
            });

            // ✅ REDIRECT AFTER SUCCESS
            return res.redirect(
                303,
                "https://bisque-ram-411182.hostingersite.com/thank-you"
            );

        } catch (error) {
            console.error(error);
            return res.status(500).send("Email failed");
        }
    });
}