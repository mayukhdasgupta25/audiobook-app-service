import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3StorageProvider } from '../../services/storage/S3StorageProvider';

jest.mock('../../config/env', () => ({
   config: {
      AWS_S3_REGION: 'us-east-1',
      AWS_S3_BUCKET: 'test-bucket',
      AWS_S3_ENDPOINT: '',
      AWS_SIGNED_URL_EXPIRES_IN: 3600,
   },
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
   getSignedUrl: jest.fn(),
}));

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe('S3StorageProvider', () => {
   beforeEach(() => {
      mockGetSignedUrl.mockReset();
   });

   describe('getFileUrl', () => {
      it('calls getSignedUrl with GetObjectCommand for the bucket and key', async () => {
         mockGetSignedUrl.mockResolvedValue(
            'https://test-bucket.s3.amazonaws.com/uploads/test.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256',
         );

         const provider = new S3StorageProvider();
         const url = await provider.getFileUrl('uploads/test.jpg', 7200);

         expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
         const [, command, options] = mockGetSignedUrl.mock.calls[0]!;
         expect(command).toBeInstanceOf(GetObjectCommand);
         expect((command as GetObjectCommand).input).toEqual({
            Bucket: 'test-bucket',
            Key: 'uploads/test.jpg',
         });
         expect(options).toEqual({ expiresIn: 7200 });
         expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      });

      it('produces SigV4 presigned URLs when signing locally', async () => {
         const { getSignedUrl: realGetSignedUrl } = jest.requireActual('@aws-sdk/s3-request-presigner');
         const { S3Client, GetObjectCommand: RealGetObjectCommand } = jest.requireActual('@aws-sdk/client-s3');

         const client = new S3Client({
            region: 'us-east-1',
            credentials: {
               accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
               secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            },
         });

         const url = await realGetSignedUrl(
            client,
            new RealGetObjectCommand({ Bucket: 'test-bucket', Key: 'uploads/test.jpg' }),
            { expiresIn: 3600 },
         );

         expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
         expect(url).toContain('X-Amz-Credential=');
         expect(url).toContain('X-Amz-Signature=');
      });
   });
});
