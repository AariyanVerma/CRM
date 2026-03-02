

const nodemailer = require('nodemailer')

try {
  require('dotenv').config({ path: '.env.local' })
} catch (e) {
  console.log("Note: dotenv not available, using process.env directly")
}

function parseFromEmail(fromEmail) {
  if (!fromEmail) {
    return {
      name: "New York Gold Market",
      address: process.env.SMTP_USER || "",
    }
  }

  const match = fromEmail.match(/^"?([^"<]+)"?\s*<(.+)>$/i)
  if (match) {
    return {
      name: match[1].trim(),
      address: match[2].trim(),
    }
  }

  return {
    name: "New York Gold Market",
    address: fromEmail.replace(/"/g, "").trim(),
  }
}

console.log("=== Email Configuration Test ===\n")

console.log("Environment Variables:")
console.log("SMTP_HOST:", process.env.SMTP_HOST || "NOT SET")
console.log("SMTP_PORT:", process.env.SMTP_PORT || "NOT SET")
console.log("SMTP_SECURE:", process.env.SMTP_SECURE || "NOT SET")
console.log("SMTP_USER:", process.env.SMTP_USER || "NOT SET")
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "SET (length: " + process.env.SMTP_PASS.replace(/\s/g, "").length + ")" : "NOT SET")
console.log("FROM_EMAIL:", process.env.FROM_EMAIL || "NOT SET")
console.log()

const fromEmailParsed = parseFromEmail(process.env.FROM_EMAIL)
console.log("Parsed FROM_EMAIL:")
console.log("  Name:", fromEmailParsed.name)
console.log("  Address:", fromEmailParsed.address)
console.log()

const smtpConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s/g, ""),
  },
}

console.log("SMTP Configuration:")
console.log("  Host:", smtpConfig.host)
console.log("  Port:", smtpConfig.port)
console.log("  Secure:", smtpConfig.secure)
console.log("  Auth User:", smtpConfig.auth.user || "NOT SET")
console.log("  Auth Pass:", smtpConfig.auth.pass ? "SET" : "NOT SET")
console.log()

const transporter = nodemailer.createTransport(smtpConfig)

console.log("Testing SMTP connection...")
transporter.verify()
  .then(() => {
    console.log("✅ SMTP connection successful!")
    console.log("\nYou can now send emails.")
  })
  .catch((error) => {
    console.error("❌ SMTP connection failed!")
    console.error("Error:", error.message)
    if (error.code) {
      console.error("Error Code:", error.code)
    }
    if (error.command) {
      console.error("Failed Command:", error.command)
    }
    console.error("\nCommon issues:")
    console.error("1. Check if SMTP_USER and SMTP_PASS are correct")
    console.error("2. Make sure you're using a Gmail App Password (not your regular password)")
    console.error("3. Check if 'Less secure app access' is enabled (if using regular password)")
    console.error("4. Verify firewall/network allows SMTP connections on port 465")
    process.exit(1)
  })

