/**
 * Resolves latitude/longitude coordinates to a human-readable location label.
 * Uses OpenStreetMap Nominatim reverse geocoding (https://nominatim.org).
 */
import axios, { AxiosError } from 'axios';
import { config } from '../config/env';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';

interface NominatimAddress {
   city?: string;
   town?: string;
   village?: string;
   state?: string;
   country?: string;
}

interface NominatimReverseResponse {
   display_name?: string;
   address?: NominatimAddress;
}

export class LocationResolverService {
   private readonly baseUrl: string;
   private readonly userAgent: string;

   constructor(
      baseUrl: string = config.NOMINATIM_BASE_URL,
      userAgent: string = config.NOMINATIM_USER_AGENT
   ) {
      this.baseUrl = baseUrl.replace(/\/$/, '');
      this.userAgent = userAgent;
   }

   /**
    * Reverse-geocode coordinates into a location string (city, region, country).
    */
   async resolveFromCoordinates(latitude: number, longitude: number): Promise<string> {
      try {
         const response = await axios.get<NominatimReverseResponse>(
            `${this.baseUrl}/reverse`,
            {
               params: {
                  lat: latitude,
                  lon: longitude,
                  format: 'json',
               },
               headers: {
                  'User-Agent': this.userAgent,
                  Accept: 'application/json',
               },
               timeout: 10_000,
            }
         );

         const location = this.formatLocation(response.data);
         if (!location) {
            throw ApiError.validationError(
               MessageHandler.getErrorMessage('validation.location_resolve_failed')
            );
         }

         return location;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 404) {
               throw ApiError.validationError(
                  MessageHandler.getErrorMessage('validation.location_resolve_failed')
               );
            }
         }
         throw ApiError.validationError(
            MessageHandler.getErrorMessage('validation.location_resolve_failed')
         );
      }
   }

   private formatLocation(data: NominatimReverseResponse): string | null {
      const address = data.address;
      if (address) {
         const locality = address.city ?? address.town ?? address.village;
         const parts = [locality, address.state, address.country].filter(
            (part): part is string => Boolean(part && part.trim())
         );
         if (parts.length > 0) {
            return parts.join(', ').slice(0, 200);
         }
      }

      const displayName = data.display_name?.trim();
      if (displayName) {
         return displayName.slice(0, 200);
      }

      return null;
   }
}
