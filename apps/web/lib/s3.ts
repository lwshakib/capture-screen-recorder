import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { nanoid } from "nanoid"

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const bucketName = process.env.AWS_S3_BUCKET_NAME!

/**
 * Generates a presigned URL for uploading a file to S3.
 */
export async function getUploadPresignedUrl(
  fileName: string,
  contentType: string,
  userId: string
) {
  const key = `recordings/${userId}/${nanoid()}-${fileName}`

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  return { url, key }
}

/**
 * Generates a signed URL for downloading/playing a file from S3.
 */
export async function getDownloadSignedUrl(key: string, expiresIn = 3600 * 24) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Deletes an object from S3.
 */
export async function deleteS3Object(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  return await s3Client.send(command)
}
