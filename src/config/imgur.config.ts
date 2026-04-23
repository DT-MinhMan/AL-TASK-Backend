import { registerAs } from '@nestjs/config';

export default registerAs('imgur', () => ({
  clientId: process.env.IMGUR_CLIENT_ID,
}));
