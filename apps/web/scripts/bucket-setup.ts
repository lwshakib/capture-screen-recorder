import {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3"
import dotenv from "dotenv"

dotenv.config()

const client = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const bucketName = process.env.AWS_S3_BUCKET_NAME!

async function setup() {
  console.log(`Setting up bucket: ${bucketName}...`)

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }))
    console.log("Bucket already exists.")
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      console.log("Bucket not found. Creating...")
      await client.send(new CreateBucketCommand({ Bucket: bucketName }))
      console.log("Bucket created.")
    } else {
      throw err
    }
  }

  console.log("Setting up CORS policy...")
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"], // User requested "*"
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  )
  console.log("CORS policy updated.")
  console.log("Bucket setup complete.")
}

setup().catch((err) => {
  console.error("Setup failed:", err)
  process.exit(1)
})
