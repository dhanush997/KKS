import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const ADMIN_EMAIL = "hembram.karunakar@gmail.com";
const SMTP_USER = "hembram.karunakar@gmail.com";
const SMTP_PASS = "babi crqo giqj ufyy"; // App Password

// Transporter with fixed IPv4 and SSL settings
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Professional Template Generator
 */
const getEmailTemplate = (name, details, type = 'workshop', isForAdmin = false) => {
    const brandColor = "#f59e0b"; // Yellow-500

    // Determine Content based on Type
    let title, subtitle, detailsHtml, ctaText;

    if (type === 'workshop') {
        title = isForAdmin ? "New Workshop Lead" : "Workshop Spot Reserved!";
        subtitle = isForAdmin
            ? `Someone has registered for your upcoming workshop.`
            : `Hi ${name}, your spot for the 28th Feb workshop is officially confirmed.`;
        ctaText = "Join Workshop WhatsApp";
        detailsHtml = `
            <tr><td style="padding: 8px 0; color: #64748b;">Serial No:</td><td style="color: #1e293b; font-weight: bold;">${details.serialNo}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Time Slot:</td><td style="color: #d97706; font-weight: bold;">${details.slot}</td></tr>
        `;
    } else if (type === 'plan') {
        title = isForAdmin ? "New Plan Subscription Inquiry" : "Welcome to your Premium Trading Journey!";
        subtitle = isForAdmin
            ? `A new user is interested in subscribing to a plan.`
            : `Hi ${name}, thank you for your interest in joining the TradeLikeKK professional trading community.`;
        ctaText = "Go to Member Dashboard";
        detailsHtml = `
            <tr><td style="padding: 8px 0; color: #64748b;">Selected Plan:</td><td style="color: #d97706; font-weight: bold;">${details.purpose.replace('Subscription Plan: ', '')}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Phone:</td><td style="color: #1e293b; font-weight: bold;">${details.phone}</td></tr>
        `;
    } else {
        title = isForAdmin ? "New Inquiry Received" : "Welcome to the TradeLikeKK Family!";
        subtitle = isForAdmin
            ? `A new interest has been logged via ${type}.`
            : `Welcome ${name}! We're thrilled to have you as part of the TradeLikeKK professional trading journey.`;
        ctaText = "Join Trading Community";
        detailsHtml = details.phone ? `<tr><td style="padding: 8px 0; color: #64748b;">Phone:</td><td style="color: #1e293b; font-weight: bold;">${details.phone}</td></tr>` : '';
    }

    return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #f8fafc; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="background-color: #0f172a; padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">
                        TradeLike<span style="color: ${brandColor};">KK</span>
                    </h1>
                </div>

                <div style="padding: 40px 30px;">
                    <h2 style="color: #1e293b; margin-top: 0;">${title}</h2>
                    <p style="color: #475569; line-height: 1.6;">${subtitle}</p>
                    
                    ${(isForAdmin || type === 'workshop') ? `
                    <div style="background-color: #f1f5f9; border-left: 4px solid ${brandColor}; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                        <h3 style="color: #1e293b; margin-top: 0; font-size: 14px; text-transform: uppercase;">Information</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Name:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: bold;">${details.name}</td>
                            </tr>
                            ${detailsHtml}
                            ${details.purpose ? `<tr><td style="padding: 8px 0; color: #64748b;">Message:</td><td style="color: #1e293b; font-weight: bold;">${details.purpose}</td></tr>` : ''}
                        </table>
                    </div>
                    ` : ''}

                    ${!isForAdmin ? `
                    <div style="text-align: center; margin-top: 40px;">
                        <a href="#" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                            ${ctaText}
                        </a>
                    </div>
                    ` : ''}
                </div>

                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 TradeLikeKK. Professional Trading.</p>
                </div>
            </div>
        </div>
    `;
};

app.post('/api/send-email', async (req, res) => {
    const { name, email, serialNo, slot, phone, purpose } = req.body;

    const type = (serialNo && slot) ? 'workshop' :
        (purpose && purpose.startsWith('Subscription Plan:')) ? 'plan' :
            (phone ? 'chatbot' : 'newsletter');

    try {
        await transporter.sendMail({
            from: `"TradeLikeKK System" <${SMTP_USER}>`,
            to: ADMIN_EMAIL,
            subject: `New ${type.toUpperCase()} Inquiry: ${name}`,
            html: getEmailTemplate(name, req.body, type, true)
        });

        await transporter.sendMail({
            from: `"TradeLikeKK" <${SMTP_USER}>`,
            to: email,
            subject: type === 'workshop' ? `Your Workshop Spot is Reserved! [${serialNo}]` : `Welcome to the TradeLikeKK Family!`,
            html: getEmailTemplate(name, req.body, type, false)
        });

        res.status(200).json({ success: true, message: "Emails sent successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Mail Engine running on http://127.0.0.1:${PORT}`);
    console.log(`[Server] Accessible via http://localhost:${PORT}`);
});
