import nodemailer from 'nodemailer'

import { config } from './config.js'

const transport = config.smtpUrl ? nodemailer.createTransport(config.smtpUrl) : undefined

export const isEmailConfigured = transport !== undefined

/**
 * Sends a plain-text email. Without SMTP configured (local development), the
 * message is written to the server log instead so links can still be followed.
 */
export async function sendEmail(to: string, subject: string, text: string) {
  if (!transport) {
    console.log(`[email:dev] To: ${to}\nSubject: ${subject}\n\n${text}\n`)
    return
  }
  await transport.sendMail({ from: config.mailFrom, to, subject, text })
}
