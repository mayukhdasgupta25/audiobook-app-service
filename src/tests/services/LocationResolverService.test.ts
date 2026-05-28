/**
 * LocationResolverService Tests
 */

import axios from 'axios';
import { LocationResolverService } from '../../services/LocationResolverService';
import { ApiError } from '../../types/ApiError';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LocationResolverService', () => {
   let service: LocationResolverService;

   beforeEach(() => {
      jest.clearAllMocks();
      service = new LocationResolverService(
         'https://nominatim.test',
         'AudioBookTest/1.0'
      );
   });

   it('should resolve coordinates to city, state, country', async () => {
      mockedAxios.get.mockResolvedValue({
         data: {
            address: {
               city: 'Dhaka',
               state: 'Dhaka Division',
               country: 'Bangladesh',
            },
         },
      });

      const location = await service.resolveFromCoordinates(23.8103, 90.4125);

      expect(location).toBe('Dhaka, Dhaka Division, Bangladesh');
      expect(mockedAxios.get).toHaveBeenCalledWith(
         'https://nominatim.test/reverse',
         expect.objectContaining({
            params: { lat: 23.8103, lon: 90.4125, format: 'json' },
            headers: expect.objectContaining({ 'User-Agent': 'AudioBookTest/1.0' }),
         })
      );
   });

   it('should fall back to display_name when address parts are missing', async () => {
      mockedAxios.get.mockResolvedValue({
         data: {
            display_name: 'Central Park, New York, United States',
         },
      });

      const location = await service.resolveFromCoordinates(40.7829, -73.9654);

      expect(location).toBe('Central Park, New York, United States');
   });

   it('should throw validation error when geocoder returns no usable label', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      await expect(service.resolveFromCoordinates(0, 0)).rejects.toThrow(ApiError);
   });

   it('should throw validation error when geocoder request fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('network error'));

      await expect(service.resolveFromCoordinates(23.8103, 90.4125)).rejects.toThrow(ApiError);
   });
});
