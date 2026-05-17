import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const client = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME!;

async function teardown() {
  console.log(`Tearing down bucket: ${bucketName}...`);

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      console.log("Bucket not found. Nothing to delete.");
      return;
    }
    throw err;
  }

  // List and delete all objects
  let isTruncated = true;
  let continuationToken: string | undefined;

  while (isTruncated) {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log(`Deleting ${listResponse.Contents.length} objects...`);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
          },
        })
      );
    }

    isTruncated = listResponse.IsTruncated || false;
    continuationToken = listResponse.NextContinuationToken;
  }

  console.log("Deleting bucket...");
  await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
  console.log("Bucket deleted.");
  console.log("Teardown complete.");
}

teardown().catch((err) => {
  console.error("Teardown failed:", err);
  process.exit(1);
});
