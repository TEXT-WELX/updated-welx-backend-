const nodemailer = require("nodemailer");
const AWS = require("aws-sdk");

async function paymentMailSend(mailOptions) {
  try {
    AWS.config.update({
      accessKeyId: process.env.SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.SES_SECRET_KEY_ID,
      region: process.env.SES_REGION,
    });

    const transporter = nodemailer.createTransport({
      SES: new AWS.SES({
        apiVersion: "2010-12-01",
      }),
    });

    const response = await transporter.sendMail(mailOptions);
    return response;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  paymentMailSend,
};
