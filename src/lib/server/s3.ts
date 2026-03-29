import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_AccessKeyId, S3_SecretAccessKey, S3_Bucket, S3_Region, S3_Endpoint } from '$env/static/private';

const s3Client = new S3Client({
    region: S3_Region,
    endpoint: S3_Endpoint,
    credentials: {
        accessKeyId: S3_AccessKeyId,
        secretAccessKey: S3_SecretAccessKey
    },
    forcePathStyle: true
});

export async function listPath(prefix = '', continuationToken?: string) {
    const command = new ListObjectsV2Command({
        Bucket: S3_Bucket,
        Prefix: prefix,
        Delimiter: '/', // Essential for grouping objects into "folders"
        ContinuationToken: continuationToken,
        MaxKeys: 50 // Controls pagination size
    });
    
    const response = await s3Client.send(command);
    
    return {
        bucket: S3_Bucket,
        // CommonPrefixes represent "folders" in S3
        folders: (response.CommonPrefixes || []).map(p => p.Prefix!),
        // Filter out the directory placeholder object itself if it exists
        files: (response.Contents || []).filter(f => f.Key !== prefix),
        nextToken: response.NextContinuationToken
    };
}

export async function generateUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
        Bucket: S3_Bucket,
        Key: key,
        ContentType: contentType
    });
    // Generate a URL valid for 1 hour
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteS3Object(key: string) {
    const command = new DeleteObjectCommand({
        Bucket: S3_Bucket,
        Key: key
    });
    await s3Client.send(command);
}