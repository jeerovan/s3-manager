import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { S3_AccessKeyId, S3_SecretAccessKey, S3_Bucket, S3_Region, S3_Endpoint } from '$env/static/private';

// Initialize a singleton client scoped to the server
const s3Client = new S3Client({
    region: S3_Region,
    endpoint: S3_Endpoint,
    credentials: {
        accessKeyId: S3_AccessKeyId,
        secretAccessKey: S3_SecretAccessKey
    },
    forcePathStyle: true // Required for providers like Cloudflare R2, MinIO, or Backblaze B2
});

export async function listObjects(prefix = '') {
    const command = new ListObjectsV2Command({ 
        Bucket: S3_Bucket, 
        Prefix: prefix 
    });
    
    const response = await s3Client.send(command);
    
    // Return both the bucket name (for the UI) and the objects
    return {
        bucket: S3_Bucket,
        objects: response.Contents || []
    };
}