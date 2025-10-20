import { S3Client } from '@aws-sdk/client-s3';

const isLocal = !!process.env.S3_ENDPOINT;

export const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  credentials: isLocal
    ? { accessKeyId: 'test', secretAccessKey: 'test' }  // LocalStack
    : undefined, // prod: IRSA
});
