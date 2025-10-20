import { Body, Controller, Post } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { s3 } from './s3.client.js';

type PresignBody = {
  carId: string;
  contentType: string;   // e.g., image/jpeg
  ext?: string;          // e.g., .jpg
};

@Controller('uploads')
export class UploadsController {
  @Post('presign')
  async presign(@Body() body: PresignBody) {
    const bucket = process.env.S3_BUCKET!;
    const ext = body.ext && body.ext.startsWith('.') ? body.ext : '';
    const key = `${body.carId}/${randomUUID()}${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: body.contentType,
      // Optionally enforce server-side encryption in prod:
      // ServerSideEncryption: 'AES256',
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 minutes

    return {
      key,
      url,
      headers: { 'Content-Type': body.contentType },
      publicUrl: `${process.env.PUBLIC_IMAGE_BASE}/${key}` // convenience for UI
    };
  }
}
