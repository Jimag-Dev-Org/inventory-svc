import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { s3 } from './s3.client.js';

type PresignBody = {
  carId?: string;
  filename?: string;
  contentType: string; // e.g. image/jpeg, image/png, image/avif
  ext?: string;        // optional fallback, e.g. .jpg
};

function cleanPathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function getExtension(body: PresignBody) {
  if (body.ext && body.ext.startsWith('.')) return body.ext;

  if (body.filename && body.filename.includes('.')) {
    return body.filename.substring(body.filename.lastIndexOf('.'));
  }

  return '';
}

@Controller('uploads')
export class UploadsController {
  @Post('presign')
  async presign(@Body() body: PresignBody) {
    const bucket = process.env.S3_BUCKET;
    const publicImageBase = process.env.PUBLIC_IMAGE_BASE;

    if (!bucket) {
      throw new BadRequestException('S3_BUCKET is not configured');
    }

    if (!body.contentType || !body.contentType.startsWith('image/')) {
      throw new BadRequestException('contentType must be a valid image/* type');
    }

    const ext = getExtension(body);
    const safeFilename = body.filename
      ? cleanPathSegment(body.filename)
      : `image${ext}`;

    // If carId is provided, organize uploads by car.
    // If not, still avoid "undefined/" by using uploads/.
    const prefix = body.carId
      ? `cars/${cleanPathSegment(body.carId)}`
      : 'uploads';

    const key = `${prefix}/${randomUUID()}-${safeFilename}`;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: body.contentType,
      ServerSideEncryption: 'AES256',
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });

    return {
      key,
      url,
      uploadUrl: url,
      headers: { 'Content-Type': body.contentType },
      publicUrl: publicImageBase ? `${publicImageBase.replace(/\/$/, '')}/${key}` : undefined,
    };
  }
}