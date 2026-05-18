const axios = require('axios');

/**
 * Sends email via Resend REST API.
 * This function bypasses the need for the heavy @resend/node library,
 * keeping the backend lightweight, fast, and fully compatible with all Node versions on Render.
 */
const sendEmailViaResend = async (subject, htmlContent, clientEmail, res) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.NOTIFICATION_EMAIL || 'info@lueinfo.com';
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (!resendApiKey) {
    console.error('[Proxy Error] RESEND_API_KEY is not defined in server environment variables.');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: Resend API Key is missing.'
    });
  }

  console.log(`[Proxy] Forwarding submission via Resend to: ${notificationEmail}`);

  try {
    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: `Lue InfoServices <${fromEmail}>`,
        to: notificationEmail,
        reply_to: clientEmail, // Allows clicking 'Reply' in email client to reply straight to the customer
        subject: subject,
        html: htmlContent
      },
      {
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      }
    );

    const result = response.data;
    
    // Resend returns an object with an "id" upon successful delivery
    if (result && result.id) {
      console.log(`[Proxy Success] Resend email sent successfully. ID: ${result.id}`);
      return res.status(200).json({
        success: true,
        message: 'Message delivered successfully.',
        id: result.id
      });
    } else {
      console.warn('[Proxy Warning] Resend API returned an unexpected response:', result);
      return res.status(400).json({ success: false, message: 'Resend delivery failed.', details: result });
    }
  } catch (error) {
    console.error(`[Proxy Error] Request to Resend failed: ${error.message}`);
    
    if (error.response) {
      console.error('[Proxy Error] Resend Error Payload:', error.response.data);
      return res.status(error.response.status).json({
        success: false,
        message: 'Resend API returned an error.',
        error: error.response.data
      });
    }

    return res.status(502).json({
      success: false,
      message: 'Bad Gateway: Failed to communicate with Resend API server.',
      error: error.message
    });
  }
};

/**
 * Handles Contact Us form submissions
 */
exports.handleContactSubmit = async (req, res) => {
  const { name, email, service, message, botcheck, subject, company, custom_service } = req.body;

  // Honeypot security bot check
  if (botcheck) {
    console.warn(`[Security Alert] Bot submission blocked for email: ${email}`);
    return res.status(400).json({ success: false, message: 'Bot submission detected and blocked.' });
  }

  // Field validation
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error: Name, email, and message are required fields.'
    });
  }

  const selectedService = service || 'Not Specified';
  const customSpec = custom_service || '';
  const clientCompany = company || 'Not Specified';

  // Premium Royal Blue HTML Template
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #F8FAFC; padding: 40px 0; color: #1E293B; margin:0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); padding: 32px 40px; text-align: center;">
          <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1px;">New Website Inquiry</h1>
          <p style="color: #BFDBFE; font-size: 14px; margin: 8px 0 0 0; font-weight: 500;">Lue InfoServices Contact Portal</p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 40px;">
          <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">You have received a new message through the website contact form. Here are the details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; width: 140px; font-size: 14px;">Full Name</td>
              <td style="padding: 12px 0; color: #475569; font-size: 14px;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; font-size: 14px;">Email Address</td>
              <td style="padding: 12px 0; color: #2563EB; font-size: 14px; font-weight: 600;"><a href="mailto:${email}" style="color: #2563EB; text-decoration: none;">${email}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; font-size: 14px;">Company</td>
              <td style="padding: 12px 0; color: #475569; font-size: 14px;">${clientCompany}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; font-size: 14px;">Service Required</td>
              <td style="padding: 12px 0; color: #475569; font-size: 14px;"><span style="background-color: #EFF6FF; color: #1E40AF; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; display: inline-block;">${selectedService}</span></td>
            </tr>
            ${customSpec ? `
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; font-size: 14px;">Custom Spec</td>
              <td style="padding: 12px 0; color: #475569; font-size: 14px;">${customSpec}</td>
            </tr>
            ` : ''}
          </table>
          
          <!-- Message Box -->
          <div style="background-color: #F8FAFC; border-left: 4px solid #2563EB; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
            <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Message Details</h4>
            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6; font-style: italic;">"${message.replace(/\n/g, '<br>')}"</p>
          </div>
          
          <!-- Reply Button -->
          <div style="text-align: center;">
            <a href="mailto:${email}" style="background-color: #2563EB; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1);">Reply to Client</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 40px; text-align: center; font-size: 12px; color: #94A3B8;">
          <p style="margin: 0 0 6px 0;">This email was securely proxied and delivered via Resend.</p>
          <p style="margin: 0;">&copy; 2026 Lue InfoServices. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  const emailSubject = subject || `New Inquiry from ${name} - Lue Infoservices`;
  await sendEmailViaResend(emailSubject, htmlContent, email, res);
};

/**
 * Handles Hire Talent form submissions
 */
