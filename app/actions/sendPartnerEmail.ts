'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface PartnerFormData {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

export async function sendPartnerEmail(data: PartnerFormData) {
  try {
    const { company, firstName, lastName, email, message } = data;

    const result = await resend.emails.send({
      from: 'hello@gadgetconsulting.pt',
      to: 'joaoalvaromota@gmail.com',
      subject: `New Partner Inquiry from ${company}`,
      text: `New Partner Inquiry\nCompany: ${company}\nContact Name: ${firstName} ${lastName}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <h2>New Partner Inquiry</h2>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Contact Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
