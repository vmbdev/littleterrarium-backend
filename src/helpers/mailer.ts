import nodemailer, { Transporter } from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool';
import Mail from 'nodemailer/lib/mailer';

import { mailer as mailerConfig } from '../../littleterrarium.config';

export class Mailer {
  transport: Transporter;

  constructor(options: SMTPPool.Options) {
    this.transport = nodemailer.createTransport(options);
  }

  async test() {
    await this.transport.verify();
  }

  async send(mail: Mail.Options) {
    await this.transport.sendMail(mail);
  }

  async sendUserRecovery(dst: string, token: string, userId: number) {
    const recoveryUrl = `https://littleterrarium.one/user/reset/${userId}/${token}`;

    await this.send({
      from: 'Little Terrarium <no-reply@littleterrarium.one>',
      to: `<${dst}>`,
      subject: 'Recover your password',
      text: `
        We have received a request to reset your password. If you have not made
        the petition, please ignore this email. Use the following link to start
        the recovery process.
        ${recoveryUrl}
      `,
      html: `
        <p>We have received a request to reset your password.</p>
        <p>If you have not made the petition, please ignore this email.</p>
        <p>Use the following link to start the recovery process.</p>
        <a href="${recoveryUrl}">
          ${recoveryUrl}
        </a>
      `
    });
  }
}

const mailer = new Mailer(mailerConfig as SMTPPool.Options);
export default mailer;