exports.handleHireSubmit = async (req, res) => {
  const { name, email, selectedTech, message, botcheck, subject, technology, company } = req.body;

  // Honeypot security bot check
  if (botcheck) {
    console.warn(`[Security Alert] Bot submission blocked for email: ${email}`);
    return res.status(400).json({ success: false, message: 'Bot submission detected and blocked.' });
  }

  // Field validation
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error: Name, email, and message are required fields.'
    });
  }

  const reqTech = technology || selectedTech || 'Not Specified';
  const clientCompany = company || 'Not Specified';

  // Premium Orange Recruitment HTML Template
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #F8FAFC; padding: 40px 0; color: #1E293B; margin:0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #FB923C 0%, #EA580C 100%); padding: 32px 40px; text-align: center;">
          <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Hire Talent Request</h1>
          <p style="color: #FFEDD5; font-size: 14px; margin: 8px 0 0 0; font-weight: 500;">Lue InfoServices Recruitment</p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 40px;">
          <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">A client has requested talent resource placement. Here are the details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; width: 140px; font-size: 14px;">Contact Person</td>
              <td style="padding: 12px 0; color: #475569; font-size: 14px;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; font-size: 14px;">Email Address</td>
              <td style="padding: 12px 0; color: #EA580C; font-size: 14px; font-weight: 600;"><a href="mailto:${email}" style="color: #EA580C; text-decoration: none;">${email}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; font-size: 14px;">Company Name</td>
              <td style="padding: 12px 0; color: #475569; font-size: 14px;">${clientCompany}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; font-size: 14px;">Target Tech Stack</td>
              <td style="padding: 12px 0; color: #475569; font-size: 14px;"><span style="background-color: #FFF7ED; color: #C2410C; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; display: inline-block;">${reqTech}</span></td>
            </tr>
          </table>
          
          <!-- Message Box -->
          <div style="background-color: #F8FAFC; border-left: 4px solid #FB923C; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
            <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Requirement Details</h4>
            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6; font-style: italic;">"${message.replace(/\n/g, '<br>')}"</p>
          </div>
          
          <!-- Reply Button -->
          <div style="text-align: center;">
            <a href="mailto:${email}" style="background-color: #EA580C; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2), 0 2px 4px -1px rgba(234, 88, 12, 0.1);">Connect with Client</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 40px; text-align: center; font-size: 12px; color: #94A3B8;">
          <p style="margin: 0 0 6px 0;">Recruitment pipeline request routed via Resend.</p>
          <p style="margin: 0;">&copy; 2026 Lue InfoServices. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  const emailSubject = subject || `Hire Talent Inquiry: ${reqTech} - Lue Infoservices`;
  await sendEmailViaResend(emailSubject, htmlContent, email, res);
};

/**
 * Handles Interactive Chatbot lead captures
 */
exports.handleChatbotSubmit = async (req, res) => {
  const { name, email, message, subject } = req.body;

  // Field validation
  if (!email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error: Email and message are required for chatbot submission.'
    });
  }

  const clientName = name || 'Website Visitor';

  // Premium Light Blue Chatbot HTML Template
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #F8FAFC; padding: 40px 0; color: #1E293B; margin:0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); padding: 32px 40px; text-align: center;">
          <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Chatbot Lead Captured</h1>
          <p style="color: #E0F2FE; font-size: 14px; margin: 8px 0 0 0; font-weight: 500;">Lue InfoServices AI Assistant</p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 40px;">
          <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">Your chatbot assistant captured a new prospect! Details below:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; width: 140px; font-size: 14px;">Visitor Name</td>
              <td style="padding: 12px 0; color: #475569; font-size: 14px;">${clientName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 12px 0; font-weight: 700; color: #334155; font-size: 14px;">Email Address</td>
              <td style="padding: 12px 0; color: #0284C7; font-size: 14px; font-weight: 600;"><a href="mailto:${email}" style="color: #0284C7; text-decoration: none;">${email}</a></td>
            </tr>
          </table>
          
          <!-- Message Box -->
          <div style="background-color: #F8FAFC; border-left: 4px solid #0EA5E9; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
            <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Chatbot Transcript Summary</h4>
            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          <!-- Reply Button -->
          <div style="text-align: center;">
            <a href="mailto:${email}" style="background-color: #0EA5E9; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2), 0 2px 4px -1px rgba(14, 165, 233, 0.1);">Reply to Prospect</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 40px; text-align: center; font-size: 12px; color: #94A3B8;">
          <p style="margin: 0 0 6px 0;">Automated lead capture processed via Resend.</p>
          <p style="margin: 0;">&copy; 2026 Lue InfoServices. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  const emailSubject = subject || `New Lead: ${clientName} - Chatbot Inquiry`;
  await sendEmailViaResend(emailSubject, htmlContent, email, res);
};
